import { useCallback, useEffect, useRef, useState } from 'react'
import { AI_MAX_TURNS } from '../lib/aiRecommendOptions.js'

const CACHE_PREFIX = 'cinescope:aiRecs:v3:'
/** 最多帶多少個已推薦／不感興趣的 ID 給後端排除 */
const MAX_EXCLUDE_IDS = 200

/**
 * 一次 AI 推薦對話的狀態，會存在 localStorage，重新整理後還在。
 * @typedef {object} RecommendSession
 * @property {string[]} requests - 使用者說過的話（第一句是主要需求，之後是微調）
 * @property {object} plan - 後端回傳的推薦條件（AI 理解為），見 api/_lib/plan.js
 * @property {string} intro - AI 選片人的開場白
 * @property {object[]} picks - 目前顯示的推薦
 * @property {{ id: number, title: string }[]} dislikes - 這次對話中標記不感興趣的片
 * @property {boolean} useLists - 是否參考使用者的清單
 */

function readCache(uid) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + uid)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(uid, session) {
  try {
    localStorage.setItem(CACHE_PREFIX + uid, JSON.stringify(session))
  } catch {
    // 無痕模式或空間不足時略過快取，不影響功能
  }
}

/** Firestore 清單項目 → API 需要的最小欄位 */
function toApiItem(item) {
  return { movieId: item.movieId ?? Number(item.id), title: item.title }
}

/**
 * AI 推薦對話：提出需求、微調、刪除條件、多推像某部的、不感興趣、再推薦一批。
 * @param {import('firebase/auth').User | null} user
 * @param {{ liked: object[], watchlist: object[] }} lists - 使用者的喜愛與收藏
 */
