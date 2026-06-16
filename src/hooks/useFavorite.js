import { useCallback, useEffect, useState } from 'react'
import {
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase'

export function useFavorite(movieId, movieData) {
  const { user } = useAuth()
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    if (!user || !movieId) {
      setIsFavorite(false)
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const ref = doc(db, 'users', user.uid, 'favorites', String(movieId))
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setIsFavorite(snapshot.exists())
        setLoading(false)
      },
      () => {
        setIsFavorite(false)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [user, movieId])

  const toggleFavorite = useCallback(async () => {
    if (!user || !movieId) return

    setToggling(true)
    try {
      const ref = doc(db, 'users', user.uid, 'favorites', String(movieId))

      if (isFavorite) {
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
    } finally {
      setToggling(false)
    }
  }, [user, movieId, isFavorite, movieData])

  return { isFavorite, loading, toggling, toggleFavorite }
}
