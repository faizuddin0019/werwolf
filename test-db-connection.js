#!/usr/bin/env node

/**
 * Test Database Connection
 * Simple test to verify Supabase connection and schema
 */

import { createClient } from '@supabase/supabase-js'

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim().replace(/[\r\n]/g, '')
  
  console.log('📋 Environment Variables:')
  console.log(`  - URL: ${supabaseUrl ? 'Set' : 'Missing'}`)
  console.log(`  - Key: ${supabaseAnonKey ? 'Set' : 'Missing'}`)
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase environment variables')
    return false
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  
  try {
    // Test 1: Check if we can connect
    console.log('📝 Test 1: Testing basic connection...')
    const { error } = await supabase.from('games').select('count').limit(1)
    
    if (error) {
      console.error('❌ Database connection failed:', error.message)
      return false
    }
    
    console.log('✅ Database connection successful')
    
    // Test 2: Check if we can create a game
    console.log('📝 Test 2: Testing game creation...')
    const gameCode = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
    
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .insert({
        code: gameCode,
        host_client_id: 'test-client-123',
        phase: 'lobby'
      })
      .select()
      .single()
    
    if (gameError) {
      console.error('❌ Game creation failed:', gameError.message)
      return false
    }
    
    console.log('✅ Game creation successful:', gameData.id)
    
    // Test 3: Check if we can create a player
    console.log('📝 Test 3: Testing player creation...')
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .insert({
        game_id: gameData.id,
        client_id: 'test-player-123',
        name: 'Test Player',
        role: 'villager',
        alive: true,
        is_host: false
      })
      .select()
      .single()
    
    if (playerError) {
      console.error('❌ Player creation failed:', playerError.message)
      return false
    }
    
    console.log('✅ Player creation successful:', playerData.id)
    
    // Test 4: Test role assignment
    console.log('📝 Test 4: Testing role assignment...')
    const { error: roleError } = await supabase
      .from('players')
      .update({ role: 'werewolf' })
      .eq('id', playerData.id)
    
    if (roleError) {
      console.error('❌ Role assignment failed:', roleError.message)
      return false
    }
    
    console.log('✅ Role assignment successful')
    
    // Cleanup
    await supabase.from('players').delete().eq('id', playerData.id)
    await supabase.from('games').delete().eq('id', gameData.id)
    
    console.log('🎉 All database tests passed!')
    return true
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message)
    return false
  }
}

// Run the test
if (require.main === module) {
  testDatabaseConnection().then(success => {
    process.exit(success ? 0 : 1)
  })
}

module.exports = { testDatabaseConnection }
