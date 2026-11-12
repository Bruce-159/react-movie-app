const TMDB_API_BASE = 'https://api.themoviedb.org/3'

/** 推薦流程中可預期的錯誤，status 會直接當 HTTP 狀態碼回給前端 */
export class RecommendError extends Error {
  /** @param {string} message @param {number} status */
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

/** 呼叫 TMDB API（語言固定 zh-TW） */
export async function tmdb(apiKey, path, params = {}) {
  const url = new URL(`${TMDB_API_BASE}${path}`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('language', 'zh-TW')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value))
  }
  const res = await fetch(url)
  if (!res.ok) throw new RecommendError(`TMDB 錯誤：${res.status}`, 502)
  return res.json()
}
