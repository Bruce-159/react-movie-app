import { useState } from 'react'
import { Link } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import { ErrorState, GrainOverlay, LoadingState } from '../components/PageStatus.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { useAiRecommendations } from '../hooks/useAiRecommendations.js'
import { useMovieList } from '../hooks/useMovieList'
import {
  AI_DAILY_LIMIT,
  AI_DEFAULT_ERA,
  AI_ERAS,
  AI_GUEST_DAILY_LIMIT,
  AI_GENRES,
  AI_LANGUAGES,
  AI_MAX_GENRES,
  AI_MAX_REQUEST_LENGTH,
  AI_MAX_THEMES,
  AI_PICK_COUNT,
  AI_REFINEMENTS,
  AI_SUGGESTIONS,
  AI_THEME_GROUPS,
  AI_THEMES,
} from '../lib/aiRecommendOptions.js'

const GENRE_NAMES = new Map(AI_GENRES.map((g) => [g.id, g.name]))
const THEME_NAMES = new Map(AI_THEMES.map((t) => [t.id, t.name]))
const ERA_NAMES = new Map(AI_ERAS.map((e) => [e.id, e.name]))
const LANGUAGE_NAMES = new Map(AI_LANGUAGES.map((l) => [l.id, l.name]))
const LISTS_SUGGESTION = '像我收藏的那些'

const pillLinkClass =
  'inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-5 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/25'

const chipClass = (active) =>
  [
    'rounded-full px-3.5 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
    active
      ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
      : 'text-zinc-400 ring-1 ring-white/10 hover:bg-white/5 hover:text-zinc-100',
  ].join(' ')

const suggestionClass =
  'rounded-full px-3 py-1 text-xs text-zinc-400 ring-1 ring-white/10 transition hover:bg-white/5 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50'

const primaryBtnClass =
  'inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50'

const secondaryBtnClass =
  'rounded-full border border-amber-500/40 px-6 py-2.5 text-sm font-medium text-amber-200 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50'

const cardActionClass =
  'rounded-full px-3 py-1 text-xs text-zinc-400 ring-1 ring-white/10 transition hover:bg-white/5 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50'

function SparkleIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2zm7 12l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
    </svg>
  )
}

function toggleId(list, id, max) {
  if (list.includes(id)) return list.filter((x) => x !== id)
  return list.length >= max ? list : [...list, id]
}

/** 中文輸入法選字時按 Enter 不送出 */
function isSubmitEnter(event) {
  return event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing
}

/**
 * 把 plan 轉成「AI 理解為」標籤；每個標籤附上刪掉它之後的 plan。
 * @returns {{ key: string, label: string, without: object }[]}
 */
function planTags(plan) {
  if (!plan) return []
  const tags = []
  for (const ref of plan.references) {
    tags.push({
      key: `ref-${ref.id}`,
      label: `類似《${ref.title}》`,
      without: { ...plan, references: plan.references.filter((r) => r.id !== ref.id) },
    })
  }
  for (const id of plan.genreIds) {
    tags.push({
      key: `genre-${id}`,
      label: GENRE_NAMES.get(id),
      without: { ...plan, genreIds: plan.genreIds.filter((x) => x !== id) },
    })
  }
  for (const id of plan.themeIds) {
    tags.push({
      key: `theme-${id}`,
      label: THEME_NAMES.get(id),
      without: { ...plan, themeIds: plan.themeIds.filter((x) => x !== id) },
    })
  }
  for (const id of plan.excludeGenreIds) {
    tags.push({
      key: `exclude-${id}`,
      label: `不要${GENRE_NAMES.get(id)}`,
      without: { ...plan, excludeGenreIds: plan.excludeGenreIds.filter((x) => x !== id) },
    })
  }
  if (plan.era !== AI_DEFAULT_ERA) {
    tags.push({ key: 'era', label: ERA_NAMES.get(plan.era), without: { ...plan, era: AI_DEFAULT_ERA } })
  }
  if (plan.languages.length > 0) {
    tags.push({
      key: 'languages',
      label: plan.languages.map((id) => LANGUAGE_NAMES.get(id)).join('・'),
      without: { ...plan, languages: [] },
    })
  }
  if (plan.maxRuntime > 0) {
    tags.push({
      key: 'runtime',
      label: `片長 ${plan.maxRuntime} 分內`,
      without: { ...plan, maxRuntime: 0 },
    })
  }
  if (plan.preferences) {
    tags.push({ key: 'preferences', label: plan.preferences, without: { ...plan, preferences: '' } })
  }
  return tags
}

