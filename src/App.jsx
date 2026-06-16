import { Navigate, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import Home from './pages/home.jsx'
import Discover from './pages/discover.jsx'
import DiscoverTaiwan from './pages/discoverTaiwan.jsx'
import Favorites from './pages/Favorites.jsx'
import Login from './pages/Login.jsx'
import MovieDetail from './pages/MovieDetail.jsx'
import Person from './pages/person.jsx'
import SearchResults from './pages/SearchResults.jsx'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Navbar />

      <div className="mx-auto w-full max-w-[1126px]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/discover/taiwan" element={<DiscoverTaiwan />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/login" element={<Login />} />
          <Route path="/movie/:movieId" element={<MovieDetail />} />
          <Route path="/person/:personId" element={<Person />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
