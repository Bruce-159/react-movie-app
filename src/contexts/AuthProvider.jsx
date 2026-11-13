import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth } from '../firebase'
import { getSafeRedirectPath } from '../utils/navigation.js'
import { AuthContext, useAuth } from './useAuth.js'

const REDIRECT_FROM_KEY = 'authRedirectFrom'

/** 已登入的人停在 /login 時，導回登入前的頁面 */
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
  // user：正式登入的帳號。免登入試用的訪客（Firebase 匿名登入）放在 guest，
  // 不放進 user，所以收藏、我的電影、導覽列等功能仍把訪客當成未登入，只有 AI 推薦會用到 guest。
  const [user, setUser] = useState(null)
  const [guest, setGuest] = useState(null)
  const [loading, setLoading] = useState(true)
  // Firebase 的 user.reload() 會原地更新同一個物件，用版本號讓畫面重繪
  const [, setUserVersion] = useState(0)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const isGuest = Boolean(currentUser?.isAnonymous)
      setUser(isGuest ? null : currentUser)
      setGuest(isGuest ? currentUser : null)
      setLoading(false)
    })
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

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) return
    await sendEmailVerification(auth.currentUser)
  }

  /** 重新向 Firebase 取得使用者資料（例如確認信箱是否已驗證） */
  const reloadUser = async () => {
    if (!auth.currentUser) return
    await auth.currentUser.reload()
    setUserVersion((version) => version + 1)
  }

  const sendPasswordReset = (email) => sendPasswordResetEmail(auth, email)

  /** 免登入試用 AI 推薦：建立 Firebase 匿名帳號（之後正式登入會直接換成該帳號） */
  const signInAsGuest = async () => {
    if (auth.currentUser?.isAnonymous) return
    await signInAnonymously(auth)
  }

  const signOut = () => firebaseSignOut(auth)

  return (
    <AuthContext.Provider
      value={{
        user,
        guest,
        loading,
        signInAsGuest,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resendVerificationEmail,
        reloadUser,
        sendPasswordReset,
        signOut,
      }}
    >
      <AuthRedirectHandler />
      {children}
    </AuthContext.Provider>
  )
}