function PageHeader() {
  return (
    <header className="mb-8">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.35em] text-amber-400/90">
        AI Picks
      </p>
      <h1 className="mb-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
        AI 推薦
      </h1>
      <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
        跟 AI 說說你想看什麼，或直接點選下方的條件標籤。AI 會從 TMDB 挑片，並告訴你為什麼推薦。
      </p>
    </header>
  )
}

function ListsSwitch({ checked, disabled, isGuest, onChange, likedCount, watchlistCount }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p id="ai-use-lists-label" className="text-sm font-medium text-zinc-200">
          參考我的電影清單
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          {isGuest ? (
            <>
              <Link to="/login" state={{ from: '/recommend' }} className="text-amber-300 hover:underline">
                登入
              </Link>
              後可以讓 AI 參考你收藏與喜愛的電影。
            </>
          ) : disabled ? (
            <>
              你的清單目前是空的，可以先去{' '}
              <Link to="/discover" className="text-amber-300 hover:underline">
                找電影
              </Link>{' '}
              收藏幾部。
            </>
          ) : checked ? (
            `AI 會依你的喜愛 ${likedCount} 部、收藏 ${watchlistCount} 部推斷口味，並避開已在清單中的片。`
          ) : (
            '關閉時只依你的描述與條件推薦，你的清單不會傳給 AI。'
          )}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby="ai-use-lists-label"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40',
          checked ? 'bg-amber-500' : 'bg-zinc-700',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-5 w-5 rounded-full bg-white shadow transition',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  )
}

