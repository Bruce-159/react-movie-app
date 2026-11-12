// 推薦條件（plan）：AI 拆解使用者需求後的結構化結果，也是前端「AI 理解為」標籤的來源。
// 前端可以刪掉某個標籤後把 plan 送回來，所以每次進來都要重新驗證。
import {
  AI_DEFAULT_ERA,
  AI_ERAS,
  AI_GENRES,
  AI_LANGUAGES,
  AI_MAX_EXCLUDE_GENRES,
  AI_MAX_GENRES,
  AI_MAX_LANGUAGES,
  AI_MAX_REFERENCES,
  AI_MAX_THEMES,
  AI_RUNTIME_MAX,
  AI_RUNTIME_MIN,
  AI_THEMES,
} from '../../src/lib/aiRecommendOptions.js'

export const VALID_GENRE_IDS = new Set(AI_GENRES.map((g) => g.id))
export const VALID_THEME_IDS = new Set(AI_THEMES.map((t) => t.id))
export const VALID_ERA_IDS = new Set(AI_ERAS.map((e) => e.id))
export const VALID_LANGUAGE_IDS = new Set(AI_LANGUAGES.map((l) => l.id))

const MAX_PREFERENCES_LENGTH = 200

/**
 * @typedef {object} Plan
 * @property {number[]} genreIds
 * @property {number[]} excludeGenreIds
 * @property {number[]} themeIds
 * @property {string} era
 * @property {number} maxRuntime - 分鐘，0 代表不限
 * @property {string[]} languages - TMDB original_language
 * @property {{ id: number, title: string }[]} references - 「像這部片」的參考電影
 * @property {string} preferences - 無法對應到條件的口味描述，例如「輕鬆、不要太燒腦」
 */

/** @returns {Plan} */
export function emptyPlan() {
  return {
    genreIds: [],
    excludeGenreIds: [],
    themeIds: [],
    era: AI_DEFAULT_ERA,
    maxRuntime: 0,
    languages: [],
    references: [],
    preferences: '',
  }
}

/** 只保留白名單內、不重複的值 */
export function pickValid(value, validSet, max) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((v) => validSet.has(v)))].slice(0, max)
}

function sanitizeRuntime(value) {
  if (!Number.isInteger(value) || value <= 0) return 0
  return Math.min(AI_RUNTIME_MAX, Math.max(AI_RUNTIME_MIN, value))
}

function sanitizeReferences(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((r) => Number.isInteger(r?.id) && r.id > 0 && typeof r.title === 'string')
    .slice(0, AI_MAX_REFERENCES)
    .map((r) => ({ id: r.id, title: r.title.trim().slice(0, 100) }))
}

/**
 * 驗證並正規化 plan；任何欄位不合法就用預設值。
 * @returns {Plan}
 */
export function sanitizePlan(raw) {
  const plan = emptyPlan()
  if (!raw || typeof raw !== 'object') return plan
  plan.genreIds = pickValid(raw.genreIds, VALID_GENRE_IDS, AI_MAX_GENRES)
  plan.excludeGenreIds = pickValid(raw.excludeGenreIds, VALID_GENRE_IDS, AI_MAX_EXCLUDE_GENRES).filter(
    (id) => !plan.genreIds.includes(id),
  )
  plan.themeIds = pickValid(raw.themeIds, VALID_THEME_IDS, AI_MAX_THEMES)
  plan.era = VALID_ERA_IDS.has(raw.era) ? raw.era : AI_DEFAULT_ERA
  plan.maxRuntime = sanitizeRuntime(raw.maxRuntime)
  plan.languages = pickValid(raw.languages, VALID_LANGUAGE_IDS, AI_MAX_LANGUAGES)
  plan.references = sanitizeReferences(raw.references)
  plan.preferences =
    typeof raw.preferences === 'string' ? raw.preferences.trim().slice(0, MAX_PREFERENCES_LENGTH) : ''
  return plan
}

/**
 * 把使用者直接點選的條件標籤併進 plan：類別、主題取聯集，年代以點選的為準（點選「不限」時保留 AI 判斷）。
 * @param {Plan} plan
 * @param {{ genreIds: number[], themeIds: number[], era: string }} chips - 已驗證
 */
export function mergeChips(plan, chips) {
  return sanitizePlan({
    ...plan,
    genreIds: [...chips.genreIds, ...plan.genreIds],
    themeIds: [...chips.themeIds, ...plan.themeIds],
    era: chips.era !== AI_DEFAULT_ERA ? chips.era : plan.era,
  })
}
