import { useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import BoxReveal, { type RevealStart } from './components/BoxReveal'
import GameNight from './components/GameNight'
import GamePage from './components/GamePage'
import Leaderboard from './components/Leaderboard'
import ShelfPage from './components/ShelfPage'
import { PlaysProvider } from './plays'

export default function App() {
  const navigate = useNavigate()
  const [reveal, setReveal] = useState<RevealStart | null>(null)

  return (
    <PlaysProvider>
      <Routes>
        <Route path="/" element={<ShelfPage pulledId={reveal?.game.bggId} onPull={setReveal} />} />
        <Route path="/game/:id" element={<GamePage />} />
        <Route path="/game-night" element={<GameNight pulledId={reveal?.game.bggId} onPull={setReveal} />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
      {reveal && (
        <BoxReveal
          key={reveal.game.bggId}
          start={reveal}
          onOpen={() => navigate(`/game/${reveal.game.bggId}`)}
          onDone={() => setReveal(null)}
        />
      )}
    </PlaysProvider>
  )
}
