'use client'

import { useState } from 'react'
import { Copy, Users, Moon, Sun, Shield, Stethoscope } from 'lucide-react'

export default function DemoMode() {
  const [copied, setCopied] = useState(false)

  const handleCopySetup = async () => {
    const setupText = `# Supabase Setup Instructions

1. Go to https://supabase.com and create a new project
2. Run the SQL schema from supabase-schema.sql in the SQL Editor
3. Copy your project URL and anon key from Settings > API
4. Update your .env.local file:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

5. Restart the development server`

    try {
      await navigator.clipboard.writeText(setupText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-200 via-yellow-100 to-amber-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">🐺 Werwolf</h1>
              <p className="text-sm text-gray-600">Video-Conference Companion</p>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Demo Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Welcome to Werwolf Demo!
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            This is a demo of the Werwolf video-conference companion app.
          </p>
        </div>

        {/* Setup Instructions */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            🚀 To Use the Full App
          </h3>
          
          <div className="space-y-4">
            <p className="text-gray-600">
              The app is currently running in demo mode. To enable full functionality with real-time multiplayer features, you need to set up Supabase:
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Quick Setup:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                <li>Create a free Supabase project at <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">supabase.com</a></li>
                <li>Run the SQL schema from <code className="bg-gray-200 px-1 rounded">supabase-schema.sql</code></li>
                <li>Copy your project URL and anon key</li>
                <li>Update your <code className="bg-gray-200 px-1 rounded">.env.local</code> file</li>
                <li>Restart the development server</li>
              </ol>
            </div>
            
            <button
              onClick={handleCopySetup}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'Copied!' : 'Copy Setup Instructions'}</span>
            </button>
          </div>
        </div>

        {/* Game Features Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              🎮 Game Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span>6-20 players support</span>
              </li>
              <li className="flex items-center space-x-2">
                <Moon className="w-4 h-4 text-red-500" />
                <span>Werwolf night actions</span>
              </li>
              <li className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-500" />
                <span>Police investigations</span>
              </li>
              <li className="flex items-center space-x-2">
                <Stethoscope className="w-4 h-4 text-green-500" />
                <span>Doctor saves</span>
              </li>
              <li className="flex items-center space-x-2">
                <Sun className="w-4 h-4 text-yellow-500" />
                <span>Day voting system</span>
              </li>
            </ul>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              🎯 How It Works
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Host creates game with 6-digit code</li>
              <li>• Players join using the code</li>
              <li>• Automatic role assignment</li>
              <li>• Real-time synchronization</li>
              <li>• Zero typing during play</li>
              <li>• Works alongside video calls</li>
            </ul>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            🛠️ Technical Stack
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-800">Frontend</div>
              <div className="text-gray-600">Next.js 15</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-800">Backend</div>
              <div className="text-gray-600">Supabase</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-800">State</div>
              <div className="text-gray-600">Jotai</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-800">Deploy</div>
              <div className="text-gray-600">Vercel</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Ready to play Werwolf remotely? Set up Supabase to get started!</p>
        </div>
      </div>
    </div>
  )
}
