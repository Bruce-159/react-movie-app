import { useEffect, useState } from 'react'
import MovieCard from './components/MovieCard.jsx'
import './App.css'

// 從環境變數讀取金鑰（.env 裡的 VITE_TMDB_API_KEY，勿把金鑰寫死在程式碼裡）
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

// 近期上映：TMDB 的「現正熱映」清單（依地區會略有不同）
// region=TW 表示以台灣上映狀態為參考；language=zh-TW 讓片名盡量為繁中
const NOW_PLAYING_URL = `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=zh-TW&region=TW&page=1`

// 首頁最多顯示幾部（需求：十部以內）
const MAX_MOVIES = 10

function App() {
  // 從 API 載入回來的電影陣列
  const [movies, setMovies] = useState([])
  // 載入中：避免第一次 render 就當成「沒資料」
  const [loading, setLoading] = useState(true)
  // 若 fetch 失敗或沒有金鑰，用字串記錄錯誤給使用者看
  const [error, setError] = useState(null)

  useEffect(() => {
    // 沒有金鑰就不要打 API，直接提示（避免無意義的 401）
    if (!API_KEY) {
      setError('缺少 VITE_TMDB_API_KEY，請檢查 .env')
      setLoading(false)
      return
    }

    let cancelled = false // 元件卸載後不再 setState，避免 React 警告

    async function loadMovies() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(NOW_PLAYING_URL)
        if (!res.ok) {
          throw new Error(`API 錯誤：${res.status}`)
        }
        const data = await res.json()
        const list = Array.isArray(data.results) ? data.results : []

        // 依「熱門程度」 popularity 由高到低排序，再只取前 MAX_MOVIES 部
        const sorted = [...list].sort(
          (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
        )
        const top = sorted.slice(0, MAX_MOVIES)

        if (!cancelled) {
          setMovies(top)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || '無法載入電影資料')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadMovies()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="home">
      <header className="home__header">
        <h1>電影資訊</h1>
        <p>近期上映（依熱門度排序，最多 {MAX_MOVIES} 部）</p>
      </header>

      {/* 依狀態顯示載入、錯誤或電影列表 */}
      {loading && <p className="home__status">載入中…</p>}
      {!loading && error && (
        <p className="home__status home__status--error">{error}</p>
      )}
      {!loading && !error && movies.length === 0 && (
        <p className="home__status">目前沒有可顯示的電影。</p>
      )}

      {!loading && !error && movies.length > 0 && (
        <section
          className="home__grid"
          aria-label="近期上映熱門電影列表"
        >
          {movies.map((movie) => (
            // key 必須穩定且唯一：TMDB 的電影 id 最適合
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </section>
      )}
    </main>
  )
}

export default App
