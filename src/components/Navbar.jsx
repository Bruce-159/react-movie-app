import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth.js'

const NAV_LINKS = [
  { to: '/', label: '熱播電影', end: true },
  { to: '/discover', label: '找電影', end: true },
  { to: '/discover/taiwan', label: '找國片' },
  { to: '/favorites', label: '我的電影' },
]

const desktopLinkClass = ({ isActive }) =>
  [
    'rounded-full px-4 py-2 text-sm font-medium transition',
    isActive
      ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100',
  ].join(' ')

const mobileLinkClass = ({ isActive }) =>
  [
    'block rounded-xl px-4 py-3 text-base font-medium transition',
    isActive
      ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
      : 'text-zinc-300 hover:bg-white/5 hover:text-zinc-100',
  ].join(' ')

/**
 * 導覽列搜尋框的值：跟著網址的 `q` 走，使用者打字時暫存草稿；
 * 網址的 q 一變（換頁、重新整理、上一頁），草稿就作廢，改顯示新的 q。
 */
function useSearchDraft(urlQuery) {
  const [draft, setDraft] = useState({ source: urlQuery, value: urlQuery })
  const value = draft.source === urlQuery ? draft.value : urlQuery
  const setValue = (nextValue) => setDraft({ source: urlQuery, value: nextValue })
  return [value, setValue]
}

function MenuIcon({ open }) {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <path d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  )
}

function UserBadge({ user, showAvatarClass, nameClass }) {
  return (
    <>
      {user.photoURL && (
        <img
          src={user.photoURL}
          alt=""
          className={`h-8 w-8 shrink-0 rounded-full ring-1 ring-white/10 ${showAvatarClass}`}
        />
      )}
      <span className={`truncate text-sm text-zinc-300 ${nameClass}`}>
        {user.displayName || user.email}
      </span>
    </>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { user, signOut } = useAuth()

  const urlQuery = location.pathname === '/search' ? (searchParams.get('q') ?? '') : ''
  const [searchQuery, setSearchQuery] = useSearchDraft(urlQuery)

  // 記下開啟選單時的 location.key；任何一次換頁 key 都會變，選單就自動收起
  const [menuOpenedAt, setMenuOpenedAt] = useState(null)
  const menuOpen = menuOpenedAt === location.key
  const closeMenu = () => setMenuOpenedAt(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpenedAt(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    const keyword = searchQuery.trim()
    if (!keyword) return
    navigate(`/search?q=${encodeURIComponent(keyword)}`)
  }

  const handleSignOut = () => {
    closeMenu()
    signOut()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/85 backdrop-blur-md">
      <nav
        className="mx-auto flex w-full max-w-[1126px] items-center justify-between gap-3 px-5 py-3.5 sm:px-8 md:px-10 lg:gap-4"
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
          className="min-w-0 flex-1 lg:max-w-sm lg:px-4"
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

        {/* 桌機版（≥1024px）：連結與帳號直接排在導覽列 */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={desktopLinkClass}>
              {link.label}
            </NavLink>
          ))}
          {user ? (
            <div className="ml-2 flex items-center gap-2">
              <UserBadge user={user} showAvatarClass="" nameClass="max-w-[8rem]" />
              <button
                type="button"
                onClick={handleSignOut}
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

        {/* 手機與平板：漢堡按鈕 */}
        <button
          type="button"
          onClick={() => (menuOpen ? closeMenu() : setMenuOpenedAt(location.key))}
          className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/5 hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 lg:hidden"
          aria-label={menuOpen ? '關閉選單' : '開啟選單'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          <MenuIcon open={menuOpen} />
        </button>
      </nav>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-white/10 bg-zinc-950/95 lg:hidden"
        >
          <div className="mx-auto w-full max-w-[1126px] space-y-1 px-5 py-4 sm:px-8 md:px-10">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={mobileLinkClass}>
                {link.label}
              </NavLink>
            ))}

            <div className="mt-3 border-t border-white/10 pt-4">
              {user ? (
                <div className="flex items-center gap-3 px-1">
                  <UserBadge user={user} showAvatarClass="" nameClass="min-w-0 flex-1" />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-zinc-300 ring-1 ring-white/10 transition hover:bg-white/5 hover:text-zinc-100"
                  >
                    登出
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="block rounded-full px-4 py-3 text-center text-base font-medium text-amber-300 ring-1 ring-amber-500/40 transition hover:bg-amber-500/15"
                >
                  登入
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
