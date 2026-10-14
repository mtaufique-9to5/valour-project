// Detects repeat clicks on the same cart line. A burst is a run of clicks on one
// line where each click comes less than `windowMs` after the previous click —
// accepted or not — so only the first click of a burst counts. A click at least
// `windowMs` after the previous one starts a new burst. Different lines never
// block each other.
export const createClickGuard = (windowMs) => {
  let last = { lineId: null, time: -Infinity }

  return {
    // Records the click and returns true when it continues the current burst.
    isRepeat: (lineId, now) => {
      const repeat = lineId === last.lineId && now - last.time < windowMs
      last = { lineId, time: now }
      return repeat
    },
  }
}
