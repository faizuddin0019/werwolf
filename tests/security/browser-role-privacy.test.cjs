const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function load(file, dependencies = {}, globals = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  vm.runInNewContext(code, {
    exports, require: name => {
      if (name in dependencies) return dependencies[name]
      throw new Error(`Unexpected dependency: ${name}`)
    }, console: { log() {}, error() {} }, process, Date, URL, ...globals,
  })
  return exports
}
const views = load('src/lib/game-view.ts')
const utils = load('src/lib/game-utils.ts')
const game = { id: 'game', code: '123456', host_client_id: 'host-secret', phase: 'night_police', day_count: 0 }
const players = [
  { id: 'host', client_id: 'host-secret', is_host: true, role: null },
  { id: 'wolf', client_id: 'wolf-secret', is_host: false, role: 'werwolf' },
  { id: 'doctor', client_id: 'doctor-secret', is_host: false, role: 'doctor' },
  { id: 'police', client_id: 'police-secret', is_host: false, role: 'police' },
  { id: 'villager', client_id: 'villager-secret', is_host: false, role: 'villager' },
].map(p => ({ ...p, game_id: game.id, name: p.id, alive: true, future_secret: 'must-not-leak' }))
const round = {
  game_id: game.id, phase_started: true, wolf_target_map: 'wolf:villager',
  wolf_target_player_id: 'villager', doctor_save_player_id: 'doctor',
  police_inspect_player_id: 'wolf', police_inspect_result: 'werewolf', resolved_death_player_id: null,
}
function api(file, results) {
  const pending = [...results]
  const supabase = { from() {
    const query = new Proxy({}, { get: (_, key) => {
      if (key === 'then') return (resolve, reject) => Promise.resolve(pending.shift()).then(resolve, reject)
      return () => query
    } })
    return query
  } }
  return load(file, {
    'next/server': { NextResponse: { json: (data, options = {}) => ({ data, status: options.status || 200, headers: options.headers }) } },
    '@/lib/supabase': { supabase, isSupabaseConfigured: () => true },
    '@/lib/game-view': views,
    '@/lib/game-utils': utils,
  })
}
function request(clientId) {
  return { url: 'http://localhost/api/games?code=123456',
    headers: { get: key => key.toLowerCase() === 'x-client-id' ? clientId : undefined },
    cookies: { get: () => undefined },
  }
}

for (const viewer of players) {
  test(`GET exposes only permitted fields for ${viewer.id}`, async () => {
    const route = api('src/app/api/games/route.ts', [game, players, round, [], []].map(data => ({ data })))
    const res = await route.GET(request(viewer.client_id))
    assert.equal(res.status, 200)
    assert.equal(res.headers['Cache-Control'], 'private, no-store')
    for (const player of res.data.players) {
      const original = players.find(p => p.id === player.id)
      assert.equal(player.role, viewer.is_host || viewer.id === player.id ? original.role : null)
      assert.equal(player.client_id, viewer.id === player.id ? original.client_id : '')
      assert.equal('future_secret' in player, false)
    }
    assert.equal(res.data.currentPlayer.role, viewer.role)
    assert.equal('future_secret' in res.data.currentPlayer, false)
    if (!viewer.is_host) {
      assert.equal(res.data.game.host_client_id, '')
      assert.equal('wolf_target_map' in res.data.roundState, false)
      assert.equal(res.data.roundState.wolf_target_player_id, null)
      assert.equal(res.data.roundState.police_inspect_result, viewer.role === 'police' ? 'werewolf' : null)
      const serialized = JSON.stringify(res.data)
      for (const other of players.filter(p => p.id !== viewer.id)) assert.equal(serialized.includes(other.client_id), false)
    } else {
      assert.equal(res.data.roundState.wolf_target_map, round.wolf_target_map)
    }
  })
}

test('GET rejects an unknown client', async () => {
  const route = api('src/app/api/games/route.ts', [game, players].map(data => ({ data })))
  assert.equal((await route.GET(request('unknown'))).status, 401)
})

test('join response also hides existing roles and other identities', async () => {
  const viewer = players[4]
  const route = api('src/app/api/games/join/route.ts', [
    { data: { ...game, phase: 'lobby' } }, { data: null }, { data: viewer }, { data: players },
  ])
  const res = await route.POST({ json: async () => ({ gameId: game.code, playerName: viewer.name, clientId: viewer.client_id }) })
  assert.equal(res.status, 200)
  assert.equal(res.data.game.host_client_id, '')
  assert.equal(res.data.players.filter(p => p.role !== null).length, 1)
  assert.equal(JSON.stringify(res.data).includes('host-secret'), false)
})

test('dead police cannot retrieve investigation results from game view', () => {
  const result = views.roundView(round, { ...players[3], alive: false })
  assert.equal(result.police_inspect_result, null)
  assert.equal(result.police_inspect_player_id, null)
})

