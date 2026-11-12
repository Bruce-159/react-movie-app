import Anthropic from '@anthropic-ai/sdk'
import {
  AI_DEFAULT_ERA,
  AI_ERAS,
  AI_GENRES,
  AI_LANGUAGES,
  AI_PICK_COUNT,
  AI_THEMES,
} from '../../src/lib/aiRecommendOptions.js'
import { RecommendError, tmdb } from './tmdb.js'

/** 最多拿幾部片當種子去 TMDB 延伸候選（參考電影優先，其次是使用者清單） */
const MAX_SEEDS = 6
/** 送給 Claude 挑選的候選上限（控制 token 用量） */
const MAX_CANDIDATES = 60
/** 年代「不限」時，候選中 2000 年前的老片最多佔幾成 */
const MAX_CLASSIC_RATIO = 0.25
/** 年代「不限」時，最後片單中 2000 年前的老片最多幾部 */
const MAX_CLASSIC_PICKS = 3
/** 多請 AI 挑幾部備用，過濾掉無效 id 或超額老片後仍能補滿 AI_PICK_COUNT */
const SPARE_PICKS = 2
const CLASSIC_BEFORE = '2000-01-01'
/** discover 只從前幾頁隨機挑，避免抽到太冷門、資料不全的片 */
const DISCOVER_PAGE_POOL = 5
/** 有片長限制時，種子延伸的片要逐部查片長，最多查幾部 */
const MAX_RUNTIME_LOOKUPS = 40

const GENRE_NAMES = new Map(AI_GENRES.map((g) => [g.id, g.name]))
const THEMES_BY_ID = new Map(AI_THEMES.map((t) => [t.id, t]))
const ERAS_BY_ID = new Map(AI_ERAS.map((e) => [e.id, e]))
const LANGUAGE_NAMES = new Map(AI_LANGUAGES.map((l) => [l.id, l.name]))

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    intro: {
      type: 'string',
      description: '選片人的開場白，繁體中文，1–2 句、60 字以內',
    },
    picks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: '必須是 candidates 中的 id' },
          reason: { type: 'string', description: '繁體中文推薦理由，1–2 句' },
        },
        required: ['id', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['intro', 'picks'],
  additionalProperties: false,
}

const SYSTEM_PROMPT = `你是 CineScope 電影網站的選片人，替台灣使用者挑電影，語氣像熟悉電影、會聊天的朋友。

你會收到：
- requests：使用者依序說的話（第一句是主要需求，之後是微調），可能為空
- plan：已經整理好的條件（類別、主題、年代、語言、片長、參考電影、口味偏好）
- liked／watchlist：使用者「喜愛」與「收藏」的電影；使用者沒有開放參考清單時不會提供
- dislikes：使用者這次標記「不感興趣」的電影，挑片時要避開風格相近的
- candidates：從 TMDB 撈出、已經符合硬性條件的候選電影；related_to 表示它是從哪幾部片延伸出來的

請從 candidates 中挑出 ${AI_PICK_COUNT + SPARE_PICKS} 部最適合的電影（候選不足時就全挑），依推薦程度由高到低排序。
- 只能挑 candidates 裡的 id，不可自創電影。
- 最重要的是符合 requests 的原意與 plan.preferences 的感覺；類別與主題必須確實符合。
- 指定多個主題時，每部片符合其中一個即可，但整批要平均涵蓋每個主題，不要被其中一個主題占滿。
- 有參考電影時，優先挑風格、氛圍真的相近的片。
- 片單要有變化：國家、風格、知名度都要混搭，不要全部挑同一系列、同一導演或同一種風格。
- 年代「不限」時，以 2000 年後的電影為主，2000 年前的老片最多 ${MAX_CLASSIC_PICKS} 部，而且要是真正的經典。
- reason 用繁體中文寫 1–2 句，具體說明這部片的看點，以及它為什麼符合這次的需求。不要只重述劇情簡介，也不要夾雜英文單字。
- 只有在題材、風格或導演真的相近時，才在 reason 提到使用者清單或參考電影；不要為了連結而硬扯。
- intro：用選片人的口吻，1–2 句說明這批片的挑選思路（例如「這次挑的都是設定有巧思、但看完不累的片……」）。內容要符合實際挑出的片，不要描述片單裡沒有的東西，也不要逐一列片名。`

