#!/usr/bin/env node

// Reconnect resilience: players keep session via clientId header/cookie on refresh

const BASE_URL = process.env.TEST_BASE_URL || process.env.TEST_URL || 'http://localhost:3000'

async function req(url, options = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(options.headers||{}) }, ...options })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

async function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

async function run(){
  // Create game as host
  const hostClientId = 'host-' + Date.now()
  const create = await req(`${BASE_URL}/api/games`, { method:'POST', body: JSON.stringify({ hostName:'Host', clientId: hostClientId }) })
  const gameCode = create.gameId
  const gameUuid = create.game.id

  // Join player
  const pClientId = 'p-' + Date.now()
  const join = await req(`${BASE_URL}/api/games/join`, { method:'POST', body: JSON.stringify({ gameId: gameCode, playerName:'Alice', clientId: pClientId }) })

  // Verify player visible to host
  const hostView = await fetch(`${BASE_URL}/api/games?code=${gameCode}&clientId=${hostClientId}`, { headers: { 'x-client-id': hostClientId } }).then(r=>r.json())
  if (!hostView.players.find(p=>p.client_id===pClientId)) throw new Error('Player not visible to host before refresh')

  // Simulate refresh by fetching with header instead of relying on cookie
  const refreshed = await fetch(`${BASE_URL}/api/games?code=${gameCode}&clientId=${pClientId}`, { headers: { 'x-client-id': pClientId } }).then(r=>r.json())
  if (!refreshed.players.find(p=>p.client_id===pClientId)) throw new Error('Player lost after refresh without cookie')

  console.log('✅ Reconnect resilience: player preserved across refresh')
}

run().catch(e=>{console.error(e.message); process.exit(1)})


