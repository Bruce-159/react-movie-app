import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const linkClass = ({ isActive }) =>
  [
    'rounded-full px-4 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
  ].join(' ')

export default function Navbar() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    const keyword = searchQuery.trim()
    if (!keyword) return
    navigate(`/search?q=${encodeURIComponent(keyword)}`)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/85 backdrop-blur-md">
      <nav
        className="mx-auto flex w-full max-w-[1126px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8 md:px-10"
        aria-label="主要導覽"
      >
        <NavLink
          to="/"
          end
          className="group flex shrink-0 items-baseline gap-0.5 text-xl font-bold tracking-tight text-white no-underline"
        >
          <span className="text-amber-400 transition group-hover:text-amber-300">
            Cine
          </span>
          <span>Scope</span>
        </NavLink>

        <form
          className="min-w-0 flex-1 justify-center px-2 sm:px-4 sm:max-w-xs md:max-w-sm"
          role="search"
          onSubmit={handleSearchSubmit}
        >
          <label htmlFor="navbar-search" className="sr-only">
            搜尋電影
          </label>
          <input
            id="navbar-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜尋電影…"
            className="w-full rounded-full border border-white/10 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition focus:border-amber-500/40 focus:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
        </form>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <NavLink to="/" end className={linkClass}>
            熱播電影
          </NavLink>
          <NavLink to="/discover" end className={linkClass}>
            找電影
          </NavLink>
          <NavLink to="/discover/taiwan" className={linkClass}>
            找國片
          </NavLink>
          <NavLink to="/favorites" className={linkClass}>
            收藏
          </NavLink>
          {user ? (
            <div className="ml-1 flex items-center gap-2 sm:ml-2">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt=""
                  className="hidden h-8 w-8 rounded-full ring-1 ring-white/10 sm:block"
                />
              )}
              <span className="hidden max-w-[8rem] truncate text-sm text-zinc-300 md:inline">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-full px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100"
              >
                登出
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-amber-300 ring-1 ring-amber-500/40 transition hover:bg-amber-500/15"
            >
              登入
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
