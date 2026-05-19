/**
 * MovieCard：單一電影的縮圖卡片，負責顯示海報與評分。
 * 父元件（首頁）把 TMDB 回傳的一筆 movie 物件傳進來即可。
 */

// TMDB 圖片 CDN 前綴；w342 是寬度約 342px 的海報尺寸（比原圖小、載入較快）
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w342'

/**
 * @param {object} props
 * @param {object} props.movie - TMDB /movie/now_playing 裡 results[] 的單一元素
 */
export default function MovieCard({ movie }) {
  // poster_path 有時為 null（沒有海報），要避開壞掉的圖片網址
  const posterUrl = movie.poster_path
    ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
    : null

  // vote_average 是 0～10 的分數；介面上習慣顯示「幾分」並保留一位小數
  const rating =
    typeof movie.vote_average === 'number'
      ? movie.vote_average.toFixed(1)
      : '—'

  return (
    <article className="movie-card">
      {/* 有海報就顯示圖片，沒有就顯示佔位文字 */}
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
        {/* title 已依 API 的 language=zh-TW 盡量為中文片名 */}
        <h3 className="movie-card__title">{movie.title}</h3>
        <p className="movie-card__rating">評分：{rating} / 10</p>
      </div>
    </article>
  )
}
