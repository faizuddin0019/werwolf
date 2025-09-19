# 🐺 Werwolf - Video-Conference Companion

A web-based companion app for playing Werwolf remotely while keeping all conversation in your video call. Host-controlled with zero typing required during play.

## 🌐 Live Game

**🎮 Play Now:** [https://wearwolf-theta.vercel.app](https://wearwolf-theta.vercel.app)

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
- **👥 6-20 players** - Supports games from 6 to 20 players
- **🔢 Unique game codes** - 6-digit codes that never repeat within the same day
- **🎭 Role-based interactions** - Werewolves, Doctor, Police, and Villagers
- **🎨 Visual feedback** - Color-coded actions and vote counts
- **🔊 Sound effects** - Audio cues for role assignment and voting
- **🚪 Leave request system** - Players request to leave, host approves
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
3. **Wait for Players**: Need 6-20 players to start
4. **Assign Roles**: Click "Assign Roles & Start" to begin
5. **Control Phases**: Use host controls to manage night/day phases
6. **Reveal Results**: Show who died, who was saved, etc.
7. **Manage Voting**: Start voting, call for final vote, eliminate players

### For Players

1. **Join Game**: Enter the 6-digit code and your name
2. **Wait in Lobby**: Wait for host to assign roles
3. **Follow Instructions**: Click buttons when it's your turn
4. **Vote**: Select players to eliminate during day phases
5. **Win**: Help your team achieve victory!

## Game Rules

### Roles

- **Werewolves** (1-3): Eliminate villagers at night
- **Doctor**: Save one player each night
- **Police**: Inspect one player each night (learns if they're a werwolf)
- **Villagers**: Vote to eliminate suspects during the day

### Win Conditions

- **Villagers Win**: Eliminate all werewolves
- **Werewolves Win**: Equal or outnumber remaining villagers

### Game Flow

1. **Lobby**: Players join, host assigns roles
2. **Night**: Werewolves select victim, Doctor saves someone, Police inspects
3. **Reveal**: Show who died (if not saved by Doctor)
4. **Day**: All players vote to eliminate a suspect
5. **Repeat**: Continue until win condition is met

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

## 🗄️ Database Schema

The app uses 5 main tables with Supabase PostgreSQL:

- **games**: Game state, phase, win condition, host information
- **players**: Player info, roles, alive status, host status
- **round_state**: Current night actions (wolf target, doctor save, police inspection)
- **votes**: Voting records for each round and phase
- **leave_requests**: Player leave requests with host approval system

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

- **Quick Tests**: `npm run test:quick` - 21/21 tests passing
- **Leave Game Tests**: `npm run test:leave-game` - Comprehensive leave system tests
- **All Tests**: `npm run test:all` - Complete test suite
- **CI/CD**: `npm run test:ci` - Automated testing pipeline

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