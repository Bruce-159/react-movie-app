import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import MovieCard from './MovieCard.jsx'
import {
  API_KEY,
  filterBtnClass,
  filterMoviesWithPoster,
  fetchDiscoverPage,
  GENRES,
  GRAIN_BACKGROUND,
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

  const [movies, setMovies] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  useEffect(() => {
    if (!API_KEY) {
      setError('缺少 VITE_TMDB_API_KEY，請檢查 .env')
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadDiscover() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchDiscoverPage(
          page,
          genreId,
          yearFilterId,
          sortBy,
          fetchOptions,
        )
        const list = filterMoviesWithPoster(
          Array.isArray(data.results) ? data.results : [],
        )

        if (!cancelled) {
          setMovies(list)
          setTotalPages(Math.max(1, data.total_pages ?? 1))
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || '無法載入電影資料')
          setMovies([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDiscover()
    return () => {
      cancelled = true
    }
  }, [page, genreId, yearFilterId, sortBy, fetchOptions])

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

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return
    updateDiscoverParams({ page: nextPage })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
              <p className="text-sm text-zinc-500">載入電影資料中…</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-5 py-4 text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && movies.length === 0 && (
            <p className="py-12 text-center text-zinc-500">此頁沒有電影資料。</p>
          )}

          {!loading && !error && movies.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  variant="cinematic"
                  returnTo={returnTo}
                  showRating={showRating}
                />
              ))}
            </div>
          )}
        </section>

        {!loading && !error && totalPages > 1 && (
          <nav
            className="mt-12 flex items-center justify-center gap-4"
            aria-label="分頁導覽"
          >
            <button
              type="button"
              className="rounded-full border border-white/10 bg-zinc-900/60 px-5 py-2 text-sm font-medium text-zinc-300 transition hover:border-amber-500/30 hover:bg-zinc-800 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              上一頁
            </button>
            <span className="text-sm text-zinc-500">
              第 {page} 頁，共 {totalPages} 頁
            </span>
            <button
              type="button"
              className="rounded-full border border-white/10 bg-zinc-900/60 px-5 py-2 text-sm font-medium text-zinc-300 transition hover:border-amber-500/30 hover:bg-zinc-800 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
            >
              下一頁
            </button>
          </nav>
        )}
      </div>
    </main>
  )
}
