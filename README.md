# 🐺 Werwolf - Video-Conference Companion

A web-based companion app for playing Werwolf remotely while keeping all conversation in your video call. Host-controlled with zero typing required during play.

## 🌐 Live Game

**🎮 Play Now:** [https://wearwolf-theta.vercel.app](https://wearwolf-theta.vercel.app) 🚀

**📱 Mobile Friendly:** Works perfectly on phones, tablets, and desktops!

**🔗 GitHub Repository:** [https://github.com/faizuddin0019/werwolf](https://github.com/faizuddin0019/werwolf)

## 🎯 Quick Start for Players

1. **Visit the game:** [https://wearwolf-oa7pcqidv-faizuddin0019s-projects.vercel.app](https://wearwolf-oa7pcqidv-faizuddin0019s-projects.vercel.app)
2. **Host creates game:** Enter name and click "Start Game"
3. **Share game code:** Host shares the 6-digit code with players
4. **Players join:** Enter the code and your name
5. **Start playing:** Host assigns roles and the game begins!

**🎮 No downloads required - works in any web browser!**

## ✨ Features

- **🎮 Host-controlled gameplay** - The host manages all game phases
- **🚫 Zero typing during play** - Players only click buttons
- **⚡ Real-time synchronization** - All players see updates instantly
- **📱 Mobile-friendly** - Works on phones, tablets, and desktops
- **👥 Host + 6 players (7 total)** - Requires at least 7 people including the host, with no player cap
- **🔢 Unique game codes** - 6-digit codes that never repeat within the same day
- **🎭 Role-based interactions** - Werewolves, Doctor, Police, and Villagers
- **🎨 Visual feedback** - Color-coded actions and vote counts
- **🔊 Sound effects** - Audio cues for role assignment and voting
- **🚪 Leave request system** - Players request to leave (Lobby and Game), host approves
- **👑 Host player management** - Host can remove any player directly
- **💾 State persistence** - Game state saved across browser refreshes
- **🧪 Comprehensive testing** - 21/21 tests passing

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime)
- **State Management**: Jotai
- **Deployment**: Vercel (Free tier)

## Quick Start

### 1. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the contents of `supabase-schema.sql`
3. Copy your project URL and anon key from Settings > API

### 2. Configure Environment

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Add Sound Effects (Optional)

Add these files to `public/sounds/`:
- `howl.mp3` - Werwolf howling sound (2-3 seconds)
- `ticktock.mp3` - Tick-tock sound for voting (can loop)

## How to Play

### For Hosts

1. **Start a Game**: Enter your name, check "I'm the host", and click "Start Game"
2. **Share Code**: Share the 6-digit game code with players
3. **Wait for Players**: Need Host + 6 players to start
4. **Assign Roles**: Click "Assign Roles & Start" to begin (Lobby never shows "Wake Up Werwolf")
5. **Control Phases**: Use host controls to manage night/day phases
6. **Reveal Results**: Show who died, who was saved, etc.
7. **Manage Voting**: Start voting, call for final vote, eliminate players

### For Players

1. **Join Game**: Enter the 6-digit code and your name
2. **Wait in Lobby**: Wait for host to assign roles
3. **Follow Instructions**: Click buttons when it's your turn
4. **Vote**: Select players to eliminate during day phases
5. **Win**: Help your team achieve victory!

## 🎮 Complete Game Rules

### 👥 Player Requirements

- **Minimum Players**: Host + 6 players (7 total)
- **Maximum Players**: No application-level player cap
- **Host Role**: Always alive, manages game phases, excluded from win conditions
- **Game Players**: Participate in gameplay, included in win conditions

### 🎭 Roles & Abilities

#### **Werewolves** (1-4 players)
- **Night Action**: Select one player to eliminate each night
- **Team**: Work together to eliminate villagers
- **Win Condition**: Outnumber or equal remaining villagers
- **Special**: Can see other werewolves' identities

#### **Doctor** (1 player)
- **Night Action**: Save one player each night (including themselves)
- **Ability**: Prevents the selected player from being eliminated
- **Strategy**: Can save themselves or protect villagers
- **Win Condition**: Help villagers eliminate all werewolves

#### **Police** (1 player)
- **Night Action**: Inspect one player each night
- **Ability**: Learns if the inspected player is a werewolf (YES/NO)
- **Strategy**: Gather information to help villagers vote correctly
- **Win Condition**: Help villagers eliminate all werewolves

#### **Villagers** (Remaining players)
- **Day Action**: Vote to eliminate suspects during day phases
- **Ability**: No special night actions
- **Strategy**: Use information from Police and Doctor to identify werewolves
- **Win Condition**: Eliminate all werewolves

### 🏆 Win Conditions

#### **Villagers Win When:**
- All werewolves are eliminated
- OR when only 2 non-host players remain and no werewolves are alive

#### **Werewolves Win When:**
- Werewolves equal or outnumber remaining villagers
- OR when only 2 non-host players remain and at least one werewolf is alive

#### **Important Notes:**
- **Host is excluded** from all win condition calculations
- **Game ends automatically** when only 2 non-host players remain
- **Winner is declared** based on werewolf status, not player count

### 🌙 Game Phases & Flow

#### **1. Lobby Phase**
- Players join using the 6-digit game code
- Host waits for Host + 6 players to join
- Host assigns roles to all non-host players
- Game begins when host clicks "Assign Roles & Start"

#### **2. Night Phase Sequence**
**Night Wolf Phase:**
- Werewolves select one player to eliminate
- Werewolves can see each other's selections
- Host sees werewolf target in real-time

**Night Doctor Phase:**
- Doctor selects one player to save
- Doctor can save themselves or any other player
- Host sees doctor's save target in real-time

**Night Police Phase:**
- Police selects one player to inspect
- Police receives YES/NO answer about werewolf status
- Host sees police inspection results in real-time

#### **3. Reveal Phase**
- Host reveals who died (if not saved by Doctor)
- Shows werewolf target, doctor save, and police results
- Host must click "Reveal the Dead" after Police. Game then advances to day.

#### **4. Day Phase**
**Day Vote:**
- All alive players vote to eliminate one suspect
- Players can change their votes before final vote
- Vote counts are shown in real-time

**Day Final Vote:**
- Host calls for final vote
- Players cannot change votes after this
- Player with most votes is eliminated

#### **5. Repeat Cycle**
- Game returns to night phase
- Continue until win condition is met

### 🎯 Special Rules & Mechanics

#### **Role Assignment**
- **Automatic**: Host clicks "Assign Roles" and system randomly assigns
- **Manual Override**: Host can change any player's role before game starts
- **Role Distribution**: 
  - 1-4 Werewolves (excluding host: 6–8 players = 1, 9–12 = 2, 13–24 = 3, 25 or more = 4)
  - 1 Doctor
  - 1 Police
  - Remaining players are Villagers

#### **Voting System**
- **Real-time Updates**: Vote counts update immediately
- **Vote Changes**: Players can change votes until final vote
- **Tie Breaking**: If tied, no one is eliminated
- **Host Exclusion**: Host cannot vote (they manage the game)

#### **Night Actions**
- **Werewolf Target**: Must select one player each night
- **Doctor Save**: Can save any player (including themselves)
- **Police Inspect**: Gets YES/NO answer about werewolf status
- **Action Order**: Werewolf → Doctor → Police (fixed sequence)

#### **Death & Elimination**
- **Werewolf Attack**: Player dies unless saved by Doctor
- **Voting**: Player with most votes is eliminated
- **Elimination Effects**: Dead players cannot vote or perform actions
- **Information**: Dead players' roles are revealed to all

#### **Leave Request System**
- **Player Request**: Players can request to leave in both Lobby and Game screens
- **Host Approval**: Host must approve or deny leave requests
- **Game Reset**: If non-host players drop below 6, game resets to lobby
- **Host Removal**: Host can remove any player directly

#### **Real-time Synchronization**
- **Instant Updates**: All game events update immediately across all players
- **State Persistence**: Game state saved across browser refreshes
- **Browser-specific**: Each browser is treated as a separate player
- **Auto-refresh**: UI updates automatically on all game events

### 🚫 Important Restrictions

#### **Host Limitations**
- **Cannot Vote**: Host manages game but doesn't participate in voting
- **Cannot Leave**: Host can only end the game, not leave it
- **Cannot Be Eliminated**: Host is always alive and manages the game
- **Cannot Be Targeted**: Werewolves, Doctor, and Police cannot target host

#### **Player Limitations**
- **One Action Per Night**: Each role can only perform one action per night
- **No Communication**: All discussion happens in video call, not in game
- **No Role Revealing**: Players cannot reveal their roles in the game interface
- **No Spectating**: Dead players cannot see ongoing game actions

#### **Game Limitations**
- **Minimum Players**: Cannot start with fewer than 6 players
- **Maximum Players**: No application-level player cap
- **Role Limits**: Automatic assignment caps at 4 werewolves; host role overrides are unrestricted
- **Action Timing**: Night actions must be completed before advancing phases

### 🎨 Visual Indicators

#### **Color Coding**
- **Red**: Werewolf actions and eliminations
- **Green**: Doctor saves and villager wins
- **Blue**: Police inspections and information
- **Amber**: Villager actions and voting

#### **Real-time Updates**
- **Vote Counts**: Update immediately when players vote
- **Phase Changes**: Clear indicators of current game phase
- **Action Results**: Immediate feedback on night actions
- **Player Status**: Live updates on alive/dead status

### 🔧 Host Controls

#### **Game Management**
- **Start Game**: Begin the game after role assignment
- **Phase Control**: Advance through night and day phases
- **Vote Management**: Start voting and call for final votes
- **Player Management**: Remove players or approve leave requests

#### **Information Display**
- **Real-time Updates**: See all player actions as they happen
- **Vote Tracking**: Monitor vote counts and changes
- **Action Results**: View werewolf targets, doctor saves, police results
- **Player Status**: Track alive/dead status of all players

### 🎯 Strategy Tips

#### **For Villagers**
- **Listen Carefully**: Pay attention to voting patterns and player behavior
- **Use Information**: Trust the Police's inspection results
- **Protect Doctor**: Keep the Doctor alive as long as possible
- **Vote Strategically**: Eliminate suspicious players based on evidence

#### **For Werewolves**
- **Work Together**: Coordinate with other werewolves
- **Blend In**: Act like villagers during day phases
- **Target Wisely**: Eliminate key players (Doctor, Police, vocal villagers)
- **Create Confusion**: Spread misinformation during discussions

#### **For Doctor**
- **Save Strategically**: Protect key players or save yourself
- **Stay Hidden**: Don't reveal your identity too early
- **Track Patterns**: Notice who the werewolves are targeting
- **Communicate Carefully**: Share information without revealing your role

#### **For Police**
- **Inspect Systematically**: Check players based on voting patterns
- **Share Information**: Help villagers make informed decisions
- **Stay Alive**: Avoid being targeted by werewolves
- **Build Trust**: Establish credibility with other villagers

### 🏁 End Game Scenarios

#### **Automatic End Game**
- **Two Players Left**: Game ends when only 2 non-host players remain
- **Winner Declaration**: Based on werewolf status, not player count
- **Host Exclusion**: Host is not counted in end game calculations

#### **Manual End Game**
- **Host Control**: Host can end the game at any time
- **Winner Declaration**: Shows final results and survivors
- **Closeable Results**: Host can close winner screen to end game

#### **Game Reset**
- **Player Count**: If non-host players drop below 6, game resets to lobby
- **Same Code**: Game code remains the same for rejoining
- **Role Reassignment**: Host can reassign roles for new game

## 🚀 Deployment

### ✅ Successfully Deployed on Vercel

**Live URL:** [https://wearwolf-theta.vercel.app](https://wearwolf-theta.vercel.app)

**Vercel Dashboard:** [https://vercel.com/faizuddin0019s-projects/wearwolf](https://vercel.com/faizuddin0019s-projects/wearwolf)

### 🔧 Deployment Process

1. ✅ **Code pushed to GitHub** - [https://github.com/faizuddin0019/werwolf](https://github.com/faizuddin0019/werwolf)
2. ✅ **Vercel CLI setup** - Authenticated and configured
3. ✅ **Environment variables configured**:
   - `NEXT_PUBLIC_SUPABASE_URL` - Connected to Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Authentication configured
4. ✅ **Production deployment** - Live and accessible worldwide

### 🌍 Global Availability

- **CDN Distribution** - Fast loading worldwide
- **Automatic HTTPS** - Secure connections
- **Mobile Optimized** - Responsive design
- **Real-time Updates** - Instant game synchronization

### 🔄 Auto-Deployment

Any future pushes to the main branch will automatically trigger new deployments on Vercel!

## 🗄️ Database Schema (canonical)

The app uses 5 main tables with Supabase PostgreSQL:

- **games**: Game state, phase, win condition, host information
- **players**: Player info, roles, alive status, host status
- **round_state**: Current night actions (canonical columns)
  - `wolf_target_map` TEXT (CSV pairs wolfId:targetId for current night)
  - `wolf_target_player_id` UUID (optional convenience, last target)
  - `doctor_save_player_id` UUID
  - `police_inspect_player_id` UUID
  - `police_inspect_result` TEXT
  - `resolved_death_player_id` TEXT (CSV of ids actually killed at reveal)
- **votes**: Voting records for each round and phase
- **leave_requests**: Player leave requests with host approval system

### Browser role privacy

Game reads and joins return a filtered player view: only the host receives all roles;
other players receive their own role. Other players' client IDs, the host's client ID,
and private night actions are withheld. Browser synchronization polls this filtered API
about once per second instead of subscribing to raw database rows. Role assignment
uses a random server-side shuffle so player IDs do not reveal roles.

This protects normal application responses. Direct Supabase access and database
permissions are unchanged and remain outside this protection.

Run the local response regression checks with
`node --test tests/security/browser-role-privacy.test.cjs`.

### 🔄 Real-time Features

- **Live player updates** - See players joining/leaving instantly
- **Game state synchronization** - All players see the same game state
- **Leave request notifications** - Host gets notified of leave requests
- **Automatic cleanup** - Game data cleaned up when games end

## 🛠️ Development

### 📁 Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   └── games/         # Game management endpoints
│   │       ├── route.ts   # Create/fetch games
│   │       ├── join/      # Join game endpoint
│   │       └── [gameId]/  # Game actions (leave, end, etc.)
│   ├── globals.css        # Global styles and animations
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── WelcomeScreen.tsx  # Game creation and joining
│   ├── GameLobby.tsx      # Pre-game player management
│   ├── GameScreen.tsx     # Main game interface
│   ├── HostControls.tsx   # Host-only game controls
│   ├── NightOverlay.tsx   # Role-specific night actions
│   ├── VotingInterface.tsx # Day voting system
│   └── DemoMode.tsx       # Fallback when Supabase not configured
├── hooks/                 # Custom hooks
│   └── useRealtimeSync.ts # Real-time synchronization
└── lib/                   # Utilities and configuration
    ├── supabase.ts        # Supabase client and types
    ├── game-utils.ts      # Game logic and utilities
    └── game-store.ts      # Jotai state management
```

### 🧪 Testing

- **Quick Tests**: `npm run test:quick`
- **Leave Game Tests**: `npm run test:leave-game` - Comprehensive leave system tests
- **All Tests**: `npm run test:all` - Complete test suite
- **CI/CD**: `npm run test:ci` - Automated testing pipeline
#### Recently Added/Updated Tests
- Integration: `tests/integration/multi-werewolf-reveal.test.js`
- Integration: `tests/integration/multi-werewolf-edgecases.test.js`
- Integration: `tests/integration/reconnect-resilience.test.js`
- UI: Reveal button gating and Action Status visibility

### 🔧 Key Features Implemented

- **Leave Request System** - Players request to leave, host approves/denies
- **Host Player Management** - Host can remove any player directly
- **State Persistence** - Game state saved across browser refreshes
- **Real-time Sync** - Live updates for all players
- **Mobile Responsive** - Works on all device sizes
- **Animated UI** - Engaging visual effects and character animations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this for your own Werwolf games!

## 🆘 Support

If you encounter issues:

1. **Check the browser console** for errors
2. **Verify your Supabase configuration** - Make sure the database schema is set up
3. **Ensure all environment variables are set** in Vercel dashboard
4. **Check the live game** - [https://wearwolf-oa7pcqidv-faizuddin0019s-projects.vercel.app](https://wearwolf-oa7pcqidv-faizuddin0019s-projects.vercel.app)
5. **Run tests locally** - `npm run test:quick` to verify functionality

### 🐛 Common Issues

- **"Failed to fetch players"** - Check Supabase connection and database schema
- **"Game not found"** - Verify game code is correct (6 digits)
- **Players not showing** - Check real-time connection and browser console
- **Leave requests not working** - Ensure database has `leave_requests` table

## 🗺️ Roadmap

### ✅ Completed Features
- [x] Complete game implementation with all roles
- [x] Real-time synchronization
- [x] Leave request system with host approval
- [x] Host player management
- [x] State persistence across refreshes
- [x] Mobile-responsive design
- [x] Animated UI with character effects
- [x] Comprehensive testing suite
- [x] Production deployment on Vercel

### 🚧 Future Enhancements
- [ ] Custom game settings (role counts, special rules)
- [ ] Game history and statistics
- [ ] Spectator mode
- [ ] Mobile app (React Native)
- [ ] Integration with Discord/Slack bots
- [ ] Tournament mode
- [ ] Custom themes and character skins
- [ ] Voice chat integration
- [ ] Game replay system