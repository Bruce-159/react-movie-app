// AI 推薦的每日用量限制（台灣時間午夜重置）：
// - 一般帳號每天 AI_DAILY_LIMIT 次
// - 免登入試用的訪客（Firebase 匿名登入）每人每天 AI_GUEST_DAILY_LIMIT 次，
//   而且所有訪客加起來每天最多 AI_GUEST_DAILY_POOL 次（匿名帳號可以無限建立，靠總量把花費封頂）
// - AI_UNLIMITED_EMAILS 內、Email 已驗證的帳號不受限
// 次數存在 Firestore 的 aiUsage/{uid} 與 aiUsagePools/guests，只有後端（firebase-admin 服務帳戶）
// 能讀寫，前端的安全規則沒有開放這兩個集合，使用者無法自行修改。
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import {
  AI_DAILY_LIMIT,
  AI_GUEST_DAILY_LIMIT,
  AI_GUEST_DAILY_POOL,
} from '../../src/lib/aiRecommendOptions.js'

const USAGE_COLLECTION = 'aiUsage'
const POOL_COLLECTION = 'aiUsagePools'
const GUEST_POOL_ID = 'guests'
const ADMIN_APP_NAME = 'cinescope-admin'

export class UsageLimitError extends Error {
  /** @param {string} message @param {number} status @param {object} [usage] */
  constructor(message, status, usage) {
    super(message)
    this.status = status
    this.usage = usage
  }
}

/** 台灣時間的今天，格式 YYYY-MM-DD */
export function todayInTaipei(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(now)
}

