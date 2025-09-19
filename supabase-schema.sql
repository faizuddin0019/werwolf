-- Werwolf Database Schema
-- Run this in your Supabase SQL editor

-- Create custom types
CREATE TYPE game_phase AS ENUM (
  'lobby',
  'night_wolf', 
  'night_police',
  'night_doctor',
  'reveal',
  'day_vote',
  'day_final_vote',
  'ended'
);

CREATE TYPE player_role AS ENUM (
  'villager',
  'werewolf', 
  'doctor',
  'police'
);

CREATE TYPE win_state AS ENUM (
  'villagers',
  'werewolves'
);

CREATE TYPE police_result AS ENUM (
  'werewolf',
  'not_werewolf'
);

CREATE TYPE vote_phase AS ENUM (
  'day_vote',
  'day_final_vote'
);

CREATE TYPE leave_request_status AS ENUM (
  'pending',
  'approved',
  'denied'
);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code CHAR(6) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  host_client_id TEXT NOT NULL,
  phase game_phase DEFAULT 'lobby',
  win_state win_state DEFAULT NULL,
  day_count INTEGER DEFAULT 0
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role player_role DEFAULT NULL,
  alive BOOLEAN DEFAULT TRUE,
  is_host BOOLEAN DEFAULT FALSE,
  UNIQUE(game_id, client_id)
);

-- Round state table
CREATE TABLE round_state (
  game_id UUID PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
  wolf_target_player_id UUID REFERENCES players(id) DEFAULT NULL,
  police_inspect_player_id UUID REFERENCES players(id) DEFAULT NULL,
  police_inspect_result police_result DEFAULT NULL,
  doctor_save_player_id UUID REFERENCES players(id) DEFAULT NULL,
  resolved_death_player_id UUID REFERENCES players(id) DEFAULT NULL
);

-- Votes table
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  voter_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  target_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  phase vote_phase NOT NULL,
  UNIQUE(game_id, voter_player_id, round, phase)
);

-- Leave requests table
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  status leave_request_status DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ DEFAULT NULL,
  processed_by UUID REFERENCES players(id) ON DELETE SET NULL,
  UNIQUE(game_id, player_id)
);

-- Indexes for performance
CREATE INDEX idx_games_code_created ON games(code, created_at);
CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_players_client_id ON players(client_id);
CREATE INDEX idx_votes_game_round_phase ON votes(game_id, round, phase);
CREATE INDEX idx_votes_voter ON votes(voter_player_id);
CREATE INDEX idx_votes_target ON votes(target_player_id);
CREATE INDEX idx_leave_requests_game_id ON leave_requests(game_id);
CREATE INDEX idx_leave_requests_player_id ON leave_requests(player_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);

-- Note: Game codes are unique per game, not per day
-- This allows multiple games with the same code on different days

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now - can be tightened later)
CREATE POLICY "Allow all operations on games" ON games FOR ALL USING (true);
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations on round_state" ON round_state FOR ALL USING (true);
CREATE POLICY "Allow all operations on votes" ON votes FOR ALL USING (true);
CREATE POLICY "Allow all operations on leave_requests" ON leave_requests FOR ALL USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE round_state;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE leave_requests;
