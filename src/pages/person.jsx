import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import {
  ErrorState,
  GrainOverlay,
  LoadingState,
  MovieGrid,
  SectionTitle,
} from '../components/PageStatus.jsx'
import { useTmdbRequests } from '../hooks/useTmdb.js'
import { tmdbImage } from '../lib/tmdb.js'

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function formatDate(dateStr) {
  if (!hasText(dateStr)) return null
  const [year, month, day] = dateStr.split('-')
  if (!year || !month || !day) return dateStr
  return `${year}年${Number(month)}月${Number(day)}日`
}

function isTaiwanAssociated(person) {
  if (!hasText(person?.place_of_birth)) return false
  return /taiwan|台灣/i.test(person.place_of_birth)
}

function resolvePersonDisplay(personEn, personZhTw) {
  const englishName = personEn?.name?.trim() ?? ''
  const chineseName = personZhTw?.name?.trim() ?? ''
  const useChinese =
    isTaiwanAssociated(personEn) && hasText(chineseName) && chineseName !== englishName

  const displayName = useChinese ? chineseName : englishName
  const alternateName = useChinese && hasText(englishName) ? englishName : null

  let biography = personEn?.biography?.trim() ?? ''
  if (useChinese && hasText(personZhTw?.biography)) {
    biography = personZhTw.biography.trim()
  }

  return {
    ...personEn,
    name: displayName,
    alternateName,
    biography,
  }
}

function toMovieCardItem(item) {
  return {
    id: item.id,
    title: item.title,
    poster_path: item.poster_path,
    vote_average: item.vote_average,
    vote_count: item.vote_count,
    release_date: item.release_date,
  }
}

/** 簡介預設顯示 3 行，超過才出現展開按鈕。換人時由父層以 key 重建，展開狀態自動重設。 */
function BiographyText({ text }) {
  const [expanded, setExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)
  const textRef = useRef(null)

  useEffect(() => {
    const el = textRef.current
    if (!el || expanded) return undefined

    const checkOverflow = () => {
      setCanExpand(el.scrollHeight > el.clientHeight + 1)
    }

    // 以 microtask 在 effect 之後立即量測（不用 requestAnimationFrame，背景分頁時它會暫停）
    let active = true
    Promise.resolve().then(() => {
      if (active) checkOverflow()
    })
    window.addEventListener('resize', checkOverflow)
    return () => {
      active = false
      window.removeEventListener('resize', checkOverflow)
    }
  }, [text, expanded])

  return (
    <div className="mb-4">
      <p
        ref={textRef}
        className={[
          'text-sm leading-relaxed text-zinc-300 sm:text-base',
          !expanded ? 'line-clamp-3' : '',
        ].join(' ')}
      >
        {text}
      </p>
      {(canExpand || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-sm font-medium text-amber-400 transition hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        >
          {expanded ? '收合' : '展開'}
        </button>
      )}
    </div>
  )
}

function Person() {
  const { personId } = useParams()
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role') === 'director' ? 'director' : 'actor'

  const personReturnTo = useMemo(() => {
    const qs = searchParams.toString()
    return qs ? `/person/${personId}?${qs}` : `/person/${personId}`
  }, [personId, searchParams])

  const { data, loading, error } = useTmdbRequests(
    personId
      ? [
          [`/person/${personId}`, { language: 'en-US' }],
          [`/person/${personId}`, { language: 'zh-TW' }],
          [`/person/${personId}/movie_credits`, { language: 'zh-TW' }],
        ]
      : null,
  )
  const [personEn, personZhTw, movieCredits] = data ?? []

  const person = useMemo(() => {
    if (!personEn) return null
    return resolvePersonDisplay(personEn, personZhTw)
  }, [personEn, personZhTw])

  const profileUrl = tmdbImage(person?.profile_path, 'w342')

  const detailFields = useMemo(() => {
    if (!person) return []

    const items = []
    if (hasText(person.birthday)) {
      items.push({ label: '生日', value: formatDate(person.birthday) })
    }
    if (hasText(person.deathday)) {
      items.push({ label: '忌日', value: formatDate(person.deathday) })
    }
    if (hasText(person.place_of_birth)) {
      items.push({ label: '出生地', value: person.place_of_birth.trim() })
    }
    return items
  }, [person])

  const uniqueMovies = useMemo(() => {
    if (!movieCredits) return []

    const movies =
      role === 'director'
        ? (movieCredits.crew || []).filter((item) => item.job === 'Director')
        : movieCredits.cast || []

    const seen = new Set()
    return movies
      .map(toMovieCardItem)
      .filter((movie) => {
        if (seen.has(movie.id)) return false
        seen.add(movie.id)
        return true
      })
      .sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''))
  }, [movieCredits, role])

  const moviesSectionTitle =
    role === 'director' ? '參與執導的電影' : '參與演出的電影'

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <GrainOverlay />

      <div className="relative z-10 px-5 pb-16 pt-8 sm:px-8 md:px-10">
        {loading && <LoadingState message="載入人物資料中…" className="py-24" />}

        {!loading && !personId && <ErrorState message="找不到人物 ID" />}

        {!loading && error && <ErrorState message={error} />}

        {!loading && !error && person && (
          <>
            <header className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
              {profileUrl ? (
                <img
                  src={profileUrl}
                  alt={person.name ? `${person.name} 照片` : '人物照片'}
                  className="w-48 shrink-0 rounded-xl object-cover shadow-2xl shadow-black/60 ring-1 ring-white/10 sm:w-52"
                />
              ) : (
                <div className="flex h-72 w-48 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-sm text-zinc-500 ring-1 ring-white/10 sm:w-52">
                  無照片
                </div>
              )}

              <div className="min-w-0 flex-1 text-left">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.35em] text-amber-400/90">
                  {role === 'director' ? 'Director' : 'Actor'}
                </p>
                <div className="mb-4">
                  <h1 className="m-0 text-3xl font-bold tracking-tight !text-white sm:text-4xl md:text-5xl">
                    {person.name}
                  </h1>
                  {person.alternateName && (
                    <p className="mt-1 text-base text-zinc-400 sm:text-lg">
                      {person.alternateName}
                    </p>
                  )}
                </div>

                {hasText(person.biography) && (
                  <BiographyText key={personId} text={person.biography} />
                )}

                {detailFields.length > 0 && (
                  <dl className="space-y-2 rounded-xl border border-white/10 bg-zinc-900/40 p-4 text-sm backdrop-blur-sm">
                    {detailFields.map((field) => (
                      <div key={field.label} className="flex flex-wrap gap-x-2">
                        <dt className="shrink-0 text-zinc-500">{field.label}</dt>
                        <dd className="text-zinc-200">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </header>

            <section className="mt-14 text-left">
              <SectionTitle
                aside={
                  uniqueMovies.length > 0 && (
                    <span className="text-sm text-zinc-500">{uniqueMovies.length} 部</span>
                  )
                }
              >
                {moviesSectionTitle}
              </SectionTitle>

              {uniqueMovies.length === 0 ? (
                <p className="py-12 text-center text-zinc-500">目前沒有可顯示的電影。</p>
              ) : (
                <MovieGrid>
                  {uniqueMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} returnTo={personReturnTo} />
                  ))}
                </MovieGrid>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

export default Person
