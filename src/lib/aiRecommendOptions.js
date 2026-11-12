// AI 推薦可選的類別、主題與年代。前端畫選項、後端（api/）驗證與組 TMDB 查詢都讀這一份。
import { GENRES } from '../utils/discoverHelpers.js'

/** 每批推薦的電影數 */
export const AI_PICK_COUNT = 12
/** 每個帳號每天可呼叫 AI 推薦的次數（台灣時間午夜重置）；AI_UNLIMITED_EMAILS 內的帳號不受限 */
export const AI_DAILY_LIMIT = 20
/** 類別、主題各最多可選幾個（選太多會篩不出片） */
export const AI_MAX_GENRES = 3
export const AI_MAX_THEMES = 3

/** TMDB 電影類別（不含「電視電影」） */
export const AI_GENRES = GENRES.filter((genre) => genre.id !== 10770)

/**
 * 年代。`gte`／`lte` 對應 TMDB 的上映日期；「不限」時後端會控制老片比例，避免整批都是老片。
 */
export const AI_ERAS = [
  { id: 'any', name: '不限' },
  { id: '2020s', name: '2020 年後', gte: '2020-01-01' },
  { id: '2010s', name: '2010 年後', gte: '2010-01-01' },
  { id: '2000s', name: '2000 年後', gte: '2000-01-01' },
  { id: 'classic', name: '2000 年前經典', lte: '1999-12-31' },
]
export const AI_DEFAULT_ERA = 'any'

/**
 * 主題，依分組顯示。每個主題對應一或多個 TMDB keyword（多個時為「任一符合」），
 * `id` 取第一個 keyword ID。所有 keyword 都以 /search/keyword 查過，
 * 每個主題在 TMDB 上至少有數十部投票數 200 以上的電影。
 */
export const AI_THEME_GROUPS = [
  {
    name: '科幻奇幻',
    themes: [
      { name: '時間旅行', keywords: [4379] },
      { name: '時間循環', keywords: [10854] },
      { name: '平行宇宙', keywords: [33465, 336874] },
      { name: '太空', keywords: [9882] },
      { name: '外星人', keywords: [9951] },
      { name: '人工智慧', keywords: [310] },
      { name: '機器人', keywords: [14544] },
      { name: '虛擬實境', keywords: [4563] },
      { name: '反烏托邦', keywords: [4565] },
      { name: '末日世界', keywords: [4458] },
      { name: '超級英雄', keywords: [9715] },
      { name: '怪獸', keywords: [1299, 161791, 11100] },
      { name: '恐龍', keywords: [12616] },
      { name: '魔法', keywords: [2343] },
      { name: '童話', keywords: [3205] },
      { name: '神話', keywords: [2035] },
    ],
  },
  {
    name: '恐怖驚悚',
    themes: [
      { name: '喪屍', keywords: [12377] },
      { name: '吸血鬼', keywords: [3133] },
      { name: '狼人', keywords: [12564] },
      { name: '女巫', keywords: [616] },
      { name: '鬼魂', keywords: [162846] },
      { name: '鬼屋', keywords: [3358] },
      { name: '惡魔附身', keywords: [15001, 9712, 2626] },
      { name: '邪教', keywords: [6158] },
      { name: '連續殺人魔', keywords: [10714] },
      { name: '心理驚悚', keywords: [12565] },
      { name: '疫情病毒', keywords: [188973, 17995] },
      { name: '災難', keywords: [10617, 5096, 189411] },
      { name: '求生', keywords: [10349] },
    ],
  },
  {
    name: '犯罪動作',
    themes: [
      { name: '搶劫', keywords: [10051] },
      { name: '間諜', keywords: [470] },
      { name: '殺手', keywords: [2708, 782] },
      { name: '黑幫', keywords: [3149, 10391] },
      { name: '臥底', keywords: [1568] },
      { name: '偵探推理', keywords: [703, 12570, 207046] },
      { name: '詐騙', keywords: [10453] },
      { name: '駭客', keywords: [2157] },
      { name: '陰謀', keywords: [10410] },
      { name: '綁架', keywords: [1930] },
      { name: '監獄', keywords: [378] },
      { name: '復仇', keywords: [9748] },
      { name: '武術', keywords: [779] },
      { name: '武士', keywords: [1462] },
      { name: '海盜', keywords: [12988] },
    ],
  },
  {
    name: '人生情感',
    themes: [
      { name: '成長青春', keywords: [10683] },
      { name: '校園', keywords: [6270, 10873, 3616] },
      { name: '初戀', keywords: [157303] },
      { name: '婚禮', keywords: [13027] },
      { name: '友情', keywords: [6054] },
      { name: '父女', keywords: [240303] },
      { name: '母女', keywords: [240315] },
      { name: '家庭關係', keywords: [10235] },
      { name: '失去與療傷', keywords: [9872] },
      { name: '孤獨', keywords: [9957] },
      { name: '女性主角', keywords: [11322] },
      { name: 'LGBTQ+', keywords: [158718] },
      { name: '聖誕節', keywords: [207317] },
      { name: '狗狗', keywords: [15162] },
      { name: '貓咪', keywords: [977] },
      { name: '美食料理', keywords: [1918, 10637] },
      { name: '音樂人', keywords: [4048] },
      { name: '歌舞音樂', keywords: [4344] },
      { name: '公路旅行', keywords: [7312] },
      { name: '小鎮故事', keywords: [1415] },
    ],
  },
  {
    name: '真實歷史',
    themes: [
      { name: '真人真事', keywords: [9672] },
      { name: '人物傳記', keywords: [5565] },
      { name: '二戰', keywords: [1956] },
      { name: '冷戰', keywords: [2106] },
      { name: '中世紀', keywords: [161257] },
      { name: '法庭', keywords: [33519] },
      { name: '新聞記者', keywords: [917] },
      { name: '運動', keywords: [6075] },
      { name: '拳擊', keywords: [209476] },
      { name: '賽車', keywords: [830, 10039] },
      { name: '足球', keywords: [13042] },
      { name: '籃球', keywords: [6496] },
    ],
  },
].map((group) => ({
  ...group,
  themes: group.themes.map((theme) => ({ ...theme, id: theme.keywords[0] })),
}))

