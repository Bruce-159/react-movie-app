// AI 推薦的每日用量限制：每個帳號每天 AI_DAILY_LIMIT 次，台灣時間午夜重置。
// 次數存在 Firestore 的 aiUsage/{uid}，只有後端（firebase-admin 服務帳戶）能讀寫，
// 前端的安全規則沒有開放這個集合，使用者無法自行修改。
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { AI_DAILY_LIMIT } from '../../src/lib/aiRecommendOptions.js'

const USAGE_COLLECTION = 'aiUsage'
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
export function isUnlimited({ email, emailVerified }) {
  return Boolean(email && emailVerified && unlimitedEmails().has(email.toLowerCase()))
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

function toUsage(count, date) {
  return { unlimited: false, used: count, limit: AI_DAILY_LIMIT, remaining: Math.max(0, AI_DAILY_LIMIT - count), date }
}

const UNLIMITED_USAGE = { unlimited: true, used: 0, limit: null, remaining: null }

/**
 * 查詢今天的用量。
 * @param {{ uid: string, email?: string, emailVerified?: boolean }} user
 * @param {{ db?: object }} [deps] - 測試時可注入 Firestore
 */
export async function getUsage(user, deps = {}) {
  if (isUnlimited(user)) return UNLIMITED_USAGE
  const today = todayInTaipei()
  const snap = await (deps.db ?? getDb()).collection(USAGE_COLLECTION).doc(user.uid).get()
  const data = snap.exists ? snap.data() : null
  return toUsage(data?.date === today ? data.count : 0, today)
}

/**
 * 用掉一次額度；已達上限時丟出 UsageLimitError（429）。以 transaction 確保同時多個請求也不會超用。
 * @returns {Promise<object>} 扣除後的用量
 */
export async function consumeUsage(user, deps = {}) {
  if (isUnlimited(user)) return UNLIMITED_USAGE
  const firestore = deps.db ?? getDb()
  const today = todayInTaipei()
  const ref = firestore.collection(USAGE_COLLECTION).doc(user.uid)

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.exists ? snap.data() : null
    const count = data?.date === today ? data.count : 0
    if (count >= AI_DAILY_LIMIT) {
      throw new UsageLimitError(
        `今天的 AI 推薦次數（${AI_DAILY_LIMIT} 次）已經用完了，台灣時間午夜會重置。`,
        429,
        toUsage(count, today),
      )
    }
    tx.set(ref, { date: today, count: count + 1, updatedAt: new Date() })
    return toUsage(count + 1, today)
  })
}

/** 請求因伺服器或 AI 端的錯誤失敗時，把剛才扣的那次還回去 */
export async function refundUsage(user, deps = {}) {
  if (isUnlimited(user)) return
  const firestore = deps.db ?? getDb()
  const today = todayInTaipei()
  const ref = firestore.collection(USAGE_COLLECTION).doc(user.uid)
  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.exists ? snap.data() : null
    if (data?.date === today && data.count > 0) {
      tx.set(ref, { date: today, count: data.count - 1, updatedAt: new Date() })
    }
  })
}
