export const API_KEY = import.meta.env.VITE_TMDB_API_KEY

export const YEAR_FILTERS = [
  { id: 'all', label: '全部' },
  { id: '2026', label: '2026', gte: '2026-01-01', lte: '2026-12-31' },
  { id: '2025', label: '2025', gte: '2025-01-01', lte: '2025-12-31' },
  { id: '2024', label: '2024', gte: '2024-01-01', lte: '2024-12-31' },
  { id: '2023', label: '2023', gte: '2023-01-01', lte: '2023-12-31' },
  { id: '2022', label: '2022', gte: '2022-01-01', lte: '2022-12-31' },
  { id: '2021', label: '2021', gte: '2021-01-01', lte: '2021-12-31' },
  { id: '2020', label: '2020', gte: '2020-01-01', lte: '2020-12-31' },
  { id: '2019', label: '2019', gte: '2019-01-01', lte: '2019-12-31' },
  { id: '2018', label: '2018', gte: '2018-01-01', lte: '2018-12-31' },
  { id: '2017', label: '2017', gte: '2017-01-01', lte: '2017-12-31' },
  { id: '2016', label: '2016', gte: '2016-01-01', lte: '2016-12-31' },
  { id: '2015', label: '2015', gte: '2015-01-01', lte: '2015-12-31' },
  { id: '2014', label: '2014', gte: '2014-01-01', lte: '2014-12-31' },
  { id: '2013', label: '2013', gte: '2013-01-01', lte: '2013-12-31' },
  { id: '2012', label: '2012', gte: '2012-01-01', lte: '2012-12-31' },
  { id: '2011', label: '2011', gte: '2011-01-01', lte: '2011-12-31' },
  { id: '2001-2010', label: '2001至2010', gte: '2001-01-01', lte: '2010-12-31' },
  { id: 'before-2000', label: '2000以前', lte: '2000-12-31' },
]

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

export function readDiscoverState(searchParams) {
  const pageRaw = Number.parseInt(searchParams.get('page') ?? '1', 10)
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1

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

function buildDiscoverParams(
  page,
  genreId,
  yearFilterId,
  sortBy,
  { originCountry, voteCountGte, minReleaseGteWhenAll } = {},
) {
  const params = new URLSearchParams({
    api_key: API_KEY,
    language: 'zh-TW',
    sort_by: sortBy,
    page: String(page),
    'with_runtime.gte': String(MIN_RUNTIME_MINUTES),
  })

  if (originCountry) {
    params.set('with_origin_country', originCountry)
  }
  if (voteCountGte != null) {
    params.set('vote_count.gte', String(voteCountGte))
  }

  const yearFilter = getYearFilter(yearFilterId)
  if (yearFilterId === 'all' && minReleaseGteWhenAll) {
    params.set('primary_release_date.gte', minReleaseGteWhenAll)
  } else {
    if (yearFilter.gte) {
      params.set('primary_release_date.gte', yearFilter.gte)
    }
    if (yearFilter.lte) {
      params.set('primary_release_date.lte', yearFilter.lte)
    }
  }

  if (genreId != null) {
    params.set('with_genres', String(genreId))
  }

  return params
}

function buildDiscoverUrl(page, genreId, yearFilterId, sortBy, options) {
  return `https://api.themoviedb.org/3/discover/movie?${buildDiscoverParams(page, genreId, yearFilterId, sortBy, options).toString()}`
}

export function hasPoster(movie) {
  return typeof movie?.poster_path === 'string' && movie.poster_path.length > 0
}

export function filterMoviesWithPoster(movies) {
  return movies.filter(hasPoster)
}

export async function fetchDiscoverPage(page, genreId, yearFilterId, sortBy, options) {
  const res = await fetch(buildDiscoverUrl(page, genreId, yearFilterId, sortBy, options))
  if (!res.ok) {
    throw new Error(`API 錯誤：${res.status}`)
  }
  return res.json()
}

export const filterBtnClass = (active) =>
  [
    'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
    active
      ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
      : 'bg-zinc-900/60 text-zinc-400 ring-1 ring-white/10 hover:bg-zinc-800 hover:text-zinc-200',
  ].join(' ')

export const GRAIN_BACKGROUND = {
  backgroundImage:
    'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
}
