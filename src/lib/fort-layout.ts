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
  return { aspect, height: Math.max(18 + wide * 2, 7.8 / aspect), centerX: -6 * (1 - wide), centerY: 5.2, foregroundScale: .68 + wide * .32 }
}

export function sceneRenderSize(width: number, height: number, lowQuality = false) {
  const scale = Math.min(1, (lowQuality ? 960 : 1920) / Math.max(1, width), (lowQuality ? 720 : 1200) / Math.max(1, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function survivorPose(time: number, survivor: number) {
  return Math.floor(Math.max(0, time) / 2.8 + survivor * .37) % 2
}
