import Anthropic from '@anthropic-ai/sdk'
import {
  AI_DEFAULT_ERA,
  AI_MAX_GENRES,
  AI_MAX_REQUEST_LENGTH,
  AI_MAX_THEMES,
  AI_MAX_TURNS,
} from '../src/lib/aiRecommendOptions.js'
import { parseRequest } from './_lib/parseRequest.js'
import {
  emptyPlan,
  mergeChips,
  pickValid,
  sanitizePlan,
  VALID_ERA_IDS,
  VALID_GENRE_IDS,
  VALID_THEME_IDS,
} from './_lib/plan.js'
import { recommendMovies } from './_lib/recommendMovies.js'
import { RecommendError } from './_lib/tmdb.js'
import { consumeUsage, getUsage, refundUsage, UsageLimitError } from './_lib/usage.js'
import { verifyFirebaseToken } from './_lib/verifyFirebaseToken.js'

const MAX_LIST_LENGTH = 50
const MAX_EXCLUDE_IDS = 200
const MAX_DISLIKES = 30

// TMDB key 與 Firebase project ID 本來就會出現在前端，可以沿用 VITE_ 變數；
// ANTHROPIC_API_KEY 則只能放在伺服器端，絕對不要加 VITE_ 前綴。
const env = (name) => process.env[name] || process.env[`VITE_${name}`] || ''

function json(body, status = 200) {
  return Response.json(body, { status })
}

/** 只接受 `{ movieId: 正整數, title: 字串 }`，其餘欄位丟掉 */
function sanitizeList(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter(
      (m) =>
        Number.isInteger(m?.movieId) &&
        m.movieId > 0 &&
        typeof m.title === 'string' &&
        m.title.trim().length > 0,
    )
    .slice(0, MAX_LIST_LENGTH)
    .map((m) => ({ movieId: m.movieId, title: m.title.trim().slice(0, 200) }))
}

function sanitizeStrings(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return []
  return value
    .filter((s) => typeof s === 'string' && s.trim().length > 0)
    .slice(-maxItems)
    .map((s) => s.trim().slice(0, maxLength))
}

function sanitizeExcludeIds(value) {
  if (!Array.isArray(value)) return []
  return value.filter((id) => Number.isInteger(id) && id > 0).slice(0, MAX_EXCLUDE_IDS)
}

/**
 * POST /api/recommend
 * Header：Authorization: Bearer <Firebase ID token>
 * Body：{
 *   requests?: string[],     // 使用者說過的話：第一句是主要需求，之後是微調
 *   parse?: boolean,         // true：請 AI 依 requests（與 plan）重新拆解條件
 *   plan?: Plan,             // 上一次回傳的條件（使用者可能刪過標籤），見 api/_lib/plan.js
 *   chips?: { genreIds, themeIds, era },  // 使用者直接點選的條件標籤，會併進 plan
 *   liked?, watchlist?,      // 使用者開放參考清單時才送：[{ movieId, title }]
 *   excludeIds?: number[],   // 已推薦過或不感興趣的片
 *   dislikedTitles?: string[]
 * }
 * 驗證失敗時回傳一般 JSON 錯誤（{ error }）與對應狀態碼；
 * 通過後以 NDJSON 串流回傳事件，依序為：
 *   { type: 'status', step: 'parse' | 'candidates' | 'pick' }
 *   { type: 'plan', plan }                      // AI 理解的條件
 *   { type: 'candidates', count }               // 候選電影數
 *   { type: 'intro', text }                     // 開場白（到目前為止的全文）
 *   { type: 'pick', index, pick, done }         // 第 index 部推薦，理由逐步變長
 *   { type: 'done', intro, picks, plan }        // 最終結果，以這個為準
 *   { type: 'usage', usage }                    // 今天的用量（一開始扣一次；失敗退還後會再送一次）
 *   { type: 'error', error }                    // 途中失敗
 * 今天的次數用完時回傳 429：{ error, usage }
 */
