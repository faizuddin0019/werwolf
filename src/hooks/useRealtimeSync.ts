'use client'

import { useEffect, useRef } from 'react'
import { useAtom } from 'jotai'
import { currentPlayerAtom, setGameDataAtom, resetGameAtom } from '@/lib/game-store'

// Fetch only the server-filtered view. Raw Supabase rows and subscription payloads
// contain secret roles and night actions, even when the UI does not display them.
export function useRealtimeSync(gameCode: string | null, onGameEnded?: () => void) {
  const [currentPlayer] = useAtom(currentPlayerAtom)
  const [, setGameData] = useAtom(setGameDataAtom)
  const [, resetGame] = useAtom(resetGameAtom)
  const onEndedRef = useRef(onGameEnded)
  onEndedRef.current = onGameEnded
  const clientId = currentPlayer?.client_id

  useEffect(() => {
    if (!gameCode || !clientId) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    let controller: AbortController | null = null

    const leaveGame = () => {
      for (const key of ['werwolf-game-state', 'werwolf-game-code', 'werwolf-player-name', 'werwolf-client-id']) {
        localStorage.removeItem(key)
      }
      resetGame()
      onEndedRef.current?.()
    }

    const refresh = async () => {
      controller = new AbortController()
      const timeout = setTimeout(() => controller?.abort(), 10000)
      try {
        const response = await fetch(`/api/games?code=${encodeURIComponent(gameCode)}`, {
          headers: { 'x-client-id': clientId },
          cache: 'no-store',
          signal: controller.signal,
        })
        if (stopped) return
        if (response.status === 401 || response.status === 404) {
          stopped = true
          leaveGame()
          return
        }
        if (response.ok) {
          const data = await response.json()
          if (stopped) return
          if (data.game.phase === 'ended' && !data.currentPlayer.is_host) {
            stopped = true
            leaveGame()
            return
          }
          setGameData(data)
        }
      } catch (error) {
        if (!stopped) console.error('Game refresh failed:', error)
      } finally {
        clearTimeout(timeout)
        if (!stopped) timer = setTimeout(refresh, 1000)
      }
    }

    refresh()
    return () => {
      stopped = true
      clearTimeout(timer)
      controller?.abort()
    }
  }, [gameCode, clientId, setGameData, resetGame])
}
