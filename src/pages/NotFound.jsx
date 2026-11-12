import { Link, useLocation } from 'react-router-dom'
import { GrainOverlay } from '../components/PageStatus.jsx'

export default function NotFound() {
  const { pathname } = useLocation()

  return (
    <main className="relative min-h-[70vh] overflow-hidden bg-zinc-950 text-zinc-100">
      <GrainOverlay />

      <div className="relative z-10 flex flex-col items-start px-5 py-20 text-left sm:px-8 md:px-10">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.35em] text-amber-400/90">
          404 · Not Found
        </p>
        <h1 className="m-0 mb-4 text-4xl font-bold tracking-tight !text-white sm:text-5xl">
          找不到這個頁面
        </h1>
        <p className="mb-8 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          <code className="mr-1 break-all rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-300">
            {pathname}
          </code>
          不存在，可能是網址打錯，或頁面已經移除。
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/"
            className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
          >
            回首頁
          </Link>
          <Link
            to="/discover"
            className="rounded-full border border-amber-500/40 bg-amber-500/15 px-5 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/25"
          >
            去找電影
          </Link>
        </div>
      </div>
    </main>
  )
}
