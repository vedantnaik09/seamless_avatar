import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Generator from './pages/Generator'
import Landing from './pages/Landing'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/generator" element={<Generator />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
