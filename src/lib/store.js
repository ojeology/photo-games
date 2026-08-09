const KEY = 'photo-games:avatar'
const HEAD_KEY = 'photo-games:head'
const JERSEY_KEY = 'photo-games:jersey'

// In-memory copies so data survives the session even if localStorage quota
// is exceeded (a 600x600 image data URL can be large on mobile).
let _mem = {}
const ls = {
  get: (k) => _mem[k] || localStorage.getItem(k),
  has: (k) => !!(_mem[k] || localStorage.getItem(k)),
  set: (k, v) => {
    _mem[k] = v
    try {
      localStorage.setItem(k, v)
    } catch (e) {
      console.warn(`Could not persist ${k} to localStorage (memory only):`, e)
    }
  },
}

export const store = {
  getAvatar() {
    return ls.get(KEY)
  },
  hasAvatar() {
    return ls.has(KEY)
  },
  setAvatar(dataUrl) {
    ls.set(KEY, dataUrl)
  },

  getHead() {
    return ls.get(HEAD_KEY)
  },
  hasHead() {
    return ls.has(HEAD_KEY)
  },
  setHead(dataUrl) {
    ls.set(HEAD_KEY, dataUrl)
  },

  getJersey() {
    return ls.get(JERSEY_KEY)
  },
  setJersey(str) {
    ls.set(JERSEY_KEY, str)
  },

  clearAvatar() {
    _mem = {}
    try {
      localStorage.removeItem(KEY)
      localStorage.removeItem(HEAD_KEY)
      localStorage.removeItem(JERSEY_KEY)
    } catch (e) {
      /* ignore */
    }
  },
}
