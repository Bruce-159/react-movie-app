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

/** 只允許站內相對路徑，避免異常 navigate 造成空白頁 */
export function getSafeRedirectPath(raw) {
  if (!raw || typeof raw !== 'string') return '/'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  if (raw === '/login' || raw.startsWith('/login?') || raw.startsWith('/login#')) {
    return '/'
  }
  return raw
}

const AuthContext = createContext(null)

function AuthRedirectHandler() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (loading || !user || location.pathname !== '/login') return

    const savedFrom = getSafeRedirectPath(
      sessionStorage.getItem(REDIRECT_FROM_KEY),
    )
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
    sessionStorage.setItem(
      REDIRECT_FROM_KEY,
      getSafeRedirectPath(redirectTo),
    )
  }

  // 使用 popup：現代瀏覽器會阻擋第三方 cookie，signInWithRedirect
  // 在 localhost 常會立刻彈回登入頁且無法完成登入（Firebase 官方建議改用 popup）。
  const signInWithGoogle = async (redirectTo = '/') => {
    saveRedirectTo(redirectTo)
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
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
    return getSafeRedirectPath(path)
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
