/** 只允許站內相對路徑，避免異常 navigate 造成空白頁或導向外站 */
export function isSafeInternalPath(raw) {
  return typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')
}

/** 登入後要導回的路徑；不安全或指向登入頁時回首頁 */
export function getSafeRedirectPath(raw) {
  if (!isSafeInternalPath(raw)) return '/'
  if (raw === '/login' || raw.startsWith('/login?') || raw.startsWith('/login#')) {
    return '/'
  }
  return raw
}

/** 依來源路徑決定返回連結的文字，順序有意義：較長的前綴放前面 */
const RETURN_LABELS = [
  { prefix: '/discover/taiwan', label: '返回找國片' },
  { prefix: '/discover', label: '返回找電影' },
  { prefix: '/search', label: '返回搜尋結果' },
  { prefix: '/favorites', label: '返回我的電影' },
  { prefix: '/person/', label: '返回人物頁' },
]

function matchesPrefix(path, prefix) {
  if (prefix.endsWith('/')) return path.startsWith(prefix)
  return path === prefix || path.startsWith(`${prefix}?`) || path.startsWith(`${prefix}/`)
}

/**
 * 依頁面帶來的 `state.from` 產生返回連結。
 * 沒有來源（直接打網址進來）時回首頁。
 * @param {unknown} rawFrom
 * @returns {{ to: string, label: string }}
 */
export function getReturnLink(rawFrom) {
  if (!isSafeInternalPath(rawFrom) || rawFrom === '/' || rawFrom.startsWith('/?')) {
    return {
      to: '/',
      label: isSafeInternalPath(rawFrom) ? '返回熱播電影' : '回首頁',
    }
  }

  const match = RETURN_LABELS.find(({ prefix }) => matchesPrefix(rawFrom, prefix))
  return { to: rawFrom, label: match?.label ?? '返回上一頁' }
}
