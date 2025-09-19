# Deployment Guide

This guide will help you deploy Werwolf to Vercel with Supabase as the backend.

## Prerequisites

- GitHub account
- Vercel account (free)
- Supabase account (free)

## Step 1: Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (usually takes 1-2 minutes)
3. Go to the **SQL Editor** in your Supabase dashboard
4. Copy the contents of `supabase-schema.sql` and run it
5. Go to **Settings > API** and copy:
   - Project URL
   - Anon public key

## Step 2: Deploy to Vercel

### Option A: Deploy from GitHub (Recommended)

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect it's a Next.js project
6. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
7. Click "Deploy"

### Option B: Deploy with Vercel CLI

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the prompts to link to your Vercel account
4. Add environment variables in the Vercel dashboard

## Step 3: Configure Environment Variables

In your Vercel project dashboard:

1. Go to **Settings > Environment Variables**
2. Add these variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Make sure they're enabled for **Production**, **Preview**, and **Development**

## Step 4: Test Your Deployment

1. Visit your Vercel URL (e.g., `https://your-project.vercel.app`)
2. Try creating a new game
3. Test joining with another browser tab
4. Verify real-time updates work

## Step 5: Add Sound Effects (Optional)

1. Add `howl.mp3` and `ticktock.mp3` to the `public/sounds/` directory
2. Commit and push to trigger a new deployment
3. The sounds will be available at `/sounds/howl.mp3` and `/sounds/ticktock.mp3`

## Troubleshooting

### Common Issues

**"Failed to create game"**
- Check that your Supabase URL and key are correct
- Verify the database schema was created properly
- Check the Supabase logs for errors

**"Game not found"**
- Ensure the game code is exactly 6 digits
- Check that the game exists in your Supabase database

**Real-time updates not working**
- Verify Realtime is enabled in Supabase
- Check that RLS policies allow the operations
- Ensure the client is properly connected

**Build errors**
- Run `npm run build` locally to check for errors
- Check the Vercel build logs for specific issues
- Ensure all dependencies are in `package.json`

### Checking Logs

**Vercel Logs:**
- Go to your Vercel project dashboard
- Click on a deployment
- Check the "Functions" tab for API route logs

**Supabase Logs:**
- Go to your Supabase dashboard
- Check the "Logs" section for database errors
- Monitor the "API" logs for request issues

## Performance Optimization

### Database Indexes
The schema includes optimized indexes, but you can add more if needed:

```sql
-- Add more indexes if you notice slow queries
CREATE INDEX idx_players_game_alive ON players(game_id, alive);
CREATE INDEX idx_votes_game_phase ON votes(game_id, phase);
```

### Vercel Configuration
Add a `vercel.json` file for custom configuration:

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

## Monitoring

### Vercel Analytics
- Enable Vercel Analytics in your project settings
- Monitor page views and performance

### Supabase Monitoring
- Check the Supabase dashboard for:
  - Database performance
  - API usage
  - Realtime connections

## Scaling

### Free Tier Limits
- **Vercel**: 100GB bandwidth, 100 serverless function executions
- **Supabase**: 500MB database, 2GB bandwidth, 50,000 monthly active users

### Upgrading
- **Vercel Pro**: $20/month for more bandwidth and functions
- **Supabase Pro**: $25/month for more database space and features

## Security

### Environment Variables
- Never commit `.env.local` to version control
- Use Vercel's environment variable system
- Rotate your Supabase keys regularly

### Database Security
- The current RLS policies allow all operations for simplicity
- For production, consider tightening the policies:

```sql
-- Example: Only allow players to see their own data
CREATE POLICY "Players can view own data" ON players
  FOR SELECT USING (client_id = current_setting('request.jwt.claims')::json->>'sub');
```

## Backup

### Database Backup
- Supabase automatically backs up your database
- You can also export data manually from the dashboard

### Code Backup
- Your code is backed up in GitHub
- Vercel keeps deployment history

## Updates

### Updating the App
1. Make changes to your code
2. Commit and push to GitHub
3. Vercel will automatically deploy the changes

### Updating Dependencies
1. Run `npm update`
2. Test locally with `npm run dev`
3. Commit and push to trigger deployment

## Support

If you need help:
1. Check the [README.md](./README.md) for general information
2. Look at the [Supabase documentation](https://supabase.com/docs)
3. Check the [Vercel documentation](https://vercel.com/docs)
4. Open an issue in the GitHub repository