const randomInt = (max) => Math.floor(Math.random() * max)
const isClassic = (movie) => Boolean(movie.release_date) && movie.release_date < CLASSIC_BEFORE

/** 從陣列隨機取 n 個（不重複） */
function sample(items, n) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

/** 交錯合併多個陣列：a1, b1, c1, a2, b2, … */
function interleave(lists) {
  const merged = []
  const longest = Math.max(0, ...lists.map((list) => list.length))
  for (let i = 0; i < longest; i++) {
    for (const list of lists) if (i < list.length) merged.push(list[i])
  }
  return merged
}

/** 上映日期是否落在年代範圍內；沒有日期的片只在「不限」時保留 */
function inEra(movie, era) {
  if (!era.gte && !era.lte) return true
  const date = movie.release_date
  if (!date) return false
  return (!era.gte || date >= era.gte) && (!era.lte || date <= era.lte)
}

/** plan 中「每部片都必須符合」的硬性條件（不含類別、主題） */
function hardFilterParams(plan, era) {
  return {
    ...(era.gte && { 'primary_release_date.gte': era.gte }),
    ...(era.lte && { 'primary_release_date.lte': era.lte }),
    ...(plan.excludeGenreIds.length > 0 && { without_genres: plan.excludeGenreIds.join(',') }),
    ...(plan.languages.length > 0 && { with_original_language: plan.languages.join('|') }),
    ...(plan.maxRuntime > 0 && { 'with_runtime.gte': 60, 'with_runtime.lte': plan.maxRuntime }),
  }
}

/** 單一組條件的 discover，從熱門前幾頁隨機抽 pageCount 頁讓每次結果不同 */
async function discoverOne(tmdbKey, { genreIds, keywordIds, hardParams, pageCount }) {
  const baseParams = {
    sort_by: 'popularity.desc',
    'vote_count.gte': 100,
    include_adult: false,
    ...(keywordIds.length > 0 && { with_keywords: keywordIds.join('|') }),
    ...hardParams,
  }
  const withGenres = (separator) =>
    genreIds.length > 0 ? { with_genres: genreIds.join(separator) } : {}

  // 多個類別先用「全部符合」，結果太少再放寬成「任一符合」
  let params = { ...baseParams, ...withGenres(',') }
  let first = await tmdb(tmdbKey, '/discover/movie', params)
  if (genreIds.length > 1 && first.total_results < 40) {
    params = { ...baseParams, ...withGenres('|') }
    first = await tmdb(tmdbKey, '/discover/movie', params)
  }

  const totalPages = Math.min(first.total_pages ?? 1, DISCOVER_PAGE_POOL)
  const pages = sample(
    Array.from({ length: totalPages }, (_, i) => i + 1),
    pageCount,
  )
  const results = await Promise.all(
    pages.map((page) =>
      page === 1 ? first : tmdb(tmdbKey, '/discover/movie', { ...params, page }),
    ),
  )
  return results.flatMap((data) => data.results ?? [])
}

/**
 * 依 plan 的條件從 TMDB discover 撈片。
 * 選了多個主題時每個主題各撈一份再交錯合併，避免熱門主題（例如喪屍）把其他主題擠掉。
 */
