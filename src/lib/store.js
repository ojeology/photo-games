const KEY = 'photo-games:avatar'

// In-memory copy so the avatar survives for the session even if localStorage
// quota is exceeded (a 600x600 PNG data URL can be large on mobile).
let _mem = null

export const store = {
  getAvatar() {
    return _mem || localStorage.getItem(KEY)
  },
  hasAvatar() {
    return !!(_mem || localStorage.getItem(KEY))
  },
  setAvatar(dataUrl) {
    _mem = dataUrl
    try {
      localStorage.setItem(KEY, dataUrl)
    } catch (e) {
      console.warn('Could not persist avatar to localStorage (using memory only):', e)
    }
  },
  clearAvatar() {
    _mem = null
    try {
      localStorage.removeItem(KEY)
    } catch (_) {}
  },
}
