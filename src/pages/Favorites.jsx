import { useState } from 'react'
import { Link } from 'react-router-dom'
import MovieCard from '../components/MovieCard.jsx'
import { LoadingState, MovieGrid } from '../components/PageStatus.jsx'
import { useAuth } from '../contexts/useAuth.js'
import { useMovieList } from '../hooks/useMovieList'

const pillLinkClass =
  'inline-flex rounded-full border border-amber-500/40 bg-amber-500/15 px-5 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/25'

const smallBtnClass =
  'rounded-full border border-amber-500/40 px-3.5 py-1.5 text-sm font-medium text-amber-200 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60'

function toMovieCardProps(item) {
  return {
    id: item.movieId ?? Number(item.id),
    title: item.title,
    poster_path: item.poster_path,
    vote_average: item.vote_average,
    vote_count: item.vote_count,
  }
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 px-6 py-10 text-left">
      <p className="mb-4 text-zinc-300">{message}</p>
      <Link to="/discover" className={pillLinkClass}>
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

      {items.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <MovieGrid>
          {items.map((item) => (
            <MovieCard
              key={item.movieId ?? item.id}
              movie={toMovieCardProps(item)}
              returnTo="/favorites"
            />
          ))}
        </MovieGrid>
      )}
    </section>
  )
}

/** Email 註冊但尚未點驗證信時顯示；不限制任何功能，只提醒 */
function VerifyEmailBanner({ email }) {
  const { resendVerificationEmail, reloadUser } = useAuth()
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  const run = async (action, task, successMessage) => {
    setBusy(action)
    setMessage(null)
    try {
      await task()
      if (successMessage) setMessage({ type: 'ok', text: successMessage })
    } catch (e) {
      setMessage({
        type: 'error',
        text:
          e?.code === 'auth/too-many-requests'
            ? '寄送次數過多，請稍後再試。'
            : e?.message || '操作失敗，請稍後再試。',
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      className="mb-10 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-left"
      role="status"
    >
      <p className="text-sm text-amber-100">
        你的信箱 <span className="font-medium">{email}</span> 尚未驗證。
        請到信箱點擊驗證連結，完成後按「我已完成驗證」。
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={smallBtnClass}
          disabled={busy != null}
          onClick={() =>
            run('resend', resendVerificationEmail, '驗證信已重新寄出，請到信箱收信。')
          }
        >
          {busy === 'resend' ? '寄送中…' : '重寄驗證信'}
        </button>
        <button
          type="button"
          className={smallBtnClass}
          disabled={busy != null}
          onClick={() =>
            run('reload', reloadUser, '尚未偵測到驗證，請確認已點擊信中的連結。')
          }
        >
          {busy === 'reload' ? '確認中…' : '我已完成驗證'}
        </button>
      </div>
      {message && (
        <p
          className={`mt-2 text-sm ${message.type === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}
        >
          {message.text}
        </p>
      )}
    </div>
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
          <Link to="/login" state={{ from: '/favorites' }} className={pillLinkClass}>
            前往登入
          </Link>
        </div>
      )}

      {user && !user.emailVerified && <VerifyEmailBanner email={user.email} />}

      {loading && user && (
        <LoadingState message="載入清單中…" className="py-24" />
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
