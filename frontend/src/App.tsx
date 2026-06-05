import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProfilePicker from './pages/ProfilePicker'
import WorkshopList from './pages/WorkshopList'
import WorkshopDetail from './pages/WorkshopDetail'

function App() {
  const hasProfile = Boolean(localStorage.getItem('profile'))

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={hasProfile ? <Navigate to="/workshops" replace /> : <ProfilePicker />} />
        <Route path="/profile" element={<ProfilePicker />} />
        <Route path="/workshops" element={<WorkshopList />} />
        <Route path="/workshops/:id" element={<WorkshopDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
