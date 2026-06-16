import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase'

export function useFavorites() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setFavorites([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const favoritesQuery = query(
      collection(db, 'users', user.uid, 'favorites'),
      orderBy('addedAt', 'desc'),
    )

    const unsubscribe = onSnapshot(
      favoritesQuery,
      (snapshot) => {
        setFavorites(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          })),
        )
        setLoading(false)
      },
      () => {
        setFavorites([])
        setLoading(false)
      },
    )

    return unsubscribe
  }, [user])

  return { favorites, loading }
}