async function discoverByPlan(tmdbKey, plan, era) {
  const hardParams = hardFilterParams(plan, era)
  if (plan.themeIds.length > 1) {
    const perTheme = await Promise.all(
      plan.themeIds.map((id) =>
        discoverOne(tmdbKey, {
          genreIds: plan.genreIds,
          keywordIds: THEMES_BY_ID.get(id).keywords,
          hardParams,
          pageCount: 2,
        }),
      ),
    )
    return interleave(perTheme.map((movies) => sample(movies, movies.length)))
  }
  const keywordIds = plan.themeIds.flatMap((id) => THEMES_BY_ID.get(id).keywords)
  return discoverOne(tmdbKey, { genreIds: plan.genreIds, keywordIds, hardParams, pageCount: 3 })
}

/** 完全沒有任何條件時：近期趨勢、高分與熱門片 */
async function discoverGeneral(tmdbKey) {
  const results = await Promise.all([
    tmdb(tmdbKey, '/trending/movie/week'),
    tmdb(tmdbKey, '/movie/top_rated', { page: 1 + randomInt(DISCOVER_PAGE_POOL) }),
    tmdb(tmdbKey, '/movie/popular', { page: 1 + randomInt(DISCOVER_PAGE_POOL) }),
  ])
  return results.flatMap((data) => data.results ?? [])
}

/** 種子延伸出的片沒有片長資料；有片長限制時逐部查，超過的移除 */
async function applyRuntimeLimit(tmdbKey, pool, maxRuntime) {
  const unknown = [...pool.values()].filter((e) => e.fromSeed).slice(0, MAX_RUNTIME_LOOKUPS)
  await Promise.all(
    unknown.map(async (entry) => {
      const detail = await tmdb(tmdbKey, `/movie/${entry.movie.id}`).catch(() => null)
      const runtime = detail?.runtime ?? 0
      if (runtime > 0 && runtime <= maxRuntime) entry.movie.runtime = runtime
      else pool.delete(entry.movie.id)
    }),
  )
  for (const entry of [...pool.values()]) {
    if (entry.fromSeed && !entry.movie.runtime) pool.delete(entry.movie.id)
  }
}

/** 從參考電影延伸出的片加分，讓「像某部片」的需求不會被一般熱門片稀釋 */
const REFERENCE_BONUS = 4

/**
 * 從候選池挑出要送給 Claude 的片：參考電影延伸的片最優先，被多部種子同時推薦的片次之，
 * 並加入隨機量讓每次不同。年代「不限」時限制 2000 年前老片的比例，避免整批都是老片。
 */
function pickCandidates(entries, era, referenceTitles) {
  const ranked = entries
    .map((entry) => ({
      ...entry,
      score:
        entry.relatedTo.length +
        (entry.relatedTo.some((title) => referenceTitles.has(title)) ? REFERENCE_BONUS : 0) +
        Math.random() * 2,
    }))
    .sort((a, b) => b.score - a.score)

  const limitClassics = era.id === AI_DEFAULT_ERA
  const maxClassics = Math.round(MAX_CANDIDATES * MAX_CLASSIC_RATIO)
  const picked = []
  let classics = 0
  for (const entry of ranked) {
    if (picked.length >= MAX_CANDIDATES) break
    if (limitClassics && isClassic(entry.movie)) {
      if (classics >= maxClassics) continue
      classics++
    }
    picked.push(entry)
  }
  return picked.map(({ movie, relatedTo }) => ({ ...movie, related_to: relatedTo }))
}

/**
 * 組出候選片單。
 * - 參考電影、使用者清單：當種子，用 TMDB 推薦延伸（只留符合硬性條件與類別的）
 * - 類別、主題或其他硬性條件：用 discover 撈
 * - 什麼條件都沒有：熱門與高分片
 */
