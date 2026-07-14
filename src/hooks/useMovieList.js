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
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase'

/** @typedef {'favorites' | 'likes'} MovieListName */

/**
 * 單一電影是否在指定清單中，並提供切換。
 * @param {MovieListName} listName
 */
export function useMovieListItem(listName, movieId, movieData) {
  const { user } = useAuth()
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user || !movieId) {
      setIsActive(false)
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const ref = doc(db, 'users', user.uid, listName, String(movieId))
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setIsActive(snapshot.exists())
        setLoading(false)
      },
      () => {
        setIsActive(false)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [user, movieId, listName])

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
          ? '沒有權限寫入此清單，請檢查 Firestore 規則是否已開放 likes。'
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
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setItems([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const listQuery = query(
      collection(db, 'users', user.uid, listName),
      orderBy('addedAt', 'desc'),
    )

    const unsubscribe = onSnapshot(
      listQuery,
      (snapshot) => {
        setItems(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })),
        )
        setLoading(false)
      },
      () => {
        setItems([])
        setLoading(false)
      },
    )

    return unsubscribe
  }, [user, listName])

  return { items, loading }
}
