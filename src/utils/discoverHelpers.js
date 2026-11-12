/** 單獨列出的近年年份數量，更早的併成區間 */
const RECENT_YEAR_COUNT = 16
/** 「2000以前」的分界年 */
const LEGACY_YEAR = 2000

function buildYearFilters(currentYear) {
  const oldestRecentYear = currentYear - RECENT_YEAR_COUNT + 1
  const rangeStart = LEGACY_YEAR + 1
  const rangeEnd = oldestRecentYear - 1

  const recent = Array.from({ length: RECENT_YEAR_COUNT }, (_, index) => {
    const year = currentYear - index
    return {
      id: String(year),
      label: String(year),
      gte: `${year}-01-01`,
      lte: `${year}-12-31`,
    }
  })

  const filters = [{ id: 'all', label: '全部' }, ...recent]
  if (rangeEnd >= rangeStart) {
    filters.push({
      id: `${rangeStart}-${rangeEnd}`,
      label: `${rangeStart}至${rangeEnd}`,
      gte: `${rangeStart}-01-01`,
      lte: `${rangeEnd}-12-31`,
    })
  }
  filters.push({
    id: `before-${LEGACY_YEAR}`,
    label: `${LEGACY_YEAR}以前`,
    lte: `${LEGACY_YEAR}-12-31`,
  })
  return filters
}

/** 依今年自動產生：今年往回 16 年，再加上區間與「2000以前」 */
export const YEAR_FILTERS = buildYearFilters(new Date().getFullYear())

export const GENRES = [
  { id: 28, name: '動作' },
  { id: 12, name: '冒險' },
  { id: 16, name: '動畫' },
  { id: 35, name: '喜劇' },
  { id: 80, name: '犯罪' },
  { id: 99, name: '紀錄片' },
  { id: 18, name: '劇情' },
  { id: 10751, name: '家庭' },
  { id: 14, name: '奇幻' },
  { id: 36, name: '歷史' },
  { id: 27, name: '恐怖' },
  { id: 10402, name: '音樂' },
  { id: 9648, name: '懸疑' },
  { id: 10749, name: '愛情' },
  { id: 878, name: '科幻' },
  { id: 10770, name: '電視電影' },
  { id: 53, name: '驚悚' },
  { id: 10752, name: '戰爭' },
  { id: 37, name: '西部' },
]

export const SORT_FIELDS = [
  { id: 'popularity', label: '熱門度' },
  { id: 'vote_average', label: '評分' },
  { id: 'vote_count', label: '投票數' },
  { id: 'release_date', label: '上映日期' },
  { id: 'revenue', label: '票房' },
]

export const SORT_ORDERS = [
  { id: 'desc', label: '由高至低' },
  { id: 'asc', label: '由低至高' },
]

export const MIN_VOTE_COUNT = 50
export const MIN_RUNTIME_MINUTES = 60
export const DEFAULT_YEAR = 'all'
export const DEFAULT_SORT_FIELD = 'popularity'
export const DEFAULT_SORT_ORDER = 'desc'

const YEAR_IDS = new Set(YEAR_FILTERS.map((f) => f.id))
const GENRE_IDS = new Set(GENRES.map((g) => String(g.id)))
const SORT_FIELD_IDS = new Set(SORT_FIELDS.map((o) => o.id))

/** 從網址參數讀出頁碼，非正整數一律視為第 1 頁 */
export function readPageParam(searchParams) {
  const pageRaw = Number.parseInt(searchParams.get('page') ?? '1', 10)
  return Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1
}

export function readDiscoverState(searchParams) {
  const page = readPageParam(searchParams)

  const yearRaw = searchParams.get('year') ?? DEFAULT_YEAR
  const yearFilterId = YEAR_IDS.has(yearRaw) ? yearRaw : DEFAULT_YEAR

  const genreRaw = searchParams.get('genre')
  const genreId = genreRaw && GENRE_IDS.has(genreRaw) ? Number(genreRaw) : null

  const sortRaw = searchParams.get('sort')
  let sortField = DEFAULT_SORT_FIELD
  let sortOrder = DEFAULT_SORT_ORDER
  if (sortRaw) {
    const [field, order] = sortRaw.split('.')
    if (SORT_FIELD_IDS.has(field)) {
      sortField = field
      if (order === 'asc' || order === 'desc') sortOrder = order
    }
  }

  return {
    page,
    yearFilterId,
    genreId,
    sortField,
    sortOrder,
    sortBy: `${sortField}.${sortOrder}`,
  }
}

export function writeDiscoverSearchParams({ page, yearFilterId, genreId, sortField, sortOrder }) {
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  if (yearFilterId !== DEFAULT_YEAR) params.set('year', yearFilterId)
  if (genreId != null) params.set('genre', String(genreId))
  if (sortField !== DEFAULT_SORT_FIELD || sortOrder !== DEFAULT_SORT_ORDER) {
    params.set('sort', `${sortField}.${sortOrder}`)
  }
  return params
}

function getYearFilter(yearFilterId) {
  return YEAR_FILTERS.find((f) => f.id === yearFilterId) ?? YEAR_FILTERS[0]
}

/**
 * 組出 TMDB `/discover/movie` 的查詢參數（不含 api_key）。
 */
export function buildDiscoverParams(
  { page, genreId, yearFilterId, sortBy },
  { originCountry, voteCountGte, minReleaseGteWhenAll } = {},
) {
  const params = {
    language: 'zh-TW',
    sort_by: sortBy,
    page,
    'with_runtime.gte': MIN_RUNTIME_MINUTES,
    with_origin_country: originCountry,
    'vote_count.gte': voteCountGte,
    with_genres: genreId,
  }

  const yearFilter = getYearFilter(yearFilterId)
  if (yearFilterId === DEFAULT_YEAR && minReleaseGteWhenAll) {
    params['primary_release_date.gte'] = minReleaseGteWhenAll
  } else {
    params['primary_release_date.gte'] = yearFilter.gte
    params['primary_release_date.lte'] = yearFilter.lte
  }

  return params
}

export const filterBtnClass = (active) =>
  [
    'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
    active
      ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
      : 'bg-zinc-900/60 text-zinc-400 ring-1 ring-white/10 hover:bg-zinc-800 hover:text-zinc-200',
  ].join(' ')