test('browser sync uses filtered API only', () => {
  const source = fs.readFileSync('src/hooks/useRealtimeSync.ts', 'utf8')
  assert.equal(source.includes(".from("), false)
  assert.equal(source.includes('.channel('), false)
  assert.equal(source.includes('/api/games?code='), true)
})


test('filtered refresh preserves host controls, role changes, votes and leave decisions', () => {
  const jotai = require('jotai/vanilla')
  const atoms = load('src/lib/game-store.ts', { jotai })
  const store = jotai.createStore()
  const vote = { id: 'vote', game_id: game.id, voter_player_id: 'villager', target_player_id: 'wolf', round: 0, phase: 'day_vote' }
  const leave = { id: 'leave', player_id: 'villager', status: 'pending' }
  const state = { game, players, currentPlayer: players[0], roundState: round, votes: [vote], leaveRequests: [leave] }
  store.set(atoms.setGameDataAtom, state)
  assert.equal(store.get(atoms.isHostAtom), true)
  const nextRound = { ...round, wolf_target_map: 'wolf:doctor,wolf2:villager' }
  store.set(atoms.setGameDataAtom, { ...state, roundState: nextRound, votes: [{ ...vote, target_player_id: 'doctor' }], leaveRequests: [{ ...leave, status: 'denied' }] })
  assert.equal(store.get(atoms.roundStateAtom).wolf_target_map, nextRound.wolf_target_map)
  assert.equal(store.get(atoms.votesAtom)[0].target_player_id, 'doctor')
  assert.equal(store.get(atoms.leaveRequestsAtom)[0].status, 'denied')
  assert.equal(store.get(atoms.isHostAtom), true)
  const changedPlayers = players.map(p => p.id === 'villager' ? { ...p, role: 'doctor' } : p)
  store.set(atoms.setGameDataAtom, { ...state, players: changedPlayers, currentPlayer: changedPlayers[4] })
  assert.equal(store.get(atoms.currentPlayerAtom).role, 'doctor')
  assert.equal(store.get(atoms.isHostAtom), false)
})

function syncHarness(responses, currentPlayer = players[4]) {
  let cleanup
  let nextId = 0
  const timers = new Map()
  const updates = []
  const removed = []
  let resets = 0
  let ended = 0
  let calls = 0
  const atoms = { currentPlayerAtom: {}, setGameDataAtom: {}, resetGameAtom: {} }
  const hook = load('src/hooks/useRealtimeSync.ts', {
    react: { useRef: value => ({ current: value }), useEffect: effect => { cleanup = effect() } },
    jotai: { useAtom: atom => atom === atoms.currentPlayerAtom ? [currentPlayer] : [null, atom === atoms.setGameDataAtom ? data => updates.push(data) : () => resets++] },
    '@/lib/game-store': atoms,
  }, {
    AbortController, encodeURIComponent,
    setTimeout: (fn, delay) => { const id = ++nextId; timers.set(id, { fn: () => { timers.delete(id); fn() }, delay }); return id },
    clearTimeout: id => timers.delete(id),
    localStorage: { removeItem: key => removed.push(key) },
    fetch: async (url, options) => {
      calls++
      assert.equal(options.headers['x-client-id'], currentPlayer.client_id)
      const response = responses.shift()
      if (response instanceof Error) throw response
      return response
    },
  })
  hook.useRealtimeSync(game.code, () => ended++)
  return { updates, removed, timers, cleanup: () => cleanup(), stats: () => ({ resets, ended, calls }) }
}
const flush = () => new Promise(resolve => setImmediate(resolve))

test('sync retries transient failure, applies refresh and cleans up timer', async () => {
  const state = { game, currentPlayer: players[4], players }
  const h = syncHarness([new Error('temporary offline'), { ok: true, status: 200, json: async () => state }])
  await flush()
  assert.equal(h.stats().resets, 0)
  const retry = [...h.timers.values()].find(t => t.delay === 1000)
  assert.ok(retry)
  retry.fn()
  await flush()
  assert.equal(h.updates.length, 1)
  assert.equal(h.updates[0], state)
  h.cleanup()
  assert.equal(h.timers.size, 0)
})

test('host stays on results; non-host exits when game ends', async () => {
  for (const viewer of [players[0], players[4]]) {
    const state = { game: { ...game, phase: 'ended' }, currentPlayer: viewer, players }
    const h = syncHarness([{ ok: true, status: 200, json: async () => state }], viewer)
    await flush()
    assert.equal(h.stats().ended, viewer.is_host ? 0 : 1)
    assert.equal(h.updates.length, viewer.is_host ? 1 : 0)
    h.cleanup()
  }
})

test('removed player exits; deleted room exits', async () => {
  for (const status of [401, 404]) {
    const h = syncHarness([{ ok: false, status }])
    await flush()
    assert.equal(h.stats().resets, 1)
    assert.equal(h.stats().ended, 1)
    assert.equal(h.removed.length, 4)
    assert.equal(h.timers.size, 0)
    h.cleanup()
  }
})
