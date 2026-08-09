const KEY = 'photo-games:avatar'

export const store = {
  getAvatar() {
    return localStorage.getItem(KEY)
  },
  hasAvatar() {
    return !!localStorage.getItem(KEY)
  },
  setAvatar(dataUrl) {
    try {
      localStorage.setItem(KEY, dataUrl)
    } catch (e) {
      console.warn('Could not persist avatar to localStorage:', e)
    }
  },
  clearAvatar() {
    localStorage.removeItem(KEY)
  },
}