/** 不受次數限制的帳號（逗號分隔的 Email，不分大小寫） */
function unlimitedEmails() {
  return new Set(
    (process.env.AI_UNLIMITED_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

/** 只認已驗證的 Email，避免有人用同一個 Email 註冊未驗證的帳號來繞過限制 */
export function isUnlimited({ email, emailVerified, isAnonymous }) {
  return Boolean(
    !isAnonymous && email && emailVerified && unlimitedEmails().has(email.toLowerCase()),
  )
}

/** 服務帳戶金鑰：FIREBASE_SERVICE_ACCOUNT 可放 JSON 原文或 base64 */
function readServiceAccount() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT ?? '').trim()
  if (!raw) return null
  const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
  return JSON.parse(text)
}

let db = null
function getDb() {
  if (db) return db
  const serviceAccount = readServiceAccount()
  if (!serviceAccount) {
    throw new UsageLimitError('伺服器尚未設定用量限制（缺少 FIREBASE_SERVICE_ACCOUNT）。', 500)
  }
  const app = getApps().some((a) => a.name === ADMIN_APP_NAME)
    ? getApp(ADMIN_APP_NAME)
    : initializeApp({ credential: cert(serviceAccount) }, ADMIN_APP_NAME)
  db = getFirestore(app)
  return db
}

const UNLIMITED_USAGE = { unlimited: true, guest: false, used: 0, limit: null, remaining: null }

/** 文件中的次數；日期不是今天就視為 0 */
function todayCount(snap, today) {
  const data = snap.exists ? snap.data() : null
  return data?.date === today ? data.count : 0
}

/**
 * 今天的用量。訪客的剩餘次數同時受自己的額度與所有訪客的總量限制。
 * @param {boolean} guest
 * @param {number} count - 自己今天用了幾次
 * @param {number} poolCount - 所有訪客今天用了幾次（一般帳號為 0）
 */
function toUsage(guest, count, poolCount, date) {
  const limit = guest ? AI_GUEST_DAILY_LIMIT : AI_DAILY_LIMIT
  const ownRemaining = Math.max(0, limit - count)
  const poolRemaining = guest ? Math.max(0, AI_GUEST_DAILY_POOL - poolCount) : Infinity
  return {
    unlimited: false,
    guest,
    used: count,
    limit,
    remaining: Math.min(ownRemaining, poolRemaining),
    // 自己還有額度，但所有訪客的總量今天用完了
    poolExhausted: guest && ownRemaining > 0 && poolRemaining === 0,
    date,
  }
}

function refs(firestore, uid) {
  return {
    user: firestore.collection(USAGE_COLLECTION).doc(uid),
    pool: firestore.collection(POOL_COLLECTION).doc(GUEST_POOL_ID),
  }
}

/**
 * 查詢今天的用量。
 * @param {{ uid: string, email?: string, emailVerified?: boolean, isAnonymous?: boolean }} user
 * @param {{ db?: object }} [deps] - 測試時可注入 Firestore
 */
export async function getUsage(user, deps = {}) {
  if (isUnlimited(user)) return UNLIMITED_USAGE
  const firestore = deps.db ?? getDb()
  const today = todayInTaipei()
  const ref = refs(firestore, user.uid)
  const [userSnap, poolSnap] = await Promise.all([
    ref.user.get(),
    user.isAnonymous ? ref.pool.get() : null,
  ])
  return toUsage(
    Boolean(user.isAnonymous),
    todayCount(userSnap, today),
    poolSnap ? todayCount(poolSnap, today) : 0,
    today,
  )
}

/**
 * 用掉一次額度；已達上限時丟出 UsageLimitError（429）。以 transaction 確保同時多個請求也不會超用。
 * @returns {Promise<object>} 扣除後的用量
 */
export async function consumeUsage(user, deps = {}) {
  if (isUnlimited(user)) return UNLIMITED_USAGE
  const firestore = deps.db ?? getDb()
  const today = todayInTaipei()
  const guest = Boolean(user.isAnonymous)
  const ref = refs(firestore, user.uid)

  return firestore.runTransaction(async (tx) => {
    // transaction 內要先讀完所有文件才能寫入
    const userSnap = await tx.get(ref.user)
    const poolSnap = guest ? await tx.get(ref.pool) : null
    const count = todayCount(userSnap, today)
    const poolCount = poolSnap ? todayCount(poolSnap, today) : 0

    if (guest && count >= AI_GUEST_DAILY_LIMIT) {
      throw new UsageLimitError(
        `訪客今天的 ${AI_GUEST_DAILY_LIMIT} 次試用已經用完了，登入後每天可以用 ${AI_DAILY_LIMIT} 次。`,
        429,
        toUsage(true, count, poolCount, today),
      )
    }
    if (guest && poolCount >= AI_GUEST_DAILY_POOL) {
      throw new UsageLimitError(
        `今天的訪客試用名額已經用完了，登入後每天可以用 ${AI_DAILY_LIMIT} 次。`,
        429,
        toUsage(true, count, poolCount, today),
      )
    }
    if (!guest && count >= AI_DAILY_LIMIT) {
      throw new UsageLimitError(
        `今天的 AI 推薦次數（${AI_DAILY_LIMIT} 次）已經用完了，台灣時間午夜會重置。`,
        429,
        toUsage(false, count, 0, today),
      )
    }

    const now = new Date()
    tx.set(ref.user, { date: today, count: count + 1, updatedAt: now })
    if (guest) tx.set(ref.pool, { date: today, count: poolCount + 1, updatedAt: now })
    return toUsage(guest, count + 1, guest ? poolCount + 1 : 0, today)
  })
}

/** 請求因伺服器或 AI 端的錯誤失敗時，把剛才扣的那次還回去（訪客也會還回總量） */
export async function refundUsage(user, deps = {}) {
  if (isUnlimited(user)) return
  const firestore = deps.db ?? getDb()
  const today = todayInTaipei()
  const guest = Boolean(user.isAnonymous)
  const ref = refs(firestore, user.uid)

  await firestore.runTransaction(async (tx) => {
    const userSnap = await tx.get(ref.user)
    const poolSnap = guest ? await tx.get(ref.pool) : null
    const now = new Date()
    const count = todayCount(userSnap, today)
    if (count > 0) tx.set(ref.user, { date: today, count: count - 1, updatedAt: now })
    const poolCount = poolSnap ? todayCount(poolSnap, today) : 0
    if (guest && poolCount > 0) tx.set(ref.pool, { date: today, count: poolCount - 1, updatedAt: now })
  })
}
