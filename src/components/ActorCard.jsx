import { Link } from 'react-router-dom'

const TMDB_PROFILE_BASE = 'https://image.tmdb.org/t/p/w185'

/**
 * @param {object} props
 * @param {object} props.actor - TMDB credits.cast 的單一演員資料
 * @param {'default' | 'cinematic'} [props.variant] - 卡片視覺風格
 */
export default function ActorCard({ actor, variant = 'default' }) {
  const photoUrl = actor.profile_path
    ? `${TMDB_PROFILE_BASE}${actor.profile_path}`
    : null

  if (variant === 'cinematic') {
    return (
      <Link
        to={`/person/${actor.id}?role=actor`}
        aria-label={`查看演員：${actor.name}`}
        className="group relative flex w-full flex-col overflow-hidden rounded-lg bg-zinc-900/60 text-center ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:ring-amber-500/40 hover:shadow-2xl hover:shadow-amber-950/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-zinc-800">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={actor.name}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-sm text-zinc-500">
              無照片
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>
        <div className="p-3">
          <span className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100 transition group-hover:text-amber-50">
            {actor.name}
          </span>
          {actor.character && (
            <span className="mt-1 block line-clamp-1 text-xs text-zinc-500">
              飾 {actor.character}
            </span>
          )}
        </div>
      </Link>
    )
  }

  return (
    <Link
      className="actor-card"
      to={`/person/${actor.id}?role=actor`}
      aria-label={`查看演員：${actor.name}`}
    >
      <span className="actor-card__name">{actor.name}</span>

      <div className="actor-card__photo">
        {photoUrl ? (
          <img src={photoUrl} alt={actor.name} loading="lazy" />
        ) : (
          <span className="actor-card__no-photo">無照片</span>
        )}
      </div>

      {actor.character && (
        <span className="actor-card__role">{actor.character}</span>
      )}
    </Link>
  )
}
