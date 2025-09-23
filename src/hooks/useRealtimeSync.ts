'use client'

import { useEffect, useRef } from 'react'
import { useAtom } from 'jotai'
import { supabase, Game, RoundState, isSupabaseConfigured } from '@/lib/supabase'
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
function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout | null = null
  return ((...args: unknown[]) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

export function useRealtimeSync(gameCode: string | null, onGameEnded?: () => void) {
  const [game] = useAtom(gameAtom)
  const [players] = useAtom(playersAtom)
  const [roundState] = useAtom(roundStateAtom)
  const [votes] = useAtom(votesAtom)
  const [leaveRequests] = useAtom(leaveRequestsAtom)
  const [currentPlayer] = useAtom(currentPlayerAtom)
  const [, setGameData] = useAtom(setGameDataAtom)
  const [, resetGame] = useAtom(resetGameAtom)
  
  // Note: Cannot use early return here as it violates Rules of Hooks
  // All hooks must be called in the same order on every render
  
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
    if (!gameCode || gameCode === '' || !isSupabaseConfigured() || !supabase) {
      log('🔧 useRealtimeSync: Skipping setup - gameCode:', gameCode, 'isSupabaseConfigured:', isSupabaseConfigured(), 'supabase:', !!supabase)
      return
    }
    
    log('🔧 useRealtimeSync: Setting up real-time sync for gameCode:', gameCode)

    // Subscribe to game changes
    const gameSubscription = supabase
      .channel(`game:${gameCode}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'games', filter: `code=eq.${gameCode}` },
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
            roundState: roundStateRef.current || undefined,
            votes: votesRef.current || [],
            leaveRequests: leaveRequestsRef.current || [],
            currentPlayer: currentPlayer || undefined || undefined
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
      const { data: updatedPlayers } = await supabase!!
        .from('players')
        .select('*')
        .eq('game_id', game?.id)
        .order('id')
        .abortSignal(AbortSignal.timeout(5000)) // Add timeout to prevent hanging
          
      if (updatedPlayers) {
        log('🔧 Updated players list:', updatedPlayers.map(p => ({ id: p.id, name: p.name, role: p.role, is_host: p.is_host })))
        
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
          log('🔧 useRealtimeSync - Players changed, updating state:', {
            game: gameRef.current?.id,
            playersCount: updatedPlayers.length,
            players: updatedPlayers.map(p => ({ id: p.id, name: p.name, role: p.role, alive: p.alive, is_host: p.is_host }))
          })
          
          // Find the current player in the updated players list
          const currentPlayer = currentPlayerRef.current
          const updatedCurrentPlayer = currentPlayer ? 
            updatedPlayers.find(p => p.id === currentPlayer.id) || currentPlayer : null
          
          setGameData({
            game: gameRef.current || {} as Game,
            players: updatedPlayers,
            roundState: roundStateRef.current || undefined,
            votes: votesRef.current,
            leaveRequests: leaveRequestsRef.current,
            currentPlayer: updatedCurrentPlayer
          })
        } else {
          log('🔧 Players unchanged, skipping state update')
        }
      }
    }, 50) // 50ms debounce for near real-time updates

    // Subscribe to player changes
    const playersSubscription = supabase
      .channel(`players:${gameCode}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${game?.id}` },
        (payload) => {
          log('🔧 Players subscription triggered', payload.eventType)
          debouncedRefetchPlayers()
        }
      )
      .subscribe()

    // Subscribe to round state changes
    const roundStateSubscription = supabase
      .channel(`round_state:${gameCode}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'round_state', filter: `game_id=eq.${game?.id}` },
        (payload) => {
          log('🔧 Round state subscription triggered:', payload.eventType, payload.new)
          const updatedRoundState = payload.new as RoundState
          log('🔧 Round state update details:', {
            gameCode: gameCode,
            phase_started: updatedRoundState.phase_started,
            wolfTarget: updatedRoundState.wolf_target_player_id,
            policeInspect: updatedRoundState.police_inspect_player_id,
            doctorSave: updatedRoundState.doctor_save_player_id
          })
          
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
            currentPlayer: currentPlayer || undefined
          })
        }
      )
      .subscribe()

    // Subscribe to vote changes for real-time voting updates
    const votesSubscription = supabase
      .channel(`votes:${gameCode}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `game_id=eq.${game?.id}` },
        async () => {
          log('🔧 Vote change detected, refetching votes')
          // Refetch all votes for this game
          const { data: updatedVotes } = await supabase!!
            .from('votes')
            .select('*')
            .eq('game_id', game?.id)
          
          if (updatedVotes) {
            // Check if votes actually changed to prevent infinite loops
            const currentVotes = votesRef.current
            const votesChanged = !currentVotes || 
              currentVotes.length !== updatedVotes.length ||
              currentVotes.some((currentVote, index) => {
                const updatedVote = updatedVotes[index]
                return !updatedVote || 
                  currentVote.id !== updatedVote.id ||
                  currentVote.voter_player_id !== updatedVote.voter_player_id ||
                  currentVote.target_player_id !== updatedVote.target_player_id
              })
            
            if (votesChanged) {
              log('🔧 Votes changed, updating state:', updatedVotes.length, 'votes')
              setGameData({
                game: gameRef.current || {} as Game,
                players: playersRef.current || [],
                roundState: roundStateRef.current || undefined,
                votes: updatedVotes,
                leaveRequests: leaveRequestsRef.current || [],
                currentPlayer: currentPlayer || undefined
              })
            } else {
              log('🔧 Votes unchanged, skipping state update')
            }
          }
        }
      )
      .subscribe()

    // Debounced function to refetch leave requests
    debounce(async () => {
      log('🔧 Refetching leave requests after debounce')
      const { data: updatedLeaveRequests } = await supabase!
        .from('leave_requests')
        .select('*')
        .eq('game_id', game?.id)
          
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
            roundState: roundStateRef.current || undefined,
            votes: votesRef.current || [],
            leaveRequests: updatedLeaveRequests,
            currentPlayer: currentPlayer || undefined
          })
        } else {
          log('🔧 Leave requests unchanged, skipping state update')
        }
      }
    }, 50) // 50ms debounce for near real-time updates

    // Subscribe to leave request changes
    const leaveRequestsSubscription = supabase
      .channel(`leave_requests:${gameCode}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests', filter: `game_id=eq.${game?.id}` },
        async (payload) => {
          log('🔧 Leave requests subscription triggered', payload.eventType, payload)
          // Immediate update for leave requests (no debounce)
          const { data: updatedLeaveRequests } = await supabase!
            .from('leave_requests')
            .select('*')
            .eq('game_id', game?.id)
              
          if (updatedLeaveRequests) {
            log('🔧 Immediate leave requests update:', updatedLeaveRequests.length, 'requests')
            if (updatedLeaveRequests.length > 0) {
              log('🔧 Leave requests details:', updatedLeaveRequests.map(r => `${r.player_id} - ${r.status}`))
            }
            setGameData({
              game: gameRef.current || {} as Game,
              players: playersRef.current || [],
              roundState: roundStateRef.current || undefined,
              votes: votesRef.current || [],
              leaveRequests: updatedLeaveRequests,
              currentPlayer: currentPlayer || undefined
            })
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
    
    log('🔧 Real-time subscriptions created for game:', gameCode)

    return () => {
      // Cleanup subscriptions
      if (subscriptionRef.current && supabase) {
        if (subscriptionRef.current.game) supabase.removeChannel(subscriptionRef.current.game)
        if (subscriptionRef.current.players) supabase.removeChannel(subscriptionRef.current.players)
        if (subscriptionRef.current.roundState) supabase.removeChannel(subscriptionRef.current.roundState)
        if (subscriptionRef.current.votes) supabase.removeChannel(subscriptionRef.current.votes)
        if (subscriptionRef.current.leaveRequests) supabase.removeChannel(subscriptionRef.current.leaveRequests)
      }
    }
  }, [gameCode])

  // Initial data fetch
  useEffect(() => {
    if (!gameCode || gameCode === '' || !isSupabaseConfigured() || !supabase) return

    const fetchGameData = async () => {
      try {
        // Fetch game by code
        const { data: gameData } = await supabase!
          .from('games')
          .select('*')
          .eq('code', gameCode)
          .single()

        if (!gameData) return

        // Fetch players
        const { data: playersData } = await supabase!
          .from('players')
          .select('*')
          .eq('game_id', gameData.id)
          .order('id')

        // Fetch round state
        const { data: roundStateData, error: roundStateError } = await supabase!
          .from('round_state')
          .select('*')
          .eq('game_id', gameData.id)
          .single()
        
        // Ignore "no rows" error for round state - it's normal when game is in lobby
        if (roundStateError && roundStateError.code !== 'PGRST116') {
          console.error('Error fetching round state:', roundStateError)
        }

        // Fetch votes
        const { data: votesData, error: votesError } = await supabase!
          .from('votes')
          .select('*')
          .eq('game_id', gameData.id)
        
        // Ignore errors for votes - it's normal when game is in lobby
        if (votesError) {
          console.error('Error fetching votes:', votesError)
        }

        // Fetch leave requests
        const { data: leaveRequestsData } = await supabase!
          .from('leave_requests')
          .select('*')
          .eq('game_id', gameData.id)
          
        log('🔧 Fetched leave requests:', leaveRequestsData?.length || 0, 'requests')
        if (leaveRequestsData && leaveRequestsData.length > 0) {
          log('🔧 Leave requests details:', leaveRequestsData.map(r => `${r.player_id} - ${r.status}`))
        }

        // Update state using setGameDataAtom to maintain consistency
        log('useRealtimeSync - Initial data fetch:', {
          game: gameData?.id,
          playersCount: playersData?.length || 0,
          players: playersData
        })
        
        // Preserve current player to maintain isHostAtom state
        const currentPlayer = currentPlayerRef.current
        setGameData({
          game: gameData,
          players: playersData || [],
          roundState: roundStateData,
          votes: votesData || [],
          leaveRequests: leaveRequestsData || [],
          currentPlayer: currentPlayer || undefined // Preserve current player
        })
      } catch (error) {
        console.error('Error fetching game data:', error)
      }
    }

    fetchGameData()
  }, [gameCode])
}
