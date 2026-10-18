export function seededRandom(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export const camp = { floor: .8, fireX: -6, fireZ: 0 }

export function stepHeight(index: number) {
  return camp.floor - Math.max(0, Math.min(8, index)) * .22
}

export function titleFraming(width: number, height: number) {
  const aspect = Math.max(.25, width / Math.max(1, height))
  const wide = Math.max(0, Math.min(1, (aspect - .65) / .75))
  return { aspect, height: Math.max(24 - wide * 4, 10.8 / aspect), centerX: -5.3 * (1 - wide), centerY: 5.4 + 1.4 * (1 - wide), compact: 1 - wide, foregroundScale: .72 + wide * .28 }
}

export function sceneRenderSize(width: number, height: number, lowQuality = false) {
  const scale = Math.min(1, (lowQuality ? 960 : 1920) / Math.max(1, width), (lowQuality ? 720 : 1200) / Math.max(1, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function survivorPose(time: number, survivor: number) {
  return Math.floor(Math.max(0, time) / 1.2 + survivor * 1.37) % 4
}

// Trimmed frame bounds keep the generated poses on fixed feet at one world scale per source pixel.
export function survivorFrame(time: number, survivor: number) {
  const pose = survivorPose(time, survivor)
  return { top: [20, 142, 262, 381][pose], bottom: (survivor === 3 ? [132, 254, 374, 494] : [125, 249, 370, 488])[pose] }
}

// Align the flame emitter without moving or stretching the fixed logs.
export function fireFrame(time: number) {
  const pose = Math.floor(Math.max(0, time) * 8) % 6
  return { pose, left: pose % 3 * 128 + [8, 0, -2, 8, 0, -1][pose], bottom: pose < 3 ? 110 : 230, height: pose < 3 ? 110 : 102 }
}
