#!/usr/bin/env node

// Multi-Werwolf integration tests
// - Two alive werwolves select two targets: all unsaved targets die on Reveal
// - After one werwolf is eliminated, remaining werwolf can still kill on next night

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

function log(msg, type = 'info') {
  const ts = new Date().toISOString()
  const p = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔧'
  console.log(`${p} [${ts}] ${msg}`)
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function req(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

async function createGame() {
  const data = await req(`${BASE_URL}/api/games`, {
    method: 'POST',
    body: JSON.stringify({ hostName: 'Host', clientId: 'host-' + Date.now() })
  })
  return { gameCode: data.gameId, hostClientId: data.player.client_id, gameUuid: data.game.id }
}

async function join(gameCode, name, clientId) {
  return req(`${BASE_URL}/api/games/join`, {
    method: 'POST',
    body: JSON.stringify({ gameId: gameCode, playerName: name, clientId })
  })
}

async function getState(gameCode, clientId) {
  return req(`${BASE_URL}/api/games?code=${gameCode}`, { headers: { Cookie: `clientId=${clientId}` } })
}

async function hostAction(gameUuid, hostClientId, action, data) {
  return req(`${BASE_URL}/api/games/${gameUuid}/actions`, {
    method: 'POST',
    body: JSON.stringify({ action, clientId: hostClientId, data })
  })
}

async function playerAction(gameUuid, clientId, action, targetId) {
  const body = { action, clientId }
  if (targetId) body.data = { targetId }
  return req(`${BASE_URL}/api/games/${gameUuid}/actions`, { method: 'POST', body: JSON.stringify(body) })
}

async function waitPhase(gameCode, hostClientId, phase, timeout = 12000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const gs = await getState(gameCode, hostClientId)
    if (gs.game.phase === phase) return gs
    await sleep(200)
  }
  const gs = await getState(gameCode, hostClientId)
  throw new Error(`Expected phase ${phase} but got ${gs.game.phase}`)
}

async function run() {
  log('🚀 Multi-Werwolf integration tests start')
  // --- Setup with 9 players (2 werwolves) ---
  const { gameCode, hostClientId } = await createGame()
  for (let i = 1; i <= 9; i++) await join(gameCode, `P${i}`, `c${i}-${Date.now()}`)

  let gs = await getState(gameCode, hostClientId)
  const gameUuid = gs.game.id
  await hostAction(gameUuid, hostClientId, 'assign_roles')
  await sleep(800)
  gs = await waitPhase(gameCode, hostClientId, 'night_wolf')
  await hostAction(gameUuid, hostClientId, 'next_phase') // start night (phase_started=true)
  await sleep(200)

  gs = await getState(gameCode, hostClientId)
  const players = gs.players.filter(p => !p.is_host)
  const wolves = players.filter(p => p.role === 'werwolf' || p.role === 'werewolf' && p.alive !== false)
  if (wolves.length < 2) throw new Error('Expected at least 2 werwolves')
  const nonWolves = players.filter(p => !wolves.some(w => w.id === p.id))
  const t1 = nonWolves[0]
  const t2 = nonWolves.find(p => p.id !== t1.id)
  await playerAction(gameUuid, wolves[0].client_id, 'wolf_select', t1.id)
  await playerAction(gameUuid, wolves[1].client_id, 'wolf_select', t2.id)

  // Doctor saves t1
  await hostAction(gameUuid, hostClientId, 'next_phase') // -> night_doctor
  await sleep(200)
  gs = await getState(gameCode, hostClientId)
  const doctor = gs.players.find(p => p.role === 'doctor')
  if (doctor) await playerAction(gameUuid, doctor.client_id, 'doctor_save', t1.id)

  // Police (optional), then reveal
  await hostAction(gameUuid, hostClientId, 'next_phase') // -> night_police
  await sleep(200)
  await hostAction(gameUuid, hostClientId, 'reveal_dead')
  await sleep(400)
  gs = await getState(gameCode, hostClientId)
  const t1Alive = gs.players.find(p => p.id === t1.id)?.alive
  const t2Alive = gs.players.find(p => p.id === t2.id)?.alive
  if (!(t1Alive === true && t2Alive === false)) {
    throw new Error(`Expected saved=${t1.name} alive and ${t2.name} dead; got alive1=${t1Alive} alive2=${t2Alive}`)
  }
  log('✅ Multi-wolf reveal kills all unsaved targets', 'success')

  // Begin voting and eliminate one wolf
  await hostAction(gameUuid, hostClientId, 'begin_voting')
  const aliveWolves = gs.players.filter(p => (p.role === 'werwolf' || p.role === 'werewolf') && p.alive && !p.is_host)
  const wolfToEliminate = aliveWolves[0]
  const voter = gs.players.find(p => p.alive && !p.is_host && p.id !== wolfToEliminate.id)
  await hostAction(gameUuid, hostClientId, 'final_vote')
  await playerAction(gameUuid, voter.client_id, 'vote', wolfToEliminate.id)
  await hostAction(gameUuid, hostClientId, 'eliminate_player')
  await sleep(600)

  // Next night: remaining wolf can still kill
  gs = await waitPhase(gameCode, hostClientId, 'night_wolf')
  await hostAction(gs.game.id, hostClientId, 'next_phase') // start night
  await sleep(200)
  gs = await getState(gameCode, hostClientId)
  const remainingWolf = gs.players.find(p => (p.role === 'werwolf' || p.role === 'werewolf') && p.alive && !p.is_host)
  const victim = gs.players.find(p => p.alive && !p.is_host && p.id !== remainingWolf.id)
  await playerAction(gs.game.id, remainingWolf.client_id, 'wolf_select', victim.id)
  await hostAction(gs.game.id, hostClientId, 'next_phase') // -> night_doctor
  await sleep(200)
  // Do not save victim
  await hostAction(gs.game.id, hostClientId, 'next_phase') // -> night_police
  await sleep(200)
  await hostAction(gs.game.id, hostClientId, 'reveal_dead')
  await sleep(400)
  gs = await getState(gameCode, hostClientId)
  const victimAlive = gs.players.find(p => p.id === victim.id)?.alive
  if (victimAlive !== false) throw new Error('Remaining werwolf should be able to kill after one wolf is dead')
  log('✅ Remaining werwolf can still kill on next night', 'success')

  log('🎉 Multi-Werwolf integration tests passed', 'success')
}

run().catch(e => { log(e.message, 'error'); process.exit(1) })


