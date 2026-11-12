/** 頁面背景的電影感顆粒紋理 */
export function GrainOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
      aria-hidden="true"
      style={{
        backgroundImage:
          'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
      }}
    />
  )
}

/** 置中的載入圈與說明文字 */
export function LoadingState({ message = '載入中…', className = 'py-20' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500"
        role="status"
        aria-label="載入中"
      />
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  )
}

export function ErrorState({ message, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-red-500/30 bg-red-950/40 px-5 py-4 text-red-300 ${className}`}
      role="alert"
    >
      {message}
    </div>
  )
}

/** 區塊標題：左側琥珀色直條＋右側漸層線 */
export function SectionTitle({ children, aside, className = 'mb-8' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="h-7 w-1 rounded-full bg-amber-500" aria-hidden="true" />
      <h2 className="m-0 text-xl font-semibold tracking-tight !text-white sm:text-2xl">
        {children}
      </h2>
      <div className="h-px flex-1 bg-gradient-to-r from-zinc-700/80 to-transparent" />
      {aside}
    </div>
  )
}

/** 電影海報網格 */
export function MovieGrid({ children }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5">
      {children}
    </div>
  )
}
