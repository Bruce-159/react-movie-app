import { useCallback, useEffect, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { useAuth } from '../contexts/useAuth.js'
import { db } from '../firebase'

/** @typedef {'favorites' | 'likes'} MovieListName */

/*
 * 兩個 hook 都把「目前訂閱的對象」存成 key，畫面上的 loading 與資料
 * 由「最近一次快照是否屬於這個 key」推導，不在 effect 內同步 setState。
 */

/**
 * 單一電影是否在指定清單中，並提供切換。
 * @param {MovieListName} listName
 */
export function useMovieListItem(listName, movieId, movieData) {
  const { user } = useAuth()
  const key = user && movieId ? `${user.uid}/${listName}/${movieId}` : null

  const [snapshotState, setSnapshotState] = useState({ key: null, isActive: false })
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!key) return undefined

    const [uid, list, id] = key.split('/')
    const unsubscribe = onSnapshot(
      doc(db, 'users', uid, list, id),
      (snapshot) => setSnapshotState({ key, isActive: snapshot.exists() }),
      () => setSnapshotState({ key, isActive: false }),
    )
    return unsubscribe
  }, [key])

  const settled = key != null && snapshotState.key === key
  const isActive = settled && snapshotState.isActive
  const loading = key != null && !settled

  const toggle = useCallback(async () => {
    if (!user || !movieId) return

    setToggling(true)
    setError(null)
    try {
      const ref = doc(db, 'users', user.uid, listName, String(movieId))

      if (isActive) {
        await deleteDoc(ref)
      } else {
        await setDoc(ref, {
          movieId: Number(movieId),
          title: movieData?.title ?? '',
          poster_path: movieData?.poster_path ?? null,
          vote_average: movieData?.vote_average ?? null,
          vote_count: movieData?.vote_count ?? null,
          addedAt: serverTimestamp(),
        })
      }
    } catch (e) {
      const message =
        e?.code === 'permission-denied'
          ? '沒有權限寫入此清單，請確認 Firestore 規則已套用 repo 內的 firestore.rules。'
          : e?.message || '操作失敗，請稍後再試。'
      setError(message)
      throw e
    } finally {
      setToggling(false)
    }
  }, [user, movieId, isActive, movieData, listName])

  return { isActive, loading, toggling, toggle, error }
}

/**
 * 讀取使用者某清單的全部電影。
 * @param {MovieListName} listName
 */
export function useMovieList(listName) {
  const { user } = useAuth()
  const key = user ? `${user.uid}/${listName}` : null

  const [snapshotState, setSnapshotState] = useState({ key: null, items: [] })

  useEffect(() => {
    if (!key) return undefined

    const [uid, list] = key.split('/')
    const listQuery = query(
      collection(db, 'users', uid, list),
      orderBy('addedAt', 'desc'),
    )

    const unsubscribe = onSnapshot(
      listQuery,
      (snapshot) => {
        setSnapshotState({
          key,
          items: snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })),
        })
      },
      () => setSnapshotState({ key, items: [] }),
    )

    return unsubscribe
  }, [key])

  const settled = key != null && snapshotState.key === key
  return {
    items: settled ? snapshotState.items : [],
    loading: key != null && !settled,
  }
}
