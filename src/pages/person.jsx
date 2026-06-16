import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'

const API_KEY = import.meta.env.VITE_TMDB_API_KEY

const TMDB_IMAGE_PROFILE_BASE = 'https://image.tmdb.org/t/p/w342'

const GRAIN_STYLE = {
  backgroundImage:
    'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
}

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

function BiographyText({ text }) {
  const [expanded, setExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)
  const textRef = useRef(null)

  useEffect(() => {
    setExpanded(false)
  }, [text])

  useEffect(() => {
    const el = textRef.current
    if (!el || expanded) return

    const checkOverflow = () => {
      setCanExpand(el.scrollHeight > el.clientHeight + 1)
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
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

  const [personEn, setPersonEn] = useState(null)
  const [personZhTw, setPersonZhTw] = useState(null)
  const [movieCredits, setMovieCredits] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const person = useMemo(() => {
    if (!personEn) return null
    return resolvePersonDisplay(personEn, personZhTw)
  }, [personEn, personZhTw])

  const profileUrl = useMemo(() => {
    if (!person?.profile_path) return null
    return `${TMDB_IMAGE_PROFILE_BASE}${person.profile_path}`
  }, [person])

  const personInfo = useMemo(() => {
    if (!person) return []

    const items = []

    if (hasText(person.biography)) {
      items.push({ type: 'biography', label: '簡介', value: person.biography.trim() })
    }
    if (hasText(person.birthday)) {
      items.push({ type: 'field', label: '生日', value: formatDate(person.birthday) })
    }
    if (hasText(person.deathday)) {
      items.push({ type: 'field', label: '忌日', value: formatDate(person.deathday) })
    }
    if (hasText(person.place_of_birth)) {
      items.push({ type: 'field', label: '出生地', value: person.place_of_birth.trim() })
    }

    return items
  }, [person])

  const movies = useMemo(() => {
    if (!movieCredits) return []

    if (role === 'director') {
      return (movieCredits.crew || [])
        .filter((item) => item.job === 'Director')
        .map(toMovieCardItem)
    }

    return (movieCredits.cast || []).map(toMovieCardItem)
  }, [movieCredits, role])

  const uniqueMovies = useMemo(() => {
    const seen = new Set()
    const list = movies.filter((movie) => {
      if (seen.has(movie.id)) return false
      seen.add(movie.id)
      return true
    })

    return list.sort((a, b) => {
      const dateA = a.release_date || ''
      const dateB = b.release_date || ''
      return dateB.localeCompare(dateA)
    })
  }, [movies])

  useEffect(() => {
    if (!API_KEY) {
      setError('缺少 VITE_TMDB_API_KEY，請檢查 .env')
      setLoading(false)
      return
    }
    if (!personId) {
      setError('找不到人物 ID')
      setLoading(false)
      return
    }

    let cancelled = false

    async function loadPerson() {
      setLoading(true)
      setError(null)
      setPersonEn(null)
      setPersonZhTw(null)
      setMovieCredits(null)

      try {
        const personEnUrl = `https://api.themoviedb.org/3/person/${personId}?api_key=${API_KEY}&language=en-US`
        const personZhTwUrl = `https://api.themoviedb.org/3/person/${personId}?api_key=${API_KEY}&language=zh-TW`
        const creditsUrl = `https://api.themoviedb.org/3/person/${personId}/movie_credits?api_key=${API_KEY}&language=zh-TW`

        const [personEnRes, personZhTwRes, creditsRes] = await Promise.all([
          fetch(personEnUrl),
          fetch(personZhTwUrl),
          fetch(creditsUrl),
        ])

        if (!personEnRes.ok) throw new Error(`API 錯誤：${personEnRes.status}`)
        if (!personZhTwRes.ok) throw new Error(`API 錯誤：${personZhTwRes.status}`)
        if (!creditsRes.ok) throw new Error(`API 錯誤：${creditsRes.status}`)

        const [personEnData, personZhTwData, creditsData] = await Promise.all([
          personEnRes.json(),
          personZhTwRes.json(),
          creditsRes.json(),
        ])

        if (!cancelled) {
          setPersonEn(personEnData)
          setPersonZhTw(personZhTwData)
          setMovieCredits(creditsData)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || '無法載入人物資料')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPerson()
    return () => {
      cancelled = true
    }
  }, [personId])

  const moviesSectionTitle =
    role === 'director' ? '參與執導的電影' : '參與演出的電影'

  const biography = personInfo.find((item) => item.type === 'biography')
  const detailFields = personInfo.filter((item) => item.type === 'field')

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
        aria-hidden="true"
        style={GRAIN_STYLE}
      />

      <div className="relative z-10 px-5 pb-16 pt-8 sm:px-8 md:px-10">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-24">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500"
              role="status"
              aria-label="載入中"
            />
            <p className="text-sm text-zinc-500">載入人物資料中…</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 px-5 py-4 text-red-300">
            {error}
          </div>
        )}

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

                {biography && <BiographyText text={biography.value} />}

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
              <div className="mb-8 flex items-center gap-3">
                <span className="h-7 w-1 rounded-full bg-amber-500" aria-hidden="true" />
                <h2 className="m-0 text-xl font-semibold tracking-tight !text-white sm:text-2xl">
                  {moviesSectionTitle}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-zinc-700/80 to-transparent" />
                {uniqueMovies.length > 0 && (
                  <span className="text-sm text-zinc-500">{uniqueMovies.length} 部</span>
                )}
              </div>

              {uniqueMovies.length === 0 ? (
                <p className="py-12 text-center text-zinc-500">目前沒有可顯示的電影。</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
                  {uniqueMovies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      variant="cinematic"
                      returnTo={personReturnTo}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}

export default Person
