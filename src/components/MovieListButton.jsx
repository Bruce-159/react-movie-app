import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMovieListItem } from '../hooks/useMovieList'

const LIST_CONFIG = {
  favorites: {
    activeLabel: '從收藏移除',
    inactiveLabel: '加入收藏',
    detailActive: '已收藏',
    detailInactive: '加入收藏',
  },
  likes: {
    activeLabel: '從喜愛移除',
    inactiveLabel: '加入喜愛',
    detailActive: '已喜愛',
    detailInactive: '加入喜愛',
  },
}

/**
 * @param {object} props
 * @param {object} props.movie
 * @param {'favorites' | 'likes'} props.listType
 * @param {'card' | 'detail'} [props.variant='card']
 * @param {string} [props.className]
 */
export default function MovieListButton({
  movie,
  listType,
  variant = 'card',
  className = '',
}) {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { isActive, loading, toggling, toggle, error } = useMovieListItem(
    listType,
    movie?.id,
    movie,
  )

  const config = LIST_CONFIG[listType]
  const Icon = listType === 'likes' ? HeartIcon : BookmarkIcon

  const handleClick = async (event) => {
    event.stopPropagation()
    event.preventDefault()

    if (authLoading) return

    if (!user) {
      navigate('/login', {
        state: { from: location.pathname + location.search },
      })
      return
    }

    try {
      await toggle()
    } catch {
      // 錯誤訊息由 hook 的 error 狀態顯示
    }
  }

  const isDisabled = authLoading || loading || toggling
  const label = isActive ? config.activeLabel : config.inactiveLabel

  const baseClass =
    variant === 'detail'
      ? 'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-50'
      : 'flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:cursor-not-allowed disabled:opacity-50'

  const stateClass =
    variant === 'detail'
      ? isActive
        ? listType === 'likes'
          ? 'border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
          : 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
        : 'border-white/15 bg-zinc-900/60 text-zinc-200 hover:border-amber-500/30 hover:text-amber-200'
      : isActive
        ? listType === 'likes'
          ? 'bg-rose-500/90 text-white hover:bg-rose-400'
          : 'bg-amber-500/90 text-zinc-950 hover:bg-amber-400'
        : 'bg-black/60 text-zinc-200 hover:bg-black/80 hover:text-amber-200'

  if (variant === 'detail') {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          className={`${baseClass} ${stateClass} ${className}`}
          aria-label={label}
          aria-pressed={isActive}
          disabled={isDisabled}
          onClick={handleClick}
          title={error || undefined}
        >
          <Icon filled={isActive} className="h-4 w-4" />
          <span>{isActive ? config.detailActive : config.detailInactive}</span>
        </button>
        {error && (
          <p className="max-w-xs text-left text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={`${baseClass} ${stateClass} ${className}`}
      aria-label={error ? `${label}（${error}）` : label}
      aria-pressed={isActive}
      disabled={isDisabled}
      onClick={handleClick}
      title={error || label}
    >
      <Icon filled={isActive} className="h-4 w-4" />
    </button>
  )
}

function HeartIcon({ filled, className }) {
  if (filled) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
      </svg>
    )
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  )
}

function BookmarkIcon({ filled, className }) {
  if (filled) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z"
          clipRule="evenodd"
        />
      </svg>
    )
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
      />
    </svg>
  )
}
