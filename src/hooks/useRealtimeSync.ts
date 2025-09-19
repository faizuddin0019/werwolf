'use client'

import { useEffect, useRef, useCallback } from 'react'
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

// Performance optimization: Only log in development
const isDevelopment = process.env.NODE_ENV === 'development'
const log = isDevelopment ? console.log : () => {}

// Debounce utility to prevent excessive API calls
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: any[]) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

export function useRealtimeSync(gameId: string | null, onGameEnded?: () => void) {
  const [game] = useAtom(gameAtom)
  const [players] = useAtom(playersAtom)
  const [roundState] = useAtom(roundStateAtom)
  const [votes] = useAtom(votesAtom)
  const [leaveRequests] = useAtom(leaveRequestsAtom)
  const [currentPlayer] = useAtom(currentPlayerAtom)
  const [, setGameData] = useAtom(setGameDataAtom)
  const [, resetGame] = useAtom(resetGameAtom)
  
  const subscriptionRef = useRef<{
    game: any
    players: any
    roundState: any
    votes: any
    leaveRequests: any
  } | null>(null)
  
  // Use refs to get current values without causing dependency issues
  const leaveRequestsRef = useRef(leaveRequests)
  const gameRef = useRef(game)
  const roundStateRef = useRef(roundState)
  const votesRef = useRef(votes)
  const playersRef = useRef(players)
  const currentPlayerRef = useRef(currentPlayer)
  
  leaveRequestsRef.current = leaveRequests
  gameRef.current = game
  roundStateRef.current = roundState
  votesRef.current = votes
  playersRef.current = players
  currentPlayerRef.current = currentPlayer

  useEffect(() => {
    if (!gameId || !isSupabaseConfigured() || !supabase) return

    // Subscribe to game changes
    const gameSubscription = supabase
      .channel(`game:${gameId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          log('🔧 Game updated:', payload.new)
          const updatedGame = payload.new as Game
          
          // Preserve current player during game phase transitions
          const currentPlayer = currentPlayerRef.current
          if (!currentPlayer) {
            log('🔧 No current player found during game update - skipping update')
            return
          }
          
          // Update game using setGameData to maintain consistency
          setGameData({
            game: updatedGame,
            players: playersRef.current || [],
            roundState: roundStateRef.current,
            votes: votesRef.current || [],
            leaveRequests: leaveRequestsRef.current || [],
            currentPlayer: currentPlayer
          })
          
          // If game ended, redirect to welcome page (but not for host)
          if (updatedGame.phase === 'ended') {
            const currentPlayer = currentPlayerRef.current
            const isHost = currentPlayer?.is_host || false
            
            if (!isHost) {
              log('🔧 Game phase changed to ended - redirecting non-host to welcome page')
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
            } else {
              log('🔧 Game phase changed to ended - host stays in game to see results')
            }
          }
        }
      )
      .subscribe()

    // Debounced function to refetch players (reduced delay for faster updates)
    const debouncedRefetchPlayers = debounce(async () => {
      log('🔧 Refetching players after debounce')
      const { data: updatedPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .order('id')
          
      if (updatedPlayers) {
        log('🔧 Updated players list:', updatedPlayers.map(p => ({ id: p.id, name: p.name, is_host: p.is_host })))
        
        // Check if players actually changed to prevent infinite loops
        const currentPlayers = playersRef.current
        const playersChanged = !currentPlayers || 
          currentPlayers.length !== updatedPlayers.length ||
          // Check if any player properties changed
          currentPlayers.some((currentPlayer) => {
            const updatedPlayer = updatedPlayers.find(p => p.id === currentPlayer.id)
            if (!updatedPlayer) return true // Player was removed
            return currentPlayer.name !== updatedPlayer.name ||
              currentPlayer.is_host !== updatedPlayer.is_host ||
              currentPlayer.role !== updatedPlayer.role ||
              currentPlayer.alive !== updatedPlayer.alive
          }) ||
          // Check if any new players were added
          updatedPlayers.some((updatedPlayer) => {
            const currentPlayer = currentPlayers.find(p => p.id === updatedPlayer.id)
            return !currentPlayer // New player was added
          })
        
        if (playersChanged) {
          log('useRealtimeSync - Players changed, updating state:', {
            game: gameRef.current?.id,
            playersCount: updatedPlayers.length,
            players: updatedPlayers
          })
          
          // Find the current player in the updated players list
          const currentPlayer = currentPlayerRef.current
          const updatedCurrentPlayer = currentPlayer ? 
            updatedPlayers.find(p => p.id === currentPlayer.id) || currentPlayer : null
          
          setGameData({
            game: gameRef.current || {} as Game,
            players: updatedPlayers,
            roundState: roundStateRef.current,
            votes: votesRef.current,
            leaveRequests: leaveRequestsRef.current,
            currentPlayer: updatedCurrentPlayer
          })
        } else {
          log('🔧 Players unchanged, skipping state update')
        }
      }
    }, 100) // 100ms debounce for faster updates

    // Subscribe to player changes
    const playersSubscription = supabase
      .channel(`players:${gameId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
        (payload) => {
          log('🔧 Players subscription triggered', payload.eventType)
          debouncedRefetchPlayers()
        }
      )
      .subscribe()

    // Subscribe to round state changes
    const roundStateSubscription = supabase
      .channel(`round_state:${gameId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'round_state', filter: `game_id=eq.${gameId}` },
        (payload) => {
          log('🔧 Round state subscription triggered:', payload.eventType, payload.new)
          const updatedRoundState = payload.new as RoundState
          
          // Preserve current player during round state updates
          const currentPlayer = currentPlayerRef.current
          if (!currentPlayer) {
            log('🔧 No current player found during round state update - skipping update')
            return
          }
          
          // Force immediate update for real-time events
          log('🔧 Immediate round state update for real-time events:', {
            wolfTarget: updatedRoundState.wolf_target_player_id,
            policeInspect: updatedRoundState.police_inspect_player_id,
            doctorSave: updatedRoundState.doctor_save_player_id,
            policeResult: updatedRoundState.police_inspect_result
          })
          
          // Update round state using setGameData to maintain consistency
          setGameData({
            game: gameRef.current || {} as Game,
            players: playersRef.current || [],
            roundState: updatedRoundState,
            votes: votesRef.current || [],
            leaveRequests: leaveRequestsRef.current || [],
            currentPlayer: currentPlayer
          })
        }
      )
      .subscribe()

    // TEMPORARILY DISABLED - Subscribe to vote changes
    // const votesSubscription = supabase
    //   .channel(`votes:${gameId}`)
    //   .on('postgres_changes',
    //     { event: '*', schema: 'public', table: 'votes', filter: `game_id=eq.${gameId}` },
    //     async () => {
    //       // Refetch all votes for this game
    //       const { data: updatedVotes } = await supabase
    //         .from('votes')
    //         .select('*')
    //         .eq('game_id', gameId)
    //       
    //       if (updatedVotes) {
    //         // Check if votes actually changed to prevent infinite loops
    //         const currentVotes = votesRef.current
    //         const votesChanged = !currentVotes || 
    //           currentVotes.length !== updatedVotes.length ||
    //           currentVotes.some((currentVote, index) => {
    //             const updatedVote = updatedVotes[index]
    //             return !updatedVote || 
    //               currentVote.id !== updatedVote.id ||
    //               currentVote.voter_id !== updatedVote.voter_id ||
    //               currentVote.target_player_id !== updatedVote.target_player_id
    //           })
    //         
    //         if (votesChanged) {
    //           console.log('🔧 Votes changed, updating state')
    //           setGameData({
    //             game: gameRef.current || {} as Game,
    //             players: playersRef.current || [],
    //             roundState: roundStateRef.current,
    //             votes: updatedVotes,
    //             leaveRequests: leaveRequestsRef.current || []
    //           })
    //         } else {
    //           console.log('🔧 Votes unchanged, skipping state update')
    //         }
    //       }
    //     }
    //   )
    //   .subscribe()

    // Debounced function to refetch leave requests
    const debouncedRefetchLeaveRequests = debounce(async () => {
      log('🔧 Refetching leave requests after debounce')
      const { data: updatedLeaveRequests } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('game_id', gameId)
          
      if (updatedLeaveRequests) {
        // Check if leave requests actually changed to prevent infinite loops
        const currentLeaveRequests = leaveRequestsRef.current
        const leaveRequestsChanged = !currentLeaveRequests || 
          currentLeaveRequests.length !== updatedLeaveRequests.length ||
          currentLeaveRequests.some((currentRequest, index) => {
            const updatedRequest = updatedLeaveRequests[index]
            return !updatedRequest || 
              currentRequest.id !== updatedRequest.id ||
              currentRequest.status !== updatedRequest.status ||
              currentRequest.player_id !== updatedRequest.player_id
          })
        
        if (leaveRequestsChanged) {
          log('🔧 Leave requests changed, updating state')
          setGameData({
            game: gameRef.current || {} as Game,
            players: playersRef.current || [],
            roundState: roundStateRef.current,
            votes: votesRef.current || [],
            leaveRequests: updatedLeaveRequests,
            currentPlayer: currentPlayerRef.current
          })
        } else {
          log('🔧 Leave requests unchanged, skipping state update')
        }
      }
    }, 100) // 100ms debounce for faster updates

    // Subscribe to leave request changes
    const leaveRequestsSubscription = supabase
      .channel(`leave_requests:${gameId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests', filter: `game_id=eq.${gameId}` },
        (payload) => {
          log('🔧 Leave requests subscription triggered', payload.eventType)
          debouncedRefetchLeaveRequests()
        }
      )
      .subscribe()

    // Store subscription references for cleanup
    subscriptionRef.current = {
      game: gameSubscription,
      players: playersSubscription,
      roundState: roundStateSubscription,
      votes: null, // votesSubscription,
      leaveRequests: leaveRequestsSubscription
    }
    
    log('🔧 Real-time subscriptions created for game:', gameId)

    return () => {
      // Cleanup subscriptions
      if (subscriptionRef.current) {
        if (subscriptionRef.current.game) supabase.removeChannel(subscriptionRef.current.game)
        if (subscriptionRef.current.players) supabase.removeChannel(subscriptionRef.current.players)
        if (subscriptionRef.current.roundState) supabase.removeChannel(subscriptionRef.current.roundState)
        if (subscriptionRef.current.votes) supabase.removeChannel(subscriptionRef.current.votes)
        if (subscriptionRef.current.leaveRequests) supabase.removeChannel(subscriptionRef.current.leaveRequests)
      }
    }
  }, [gameId])

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
        log('useRealtimeSync - Initial data fetch:', {
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
  }, [gameId])
}
