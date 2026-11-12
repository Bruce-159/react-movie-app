import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import MovieCard from './MovieCard.jsx'
import {
  ErrorState,
  GrainOverlay,
  LoadingState,
  MovieGrid,
  SectionTitle,
} from './PageStatus.jsx'
import Pagination from './Pagination.jsx'
import { useTmdb } from '../hooks/useTmdb.js'
import { clampTotalPages, filterMoviesWithPoster } from '../lib/tmdb.js'
import {
  buildDiscoverParams,
  filterBtnClass,
  GENRES,
  readDiscoverState,
  SORT_FIELDS,
  SORT_ORDERS,
  writeDiscoverSearchParams,
  YEAR_FILTERS,
} from '../utils/discoverHelpers.js'

function FilterTitle({ children }) {
  return (
    <p className="flex items-center gap-2 text-left text-sm font-semibold text-zinc-300">
      <span className="h-4 w-0.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
      {children}
    </p>
  )
}

/**
 * @param {object} props
 * @param {string} props.basePath - 頁面路徑，用於 URL 與返回連結
 * @param {string} props.pageEyebrow - 頁首小標
 * @param {string} props.pageTitle - 頁首主標
 * @param {string} props.resultsAriaLabel - 結果區 aria-label
 * @param {object} props.fetchOptions - 傳給 TMDB discover API 的額外參數
 * @param {boolean} [props.showRating=true] - 電影卡片是否顯示評分
 */
export default function DiscoverPage({
  basePath,
  pageEyebrow,
  pageTitle,
  resultsAriaLabel,
  fetchOptions,
  showRating = true,
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { page, yearFilterId, genreId, sortField, sortOrder, sortBy } = useMemo(
    () => readDiscoverState(searchParams),
    [searchParams],
  )

  const { data, loading, error } = useTmdb(
    '/discover/movie',
    buildDiscoverParams({ page, genreId, yearFilterId, sortBy }, fetchOptions),
  )
  const movies = useMemo(() => filterMoviesWithPoster(data?.results), [data])
  const totalPages = clampTotalPages(data?.total_pages)

  const returnTo = useMemo(() => {
    const qs = searchParams.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }, [basePath, searchParams])

  const updateDiscoverParams = (updates) => {
    const next = writeDiscoverSearchParams({
      page,
      yearFilterId,
      genreId,
      sortField,
      sortOrder,
      ...updates,
    })
    setSearchParams(next, { replace: true })
  }

  const selectYear = (nextYearId) => {
    if (nextYearId === yearFilterId) return
    updateDiscoverParams({ yearFilterId: nextYearId, page: 1 })
  }

  const selectGenre = (nextGenreId) => {
    if (nextGenreId === genreId) return
    updateDiscoverParams({ genreId: nextGenreId, page: 1 })
  }

  const selectSort = (nextSortField) => {
    if (nextSortField === sortField) return
    updateDiscoverParams({ sortField: nextSortField, page: 1 })
  }

  const selectSortOrder = (nextSortOrder) => {
    if (nextSortOrder === sortOrder) return
    updateDiscoverParams({ sortOrder: nextSortOrder, page: 1 })
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <GrainOverlay />

      <div className="relative z-10 px-5 pb-16 pt-8 sm:px-8 md:px-10">
        <header className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.35em] text-amber-400/90">
            {pageEyebrow}
          </p>
          <h1 className="mb-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {pageTitle}
          </h1>
        </header>

        <section
          className="mb-10 space-y-5 rounded-2xl border border-white/10 bg-zinc-900/40 p-5 text-left backdrop-blur-sm sm:p-6"
          aria-label="電影篩選"
        >
          <div className="flex flex-col gap-3 text-left">
            <FilterTitle>年份</FilterTitle>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="上映年份篩選"
            >
              {YEAR_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={filterBtnClass(yearFilterId === filter.id)}
                  onClick={() => selectYear(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-zinc-700/60 to-transparent" />

          <div className="flex flex-col gap-3 text-left">
            <FilterTitle>類別</FilterTitle>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="電影類別篩選"
            >
              <button
                type="button"
                className={filterBtnClass(genreId == null)}
                onClick={() => selectGenre(null)}
              >
                全部
              </button>
              {GENRES.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  className={filterBtnClass(genreId === genre.id)}
                  onClick={() => selectGenre(genre.id)}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-zinc-700/60 to-transparent" />

          <div className="flex flex-col gap-3 text-left">
            <FilterTitle>排序</FilterTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex flex-1 flex-wrap gap-2"
                role="group"
                aria-label="排序方式"
              >
                {SORT_FIELDS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={filterBtnClass(sortField === option.id)}
                    onClick={() => selectSort(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div
                className="flex shrink-0 gap-2"
                role="group"
                aria-label="排序方向"
              >
                {SORT_ORDERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={filterBtnClass(sortOrder === option.id)}
                    onClick={() => selectSortOrder(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section aria-label={resultsAriaLabel}>
          <SectionTitle>搜尋結果</SectionTitle>

          {loading && <LoadingState message="載入電影資料中…" />}

          {!loading && error && <ErrorState message={error} />}

          {!loading && !error && movies.length === 0 && (
            <p className="py-12 text-center text-zinc-500">此頁沒有電影資料。</p>
          )}

          {!loading && !error && movies.length > 0 && (
            <MovieGrid>
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  returnTo={returnTo}
                  showRating={showRating}
                />
              ))}
            </MovieGrid>
          )}
        </section>

        {!loading && !error && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={(nextPage) => updateDiscoverParams({ page: nextPage })}
          />
        )}
      </div>
    </main>
  )
}
