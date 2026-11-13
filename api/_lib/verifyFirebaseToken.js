import { createRemoteJWKSet, jwtVerify } from 'jose'

// Firebase ID token 的公開金鑰（Google 會輪替，jose 會自動快取與更新）
// 參考：Firebase「使用第三方 JWT 函式庫驗證 ID token」
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
)

/**
 * 驗證前端送來的 Firebase ID token，成功時回傳使用者資料。
 * 只需要 project ID，不需要 service account 金鑰。
 * @param {string | null} authorizationHeader - `Bearer <token>`
 * @param {string} projectId
 * @returns {Promise<{ uid: string, email: string | null, emailVerified: boolean, isAnonymous: boolean }>}
 */
export async function verifyFirebaseToken(authorizationHeader, projectId) {
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader ?? '')
  if (!match) throw new Error('缺少登入憑證')

  const { payload } = await jwtVerify(match[1], FIREBASE_JWKS, {
    algorithms: ['RS256'],
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  })

  if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
    throw new Error('登入憑證缺少使用者 ID')
  }
  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : null,
    emailVerified: payload.email_verified === true,
    // 免登入試用的訪客（Firebase 匿名登入）
    isAnonymous: payload.firebase?.sign_in_provider === 'anonymous',
  }
}
