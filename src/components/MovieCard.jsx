/**
 * MovieCard：單一電影的縮圖卡片，負責顯示海報與評分。
 * 父元件（首頁）把 TMDB 回傳的一筆 movie 物件傳進來即可。
 */

import { useNavigate } from 'react-router-dom'
import FavoriteButton from './FavoriteButton.jsx'

// TMDB 圖片 CDN 前綴；w342 是寬度約 342px 的海報尺寸（比原圖小、載入較快）
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'

/**
 * @param {object} props
 * @param {object} props.movie - TMDB /movie/now_playing 裡 results[] 的單一元素
 * @param {'default' | 'cinematic'} [props.variant] - 卡片視覺風格
 * @param {string} [props.returnTo] - 詳情頁返回時要還原的路徑（含查詢參數）
 * @param {boolean} [props.showRating=true] - 是否顯示評分
 */
export default function MovieCard({ movie, variant = 'default', returnTo, showRating = true }) {
  const navigate = useNavigate()

  const posterUrl = movie.poster_path
    ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
    : null

  const hasRating =
    typeof movie.vote_count === 'number' &&
    movie.vote_count >= 10 &&
    typeof movie.vote_average === 'number'

  const rating = hasRating ? movie.vote_average.toFixed(1) : null

  const goToDetail = () => {
    navigate(`/movie/${movie.id}`, returnTo ? { state: { from: returnTo } } : undefined)
  }

  if (variant === 'cinematic') {
    return (
      <div className="group relative w-full">
        <button
          type="button"
          className="relative w-full overflow-hidden rounded-lg bg-zinc-900/60 text-left ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:ring-amber-500/40 hover:shadow-2xl hover:shadow-amber-950/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          aria-label={`查看電影：${movie.title}`}
          onClick={goToDetail}
        >
        <div className="relative aspect-[2/3] overflow-hidden bg-zinc-800">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={movie.title || '電影海報'}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-sm text-zinc-500">
              無海報
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {showRating && hasRating && (
            <span className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-medium text-amber-300 backdrop-blur-sm">
              ★ {rating}
            </span>
          )}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-zinc-100 transition group-hover:text-amber-50">
            {movie.title}
          </h3>
        </div>
        </button>
        <FavoriteButton
          movie={movie}
          variant="card"
          className="absolute left-2 top-2 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
        />
      </div>
    )
  }

  return (
    <div className="group relative">
      <button
        type="button"
        className="movie-card movie-card--btn"
        aria-label={`查看電影：${movie.title}`}
        onClick={goToDetail}
      >
      <div className="movie-card__poster">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={movie.title || '電影海報'}
            loading="lazy"
          />
        ) : (
          <span className="movie-card__no-poster">無海報</span>
        )}
      </div>

      <div className="movie-card__meta">
        <h3 className="movie-card__title">{movie.title}</h3>
        {showRating && hasRating && (
          <p className="movie-card__rating">評分：{rating} / 10</p>
        )}
      </div>
      </button>
      <FavoriteButton
        movie={movie}
        variant="card"
        className="absolute left-2 top-2 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
      />
    </div>
  )
}
