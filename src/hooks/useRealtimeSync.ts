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

export function useRealtimeSync(gameId: string | null, onGameEnded?: () => void) {
  const [game] = useAtom(gameAtom)
  const [players] = useAtom(playersAtom)
  const [roundState] = useAtom(roundStateAtom)
  const [votes] = useAtom(votesAtom)
  const [leaveRequests] = useAtom(leaveRequestsAtom)
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
          console.log('🔧 Game updated:', payload.new)
          const updatedGame = payload.new as Game
          
          // Update game using setGameData to maintain consistency
          setGameData({
            game: updatedGame,
            players: playersRef.current || [],
            roundState: roundStateRef.current,
            votes: votesRef.current || [],
            leaveRequests: leaveRequestsRef.current || [],
            currentPlayer: currentPlayerRef.current
          })
          
          // If game ended, redirect to welcome page
          if (updatedGame.phase === 'ended') {
            console.log('🔧 Game phase changed to ended - redirecting to welcome page')
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
        async (payload) => {
          console.log('🔧 Players subscription triggered - refetching players', payload)
          console.log('🔧 Payload details:', {
            eventType: payload.eventType,
            table: payload.table,
            old: payload.old,
            new: payload.new
          })
          // Refetch all players for this game
          const { data: updatedPlayers } = await supabase
            .from('players')
            .select('*')
            .eq('game_id', gameId)
            .order('id')
          
          if (updatedPlayers) {
            console.log('🔧 Updated players list:', updatedPlayers.map(p => ({ id: p.id, name: p.name, is_host: p.is_host })))
            
            // Check if players actually changed to prevent infinite loops
            const currentPlayers = playersRef.current
            const playersChanged = !currentPlayers || 
              currentPlayers.length !== updatedPlayers.length ||
              currentPlayers.some((currentPlayer, index) => {
                const updatedPlayer = updatedPlayers[index]
                return !updatedPlayer || 
                  currentPlayer.id !== updatedPlayer.id ||
                  currentPlayer.name !== updatedPlayer.name ||
                  currentPlayer.is_host !== updatedPlayer.is_host ||
                  currentPlayer.role !== updatedPlayer.role ||
                  currentPlayer.alive !== updatedPlayer.alive
              })
            
            if (playersChanged) {
              console.log('useRealtimeSync - Players changed, updating state:', {
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
              console.log('🔧 Players unchanged, skipping state update')
            }
          }
        }
      )
      .subscribe()

    // TEMPORARILY DISABLED - Subscribe to round state changes
    // const roundStateSubscription = supabase
    //   .channel(`round_state:${gameId}`)
    //   .on('postgres_changes',
    //     { event: '*', schema: 'public', table: 'round_state', filter: `game_id=eq.${gameId}` },
    //     (payload) => {
    //       console.log('Round state updated:', payload.new)
    //       const updatedRoundState = payload.new as RoundState
    //       
    //       // Update round state using setGameData to maintain consistency
    //       setGameData({
    //         game: gameRef.current || {} as Game,
    //         players: playersRef.current || [],
    //         roundState: updatedRoundState,
    //         votes: votesRef.current || [],
    //         leaveRequests: leaveRequestsRef.current || []
    //       })
    //     }
    //   )
    //   .subscribe()

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
              console.log('🔧 Leave requests changed, updating state')
              setGameData({
                game: gameRef.current || {} as Game,
                players: playersRef.current || [],
                roundState: roundStateRef.current,
                votes: votesRef.current || [],
                leaveRequests: updatedLeaveRequests,
                currentPlayer: currentPlayerRef.current
              })
            } else {
              console.log('🔧 Leave requests unchanged, skipping state update')
            }
          }
        }
      )
      .subscribe()

    // Store subscription references for cleanup
    subscriptionRef.current = {
      game: gameSubscription,
      players: playersSubscription,
      roundState: null, // roundStateSubscription,
      votes: null, // votesSubscription,
      leaveRequests: leaveRequestsSubscription
    }
    
    console.log('🔧 Real-time subscriptions created for game:', gameId)

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
  }, [gameId])
}