export async function POST(request) {
  const projectId = env('FIREBASE_PROJECT_ID')
  const tmdbKey = env('TMDB_API_KEY')
  if (!projectId || !tmdbKey) {
    return json({ error: '伺服器缺少 TMDB 或 Firebase 設定。' }, 500)
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ error: '伺服器尚未設定 ANTHROPIC_API_KEY。' }, 500)
  }

  let user
  try {
    user = await verifyFirebaseToken(request.headers.get('authorization'), projectId)
  } catch {
    return json({ error: '請先登入後再使用 AI 推薦。' }, 401)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: '請求格式錯誤。' }, 400)
  }

  const requests = sanitizeStrings(body?.requests, AI_MAX_TURNS, AI_MAX_REQUEST_LENGTH)
  const previousPlan = body?.plan ? sanitizePlan(body.plan) : null
  const chips = {
    genreIds: pickValid(body?.chips?.genreIds, VALID_GENRE_IDS, AI_MAX_GENRES),
    themeIds: pickValid(body?.chips?.themeIds, VALID_THEME_IDS, AI_MAX_THEMES),
    era: VALID_ERA_IDS.has(body?.chips?.era) ? body.chips.era : AI_DEFAULT_ERA,
  }
  const liked = sanitizeList(body?.liked)
  const watchlist = sanitizeList(body?.watchlist)
  const excludeIds = sanitizeExcludeIds(body?.excludeIds)
  const dislikedTitles = sanitizeStrings(body?.dislikedTitles, MAX_DISLIKES, 100)

  const parse = body?.parse === true && requests.length > 0

  // 先扣一次額度（用完就直接拒絕，不呼叫 AI）
  let usage
  try {
    usage = await consumeUsage(user)
  } catch (error) {
    if (error instanceof UsageLimitError) {
      return json({ error: error.message, usage: error.usage }, error.status)
    }
    console.error('檢查 AI 推薦用量失敗：', error)
    return json({ error: '暫時無法確認使用次數，請稍後再試。' }, 500)
  }

  const encoder = new TextEncoder()

  // 以 NDJSON 串流回傳（每行一個 JSON 事件），讓前端逐步顯示進度、開場白與每一部推薦
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      try {
        emit({ type: 'usage', usage })
        const anthropic = new Anthropic()

        let plan = previousPlan ?? emptyPlan()
        if (parse) {
          emit({ type: 'status', step: 'parse' })
          plan = await parseRequest(anthropic, { requests, previousPlan, tmdbKey })
        }
        plan = mergeChips(plan, chips)
        emit({ type: 'plan', plan })

        emit({ type: 'status', step: 'candidates' })
        const result = await recommendMovies(
          { requests, plan, liked, watchlist, excludeIds, dislikedTitles },
          { tmdbKey, anthropic },
          (event) => {
            emit(event)
            if (event.type === 'candidates') emit({ type: 'status', step: 'pick' })
          },
        )
        emit({ type: 'done', ...result, plan })
      } catch (error) {
        // 伺服器、TMDB 或 AI 服務端的失敗不算使用者的次數；找不到片、AI 拒答（4xx）照常計算
        if (!(error instanceof RecommendError) || error.status >= 500) {
          try {
            await refundUsage(user)
            emit({ type: 'usage', usage: await getUsage(user) })
          } catch (refundError) {
            console.error('退還 AI 推薦次數失敗：', refundError)
          }
        }
        emit({ type: 'error', error: toErrorMessage(error) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}

/**
 * GET /api/recommend：查詢今天的 AI 推薦用量
 * Header：Authorization: Bearer <Firebase ID token>
 * 回傳：{ unlimited, used, limit, remaining }
 */
export async function GET(request) {
  const projectId = env('FIREBASE_PROJECT_ID')
  if (!projectId) return json({ error: '伺服器缺少 Firebase 設定。' }, 500)

  let user
  try {
    user = await verifyFirebaseToken(request.headers.get('authorization'), projectId)
  } catch {
    return json({ error: '請先登入。' }, 401)
  }

  try {
    return json(await getUsage(user))
  } catch (error) {
    if (error instanceof UsageLimitError) return json({ error: error.message }, error.status)
    console.error('查詢 AI 推薦用量失敗：', error)
    return json({ error: '暫時無法確認使用次數。' }, 500)
  }
}

/** 把錯誤轉成給使用者看的訊息；非預期的錯誤只記在伺服器 log */
function toErrorMessage(error) {
  if (error instanceof RecommendError) return error.message
  if (error instanceof Anthropic.RateLimitError) return 'AI 服務忙碌中，請稍後再試。'
  if (error instanceof Anthropic.AuthenticationError) {
    console.error('Anthropic 驗證失敗：請檢查 ANTHROPIC_API_KEY')
    return 'AI 服務設定有誤。'
  }
  if (error instanceof Anthropic.APIError) {
    console.error(`Anthropic API 錯誤 ${error.status}:`, error.message)
    return 'AI 服務暫時無法使用，請稍後再試。'
  }
  console.error('AI 推薦失敗：', error)
  return '推薦失敗，請稍後再試。'
}