async function buildCandidates(tmdbKey, { plan, liked, watchlist, excludeIds }) {
  const era = ERAS_BY_ID.get(plan.era) ?? ERAS_BY_ID.get(AI_DEFAULT_ERA)
  const hasLists = liked.length + watchlist.length > 0
  const hasFilters = plan.genreIds.length + plan.themeIds.length > 0
  const hasHardFilters =
    plan.excludeGenreIds.length + plan.languages.length > 0 ||
    plan.maxRuntime > 0 ||
    era.id !== AI_DEFAULT_ERA
  const excluded = new Set(
    [...liked, ...watchlist]
      .map((m) => m.movieId)
      .concat(excludeIds, plan.references.map((r) => r.id)),
  )

  /** @type {Map<number, { movie: object, relatedTo: string[], fromSeed: boolean }>} */
  const pool = new Map()
  const passesHardFilters = (movie) =>
    !excluded.has(movie.id) &&
    Boolean(movie.poster_path && movie.overview) &&
    inEra(movie, era) &&
    !plan.excludeGenreIds.some((id) => movie.genre_ids?.includes(id)) &&
    (plan.languages.length === 0 || plan.languages.includes(movie.original_language))
  const addToPool = (movie, seedTitle) => {
    if (!passesHardFilters(movie)) return
    const entry = pool.get(movie.id) ?? { movie, relatedTo: [], fromSeed: false }
    if (seedTitle) {
      if (!entry.relatedTo.includes(seedTitle)) entry.relatedTo.push(seedTitle)
      if (!pool.has(movie.id)) entry.fromSeed = true
    }
    pool.set(movie.id, entry)
  }
  const addAll = (movies) => movies.forEach((movie) => addToPool(movie, null))

  // 種子：參考電影一定用；使用者清單在「只指定主題」時不用（延伸的片無法確認是否符合主題）
  const references = plan.references.map((r) => ({ movieId: r.id, title: r.title }))
  const useListSeeds = hasLists && (plan.genreIds.length > 0 || plan.themeIds.length === 0)
  const listSeeds = useListSeeds
    ? (() => {
        const room = Math.max(0, MAX_SEEDS - references.length)
        const likedSeeds = sample(liked, room)
        return likedSeeds.concat(sample(watchlist, room - likedSeeds.length))
      })()
    : []

  const tasks = [...references, ...listSeeds].map(async (seed) => {
    const data = await tmdb(tmdbKey, `/movie/${seed.movieId}/recommendations`, {
      page: 1 + randomInt(2),
    }).catch(() => ({ results: [] }))
    for (const movie of data.results ?? []) {
      const matchesGenre =
        plan.genreIds.length === 0 || plan.genreIds.some((id) => movie.genre_ids?.includes(id))
      if (matchesGenre) addToPool(movie, seed.title)
    }
  })

  const hasSeeds = references.length + listSeeds.length > 0
  if (hasFilters || hasHardFilters) {
    tasks.push(discoverByPlan(tmdbKey, plan, era).then(addAll))
  } else if (!hasSeeds) {
    tasks.push(discoverGeneral(tmdbKey).then(addAll))
  }

  await Promise.all(tasks)

  if (plan.maxRuntime > 0) {
    await applyRuntimeLimit(tmdbKey, pool, plan.maxRuntime)
  }

  // 種子延伸的片太少（例如種子很冷門），且沒有類別、主題條件時，用熱門片補足
  if (!hasFilters && pool.size < MAX_CANDIDATES / 2) {
    addAll(
      hasHardFilters ? await discoverByPlan(tmdbKey, plan, era) : await discoverGeneral(tmdbKey),
    )
  }

  return pickCandidates([...pool.values()], era, new Set(references.map((r) => r.title)))
}

/** 只送 Claude 判斷需要的欄位，節省 token */
function toPromptCandidate(movie) {
  return {
    id: movie.id,
    title: movie.title,
    original_title: movie.original_title !== movie.title ? movie.original_title : undefined,
    year: movie.release_date?.slice(0, 4) || undefined,
    genres: (movie.genre_ids ?? []).map((id) => GENRE_NAMES.get(id)).filter(Boolean),
    language: LANGUAGE_NAMES.get(movie.original_language) ?? movie.original_language,
    rating: movie.vote_count >= 10 ? Number(movie.vote_average?.toFixed(1)) : undefined,
    runtime: movie.runtime || undefined,
    overview: movie.overview.slice(0, 140),
    related_to: movie.related_to.length > 0 ? movie.related_to : undefined,
  }
}

