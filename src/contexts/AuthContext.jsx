import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../firebase'

const REDIRECT_FROM_KEY = 'authRedirectFrom'

// React StrictMode 會 mount 兩次，redirect 結果只能取一次
let redirectResultPromise = null

function getRedirectResultOnce() {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth)
  }
  return redirectResultPromise
}

const AuthContext = createContext(null)

function AuthRedirectHandler() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (loading || !user || location.pathname !== '/login') return

    const savedFrom = sessionStorage.getItem(REDIRECT_FROM_KEY) || '/'
    sessionStorage.removeItem(REDIRECT_FROM_KEY)
    navigate(savedFrom, { replace: true })
  }, [user, loading, location.pathname, navigate])

  return null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [redirectError, setRedirectError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    getRedirectResultOnce()
      .then(() => setRedirectError(null))
      .catch((error) => setRedirectError(error))

    return unsubscribe
  }, [])

  const saveRedirectTo = (redirectTo = '/') => {
    sessionStorage.setItem(REDIRECT_FROM_KEY, redirectTo)
  }

  const signInWithGoogle = async (redirectTo = '/') => {
    saveRedirectTo(redirectTo)
    const provider = new GoogleAuthProvider()

    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      if (error.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, provider)
        return
      }
      throw error
    }
  }

  const signInWithEmail = async (email, password, redirectTo = '/') => {
    saveRedirectTo(redirectTo)
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUpWithEmail = async (email, password, redirectTo = '/') => {
    saveRedirectTo(redirectTo)
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await sendEmailVerification(credential.user)
  }

  const consumeRedirectFrom = useCallback(() => {
    const path = sessionStorage.getItem(REDIRECT_FROM_KEY)
    sessionStorage.removeItem(REDIRECT_FROM_KEY)
    return path
  }, [])

  const signOut = () => firebaseSignOut(auth)

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        redirectError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        consumeRedirectFrom,
        signOut,
      }}
    >
      <AuthRedirectHandler />
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
