import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
})
