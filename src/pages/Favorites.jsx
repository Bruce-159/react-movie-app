import { Link } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import { useAuth } from '../contexts/AuthContext'
import { useFavorites } from '../hooks/useFavorites'

export default function Favorites() {
  const { user, loading: authLoading } = useAuth()
  const { favorites, loading: favoritesLoading } = useFavorites()

  const loading = authLoading || (user && favoritesLoading)

  return (
    <main className="px-5 py-10 sm:px-8 md:px-10">
      <header className="mb-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.35em] text-amber-400/90">
          My List
        </p>
        <h1 className="m-0 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          我的收藏
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          你收藏的電影會顯示在這裡。
        </p>
      </header>

      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500"
            role="status"
            aria-label="載入中"
          />
          <p className="text-sm text-zinc-500">載入收藏清單中…</p>
        </div>
      )}

      {!loading && !user && (
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 px-6 py-10 text-center">
          <p className="mb-4 text-zinc-300">登入後即可查看與管理你的收藏清單。</p>
          <Link
            to="/login"
            state={{ from: '/favorites' }}
            className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-5 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/25"
          >
            前往登入
          </Link>
        </div>
      )}

      {!loading && user && favorites.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 px-6 py-10 text-center">
          <p className="mb-4 text-zinc-300">你還沒有收藏任何電影。</p>
          <Link
            to="/discover"
            className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-5 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/25"
          >
            去探索電影
          </Link>
        </div>
      )}

      {!loading && user && favorites.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
          {favorites.map((favorite) => (
            <MovieCard
              key={favorite.movieId ?? favorite.id}
              movie={{
                id: favorite.movieId ?? Number(favorite.id),
                title: favorite.title,
                poster_path: favorite.poster_path,
                vote_average: favorite.vote_average,
                vote_count: favorite.vote_count,
              }}
              variant="cinematic"
              returnTo="/favorites"
            />
          ))}
        </div>
      )}
    </main>
  )
}
