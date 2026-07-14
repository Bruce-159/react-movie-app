import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getSafeRedirectPath, useAuth } from '../contexts/AuthContext'

function getAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/invalid-email':
      return '電子郵件格式不正確。'
    case 'auth/user-disabled':
      return '此帳號已被停用。'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return '電子郵件或密碼錯誤。'
    case 'auth/email-already-in-use':
      return '此電子郵件已被註冊。'
    case 'auth/weak-password':
      return '密碼強度不足，請至少使用 6 個字元。'
    case 'auth/too-many-requests':
      return '嘗試次數過多，請稍後再試。'
    case 'auth/account-exists-with-different-credential':
      return '此電子郵件已使用其他登入方式註冊。'
    case 'auth/network-request-failed':
      return '網路連線失敗，請稍後再試。'
    case 'auth/unauthorized-domain':
      return '此網域尚未在 Firebase 授權，請聯絡管理員。'
    case 'auth/popup-blocked':
      return '瀏覽器封鎖了登入視窗，請允許此網站的彈出視窗後再試。'
    case 'auth/popup-closed-by-user':
      return '已取消 Google 登入。'
    default:
      return error?.message || '操作失敗，請稍後再試。'
  }
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 transition focus:border-amber-500/40 focus:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-amber-500/30'

export default function Login() {
  const {
    loading,
    redirectError,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)

  const from = getSafeRedirectPath(location.state?.from)

  useEffect(() => {
    if (redirectError) {
      setError(getAuthErrorMessage(redirectError))
    }
  }, [redirectError])

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setError(null)
    setPassword('')
    setConfirmPassword('')
  }

  const handleEmailSubmit = async (event) => {
    event.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('請填寫電子郵件與密碼。')
      return
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('兩次輸入的密碼不一致。')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signInWithEmail(trimmedEmail, password, from)
      } else {
        await signUpWithEmail(trimmedEmail, password, from)
      }
    } catch (e) {
      setError(getAuthErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setGoogleSubmitting(true)
    try {
      await signInWithGoogle(from)
      navigate(from, { replace: true })
    } catch (e) {
      setError(getAuthErrorMessage(e))
      setGoogleSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-5">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500"
          role="status"
          aria-label="載入中"
        />
      </main>
    )
  }

  const isBusy = submitting || googleSubmitting

  return (
    <main className="px-5 py-16 sm:px-8 md:px-10">
      <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-zinc-900/50 p-8 backdrop-blur-sm">
        <div className="text-center">
          <p className="mb-8 text-xs font-medium uppercase tracking-[0.35em] text-amber-400/90">
            {mode === 'login' ? 'Sign In' : 'Sign Up'}
          </p>
        </div>

        <form className="space-y-4 text-left" onSubmit={handleEmailSubmit} noValidate>
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm text-zinc-400">
              電子郵件
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className={inputClass}
              disabled={isBusy}
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm text-zinc-400">
              密碼
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="請輸入密碼"
              className={inputClass}
              disabled={isBusy}
            />
          </div>

          {mode === 'register' && (
            <div>
              <label
                htmlFor="login-confirm-password"
                className="mb-1.5 block text-sm text-zinc-400"
              >
                確認密碼
              </label>
              <input
                id="login-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="請再次輸入密碼"
                className={inputClass}
                disabled={isBusy}
              />
            </div>
          )}

          <div className="pt-6">
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex w-full items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15 px-5 py-3 text-sm font-medium text-amber-300 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? mode === 'login'
                  ? '登入中…'
                  : '註冊中…'
                : mode === 'login'
                  ? '登入'
                  : '註冊'}
            </button>
          </div>

          <div className="pt-6 text-center">
            <p className="m-0 text-sm text-zinc-500">
              {mode === 'login' ? (
                <>
                  還沒有帳號？{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="text-amber-300 underline decoration-amber-500/40 underline-offset-2 transition hover:text-amber-200"
                  >
                    註冊
                  </button>
                </>
              ) : (
                <>
                  已有帳號？{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-amber-300 underline decoration-amber-500/40 underline-offset-2 transition hover:text-amber-200"
                  >
                    登入
                  </button>
                </>
              )}
            </p>
          </div>
        </form>

        {error && (
          <p className="mt-4 text-center text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="my-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-700/80" />
          <span className="text-xs text-zinc-500">或</span>
          <div className="h-px flex-1 bg-zinc-700/80" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isBusy}
          className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white px-5 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleIcon />
          {googleSubmitting ? '前往 Google 登入…' : '使用 Google 登入'}
        </button>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
