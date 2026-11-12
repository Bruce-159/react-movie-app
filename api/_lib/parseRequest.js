// 把使用者的一句話需求（以及後續的微調）拆解成結構化的推薦條件（plan）。
import {
  AI_ERAS,
  AI_GENRES,
  AI_LANGUAGES,
  AI_MAX_REFERENCES,
  AI_THEMES,
} from '../../src/lib/aiRecommendOptions.js'
import { sanitizePlan } from './plan.js'
import { RecommendError, tmdb } from './tmdb.js'

const PARSE_SCHEMA = {
  type: 'object',
  properties: {
    genreIds: { type: 'array', items: { type: 'integer', enum: AI_GENRES.map((g) => g.id) } },
    excludeGenreIds: {
      type: 'array',
      items: { type: 'integer', enum: AI_GENRES.map((g) => g.id) },
    },
    themeIds: { type: 'array', items: { type: 'integer', enum: AI_THEMES.map((t) => t.id) } },
    era: { type: 'string', enum: AI_ERAS.map((e) => e.id) },
    maxRuntime: { type: 'integer', description: '片長上限（分鐘），0 代表不限' },
    languages: { type: 'array', items: { type: 'string', enum: AI_LANGUAGES.map((l) => l.id) } },
    referenceTitles: {
      type: 'array',
      items: { type: 'string' },
      description: '使用者提到、想找相似作品的電影片名',
    },
    preferences: {
      type: 'string',
      description: '無法對應到上述條件的口味描述，繁體中文，30 字以內；沒有就給空字串',
    },
  },
  required: [
    'genreIds',
    'excludeGenreIds',
    'themeIds',
    'era',
    'maxRuntime',
    'languages',
    'referenceTitles',
    'preferences',
  ],
  additionalProperties: false,
}

const list = (items) => items.map((item) => `${item.id}=${item.name}`).join('、')

const SYSTEM_PROMPT = `你負責把電影推薦網站使用者的需求，拆解成可以拿去 TMDB 查詢的條件。

可用的選項（id=名稱）：
- 類別 genreIds／excludeGenreIds：${list(AI_GENRES)}
- 主題 themeIds：${list(AI_THEMES)}
- 年代 era：${list(AI_ERAS)}
- 原始語言 languages：${list(AI_LANGUAGES)}

規則：
- requests 是使用者依序說的話。第一句是主要需求，之後是對推薦結果的微調（例如「更輕鬆一點」「不要動畫」）。
- 有 previous_plan 時，以它為基礎套用最新一句的微調，輸出更新後的「完整」條件；最新一句沒提到的部分維持不變。
- 只有使用者明確或強烈暗示時才設條件，寧可少設也不要亂猜，否則會篩不到片。類別、主題各最多 3 個，且只設最關鍵的。
- 「不要／排除某類型」放 excludeGenreIds。
- 「不要太長」約 120、「短一點」約 100；沒提就 0。
- 「亞洲片」= ja、ko、zh、cn、th；「歐洲片」= fr、es、de、it、sv、da；「國片／台灣片／華語片」= zh。
- 「近幾年」= 2020s；「經典老片」= classic；沒提就 any。
- 使用者說「像某部片」「類似某部片」時，把片名放進 referenceTitles（最多 ${AI_MAX_REFERENCES} 部），用最常見的片名寫法。
  這時不要自己從參考電影推測類別或主題（系統會用參考電影找相似片），只設使用者明確說出的條件。
- 「輕鬆」「燒腦」「冷門」「節奏快」這類無法對應到選項的感覺，寫進 preferences。`

/**
 * 用 TMDB 搜尋把片名轉成電影 ID；上一輪已經找過的片名直接沿用。
 * @param {string} tmdbKey
 * @param {string[]} titles
 * @param {{ id: number, title: string }[]} known
 */
async function resolveReferences(tmdbKey, titles, known) {
  const resolved = await Promise.all(
    titles.slice(0, AI_MAX_REFERENCES).map(async (title) => {
      const hit = known.find((ref) => ref.title === title)
      if (hit) return hit
      const data = await tmdb(tmdbKey, '/search/movie', { query: title }).catch(() => null)
      const movie = data?.results?.find((m) => m.poster_path) ?? data?.results?.[0]
      return movie ? { id: movie.id, title: movie.title } : null
    }),
  )
  const seen = new Set()
  return resolved.filter((ref) => ref && !seen.has(ref.id) && seen.add(ref.id))
}

/**
 * @param {import('@anthropic-ai/sdk').default} client
 * @param {{ requests: string[], previousPlan: import('./plan.js').Plan | null, tmdbKey: string }} input
 * @returns {Promise<import('./plan.js').Plan>}
 */
export async function parseRequest(client, { requests, previousPlan, tmdbKey }) {
  const response = await client.messages.create({
    model: 'claude-haiku-5-5',
    max_tokens: 4000,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: PARSE_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          requests,
          ...(previousPlan && {
            previous_plan: {
              ...previousPlan,
              references: undefined,
              referenceTitles: previousPlan.references.map((r) => r.title),
            },
          }),
        }),
      },
    ],
  })

  if (response.stop_reason === 'refusal') {
    throw new RecommendError('AI 無法處理這個需求，請換個說法再試一次。', 422)
  }
  const text = response.content.find((block) => block.type === 'text')?.text
  if (!text || response.stop_reason === 'max_tokens') {
    throw new RecommendError('AI 沒能理解這個需求，請再試一次。', 502)
  }

  const parsed = JSON.parse(text)
  const references = await resolveReferences(
    tmdbKey,
    Array.isArray(parsed.referenceTitles) ? parsed.referenceTitles : [],
    previousPlan?.references ?? [],
  )
  return sanitizePlan({ ...parsed, references })
}
