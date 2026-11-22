import { useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { AuthProvider } from './auth'
import BoxReveal, { type RevealStart } from './components/BoxReveal'
import GameNight from './components/GameNight'
import GamePage from './components/GamePage'
import Home from './components/Home'
import Leaderboard from './components/Leaderboard'
import Library from './components/Library'
import Settings from './components/Settings'
import ShelfPage from './components/ShelfPage'

export default function App() {
  const navigate = useNavigate()
  const [reveal, setReveal] = useState<RevealStart | null>(null)
  const pull = { pulledId: reveal?.game.bggId, onPull: setReveal }

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/library" element={<Library />} />
        <Route path="/game/:id" element={<GamePage />} />
        <Route path="/u/:username" element={<ShelfPage {...pull} />} />
        <Route path="/u/:username/game-night" element={<GameNight {...pull} />} />
        <Route path="/u/:username/leaderboard" element={<Leaderboard />} />
        <Route path="/u/:username/game/:id" element={<GamePage />} />
      </Routes>
      {reveal && (
        <BoxReveal key={reveal.game.bggId} start={reveal} onOpen={() => navigate(reveal.to)} onDone={() => setReveal(null)} />
      )}
    </AuthProvider>
  )
}
