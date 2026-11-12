import { useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import ActorCard from '../components/ActorCard.jsx'
import MovieListButton from '../components/MovieListButton.jsx'
import {
  ErrorState,
  GrainOverlay,
  LoadingState,
  MovieGrid,
  SectionTitle,
} from '../components/PageStatus.jsx'
import { useTmdbRequests } from '../hooks/useTmdb.js'
import { getDisplayRating, tmdbImage } from '../lib/tmdb.js'
import { getReturnLink } from '../utils/navigation.js'

const WATCH_REGION = 'TW'

function formatRuntime(minutes) {
  if (typeof minutes !== 'number') return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h} 小時 ${m} 分鐘` : `${m} 分鐘`
}

function findTrailer(videos) {
  if (!videos || !Array.isArray(videos.results)) return null

  const official = videos.results.find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official,
  )
  if (official) return official

  const trailer = videos.results.find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer',
  )
  if (trailer) return trailer

  const teaser = videos.results.find(
    (v) => v.site === 'YouTube' && v.type === 'Teaser',
  )
  return teaser ?? null
}

function getDirectors(crew) {
  if (!Array.isArray(crew)) return []
  return crew.filter((member) => member.job === 'Director')
}

/** 從 TMDB watch/providers 取出指定地區的訂閱串流平台（flatrate） */
function getStreamingProviders(watchProviders, region = WATCH_REGION) {
  const regionData = watchProviders?.results?.[region]
  if (!regionData?.flatrate?.length) return { providers: [], link: null }

  const providers = [...regionData.flatrate].sort(
    (a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99),
  )

  return { providers, link: regionData.link ?? null }
}

function BackLink({ to, label }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-zinc-950/60 px-4 py-1.5 text-sm font-medium text-zinc-300 backdrop-blur-sm transition hover:border-amber-500/30 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  )
}

function MovieDetail() {
  const { movieId } = useParams()
  const location = useLocation()
  const backLink = getReturnLink(location.state?.from)

  const { data, loading, error } = useTmdbRequests(
    movieId
      ? [
          [`/movie/${movieId}`, { language: 'zh-TW' }],
          [`/movie/${movieId}/credits`],
          [`/movie/${movieId}/videos`, { language: 'en-US' }],
          [`/movie/${movieId}/watch/providers`],
        ]
      : null,
  )
  const [movie, credits, videos, watchProviders] = data ?? []

  const posterUrl = tmdbImage(movie?.poster_path, 'w342')
  const backdropUrl = tmdbImage(movie?.backdrop_path, 'w1280')
  const rating = getDisplayRating(movie)

  const trailer = useMemo(() => findTrailer(videos), [videos])
  const directors = useMemo(() => getDirectors(credits?.crew), [credits])
  const streaming = useMemo(
    () => getStreamingProviders(watchProviders),
    [watchProviders],
  )

  const countries = useMemo(() => {
    if (!movie?.production_countries?.length) return '—'
    return movie.production_countries.map((c) => c.name).join('、')
  }, [movie])

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <GrainOverlay />

      {/* 劇照背景 */}
      <div className="absolute top-0 left-1/2 -ml-[50vw] w-screen h-[min(60vh,520px)] overflow-hidden">
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt=""
            className="h-full w-full object-cover object-top"
            aria-hidden="true"
          />
        ) : (
          <div className="h-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]" />
      </div>

      <div className="relative z-10 px-5 pb-16 pt-6 sm:px-8 md:px-10">
        <div className="text-left">
          <BackLink to={backLink.to} label={backLink.label} />
        </div>

        <div className="pt-28 sm:pt-32 md:pt-36">
          {loading && <LoadingState message="載入電影資料中…" className="py-24" />}

          {!loading && !movieId && <ErrorState message="找不到電影 ID" className="mt-8" />}

          {!loading && error && <ErrorState message={error} className="mt-8" />}

          {!loading && !error && movie && (
            <>
              <div className="flex flex-col gap-8 md:flex-row md:items-start">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={movie.title ? `${movie.title} 海報` : '電影海報'}
                    className="mx-auto w-56 shrink-0 rounded-xl object-cover shadow-2xl shadow-black/60 ring-1 ring-white/10 md:mx-0 md:w-60"
                  />
                ) : (
                  <div className="mx-auto flex h-[360px] w-56 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-sm text-zinc-500 ring-1 ring-white/10 md:mx-0 md:w-60">
                    無海報
                  </div>
                )}

                <div className="min-w-0 flex-1 pt-2 text-left md:pt-6">
                  <p className="mb-2 text-left text-xs font-medium uppercase tracking-[0.35em] text-amber-400/90">
                    Movie Detail
                  </p>
                  <h1 className="m-0 mb-2 text-left text-3xl font-bold tracking-tight !text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] sm:text-4xl md:text-5xl">
                    {movie.title}
                  </h1>

                  <div className="mb-4 flex flex-wrap gap-2">
                    {(movie.genres || []).map((g) => (
                      <span
                        key={g.id}
                        className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>

                  <p className="text-sm leading-relaxed text-zinc-300 sm:text-base">
                    {movie.overview || '—'}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <MovieListButton
                      movie={movie}
                      listType="favorites"
                      variant="detail"
                    />
                    <MovieListButton
                      movie={movie}
                      listType="likes"
                      variant="detail"
                    />
                    {rating && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-300">
                        <span aria-hidden="true">★</span>
                        {rating} / 10
                      </span>
                    )}
                    <span className="text-sm text-zinc-500">
                      投票數：{movie.vote_count ?? '—'}
                    </span>
                  </div>
                </div>
              </div>

              <dl className="mt-6 w-full space-y-2 rounded-xl border border-white/10 bg-zinc-900/40 p-4 text-left text-sm backdrop-blur-sm sm:mt-8 sm:p-5">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-zinc-500">原文片名</dt>
                  <dd className="text-zinc-200">{movie.original_title || '—'}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-zinc-500">上映日期</dt>
                  <dd className="text-zinc-200">{movie.release_date || '—'}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-zinc-500">片長</dt>
                  <dd className="text-zinc-200">{formatRuntime(movie.runtime)}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-zinc-500">國家</dt>
                  <dd className="text-zinc-200">{countries}</dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="shrink-0 text-zinc-500">製作公司</dt>
                  <dd className="flex min-w-0 flex-1 flex-wrap text-zinc-200">
                    {movie.production_companies?.length ? (
                      movie.production_companies.map((company, index) => (
                        <span key={company.id} className="whitespace-nowrap">
                          {index > 0 ? '、' : ''}
                          {company.name}
                        </span>
                      ))
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="shrink-0 text-zinc-500">導演</dt>
                  <dd className="text-zinc-200">
                    {directors.length > 0 ? (
                      directors.map((director, index) => (
                        <span key={director.id}>
                          {index > 0 ? '、' : ''}
                          <Link
                            to={`/person/${director.id}?role=director`}
                            className="text-amber-300 underline decoration-amber-500/40 underline-offset-2 transition hover:text-amber-200"
                          >
                            {director.name}
                          </Link>
                        </span>
                      ))
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>

              <section className="mt-14">
                <SectionTitle className="mb-6">串流平台</SectionTitle>
                {streaming.providers.length > 0 ? (
                  <>
                    <p className="mb-5 text-sm text-zinc-500">
                      台灣地區可收看的訂閱平台（資料來源：JustWatch / TMDB）
                    </p>
                    <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
                      {streaming.providers.map((provider) => (
                        <li
                          key={provider.provider_id}
                          className="flex flex-col items-center gap-2"
                        >
                          {provider.logo_path ? (
                            <img
                              src={tmdbImage(provider.logo_path, 'w92')}
                              alt={provider.provider_name}
                              title={provider.provider_name}
                              className="h-14 w-14 rounded-xl object-cover shadow-lg shadow-black/40 ring-1 ring-white/10"
                            />
                          ) : (
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-800 text-xs text-zinc-400 ring-1 ring-white/10">
                              {provider.provider_name?.slice(0, 2) || '?'}
                            </div>
                          )}
                          <span className="max-w-[5.5rem] text-center text-xs text-zinc-300">
                            {provider.provider_name}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {streaming.link && (
                      <a
                        href={streaming.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 inline-block text-sm text-amber-400/90 underline decoration-amber-500/40 underline-offset-2 transition hover:text-amber-300"
                      >
                        查看更多觀看選項
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-zinc-500">
                    目前台灣地區沒有找到訂閱串流平台上架資訊。
                  </p>
                )}
              </section>

              {credits && (
                <section className="mt-14">
                  <SectionTitle className="mb-6">演員陣容</SectionTitle>
                  <MovieGrid>
                    {(credits.cast || []).slice(0, 8).map((actor) => (
                      <ActorCard
                        key={actor.cast_id ?? actor.credit_id ?? actor.id}
                        actor={actor}
                      />
                    ))}
                  </MovieGrid>
                </section>
              )}

              {videos && (
                <section className="mt-14">
                  <SectionTitle className="mb-6">預告片</SectionTitle>
                  {trailer ? (
                    <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/40 shadow-2xl shadow-black/40 ring-1 ring-white/5">
                      <div className="aspect-video">
                        <iframe
                          title="movie trailer"
                          src={`https://www.youtube.com/embed/${trailer.key}`}
                          className="h-full w-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-zinc-500">找不到預告片資料。</p>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default MovieDetail
