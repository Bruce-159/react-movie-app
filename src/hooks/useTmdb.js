import { useEffect, useState } from 'react'
import {
  buildTmdbUrl,
  fetchTmdbJson,
  MISSING_TMDB_KEY_MESSAGE,
  TMDB_API_KEY,
} from '../lib/tmdb.js'

const IDLE = { data: null, loading: false, error: null }

/**
 * 同時抓多個 TMDB API，全部成功才回傳。
 * 請求內容改變時會中止舊請求；loading 由「目前結果是否對應這組請求」推導，
 * 不在 effect 內同步 setState。
 *
 * @param {Array<[string, Record<string, unknown>?]> | null} requests
 *   每筆為 [path, params]；傳 null 表示不抓。
 * @returns {{ data: unknown[] | null, loading: boolean, error: string | null }}
 */
export function useTmdbRequests(requests) {
  const key =
    TMDB_API_KEY && requests
      ? requests.map(([path, params]) => buildTmdbUrl(path, params)).join('\n')
      : null

  const [result, setResult] = useState({ key: null, data: null, error: null })

  useEffect(() => {
    if (!key) return undefined

    const controller = new AbortController()
    Promise.all(
      key.split('\n').map((url) => fetchTmdbJson(url, controller.signal)),
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ key, data, error: null })
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResult({ key, data: null, error })
        }
      })

    return () => controller.abort()
  }, [key])

  if (!TMDB_API_KEY) return { ...IDLE, error: MISSING_TMDB_KEY_MESSAGE }
  if (!key) return IDLE

  if (result.key !== key) return { data: null, loading: true, error: null }
  if (result.error) {
    return {
      data: null,
      loading: false,
      error: result.error.message || '無法載入資料，請稍後再試。',
    }
  }
  return { data: result.data, loading: false, error: null }
}

/**
 * 抓單一 TMDB API。
 * @param {string | null} path - 傳 null 表示不抓
 * @param {Record<string, unknown>} [params]
 */
export function useTmdb(path, params) {
  const { data, loading, error } = useTmdbRequests(
    path ? [[path, params]] : null,
  )
  return { data: data?.[0] ?? null, loading, error }
}
