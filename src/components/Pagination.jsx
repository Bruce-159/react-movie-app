const pageBtnClass =
  'rounded-full border border-white/10 bg-zinc-900/60 px-5 py-2 text-sm font-medium text-zinc-300 transition hover:border-amber-500/30 hover:bg-zinc-800 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-40'

/**
 * 上一頁／下一頁分頁列，只有一頁時不顯示。
 * @param {object} props
 * @param {number} props.page
 * @param {number} props.totalPages
 * @param {(page: number) => void} props.onChange
 */
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const goTo = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return
    onChange(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav className="mt-12 flex items-center justify-center gap-4" aria-label="分頁導覽">
      <button
        type="button"
        className={pageBtnClass}
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
      >
        上一頁
      </button>
      <span className="text-sm text-zinc-500">
        第 {page} 頁，共 {totalPages} 頁
      </span>
      <button
        type="button"
        className={pageBtnClass}
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
      >
        下一頁
      </button>
    </nav>
  )
}