export function useAiRecommendations(user, { liked, watchlist }) {
  const uid = user?.uid ?? null
  // 首次渲染時讀一次快取；換帳號時頁面會以新的 key 重建這個元件
  const [session, setSession] = useState(() => (uid ? readCache(uid) : null))
  const [status, setStatus] = useState('idle') // idle | loading | loadingMore | error
  const [error, setError] = useState(null)
  /** 串流進行中的畫面狀態（結構同 session，picks 會逐部出現）；沒有請求時為 null */
  const [live, setLive] = useState(null)
  /** 後端回報的進度：每一步為 'skip' | 'pending' | 'active' | 'done' */
  const [progress, setProgress] = useState(null)
  /** 同一時間只允許一個請求；按鈕停用要等下一次渲染，連點時靠這個擋住 */
  const inFlight = useRef(false)
  /** 今天的用量：{ unlimited, used, limit, remaining }；還沒查到時為 null */
  const [usage, setUsage] = useState(null)

  // 進頁面時查一次今天還剩幾次
  useEffect(() => {
    if (!user) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch('/api/recommend', { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok && !cancelled) setUsage(await res.json())
      } catch {
        // 查不到就不顯示次數，送出推薦時後端仍會把關
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const save = useCallback(
    (next) => {
      setSession(next)
      if (uid) writeCache(uid, next)
    },
    [uid],
  )

  /**
   * 送出推薦請求。
   * @param {object} req
   * @param {string[]} req.requests
   * @param {boolean} req.parse
   * @param {object | null} req.plan
   * @param {object} [req.chips]
   * @param {boolean} req.useLists
   * @param {{ id: number, title: string }[]} req.dislikes
   * @param {object[]} req.keep - 要保留在畫面上的推薦（再推薦一批時為目前片單）
   * @param {number[]} req.excludeIds
   * @returns {Promise<number | null>} 這次新增的推薦數；失敗或已有請求進行中時為 null
   */
  const send = useCallback(
    async ({ requests, parse, plan, chips, useLists, dislikes, keep, excludeIds }) => {
      if (!user || inFlight.current) return null
      inFlight.current = true
      const append = keep.length > 0
      const keepIds = new Set(keep.map((m) => m.id))
      const intro = append && session?.intro ? session.intro : ''
      setStatus(append ? 'loadingMore' : 'loading')
      setError(null)
      // 需要重新拆解需求時先不顯示舊條件，等後端回傳新的 plan
      setLive({ requests, plan: parse ? null : plan, intro, picks: keep, dislikes, useLists })
      setProgress({
        parse: parse ? 'active' : 'skip',
        candidates: parse ? 'pending' : 'active',
        candidateCount: null,
        pick: 'pending',
      })

      /** 處理一個串流事件；回傳最終結果（done 事件）或 null */
      const handleEvent = (event) => {
        switch (event.type) {
          case 'status':
            setProgress((p) => ({
              ...p,
              ...(event.step === 'candidates' && { parse: p.parse === 'skip' ? 'skip' : 'done' }),
              [event.step]: 'active',
            }))
            return null
          case 'plan':
            setLive((l) => ({ ...l, plan: event.plan }))
            return null
          case 'usage':
            setUsage(event.usage)
            return null
          case 'candidates':
            setProgress((p) => ({ ...p, candidates: 'done', candidateCount: event.count }))
            return null
          case 'intro':
            if (!append) setLive((l) => ({ ...l, intro: event.text }))
            return null
          case 'pick':
            if (keepIds.has(event.pick.id)) return null
            setLive((l) => {
              const picks = [...l.picks]
              picks[keep.length + event.index] = { ...event.pick, streaming: !event.done }
              return { ...l, picks }
            })
            return null
          case 'error':
            throw new Error(event.error)
          case 'done':
            return event
          default:
            return null
        }
      }

      try {
        const token = await user.getIdToken()
        const res = await fetch('/api/recommend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            requests,
            parse,
            plan,
            chips,
            // 使用者關掉「參考我的清單」時，清單完全不送到後端
            ...(useLists && {
              liked: liked.map(toApiItem),
              watchlist: watchlist.map(toApiItem),
            }),
            excludeIds: [...new Set(excludeIds)].slice(-MAX_EXCLUDE_IDS),
            dislikedTitles: dislikes.map((d) => d.title),
          }),
        })
        // 登入、格式等錯誤在串流開始前就會以一般 JSON 回傳
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null)
          if (data?.usage) setUsage(data.usage)
          throw new Error(data?.error || `推薦失敗（${res.status}）`)
        }

        // 讀 NDJSON：每收到完整的一行就處理一個事件
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let final = null
        for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
          buffer += decoder.decode(chunk.value, { stream: true })
          let newline = buffer.indexOf('\n')
          while (newline >= 0) {
            const line = buffer.slice(0, newline).trim()
            buffer = buffer.slice(newline + 1)
            if (line) final = handleEvent(JSON.parse(line)) ?? final
            newline = buffer.indexOf('\n')
          }
        }
        if (!final) throw new Error('連線中斷，請再試一次。')

        save({
          requests,
          plan: final.plan,
          intro: append ? intro : final.intro,
          picks: [...keep, ...final.picks.filter((m) => !keepIds.has(m.id))],
          dislikes,
          useLists,
          createdAt: Date.now(),
        })
        setStatus('idle')
        return final.picks.length
      } catch (e) {
        setError(e?.message || '推薦失敗，請稍後再試。')
        setStatus('error')
        // 失敗不代表「沒有更多片」，回傳 null 讓畫面只顯示錯誤訊息
        return null
      } finally {
        inFlight.current = false
        setLive(null)
        setProgress(null)
      }
    },
    [user, liked, watchlist, save, session],
  )

  /** 已推薦過與不感興趣的片，換一批時都要排除 */
  const seenIds = () => [
    ...(session?.picks ?? []).map((m) => m.id),
    ...(session?.dislikes ?? []).map((d) => d.id),
  ]

  /** 開始新的推薦：一句話需求（可空）＋條件標籤 */
  const ask = ({ text, chips, useLists }) => {
    const trimmed = text.trim()
    return send({
      requests: trimmed ? [trimmed] : [],
      parse: Boolean(trimmed),
      plan: null,
      chips,
      useLists,
      dislikes: [],
      keep: [],
      excludeIds: [],
    })
  }

  /** 對目前的推薦再提要求，例如「更輕鬆一點」 */
  const refine = (text) => {
    if (!session) return
    return send({
      requests: [...session.requests, text.trim()].slice(-AI_MAX_TURNS),
      parse: true,
      plan: session.plan,
      useLists: session.useLists,
      dislikes: session.dislikes,
      keep: [],
      excludeIds: seenIds(),
    })
  }

  /** 使用者刪掉某個「AI 理解為」標籤後，用修改過的條件重新推薦 */
  const updatePlan = (plan) => {
    if (!session) return
    return send({
      requests: session.requests,
      parse: false,
      plan,
      useLists: session.useLists,
      dislikes: session.dislikes,
      keep: [],
      excludeIds: seenIds(),
    })
  }

  /** 以某部推薦片為參考，推薦更多相似的 */
  const moreLike = (movie) => {
    if (!session) return
    return send({
      requests: [...session.requests, `多推薦像《${movie.title}》的片`].slice(-AI_MAX_TURNS),
      parse: false,
      plan: { ...session.plan, references: [{ id: movie.id, title: movie.title }] },
      useLists: session.useLists,
      dislikes: session.dislikes,
      keep: [],
      excludeIds: seenIds(),
    })
  }

  /** 不感興趣：從片單移除，之後的推薦也會避開相近風格 */
  const dislike = (movie) => {
    if (!session) return
    save({
      ...session,
      picks: session.picks.filter((m) => m.id !== movie.id),
      dislikes: [...session.dislikes, { id: movie.id, title: movie.title }],
    })
  }

  /** 同樣的條件再推薦一批，接在目前片單後面 */
  const loadMore = () => {
    if (!session) return
    return send({
      requests: session.requests,
      parse: false,
      plan: session.plan,
      useLists: session.useLists,
      dislikes: session.dislikes,
      keep: session.picks,
      excludeIds: seenIds(),
    })
  }

  return {
    /** 要顯示的內容：串流中顯示即時結果，否則顯示上一次完成的推薦 */
    view: live ?? session,
    status,
    error,
    progress,
    usage,
    ask,
    refine,
    updatePlan,
    moreLike,
    dislike,
    loadMore,
  }
}
