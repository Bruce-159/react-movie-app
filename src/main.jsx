import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* BrowserRouter 提供前端路由能力，讓 App 內可使用 Routes/Route */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
