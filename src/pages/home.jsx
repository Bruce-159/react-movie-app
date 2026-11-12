import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import {
  ErrorState,
  GrainOverlay,
  LoadingState,
  MovieGrid,
  SectionTitle,
} from '../components/PageStatus.jsx'
import { useTmdb } from '../hooks/useTmdb.js'
import { getDisplayRating, tmdbImage } from '../lib/tmdb.js'

const NOW_PLAYING_PARAMS = { language: 'zh-TW', region: 'TW', page: 1 }

function Home() {
  const navigate = useNavigate()
  const { data, loading, error } = useTmdb('/movie/now_playing', NOW_PLAYING_PARAMS)

  const movies = useMemo(() => {
    const list = Array.isArray(data?.results) ? data.results : []
    return [...list].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
  }, [data])

  const featured = movies[0]
  const featuredBackdrop = tmdbImage(featured?.backdrop_path, 'w1280')
  const featuredRating = getDisplayRating(featured)

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <GrainOverlay />

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
        <SectionTitle>現正熱映</SectionTitle>

        {loading && <LoadingState message="載入電影資料中…" />}

        {!loading && error && <ErrorState message={error} />}

        {!loading && !error && movies.length === 0 && (
          <p className="py-12 text-center text-zinc-500">目前沒有可顯示的電影。</p>
        )}

        {!loading && !error && movies.length > 0 && (
          <MovieGrid>
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} returnTo="/" />
            ))}
          </MovieGrid>
        )}
      </section>
    </main>
  )
}

export default Home
