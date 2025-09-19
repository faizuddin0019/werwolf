'use client'

import { useEffect, useRef } from 'react'
import { useAtom, getDefaultStore } from 'jotai'
import { supabase, Game, Player, RoundState, Vote, LeaveRequest, isSupabaseConfigured } from '@/lib/supabase'
import { 
  gameAtom, 
  playersAtom, 
  roundStateAtom, 
  votesAtom,
  leaveRequestsAtom,
  currentPlayerAtom,
  setGameDataAtom,
  resetGameAtom
} from '@/lib/game-store'

export function useRealtimeSync(gameId: string | null, onGameEnded?: () => void) {
  const [game, setGame] = useAtom(gameAtom)
  const [players, setPlayers] = useAtom(playersAtom)
  const [roundState, setRoundState] = useAtom(roundStateAtom)
  const [votes, setVotes] = useAtom(votesAtom)
  const [leaveRequests, setLeaveRequests] = useAtom(leaveRequestsAtom)
  const [, setGameData] = useAtom(setGameDataAtom)
  const [, resetGame] = useAtom(resetGameAtom)
  
  const subscriptionRef = useRef<{
    game: any
    players: any
    roundState: any
    votes: any
    leaveRequests: any
  } | null>(null)

  useEffect(() => {
    if (!gameId || !isSupabaseConfigured() || !supabase) return

    // Subscribe to game changes
    const gameSubscription = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          console.log('Game updated:', payload.new)
          const updatedGame = payload.new as Game
          setGame(updatedGame)
          
          // If game ended, redirect to welcome page
          if (updatedGame.phase === 'ended') {
            // Clear localStorage
            localStorage.removeItem('werwolf-game-state')
            localStorage.removeItem('werwolf-game-code')
            localStorage.removeItem('werwolf-player-name')
            localStorage.removeItem('werwolf-client-id')
            
            // Reset game state
            resetGame()
            
            // Call the callback to redirect to welcome page
            if (onGameEnded) {
              onGameEnded()
            }
          }
        }
      )
      .subscribe()

    // Subscribe to player changes
    const playersSubscription = supabase
      .channel(`players:${gameId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        async () => {
          // Refetch all players for this game
          const { data: updatedPlayers } = await supabase
            .from('players')
            .select('*')
            .eq('game_id', gameId)
            .order('id')
          
          if (updatedPlayers) {
            // Update players while preserving other state
            const currentGame = game
            const currentRoundState = roundState
            const currentVotes = votes
            console.log('useRealtimeSync - Player update:', {
              game: currentGame?.id,
              playersCount: updatedPlayers.length,
              players: updatedPlayers
            })
            setGameData({
              game: currentGame || {} as Game,
              players: updatedPlayers,
              roundState: currentRoundState,
              votes: currentVotes
            })
          }
        }
      )
      .subscribe()

    // Subscribe to round state changes
    const roundStateSubscription = supabase
      .channel(`round_state:${gameId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'round_state', filter: `game_id=eq.${gameId}` },
        (payload) => {
          console.log('Round state updated:', payload.new)
          setRoundState(payload.new as RoundState)
        }
      )
      .subscribe()

    // Subscribe to vote changes
    const votesSubscription = supabase
      .channel(`votes:${gameId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `game_id=eq.${gameId}` },
        async () => {
          // Refetch all votes for this game
          const { data: updatedVotes } = await supabase
            .from('votes')
            .select('*')
            .eq('game_id', gameId)
          
          if (updatedVotes) {
            setVotes(updatedVotes)
          }
        }
      )
      .subscribe()

    // Subscribe to leave request changes
    const leaveRequestsSubscription = supabase
      .channel(`leave_requests:${gameId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests', filter: `game_id=eq.${gameId}` },
        async () => {
          // Refetch all leave requests for this game
          const { data: updatedLeaveRequests } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('game_id', gameId)
          
          if (updatedLeaveRequests) {
            setLeaveRequests(updatedLeaveRequests)
          }
        }
      )
      .subscribe()

    // Store subscription references for cleanup
    subscriptionRef.current = {
      game: gameSubscription,
      players: playersSubscription,
      roundState: roundStateSubscription,
      votes: votesSubscription,
      leaveRequests: leaveRequestsSubscription
    }

    return () => {
      // Cleanup subscriptions
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current.game)
        supabase.removeChannel(subscriptionRef.current.players)
        supabase.removeChannel(subscriptionRef.current.roundState)
        supabase.removeChannel(subscriptionRef.current.votes)
        supabase.removeChannel(subscriptionRef.current.leaveRequests)
      }
    }
  }, [gameId, setGame, setPlayers, setRoundState, setVotes, setLeaveRequests])

  // Initial data fetch
  useEffect(() => {
    if (!gameId || !isSupabaseConfigured() || !supabase) return

    const fetchGameData = async () => {
      try {
        // Fetch game
        const { data: gameData } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single()

        if (!gameData) return

        // Fetch players
        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameId)
          .order('id')

        // Fetch round state
        const { data: roundStateData, error: roundStateError } = await supabase
          .from('round_state')
          .select('*')
          .eq('game_id', gameId)
          .single()
        
        // Ignore "no rows" error for round state - it's normal when game is in lobby
        if (roundStateError && roundStateError.code !== 'PGRST116') {
          console.error('Error fetching round state:', roundStateError)
        }

        // Fetch votes
        const { data: votesData, error: votesError } = await supabase
          .from('votes')
          .select('*')
          .eq('game_id', gameId)
        
        // Ignore errors for votes - it's normal when game is in lobby
        if (votesError) {
          console.error('Error fetching votes:', votesError)
        }

        // Fetch leave requests
        const { data: leaveRequestsData } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('game_id', gameId)

        // Update state using setGameDataAtom to maintain consistency
        console.log('useRealtimeSync - Initial data fetch:', {
          game: gameData?.id,
          playersCount: playersData?.length || 0,
          players: playersData
        })
        
        // Preserve current player to maintain isHostAtom state
        const store = getDefaultStore()
        const currentPlayer = store.get(currentPlayerAtom)
        setGameData({
          game: gameData,
          players: playersData || [],
          roundState: roundStateData,
          votes: votesData || [],
          leaveRequests: leaveRequestsData || [],
          currentPlayer: currentPlayer // Preserve current player
        })
      } catch (error) {
        console.error('Error fetching game data:', error)
      }
    }

    fetchGameData()
  }, [gameId, setGame, setPlayers, setRoundState, setVotes])
}