/** 所有主題攤平成一個陣列（後端驗證、查名稱用） */
export const AI_THEMES = AI_THEME_GROUPS.flatMap((group) => group.themes)

/** 原始語言（TMDB original_language）。「亞洲片」之類的需求由 AI 拆解成多個語言 */
export const AI_LANGUAGES = [
  { id: 'en', name: '英語' },
  { id: 'ja', name: '日語' },
  { id: 'ko', name: '韓語' },
  { id: 'zh', name: '華語' },
  { id: 'cn', name: '粵語' },
  { id: 'th', name: '泰語' },
  { id: 'hi', name: '印度語' },
  { id: 'fr', name: '法語' },
  { id: 'es', name: '西班牙語' },
  { id: 'de', name: '德語' },
  { id: 'it', name: '義大利語' },
  { id: 'sv', name: '瑞典語' },
  { id: 'da', name: '丹麥語' },
]

/** AI 拆解出的條件上限 */
export const AI_MAX_LANGUAGES = 5
export const AI_MAX_REFERENCES = 3
export const AI_MAX_EXCLUDE_GENRES = 3
/** 片長上限可設定的範圍（分鐘）；0 代表不限 */
export const AI_RUNTIME_MIN = 60
export const AI_RUNTIME_MAX = 240
/** 一句話需求、微調的字數上限，以及一次對話最多保留幾句 */
export const AI_MAX_REQUEST_LENGTH = 200
export const AI_MAX_TURNS = 6

/** 輸入框下方的建議句，點了直接帶入輸入框 */
export const AI_SUGGESTIONS = [
  '週末想放鬆，輕鬆好笑的片',
  '燒腦又有反轉的懸疑片',
  '看完會哭的感人電影',
  '適合跟另一半一起看',
  '冷門但評價很好的片',
  '像我收藏的那些',
]

/** 推薦結果下方的微調建議 */
export const AI_REFINEMENTS = [
  '更輕鬆一點',
  '更燒腦一點',
  '冷門一點',
  '近幾年的片',
  '多一點亞洲片',
  '不要動畫',
  '片長短一點',
]
