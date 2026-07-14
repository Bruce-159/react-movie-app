import { Link } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import { useAuth } from '../contexts/AuthContext'
import { useMovieList } from '../hooks/useMovieList'

function toMovieCardProps(item) {
  return {
    id: item.movieId ?? Number(item.id),
    title: item.title,
    poster_path: item.poster_path,
    vote_average: item.vote_average,
    vote_count: item.vote_count,
  }
}

function MovieGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <MovieCard
          key={item.movieId ?? item.id}
          movie={toMovieCardProps(item)}
          variant="cinematic"
          returnTo="/favorites"
        />
      ))}
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 px-6 py-10 text-left">
      <p className="mb-4 text-zinc-300">{message}</p>
      <Link
        to="/discover"
        className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-5 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/25"
      >
        去探索電影
      </Link>
    </div>
  )
}

function ListSection({ title, subtitle, items, emptyMessage }) {
  return (
    <section className="text-left">
      <header className="mb-5">
        <h2 className="m-0 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1.5 text-sm text-zinc-400">{subtitle}</p>}
      </header>

      {items.length === 0 && <EmptyState message={emptyMessage} />}
      {items.length > 0 && <MovieGrid items={items} />}
    </section>
  )
}

export default function Favorites() {
  const { user, loading: authLoading } = useAuth()
  const { items: favorites, loading: favoritesLoading } =
    useMovieList('favorites')
  const { items: likes, loading: likesLoading } = useMovieList('likes')

  const listsLoading = Boolean(user) && (favoritesLoading || likesLoading)
  const loading = authLoading || listsLoading

  return (
    <main className="px-5 py-10 text-left sm:px-8 md:px-10">
      {!authLoading && !user && (
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 px-6 py-10 text-left">
          <p className="mb-4 text-zinc-300">
            登入後即可查看與管理你的收藏與喜愛清單。
          </p>
          <Link
            to="/login"
            state={{ from: '/favorites' }}
            className="inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-5 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/25"
          >
            前往登入
          </Link>
        </div>
      )}

      {loading && user && (
        <div className="flex flex-col items-start gap-4 py-24">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500"
            role="status"
            aria-label="載入中"
          />
          <p className="text-sm text-zinc-500">載入清單中…</p>
        </div>
      )}

      {!loading && user && (
        <div className="space-y-14">
          <ListSection
            title="我的收藏"
            subtitle="之後想看的電影會放在這裡。"
            items={favorites}
            emptyMessage="你還沒有收藏任何電影。"
          />
          <ListSection
            title="喜愛電影"
            subtitle="你標記為喜愛的電影會顯示在這裡。"
            items={likes}
            emptyMessage="你還沒有標記任何喜愛電影。"
          />
        </div>
      )}
    </main>
  )
}
