import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'

const API_KEY = import.meta.env.VITE_TMDB_API_KEY
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

const NOW_PLAYING_URL = `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=zh-TW&region=TW&page=1`

function Home() {
  const navigate = useNavigate()
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!API_KEY) {
      setError('缺少 VITE_TMDB_API_KEY，請檢查 .env')
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadMovies() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(NOW_PLAYING_URL)
        if (!res.ok) {
          throw new Error(`API 錯誤：${res.status}`)
        }

        const data = await res.json()
        const list = Array.isArray(data.results) ? data.results : []
        const sorted = [...list].sort(
          (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
        )

        if (!cancelled) {
          setMovies(sorted)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || '無法載入電影資料')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadMovies()
    return () => {
      cancelled = true
    }
  }, [])

  const featured = movies[0]
  const featuredBackdrop = featured?.backdrop_path
    ? `${TMDB_IMAGE_BASE}/w1280${featured.backdrop_path}`
    : null
  const featuredRating =
    typeof featured?.vote_count === 'number' &&
    featured.vote_count >= 10 &&
    typeof featured?.vote_average === 'number'
      ? featured.vote_average.toFixed(1)
      : null

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* 電影感顆粒紋理 */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      {/* Hero：以熱門榜首電影的劇照作為背景 */}
      <section className="relative z-10">
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden">
          <div className="relative h-[min(52vh,420px)] min-h-[280px]">
            {featuredBackdrop ? (
              <img
                src={featuredBackdrop}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-top"
                aria-hidden="true"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
            )}

            {/* 多層漸層：模擬電影院暗角與底部淡出 */}
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.45)_100%)]" />
          </div>
        </div>

        <div className="relative -mt-[min(52vh,420px)] z-10 flex min-h-[min(52vh,420px)] flex-col items-start justify-end px-5 pb-10 pt-10 text-left sm:px-8 md:px-10">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.35em] text-amber-400/90">
            Now Playing
          </p>
          <h1 className="m-0 mb-2 text-4xl font-bold tracking-tight !text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-5xl md:text-6xl">
            熱播電影
          </h1>

          {!loading && !error && featured && (
            <div className="mt-5 w-full max-w-2xl">
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-widest text-amber-500/80">
                  本週焦點
                </p>
                <h2 className="m-0 text-2xl font-semibold !text-white sm:text-3xl">
                  {featured.title}
                </h2>
              </div>
              {featured.overview && (
                <p className="!mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-300 sm:text-base">
                  {featured.overview}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {featuredRating && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-300">
                    <span aria-hidden="true">★</span>
                    {featuredRating} / 10
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/movie/${featured.id}`, { state: { from: '/' } })
                  }
                  className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                >
                  查看詳情
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 電影列表 */}
      <section
        className="relative z-10 px-5 pb-16 pt-4 text-left sm:px-8 md:px-10"
        aria-label="近期上映熱門電影列表"
      >
        <div className="mb-8 flex items-center gap-3">
          <span className="h-7 w-1 rounded-full bg-amber-500" aria-hidden="true" />
          <h2 className="m-0 text-xl font-semibold tracking-tight !text-white sm:text-2xl">
            現正熱映
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
            <p className="text-sm text-zinc-500">載入電影資料中…</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-5 py-4 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && movies.length === 0 && (
          <p className="py-12 text-center text-zinc-500">目前沒有可顯示的電影。</p>
        )}

        {!loading && !error && movies.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} variant="cinematic" returnTo="/" />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default Home