function ChipGroup({ label, items, selected, max, onToggle }) {
  const full = selected.length >= max
  return (
    <fieldset>
      <legend className="mb-2 flex w-full items-baseline justify-between text-sm font-medium text-zinc-200">
        <span>{label}</span>
        <span className="text-xs font-normal text-zinc-500">
          {selected.length > 0 ? `已選 ${selected.length}／${max}` : `可複選，最多 ${max} 個`}
        </span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = selected.includes(item.id)
          return (
            <button
              key={item.id}
              type="button"
              className={chipClass(active)}
              aria-pressed={active}
              disabled={!active && full}
              onClick={() => onToggle(item.id)}
            >
              {item.name}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function EraPicker({ value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-zinc-200">年代</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="上映年代">
        {AI_ERAS.map((era) => (
          <button
            key={era.id}
            type="button"
            role="radio"
            aria-checked={value === era.id}
            className={chipClass(value === era.id)}
            onClick={() => onChange(era.id)}
          >
            {era.name}
          </button>
        ))}
      </div>
      {value === AI_DEFAULT_ERA && (
        <p className="mt-2 text-xs text-zinc-500">不限年代時以 2000 年後的片為主，經典老片最多 3 部。</p>
      )}
    </fieldset>
  )
}

/** 主題很多，依分組用分頁切換；已選的主題固定顯示在上方，可直接取消 */
function ThemePicker({ selected, onToggle }) {
  const [activeGroup, setActiveGroup] = useState(AI_THEME_GROUPS[0].name)
  const group = AI_THEME_GROUPS.find((g) => g.name === activeGroup)
  const full = selected.length >= AI_MAX_THEMES

  return (
    <fieldset>
      <legend className="mb-2 flex w-full items-baseline justify-between text-sm font-medium text-zinc-200">
        <span>主題</span>
        <span className="text-xs font-normal text-zinc-500">
          {selected.length > 0
            ? `已選 ${selected.length}／${AI_MAX_THEMES}`
            : `可複選，最多 ${AI_MAX_THEMES} 個`}
        </span>
      </legend>

      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selected.map((id) => (
            <button
              key={id}
              type="button"
              className={chipClass(true)}
              aria-label={`取消主題：${THEME_NAMES.get(id)}`}
              onClick={() => onToggle(id)}
            >
              {THEME_NAMES.get(id)} ✕
            </button>
          ))}
        </div>
      )}

      <div
        className="mb-3 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-white/10"
        role="tablist"
        aria-label="主題分類"
      >
        {AI_THEME_GROUPS.map((g) => {
          const active = g.name === activeGroup
          const count = g.themes.filter((t) => selected.includes(t.id)).length
          return (
            <button
              key={g.name}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveGroup(g.name)}
              className={[
                '-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition',
                active
                  ? 'border-amber-500 text-amber-300'
                  : 'border-transparent text-zinc-400 hover:text-zinc-100',
              ].join(' ')}
            >
              {g.name}
              {count > 0 && <span className="ml-1 text-xs text-amber-400">({count})</span>}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-2" role="tabpanel" aria-label={group.name}>
        {group.themes.map((theme) => {
          const active = selected.includes(theme.id)
          return (
            <button
              key={theme.id}
              type="button"
              className={chipClass(active)}
              aria-pressed={active}
              disabled={!active && full}
              onClick={() => onToggle(theme.id)}
            >
              {theme.name}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

const STEP_STYLES = {
  done: { icon: '✓', className: 'text-zinc-400' },
  active: { icon: '…', className: 'text-zinc-100' },
  pending: { icon: '・', className: 'text-zinc-600' },
}

/** 後端回報的實際進度，讓使用者知道 AI 正在做什麼 */
function ThinkingSteps({ progress }) {
  const steps = [
    progress.parse !== 'skip' && { key: 'parse', label: '理解你的需求', state: progress.parse },
    {
      key: 'candidates',
      label: progress.candidateCount
        ? `從 TMDB 找到 ${progress.candidateCount} 部候選電影`
        : '從 TMDB 找候選電影',
      state: progress.candidates,
    },
    { key: 'pick', label: '挑選片單並寫推薦理由', state: progress.pick },
  ].filter(Boolean)

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4" role="status">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-200">
        <SparkleIcon className="h-4 w-4 animate-pulse text-amber-400" />
        AI 正在幫你挑片…
      </p>
      <ol className="m-0 list-none space-y-1.5 p-0 text-sm">
        {steps.map((step) => {
          const style = STEP_STYLES[step.state] ?? STEP_STYLES.pending
          return (
            <li key={step.key} className={style.className}>
              <span
                className={`mr-2 inline-block w-4 text-center ${step.state === 'active' ? 'animate-pulse' : ''}`}
              >
                {style.icon}
              </span>
              {step.label}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** AI 還在寫字時顯示的閃爍游標 */
function TypingCaret() {
  return (
    <span
      className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-amber-400 motion-safe:animate-ai-caret"
      aria-hidden="true"
    />
  )
}

/** locked：今天的次數用完，需要呼叫 AI 的動作（多推像這部的）停用；不感興趣不用呼叫 AI，照常可用 */
function RecommendationItem({ movie, busy, locked, onMoreLike, onDislike }) {
  const year = movie.release_date?.slice(0, 4)
  return (
    <li className="flex gap-4 rounded-xl border border-white/10 bg-zinc-900/40 p-3 motion-safe:animate-ai-card-in sm:p-4">
      <div className="w-24 shrink-0 sm:w-28">
        <MovieCard movie={movie} returnTo="/recommend" showRating={false} showTitle={false} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col py-1">
        <h3 className="m-0 text-base font-semibold leading-snug text-zinc-100">
          <Link
            to={`/movie/${movie.id}`}
            state={{ from: '/recommend' }}
            className="transition hover:text-amber-300"
          >
            {movie.title}
          </Link>
          {year && <span className="ml-2 text-sm font-normal text-zinc-500">{year}</span>}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">
          {movie.reason}
          {movie.streaming && <TypingCaret />}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <button type="button" className={cardActionClass} disabled={busy || locked} onClick={onMoreLike}>
            多推像這部的
          </button>
          <button type="button" className={cardActionClass} disabled={busy} onClick={onDislike}>
            不感興趣
          </button>
        </div>
      </div>
    </li>
  )
}

/** 今天的 AI 推薦次數 */
function UsageNote({ usage }) {
  if (!usage) return null
  if (usage.unlimited) {
    return <span className="text-xs text-zinc-500">你的帳號不限使用次數</span>
  }
  if (usage.remaining === 0) {
    return (
      <span className="text-xs text-amber-300" role="status">
        {usage.guest
          ? usage.poolExhausted
            ? `今天的訪客試用名額已經用完了，登入後每天可以用 ${AI_DAILY_LIMIT} 次。`
            : `訪客今天的 ${usage.limit} 次試用已經用完了，登入後每天可以用 ${AI_DAILY_LIMIT} 次。`
          : `今天的 ${usage.limit} 次 AI 推薦已經用完了，台灣時間午夜會重置。`}
      </span>
    )
  }
  return (
    <span className="text-xs text-zinc-500">
      {usage.guest ? '訪客今天還可以試用 ' : '今天還可以用 '}
      <span className="font-medium text-zinc-300">{usage.remaining}</span>／{usage.limit} 次
    </span>
  )
}

/** 訪客模式提示：說明試用額度，並引導登入 */
function GuestBanner() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 py-3">
      <p className="m-0 text-sm text-violet-100">
        <span className="mr-2 font-semibold">訪客模式</span>
        每天可免費試用 {AI_GUEST_DAILY_LIMIT} 次。登入後每天 {AI_DAILY_LIMIT} 次，還能讓 AI 參考你的收藏。
      </p>
      <Link
        to="/login"
        state={{ from: '/recommend' }}
        className="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium text-violet-100 ring-1 ring-violet-300/40 transition hover:bg-violet-500/20"
      >
        登入
      </Link>
    </div>
  )
}

/** busy：正在推薦中；locked：今天的次數已用完 */
function AskForm({ liked, watchlist, isGuest, busy, locked, usage, onAsk }) {
  const hasLists = liked.length + watchlist.length > 0
  const [text, setText] = useState('')
  const [useLists, setUseLists] = useState(hasLists)
  const [genreIds, setGenreIds] = useState([])
  const [themeIds, setThemeIds] = useState([])
  const [era, setEra] = useState(AI_DEFAULT_ERA)
  const [showChips, setShowChips] = useState(true)

  const effectiveUseLists = useLists && hasLists
  const chipCount = genreIds.length + themeIds.length + (era !== AI_DEFAULT_ERA ? 1 : 0)

  const submit = () => {
    if (busy || locked) return
    onAsk({ text, chips: { genreIds, themeIds, era }, useLists: effectiveUseLists })
  }

  const applySuggestion = (suggestion) => {
    setText(suggestion)
    if (suggestion === LISTS_SUGGESTION && hasLists) setUseLists(true)
  }

  const clearChips = () => {
    setGenreIds([])
    setThemeIds([])
    setEra(AI_DEFAULT_ERA)
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="mb-10 space-y-5 rounded-2xl border border-white/10 bg-zinc-900/40 p-5 text-left backdrop-blur-sm sm:p-6"
    >
      <div>
        <label htmlFor="ai-request" className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
          <SparkleIcon className="h-4 w-4 text-amber-400" />
          想看什麼樣的電影？
        </label>
        <textarea
          id="ai-request"
          rows={2}
          value={text}
          maxLength={AI_MAX_REQUEST_LENGTH}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (isSubmitEnter(event)) {
              event.preventDefault()
              submit()
            }
          }}
          placeholder="例如：想看像《全面啟動》那樣燒腦，但輕鬆一點、不要太長的片"
          className="w-full resize-none rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-500 transition focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">試試：</span>
          {AI_SUGGESTIONS.filter((s) => s !== LISTS_SUGGESTION || hasLists).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={suggestionClass}
              onClick={() => applySuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <ListsSwitch
        isGuest={isGuest}
        checked={effectiveUseLists}
        disabled={!hasLists}
        onChange={setUseLists}
        likedCount={liked.length}
        watchlistCount={watchlist.length}
      />

      <div className="rounded-xl border border-white/10">
        <button
          type="button"
          onClick={() => setShowChips((v) => !v)}
          aria-expanded={showChips}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-zinc-300"
        >
          <span>
            不想打字？直接點選條件
            {chipCount > 0 && <span className="ml-2 text-xs text-amber-400">已選 {chipCount} 個</span>}
          </span>
          <span className="text-zinc-500" aria-hidden="true">
            {showChips ? '收起 ▲' : '展開 ▼'}
          </span>
        </button>
        {showChips && (
          <div className="space-y-6 border-t border-white/10 px-4 py-5">
            <ChipGroup
              label="類別"
              items={AI_GENRES}
              selected={genreIds}
              max={AI_MAX_GENRES}
              onToggle={(id) => setGenreIds((prev) => toggleId(prev, id, AI_MAX_GENRES))}
            />
            <ThemePicker
              selected={themeIds}
              onToggle={(id) => setThemeIds((prev) => toggleId(prev, id, AI_MAX_THEMES))}
            />
            <EraPicker value={era} onChange={setEra} />
            {chipCount > 0 && (
              <button
                type="button"
                onClick={clearChips}
                className="text-sm text-zinc-400 transition hover:text-zinc-100"
              >
                清除條件
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || locked} className={primaryBtnClass}>
          <SparkleIcon />
          {busy ? 'AI 挑片中…' : '幫我挑'}
        </button>
        <span className="text-xs text-zinc-500">
          文字和條件可以一起用；都不填時，AI 會從近期熱門與高分片中挑。
        </span>
        <UsageNote usage={usage} />
      </div>
    </form>
  )
}

function RefineBar({ busy, onRefine }) {
  const [text, setText] = useState('')
  const submit = () => {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    onRefine(trimmed)
    setText('')
  }

  return (
    <div className="mt-8 rounded-xl border border-white/10 bg-zinc-900/40 p-4">
      <p className="mb-3 text-sm font-medium text-zinc-200">不太對？跟 AI 說怎麼調整</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {AI_REFINEMENTS.map((refinement) => (
          <button
            key={refinement}
            type="button"
            className={suggestionClass}
            disabled={busy}
            onClick={() => onRefine(refinement)}
          >
            {refinement}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <label htmlFor="ai-refine" className="sr-only">
          調整推薦
        </label>
        <input
          id="ai-refine"
          type="text"
          value={text}
          maxLength={AI_MAX_REQUEST_LENGTH}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault()
          }}
          placeholder="例如：想要更有笑點、不要太血腥"
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-zinc-950/60 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition focus:border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
        />
        <button type="submit" disabled={busy || !text.trim()} className={secondaryBtnClass}>
          送出
        </button>
      </form>
    </div>
  )
}

function Conversation({ requests }) {
  const turns = requests.length > 0 ? requests : ['依照我點選的條件推薦']
  return (
    <div className="mb-4 flex flex-col items-end gap-2">
      {turns.map((turn, i) => (
        <p
          key={`${i}-${turn}`}
          className="m-0 max-w-[85%] rounded-2xl rounded-br-sm bg-amber-500/15 px-4 py-2 text-sm text-amber-50 ring-1 ring-amber-500/30"
        >
          {turn}
        </p>
      ))}
    </div>
  )
}

function UnderstandingTags({ plan, busy, onRemove }) {
  const tags = planTags(plan)
  if (tags.length === 0) return null
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs text-zinc-500">AI 理解為</span>
      {tags.map((tag) => (
        <button
          key={tag.key}
          type="button"
          disabled={busy}
          onClick={() => onRemove(tag.without)}
          aria-label={`移除條件：${tag.label}`}
          title="移除這個條件並重新推薦"
          className="max-w-full truncate rounded-full bg-violet-500/15 px-3 py-1 text-xs text-violet-200 ring-1 ring-violet-400/30 transition hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {tag.label} ✕
        </button>
      ))}
    </div>
  )
}

/** user：正式登入的帳號或訪客（匿名帳號）；isGuest 時沒有清單、只能試用有限次數 */
function RecommendPanel({ user, isGuest, liked, watchlist }) {
  const { view, status, error, progress, usage, ask, refine, updatePlan, moreLike, dislike, loadMore } =
    useAiRecommendations(user, { liked, watchlist })
  const [noMore, setNoMore] = useState(false)
  const loading = status === 'loading'
  const busy = loading || status === 'loadingMore'
  // 今天的次數用完時，所有會呼叫 AI 的按鈕都停用（後端也會擋）
  const outOfQuota = Boolean(usage && !usage.unlimited && usage.remaining === 0)
  const aiLocked = busy || outOfQuota

  const picks = (view?.picks ?? []).filter(Boolean)
  // 串流中：開場白或第一部片出現前顯示進度步驟，之後改為逐步顯示結果
  const hasContent = Boolean(view?.intro) || picks.length > 0
  const introStreaming = loading && picks.length === 0

  const run = (action) => {
    setNoMore(false)
    action()
    document.getElementById('ai-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleLoadMore = async () => {
    const added = await loadMore()
    if (added === 0) setNoMore(true)
  }

  return (
    <>
      {isGuest && <GuestBanner />}
      <AskForm
        isGuest={isGuest}
        liked={liked}
        watchlist={watchlist}
        busy={busy}
        locked={outOfQuota}
        usage={usage}
        onAsk={(req) => run(() => ask(req))}
      />

      <section id="ai-results" className="scroll-mt-24 text-left" aria-label="推薦結果" aria-busy={busy}>
        {view && (
          <>
            <Conversation requests={view.requests} />
            <UnderstandingTags
              plan={view.plan}
              busy={aiLocked}
              onRemove={(plan) => run(() => updatePlan(plan))}
            />
          </>
        )}

        {error && <ErrorState message={error} className="mb-6" />}

        {loading && !hasContent && progress && <ThinkingSteps progress={progress} />}

        {view && hasContent && (
          <>
            {view.intro && (
              <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
                <SparkleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <p className="m-0 text-sm leading-relaxed text-amber-50">
                  {view.intro}
                  {introStreaming && <TypingCaret />}
                </p>
              </div>
            )}

            {picks.length > 0 && (
              <ul className="grid list-none gap-4 p-0 lg:grid-cols-2">
                {picks.map((movie) => (
                  <RecommendationItem
                    key={movie.id}
                    movie={movie}
                    busy={busy}
                    locked={outOfQuota}
                    onMoreLike={() => run(() => moreLike(movie))}
                    onDislike={() => dislike(movie)}
                  />
                ))}
              </ul>
            )}

            {!busy && picks.length === 0 && (
              <p className="text-zinc-400">片單已經清空了，按「再推薦」或調整一下需求吧。</p>
            )}

            {loading ? (
              <p className="mt-6 flex items-center justify-center gap-2 text-sm text-zinc-400" role="status">
                <SparkleIcon className="h-4 w-4 animate-pulse text-amber-400" />
                AI 還在挑片…（已挑出 {picks.length} 部）
              </p>
            ) : (
              <>
                <div className="mt-8 flex flex-col items-center gap-2">
                  {status === 'loadingMore' ? (
                    <p className="flex items-center gap-2 text-sm text-zinc-400" role="status">
                      <SparkleIcon className="h-4 w-4 animate-pulse text-amber-400" />
                      AI 正在挑下一批…
                    </p>
                  ) : noMore ? (
                    <p className="text-sm text-zinc-500">已經沒有更多符合條件的電影了，試著調整一下需求。</p>
                  ) : (
                    <button type="button" onClick={handleLoadMore} disabled={aiLocked} className={secondaryBtnClass}>
                      再推薦 {AI_PICK_COUNT} 部
                    </button>
                  )}
                  <p className="text-xs text-zinc-500">目前 {picks.length} 部</p>
                </div>

                <RefineBar busy={aiLocked} onRefine={(text) => run(() => refine(text))} />
              </>
            )}
          </>
        )}
      </section>
    </>
  )
}

/** 未登入時：免登入試用（建立匿名帳號）或前往登入 */
function SignInChoices({ onTryAsGuest }) {
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)

  const tryAsGuest = async () => {
    setStarting(true)
    setError(null)
    try {
      await onTryAsGuest()
    } catch (e) {
      setError(
        e?.code === 'auth/operation-not-allowed'
          ? '訪客試用目前還沒開放，請先登入。'
          : '暫時無法開始試用，請稍後再試或直接登入。',
      )
      setStarting(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 px-6 py-8">
      <p className="mb-1 text-base font-medium text-zinc-100">不用註冊，馬上試試 AI 推薦</p>
      <p className="mb-5 text-sm text-zinc-400">
        訪客每天可免費試用 {AI_GUEST_DAILY_LIMIT} 次；登入後每天 {AI_DAILY_LIMIT} 次，還能讓 AI 參考你的收藏。
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={tryAsGuest} disabled={starting} className={primaryBtnClass}>
          <SparkleIcon />
          {starting ? '準備中…' : '免登入試用'}
        </button>
        <Link to="/login" state={{ from: '/recommend' }} className={pillLinkClass}>
          登入
        </Link>
      </div>
      {error && <ErrorState message={error} className="mt-4" />}
    </div>
  )
}

export default function Recommend() {
  const { user, guest, loading: authLoading, signInAsGuest } = useAuth()
  const { items: likes, loading: likesLoading } = useMovieList('likes')
  const { items: favorites, loading: favoritesLoading } = useMovieList('favorites')
  const listsLoading = Boolean(user) && (likesLoading || favoritesLoading)
  // 正式帳號優先；沒登入但已開始試用時，用訪客（匿名帳號）的身分呼叫 AI
  const aiUser = user ?? guest

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-left text-zinc-100">
      <GrainOverlay />

      <div className="relative z-10 px-5 pb-16 pt-8 sm:px-8 md:px-10">
        <PageHeader />

        {!authLoading && !aiUser && <SignInChoices onTryAsGuest={signInAsGuest} />}

        {(authLoading || listsLoading) && <LoadingState message="載入清單中…" className="py-24" />}

        {aiUser && !listsLoading && (
          <RecommendPanel
            key={aiUser.uid}
            user={aiUser}
            isGuest={!user}
            liked={user ? likes : []}
            watchlist={user ? favorites : []}
          />
        )}
      </div>
    </main>
  )
}
