/**
 * Browser fingerprinting utility to create a unique identifier for each browser
 * This ensures that player sync only works within the same browser
 */

// Generate a browser fingerprint based on various browser characteristics
export function generateBrowserFingerprint(): string {
  if (typeof window === 'undefined') {
    // Server-side: return a random ID (shouldn't happen in normal flow)
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  // Collect browser characteristics
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('Browser fingerprint', 2, 2)
  }

  // More comprehensive fingerprinting
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.platform,
    navigator.cookieEnabled ? '1' : '0',
    navigator.doNotTrack || 'unknown',
    navigator.hardwareConcurrency || 'unknown',
    navigator.maxTouchPoints || '0',
    window.devicePixelRatio || '1',
    canvas.toDataURL()
    // Removed Date.now() to make fingerprint consistent across page refreshes
  ].join('|')

  // Create a simple hash of the fingerprint
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36)
}

// Generate a browser-specific client ID
export function generateBrowserSpecificClientId(): string {
  const browserFingerprint = generateBrowserFingerprint()
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  
  return `${browserFingerprint}-${timestamp}-${random}`
}

// Check if a client ID belongs to the current browser
export function isClientIdFromCurrentBrowser(clientId: string): boolean {
  if (typeof window === 'undefined') return false
  
  const currentFingerprint = generateBrowserFingerprint()
  return clientId.startsWith(currentFingerprint + '-')
}

// Get or create a browser-specific client ID from localStorage
export function getOrCreateBrowserClientId(): string {
  if (typeof window === 'undefined') {
    return generateBrowserSpecificClientId()
  }

  const storageKey = 'werwolf-browser-client-id'
  let clientId = localStorage.getItem(storageKey)

  // Check if the stored client ID is from the current browser
  if (clientId && isClientIdFromCurrentBrowser(clientId)) {
    return clientId
  }

  // Generate new client ID for this browser
  clientId = generateBrowserSpecificClientId()
  localStorage.setItem(storageKey, clientId)
  
  return clientId
}
