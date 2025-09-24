#!/usr/bin/env node

// Multi-Werwolf edge cases
// - Two werwolves same target; doctor saves -> 0 deaths
// - Two werwolves different targets; no save -> 2 deaths

const BASE_URL = process.env.TEST_BASE_URL || process.env.TEST_URL || 'http://localhost:3000'

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
  return { code: data.gameId, host: data.player.client_id, uuid: data.game.id }
}

async function join(code, name, cid) {
  return req(`${BASE_URL}/api/games/join`, { method: 'POST', body: JSON.stringify({ gameId: code, playerName: name, clientId: cid }) })
}

async function state(code, host) { return req(`${BASE_URL}/api/games?code=${code}`, { headers: { Cookie: `clientId=${host}` } }) }
async function hostAction(uuid, host, action, data) { return req(`${BASE_URL}/api/games/${uuid}/actions`, { method: 'POST', body: JSON.stringify({ action, clientId: host, data }) }) }
async function playerAction(uuid, cid, action, target) { const body = { action, clientId: cid }; if (target) body.data = { targetId: target }; return req(`${BASE_URL}/api/games/${uuid}/actions`, { method: 'POST', body: JSON.stringify(body) }) }

async function waitPhase(code, host, phase, timeout = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeout) { const gs = await state(code, host); if (gs.game.phase === phase) return gs; await sleep(200) }
  const gs = await state(code, host); throw new Error(`Expected phase ${phase} but got ${gs.game.phase}`)
}

async function testSameTargetSaved() {
  log('🧪 Two werwolves same target; doctor saves => 0 deaths')
  const { code, host, uuid } = await createGame()
  for (let i = 1; i <= 9; i++) await join(code, `P${i}`, `c${i}-${Date.now()}`)
  await hostAction(uuid, host, 'assign_roles'); await sleep(600)
  let gs
  try { gs = await waitPhase(code, host, 'night_wolf', 4000) } catch (_) { await hostAction(uuid, host, 'next_phase'); gs = await waitPhase(code, host, 'night_wolf', 8000) }
  await hostAction(uuid, host, 'next_phase') // start night
  await sleep(200)
  gs = await state(code, host)
  const players = gs.players.filter(p => !p.is_host)
  const wolves = players.filter(p => (p.role === 'werwolf' || p.role === 'werewolf') && p.alive !== false)
  const target = players.find(p => !wolves.some(w => w.id === p.id))
  await playerAction(uuid, wolves[0].client_id, 'wolf_select', target.id)
  await playerAction(uuid, wolves[1].client_id, 'wolf_select', target.id)
  await hostAction(uuid, host, 'next_phase') // -> doctor
  await sleep(200)
  const doctor = (await state(code, host)).players.find(p => p.role === 'doctor')
  if (doctor) await playerAction(uuid, doctor.client_id, 'doctor_save', target.id)
  await hostAction(uuid, host, 'next_phase') // -> police
  await sleep(200)
  await hostAction(uuid, host, 'reveal_dead')
  await sleep(300)
  gs = await state(code, host)
  const deaths = gs.players.filter(p => !p.alive && !p.is_host)
  if (deaths.length !== 0) throw new Error(`Expected 0 deaths, got ${deaths.length}`)
  log('✅ Same target saved -> 0 deaths', 'success')
}

async function testDifferentTargetsNoSave() {
  log('🧪 Two werwolves different targets; no save => 2 deaths')
  const { code, host, uuid } = await createGame()
  for (let i = 1; i <= 9; i++) await join(code, `Q${i}`, `d${i}-${Date.now()}`)
  await hostAction(uuid, host, 'assign_roles'); await sleep(600)
  let gs
  try { gs = await waitPhase(code, host, 'night_wolf', 4000) } catch (_) { await hostAction(uuid, host, 'next_phase'); gs = await waitPhase(code, host, 'night_wolf', 8000) }
  await hostAction(uuid, host, 'next_phase'); await sleep(200)
  gs = await state(code, host)
  const players = gs.players.filter(p => !p.is_host)
  const wolves = players.filter(p => (p.role === 'werwolf' || p.role === 'werewolf') && p.alive !== false)
  const nonWolves = players.filter(p => !wolves.some(w => w.id === p.id))
  await playerAction(uuid, wolves[0].client_id, 'wolf_select', nonWolves[0].id)
  await playerAction(uuid, wolves[1].client_id, 'wolf_select', nonWolves[1].id)
  await hostAction(uuid, host, 'next_phase') // -> doctor
  await sleep(200)
  // No save
  await hostAction(uuid, host, 'next_phase') // -> police
  await sleep(200)
  await hostAction(uuid, host, 'reveal_dead')
  // Poll up to 2s for both deaths to persist
  let success = false
  const expected = new Set([nonWolves[0].id, nonWolves[1].id])
  for (let i = 0; i < 10; i++) {
    await sleep(200)
    gs = await state(code, host)
    const deadIds = players.filter(p => !gs.players.find(gp => gp.id === p.id)?.alive).map(p => p.id)
    success = [...expected].every(id => deadIds.includes(id))
    if (success) break
  }
  if (!success) throw new Error(`Expected deaths to include both targets, got ${deadIds.join(',')}`)
  log('✅ Different targets unsaved -> both dead', 'success')
}

async function run() {
  await testSameTargetSaved()
  await testDifferentTargetsNoSave()
  log('🎉 Multi-Werwolf edge cases passed', 'success')
}

run().catch(e => { log(e.message, 'error'); process.exit(1) })