/** plan 轉成給 Claude 看的易讀版本 */
function describePlan(plan) {
  const era = ERAS_BY_ID.get(plan.era)
  return {
    genres: plan.genreIds.map((id) => GENRE_NAMES.get(id)),
    excludeGenres: plan.excludeGenreIds.map((id) => GENRE_NAMES.get(id)),
    themes: plan.themeIds.map((id) => THEMES_BY_ID.get(id).name),
    era: era?.name ?? '不限',
    languages: plan.languages.map((id) => LANGUAGE_NAMES.get(id)),
    maxRuntime: plan.maxRuntime > 0 ? `${plan.maxRuntime} 分鐘內` : '不限',
    references: plan.references.map((r) => r.title),
    preferences: plan.preferences || undefined,
  }
}

/** 解碼還沒結束的 JSON 字串內容；結尾若是不完整的跳脫字元就先略過 */
function decodePartial(raw) {
  for (const candidate of [raw, raw.replace(/\\u[0-9a-fA-F]{0,3}$/, ''), raw.replace(/\\$/, '')]) {
    try {
      return JSON.parse(`"${candidate}"`)
    } catch {
      // 試下一個
    }
  }
  return ''
}

const INTRO_PATTERN = /"intro"\s*:\s*"((?:[^"\\]|\\.)*)/
const PICK_PATTERN = /\{\s*"id"\s*:\s*(\d+)\s*,\s*"reason"\s*:\s*"((?:[^"\\]|\\.)*)(")?/g

/**
 * 決定 AI 挑的片要不要採用：只保留候選池裡真的存在的 id、不重複、不超過數量；
 * 年代不限時老片不超過上限。依 AI 給的順序呼叫。
 */
function createPickFilter(candidates, plan) {
  const byId = new Map(candidates.map((m) => [m.id, m]))
  const limitClassics = plan.era === AI_DEFAULT_ERA
  const seen = new Set()
  let classics = 0
  return (id) => {
    const movie = byId.get(id)
    if (!movie || seen.has(id) || seen.size >= AI_PICK_COUNT) return null
    if (limitClassics && isClassic(movie)) {
      if (classics >= MAX_CLASSIC_PICKS) return null
      classics++
    }
    seen.add(id)
    return movie
  }
}

/** 推薦卡片需要的欄位 */
function toPick(movie, reason) {
  return {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path,
    vote_average: movie.vote_average,
    vote_count: movie.vote_count,
    release_date: movie.release_date,
    runtime: movie.runtime || null,
    reason,
  }
}

/**
 * 邊收 AI 的串流輸出邊解析：開場白一有新字就送出，每部片的 id 一確定就送出卡片、理由逐字更新。
 * 串流途中解析不到時（例如欄位順序不同），最後仍會以完整 JSON 為準。
 */
function createStreamParser({ accept, emit }) {
  let buffer = ''
  let intro = ''
  /** AI 輸出的第幾部 → 採用後在片單中的位置（null 表示不採用） */
  const slots = new Map()
  const picks = []

  return (delta) => {
    buffer += delta

    const introMatch = INTRO_PATTERN.exec(buffer)
    if (introMatch) {
      const text = decodePartial(introMatch[1])
      if (text !== intro) {
        intro = text
        emit({ type: 'intro', text })
      }
    }

    const picksStart = buffer.indexOf('"picks"')
    if (picksStart < 0) return
    PICK_PATTERN.lastIndex = picksStart
    let raw = 0
    for (let match = PICK_PATTERN.exec(buffer); match; match = PICK_PATTERN.exec(buffer)) {
      const order = raw++
      if (!slots.has(order)) {
        const movie = accept(Number(match[1]))
        slots.set(order, movie ? picks.push({ movie, reason: '', done: false }) - 1 : null)
      }
      const slot = slots.get(order)
      if (slot == null) continue
      const pick = picks[slot]
      const reason = decodePartial(match[2])
      const done = Boolean(match[3])
      if (reason !== pick.reason || done !== pick.done) {
        pick.reason = reason
        pick.done = done
        emit({ type: 'pick', index: slot, pick: toPick(pick.movie, reason), done })
      }
    }
  }
}

async function askClaude(client, { requests, plan, liked, watchlist, dislikedTitles, candidates }, onText) {
  const hasLists = liked.length + watchlist.length > 0
  const stream = client.messages.stream({
    // Haiku 5.5：挑片寫理由的品質足夠，費用約為 Opus 5.5 的 1/30 以下
    model: 'claude-haiku-5-5',
    max_tokens: 8000,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: RESULT_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          requests,
          plan: describePlan(plan),
          ...(hasLists && {
            liked: liked.map((m) => m.title),
            watchlist: watchlist.map((m) => m.title),
          }),
          ...(dislikedTitles.length > 0 && { dislikes: dislikedTitles }),
          candidates: candidates.map(toPromptCandidate),
        }),
      },
    ],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      onText(event.delta.text)
    }
  }
  const response = await stream.finalMessage()

  if (response.stop_reason === 'refusal') {
    throw new RecommendError('AI 無法處理這次的需求，請換個說法再試一次。', 422)
  }
  if (response.stop_reason === 'max_tokens') {
    throw new RecommendError('AI 回應被截斷，請再試一次。', 502)
  }

  const text = response.content.find((block) => block.type === 'text')?.text
  if (!text) throw new RecommendError('AI 沒有回傳推薦結果。', 502)
  return JSON.parse(text)
}

