import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import {
  ErrorState,
  GrainOverlay,
  LoadingState,
  MovieGrid,
  SectionTitle,
} from '../components/PageStatus.jsx'
import Pagination from '../components/Pagination.jsx'
import { useTmdb } from '../hooks/useTmdb.js'
import { clampTotalPages, filterMoviesWithPoster } from '../lib/tmdb.js'
import { readPageParam } from '../utils/discoverHelpers.js'

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q')?.trim() ?? ''
  const page = readPageParam(searchParams)

  const { data, loading, error } = useTmdb(
    q ? '/search/movie' : null,
    { query: q, language: 'zh-TW', page },
  )
  const movies = useMemo(() => filterMoviesWithPoster(data?.results), [data])
  const totalPages = clampTotalPages(data?.total_pages)
  const totalResults = data?.total_results ?? 0

  const returnTo = useMemo(() => {
    const qs = searchParams.toString()
    return qs ? `/search?${qs}` : '/search'
  }, [searchParams])

  const goToPage = (nextPage) => {
    const next = new URLSearchParams({ q })
    if (nextPage > 1) next.set('page', String(nextPage))
    setSearchParams(next)
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <GrainOverlay />

      <div className="relative z-10 px-5 pb-16 pt-8 sm:px-8 md:px-10">
        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.35em] text-amber-400/90">
            搜尋
          </p>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {q ? `「${q}」的搜尋結果` : '搜尋電影'}
          </h1>
          {q && !loading && !error && (
            <p className="text-sm text-zinc-500">共找到 {totalResults} 部電影</p>
          )}
        </header>

        <section aria-label="電影搜尋結果">
          <SectionTitle>搜尋結果</SectionTitle>

          {loading && <LoadingState message="搜尋電影中…" />}

          {!loading && error && <ErrorState message={error} />}

          {!loading && !error && !q && (
            <p className="py-12 text-center text-zinc-500">
              請在上方導覽列輸入關鍵字並按 Enter 開始搜尋。
            </p>
          )}

          {!loading && !error && q && movies.length === 0 && (
            <p className="py-12 text-center text-zinc-500">
              {page > 1
                ? '這一頁沒有可顯示的電影。'
                : `找不到與「${q}」相關的電影，請試試其他關鍵字。`}
            </p>
          )}

          {!loading && !error && movies.length > 0 && (
            <MovieGrid>
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} returnTo={returnTo} />
              ))}
            </MovieGrid>
          )}
        </section>

        {!loading && !error && q && (
          <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
        )}
      </div>
    </main>
  )
}
