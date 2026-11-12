import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import { LoadingState } from './components/PageStatus.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import { AuthProvider } from './contexts/AuthProvider.jsx'

// 各頁面依路由按需載入，首次進站只下載當前頁面的程式碼
const Home = lazy(() => import('./pages/home.jsx'))
const Discover = lazy(() => import('./pages/discover.jsx'))
const DiscoverTaiwan = lazy(() => import('./pages/discoverTaiwan.jsx'))
const Favorites = lazy(() => import('./pages/Favorites.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const MovieDetail = lazy(() => import('./pages/MovieDetail.jsx'))
const Person = lazy(() => import('./pages/person.jsx'))
const SearchResults = lazy(() => import('./pages/SearchResults.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Navbar />

      <div className="mx-auto w-full max-w-[1126px]">
        <Suspense fallback={<LoadingState className="py-32" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/discover/taiwan" element={<DiscoverTaiwan />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/login" element={<Login />} />
            <Route path="/movie/:movieId" element={<MovieDetail />} />
            <Route path="/person/:personId" element={<Person />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </AuthProvider>
  )
}

export default App