/**
 * 依推薦條件產生 AI 推薦片單；過程中透過 emit 送出進度與逐步產生的結果：
 * - `{ type: 'candidates', count }`：候選電影撈完
 * - `{ type: 'intro', text }`：開場白（到目前為止的全文）
 * - `{ type: 'pick', index, pick, done }`：第 index 部推薦（理由到目前為止的全文）
 * @param {object} input
 * @param {string[]} input.requests - 使用者說過的話（可能為空）
 * @param {import('./plan.js').Plan} input.plan - 已驗證
 * @param {{ movieId: number, title: string }[]} input.liked - 使用者未開放參考清單時為空陣列
 * @param {{ movieId: number, title: string }[]} input.watchlist
 * @param {number[]} input.excludeIds - 已經推薦過或標記不感興趣、這次不要再出現的電影
 * @param {string[]} input.dislikedTitles - 標記不感興趣的片名，讓 AI 避開相近風格
 * @param {{ tmdbKey: string, anthropic?: Anthropic }} deps
 * @param {(event: object) => void} [emit]
 * @returns {Promise<{ intro: string, picks: object[] }>} 以 AI 的完整輸出為準的最終結果
 */
export async function recommendMovies(input, { tmdbKey, anthropic }, emit = () => {}) {
  const candidates = await buildCandidates(tmdbKey, input)
  if (candidates.length === 0) {
    throw new RecommendError('找不到符合條件的電影，請放寬一些條件再試。', 422)
  }
  emit({ type: 'candidates', count: candidates.length })

  const client = anthropic ?? new Anthropic()
  const onText = createStreamParser({ accept: createPickFilter(candidates, input.plan), emit })
  const result = await askClaude(client, { ...input, candidates }, onText)

  // 以完整輸出重新套一次同樣的篩選規則，確保最終結果與串流途中一致且完整
  const accept = createPickFilter(candidates, input.plan)
  const picks = []
  for (const pick of result.picks ?? []) {
    const movie = accept(pick.id)
    if (movie) picks.push(toPick(movie, pick.reason))
  }
  return { intro: result.intro ?? '', picks }
}
