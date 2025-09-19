# 🐺 Werwolf - Video-Conference Companion

A web-based companion app for playing Werwolf remotely while keeping all conversation in your video call. Host-controlled with zero typing required during play.

## Features

- **Host-controlled gameplay** - The host manages all game phases
- **Zero typing during play** - Players only click buttons
- **Real-time synchronization** - All players see updates instantly
- **Mobile-friendly** - Works on phones, tablets, and desktops
- **6-20 players** - Supports games from 6 to 20 players
- **Unique game codes** - 6-digit codes that never repeat within the same day
- **Role-based interactions** - Werewolves, Doctor, Police, and Villagers
- **Visual feedback** - Color-coded actions and vote counts
- **Sound effects** - Audio cues for role assignment and voting

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

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### Environment Variables

Make sure to set these in your Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

## Database Schema

The app uses 4 main tables:

- **games**: Game state, phase, win condition
- **players**: Player info, roles, alive status
- **round_state**: Current night actions (wolf target, doctor save, etc.)
- **votes**: Voting records for each round

## Development

### Project Structure

```
src/
├── app/                 # Next.js app router
│   ├── api/            # API routes
│   └── page.tsx        # Main page
├── components/         # React components
├── hooks/             # Custom hooks
└── lib/               # Utilities and configuration
    ├── supabase.ts    # Supabase client
    ├── game-utils.ts  # Game logic
    └── game-store.ts  # State management
```

### Key Components

- `WelcomeScreen`: Game creation and joining
- `GameLobby`: Pre-game player management
- `GameScreen`: Main game interface
- `HostControls`: Host-only game controls
- `NightOverlay`: Role-specific night actions
- `VotingInterface`: Day voting system

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this for your own Werwolf games!

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify your Supabase configuration
3. Ensure all environment variables are set
4. Check that the database schema is properly set up

## Roadmap

- [ ] Custom game settings (role counts, special rules)
- [ ] Game history and statistics
- [ ] Spectator mode
- [ ] Mobile app (React Native)
- [ ] Integration with Discord/Slack bots
- [ ] Tournament mode