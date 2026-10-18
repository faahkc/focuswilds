export function seededRandom(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export const camp = { floor: .8, fireX: -4.5, fireZ: 2, stairX: .5 }
export const fortCamera = { x: 14, y: 14, z: 30 }

export function courtyardRightEdge(z: number) {
  return 2 + Math.min(1, Math.max(0, (z + 4) / 2)) * 6.6 + Math.sin(z * .9) * .35 + Math.min(3, Math.max(0, z - 4) * .12)
}

export function courtyardHeight(x: number, z: number, stairX = camp.stairX) {
  const descent = Math.min(9, Math.max(0, (z - 3.8) / .53)) * .22
  const roughness = Math.min(1, Math.max(0, z - 4)) * Math.min(1, Math.max(0, Math.abs(x - camp.stairX) - 3))
  const stairBed = z > 3.8 && z < 9 && Math.abs(x - stairX) < 2.8 ? .4 : 0
  return camp.floor - descent - stairBed - Math.max(0, z - 12) * .35 - Math.abs(Math.sin(x * 1.3) * Math.cos(z * .9)) * .18 * roughness
}

export function courtyardTerrain(stairX = camp.stairX) {
  const columns = 32, rows = 48, positions: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let row = 0; row <= rows; row++) {
    const z = -8 + row * 1.5
    const left = -16 + Math.sin(z * .7) * .35
    const right = courtyardRightEdge(z)
    for (let column = 0; column <= columns; column++) {
      const x = left + (right - left) * column / columns
      positions.push(x, courtyardHeight(x, z, stairX), z); uvs.push(x / 22.5, z / 10)
      if (row < rows && column < columns) {
        const a = row * (columns + 1) + column, c = a + columns + 1
        indices.push(a, c, a + 1, a + 1, c, c + 1)
      }
    }
  }
  const topIndexCount = indices.length, edge: number[] = []
  for (let column = 0; column <= columns; column++) edge.push(column)
  for (let row = 1; row <= rows; row++) edge.push(row * (columns + 1) + columns)
  for (let column = columns - 1; column >= 0; column--) edge.push(rows * (columns + 1) + column)
  for (let row = rows - 1; row > 0; row--) edge.push(row * (columns + 1))
  for (let i = 0; i < edge.length; i++) {
    const a = edge[i] * 3, b = edge[(i + 1) % edge.length] * 3, start = positions.length / 3
    positions.push(...positions.slice(a, a + 3), ...positions.slice(b, b + 3), positions[b], -60, positions[b + 2], positions[a], -60, positions[a + 2])
    uvs.push(i / 16, positions[a + 1] / 24, (i + 1) / 16, positions[b + 1] / 24, (i + 1) / 16, -60 / 24, i / 16, -60 / 24)
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3)
  }
  return { positions, uvs, indices, topIndexCount }
}

export function stepHeight(index: number) {
  return camp.floor - Math.max(0, Math.min(8, index)) * .22
}

export function courtyardPavers(stairX = camp.stairX) {
  const random = seededRandom(407), stones = []
  for (let row = 0; row < 22; row++) {
    const z = -5 + row * .85
    for (let column = 0; column < 24; column++) {
      const x = -15 + column + (row % 2) * .5
      const jitterX = (random() - .5) * .16, jitterZ = (random() - .5) * .12, turn = random() * .4
      if (x > courtyardRightEdge(z) - .65 || (z > 3.5 && z < 9.3 && Math.abs(x - stairX) < 3)) continue
      stones.push({ x: x + jitterX, y: courtyardHeight(x + jitterX, z + jitterZ, stairX), z: z + jitterZ, turn })
    }
  }
  return stones
}

export function titleFraming(width: number, height: number) {
  const aspect = Math.max(1, width) / Math.max(1, height)
  const wide = Math.max(0, Math.min(1, (aspect - .65) / .75))
  const viewHeight = Math.max(14.5, 7.8 / aspect)
  return { aspect, height: viewHeight, centerX: -.8 - 5.4 * (1 - wide), centerY: 1.7 + (1 - wide) * (1.2 + viewHeight * .17 / Math.cos(Math.atan2(fortCamera.y, Math.hypot(fortCamera.x, fortCamera.z)))), compact: 1 - wide, foregroundScale: .55 + wide * .45 }
}

export function sceneRenderSize(width: number, height: number, lowQuality = false) {
  const scale = Math.min(1, (lowQuality ? 1600 : 3200) / Math.max(1, width), (lowQuality ? 1000 : 1800) / Math.max(1, height))
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
