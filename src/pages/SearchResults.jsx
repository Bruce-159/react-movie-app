import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import {
  API_KEY,
  filterMoviesWithPoster,
  GRAIN_BACKGROUND,
} from '../utils/discoverHelpers.js'

export default function SearchResults() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q')?.trim() ?? ''

  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const returnTo = useMemo(() => {
    const qs = searchParams.toString()
    return qs ? `/search?${qs}` : '/search'
  }, [searchParams])

  useEffect(() => {
    if (!API_KEY) {
      setError('缺少 VITE_TMDB_API_KEY，請檢查 .env')
      setLoading(false)
      return
    }

    if (!q) {
      setMovies([])
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()

    async function loadSearch() {
      setLoading(true)
      setError(null)

      try {
        const url = new URL('https://api.themoviedb.org/3/search/movie')
        url.searchParams.set('api_key', API_KEY)
        url.searchParams.set('query', q)
        url.searchParams.set('language', 'zh-TW')
        url.searchParams.set('page', '1')

        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`API 錯誤：${res.status}`)
        }

        const data = await res.json()
        const list = filterMoviesWithPoster(
          Array.isArray(data.results) ? data.results : [],
        )

        if (!controller.signal.aborted) {
          setMovies(list)
        }
      } catch (e) {
        if (e.name === 'AbortError') return
        if (!controller.signal.aborted) {
          setError(e.message || '無法載入搜尋結果')
          setMovies([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadSearch()
    return () => controller.abort()
  }, [q])

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
        aria-hidden="true"
        style={GRAIN_BACKGROUND}
      />

      <div className="relative z-10 px-5 pb-16 pt-8 sm:px-8 md:px-10">
        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.35em] text-amber-400/90">
            搜尋
          </p>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {q ? `「${q}」的搜尋結果` : '搜尋電影'}
          </h1>
          {q && !loading && !error && (
            <p className="text-sm text-zinc-500">
              共找到 {movies.length} 部電影
            </p>
          )}
        </header>

        <section aria-label="電影搜尋結果">
          <div className="mb-8 flex items-center gap-3">
            <span className="h-7 w-1 rounded-full bg-amber-500" aria-hidden="true" />
            <h2 className="m-0 text-xl font-semibold tracking-tight !text-white sm:text-2xl">
              搜尋結果
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-zinc-700/80 to-transparent" />
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div
                className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500"
                role="status"
                aria-label="載入中"
              />
              <p className="text-sm text-zinc-500">搜尋電影中…</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-5 py-4 text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && !q && (
            <p className="py-12 text-center text-zinc-500">
              請在上方導覽列輸入關鍵字並按 Enter 開始搜尋。
            </p>
          )}

          {!loading && !error && q && movies.length === 0 && (
            <p className="py-12 text-center text-zinc-500">
              找不到與「{q}」相關的電影，請試試其他關鍵字。
            </p>
          )}

          {!loading && !error && movies.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  variant="cinematic"
                  returnTo={returnTo}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
