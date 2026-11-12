export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY

export const MISSING_TMDB_KEY_MESSAGE = '缺少 VITE_TMDB_API_KEY，請檢查 .env'

/** TMDB 的分頁上限：page 超過 500 會回傳錯誤 */
export const TMDB_MAX_PAGE = 500

const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

/**
 * 組出 TMDB 圖片網址，沒有路徑時回傳 null。
 * @param {string | null | undefined} path
 * @param {'w92' | 'w185' | 'w342' | 'w1280'} size
 */
export function tmdbImage(path, size) {
  return path ? `${IMAGE_BASE}/${size}${path}` : null
}

/**
 * 組出 TMDB API 網址，值為 null／undefined／空字串的參數會略過。
 * @param {string} path - 例如 `/movie/123`
 * @param {Record<string, string | number | null | undefined>} [params]
 */
export function buildTmdbUrl(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`)
  url.searchParams.set('api_key', TMDB_API_KEY)
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

export async function fetchTmdbJson(url, signal) {
  const res = await fetch(url, { signal })
  if (!res.ok) {
    throw new Error(`API 錯誤：${res.status}`)
  }
  return res.json()
}

export function hasPoster(movie) {
  return typeof movie?.poster_path === 'string' && movie.poster_path.length > 0
}

export function filterMoviesWithPoster(movies) {
  return Array.isArray(movies) ? movies.filter(hasPoster) : []
}

/** TMDB 回傳的總頁數，夾在 1 到 TMDB_MAX_PAGE 之間 */
export function clampTotalPages(totalPages) {
  return Math.min(TMDB_MAX_PAGE, Math.max(1, totalPages ?? 1))
}

/** 投票數至少 10 才顯示評分，避免少數投票造成誤導 */
export function getDisplayRating(movie) {
  if (
    typeof movie?.vote_count === 'number' &&
    movie.vote_count >= 10 &&
    typeof movie?.vote_average === 'number'
  ) {
    return movie.vote_average.toFixed(1)
  }
  return null
}
