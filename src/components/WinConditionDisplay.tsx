'use client'

import { useAtom } from 'jotai'
import { gameAtom, playersAtom } from '@/lib/game-store'
import { Trophy, Skull, Users } from 'lucide-react'

export default function WinConditionDisplay() {
  const [game] = useAtom(gameAtom)
  const [players] = useAtom(playersAtom)

  if (!game || game.phase !== 'ended' || !game.win_state) {
    return null
  }

  const alivePlayers = players.filter(p => p.alive)
  const aliveWerewolves = alivePlayers.filter(p => p.role === 'werewolf')
  const aliveVillagers = alivePlayers.filter(p => p.role !== 'werewolf')

  const isWerewolfWin = game.win_state === 'werewolves'
  const isVillagerWin = game.win_state === 'villagers'

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-2xl p-8 border border-gray-600/30 shadow-2xl max-w-md w-full mx-4">
        <div className="text-center">
          {/* Win Icon */}
          <div className="mb-6">
            {isWerewolfWin ? (
              <div className="mx-auto w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center border-2 border-red-500/50">
                <Skull className="w-10 h-10 text-red-400" />
              </div>
            ) : (
              <div className="mx-auto w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center border-2 border-green-500/50">
                <Trophy className="w-10 h-10 text-green-400" />
              </div>
            )}
          </div>

          {/* Win Message */}
          <h2 className={`text-3xl font-bold mb-4 ${
            isWerewolfWin ? 'text-red-400' : 'text-green-400'
          }`}>
            {isWerewolfWin ? 'WEREWOLVES WIN!' : 'VILLAGERS WIN!'}
          </h2>

          {/* Win Description */}
          <p className="text-gray-300 mb-6 text-lg">
            {isWerewolfWin 
              ? 'The werewolves have taken over the village!'
              : 'The villagers have successfully eliminated all werewolves!'
            }
          </p>

          {/* Final Stats */}
          <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
            <h3 className="text-white font-semibold mb-3">Final Results</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Players:</span>
                <span className="text-white">{players.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Alive Players:</span>
                <span className="text-white">{alivePlayers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Werewolves:</span>
                <span className="text-red-400">{aliveWerewolves.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Villagers:</span>
                <span className="text-green-400">{aliveVillagers.length}</span>
              </div>
            </div>
          </div>

          {/* Survivors List */}
          {alivePlayers.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center justify-center">
                <Users className="w-4 h-4 mr-2" />
                Survivors
              </h4>
              <div className="space-y-1">
                {alivePlayers.map(player => (
                  <div key={player.id} className="flex justify-between items-center">
                    <span className="text-gray-300">{player.name}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      player.role === 'werewolf' 
                        ? 'bg-red-600/20 text-red-400 border border-red-500/30' 
                        : 'bg-green-600/20 text-green-400 border border-green-500/30'
                    }`}>
                      {player.role === 'werewolf' ? 'Werewolf' : 'Villager'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
