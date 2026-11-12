import { Readable } from 'node:stream'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * 本機開發時讓 `npm run dev` 也能呼叫 `api/` 底下的 Vercel Functions，
 * 不必安裝 Vercel CLI。只處理檔案匯出的 Web 標準 handler（GET、POST…）。
 */
function vercelApiDevServer() {
  return {
    name: 'vercel-api-dev-server',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        const pathname = new URL(req.url, 'http://localhost').pathname
        // 底線開頭的檔案（例如 api/_lib）在 Vercel 上不會成為路由
        if (!/^\/[a-z0-9-]+$/i.test(pathname)) return next()

        let mod
        try {
          mod = await server.ssrLoadModule(`/api${pathname}.js`)
        } catch {
          return next()
        }

        const handler = mod[req.method]
        if (typeof handler !== 'function') {
          res.statusCode = 405
          return res.end()
        }

        try {
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
          const request = new Request(new URL(req.originalUrl ?? req.url, 'http://localhost'), {
            method: req.method,
            headers: req.headers,
            body: hasBody ? Readable.toWeb(req) : undefined,
            duplex: hasBody ? 'half' : undefined,
          })
          const response = await handler(request)
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          // 逐段轉送，讓串流回應（例如 AI 推薦）在本機也能邊產生邊顯示
          if (response.body) {
            const reader = response.body.getReader()
            for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
              res.write(chunk.value)
            }
          }
          res.end()
        } catch (error) {
          server.ssrFixStacktrace(error)
          next(error)
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // api/ 在伺服器端執行，需要把 .env 的值（包含沒有 VITE_ 前綴的）放進 process.env。
  // 改 .env 後 Vite 會重新載入設定，這時要用新值覆蓋舊值；
  // 但啟動前就存在的系統環境變數優先，不覆蓋。
  globalThis.__shellEnvKeys ??= new Set(Object.keys(process.env))
  // loadEnv 會把 process.env 現有的值也併進來，所以先清掉上一次從 .env 載入的值，
  // 這樣 .env 裡刪掉的變數才會真的消失
  for (const key of globalThis.__envFileKeys ?? []) delete process.env[key]
  const env = loadEnv(mode, process.cwd(), '')
  globalThis.__envFileKeys = Object.keys(env).filter((key) => !globalThis.__shellEnvKeys.has(key))
  for (const key of globalThis.__envFileKeys) {
    process.env[key] = env[key]
  }

  return {
    plugins: [react(), tailwindcss(), vercelApiDevServer()],
    build: {
      rolldownOptions: {
        output: {
          // 第三方套件獨立成 chunk：改自己的程式碼時，使用者瀏覽器仍可沿用快取
          codeSplitting: {
            groups: [
              { name: 'firebase', test: /node_modules[\\/](firebase|@firebase)[\\/]/ },
              {
                name: 'react',
                test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
              },
            ],
          },
        },
      },
    },
  }
})
