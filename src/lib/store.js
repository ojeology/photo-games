const KEY = 'photo-games:avatar'
const HEAD_KEY = 'photo-games:head'
const JERSEY_KEY = 'photo-games:jersey'
const SKIN_KEY = 'photo-games:skin'
const TUT_KEY = 'photo-games:walkthrough-seen'

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
  getAvatar() { return ls.get(KEY) },
  hasAvatar() { return ls.has(KEY) },
  setAvatar(d) { ls.set(KEY, d) },

  getHead() { return ls.get(HEAD_KEY) },
  hasHead() { return ls.has(HEAD_KEY) },
  setHead(d) { ls.set(HEAD_KEY, d) },

  getJersey() { return ls.get(JERSEY_KEY) },
  setJersey(s) { ls.set(JERSEY_KEY, s) },

  getSkin() { return ls.get(SKIN_KEY) },
  hasSkin() { return ls.has(SKIN_KEY) },
  setSkin(s) { ls.set(SKIN_KEY, s) },

  hasSeenWalkthrough() { return ls.has(TUT_KEY) },
  setWalkthroughSeen() { ls.set(TUT_KEY, '1') },

  clearAvatar() {
    _mem = {}
    try {
      localStorage.removeItem(KEY)
      localStorage.removeItem(HEAD_KEY)
      localStorage.removeItem(JERSEY_KEY)
      localStorage.removeItem(SKIN_KEY)
    } catch (e) {}
  },
}
