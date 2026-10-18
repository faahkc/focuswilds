export function seededRandom(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export const camp = { floor: .8, fireX: -4.24, fireZ: 1.88, stairX: -.25 }
export const fortCamera = { x: 14, y: 14, z: 30 }
export const fortStairs = { z: 2.93, yaw: .8, run: .28, rise: .17, width: 4.8, count: 6 }

export function stairPosition(index: number, stairX = camp.stairX) {
  return { x: stairX + Math.sin(fortStairs.yaw) * index * fortStairs.run, y: stepHeight(index), z: fortStairs.z + Math.cos(fortStairs.yaw) * index * fortStairs.run }
}

function stairLocal(x: number, z: number, stairX: number) {
  const dx = x - stairX, dz = z - fortStairs.z, c = Math.cos(fortStairs.yaw), s = Math.sin(fortStairs.yaw)
  return { across: dx * c - dz * s, along: dx * s + dz * c }
}

export function courtyardRightEdge(z: number) {
  return .6 + Math.min(1, Math.max(0, (z + 4) / 11)) * 9 + Math.sin(z * .9) * .18 + Math.max(0, z - 9) * .08
}

export function courtyardHeight(x: number, z: number, stairX = camp.stairX) {
  const local = stairLocal(x, z, stairX)
  const stairBed = local.along > -.24 && local.along < fortStairs.run * (fortStairs.count - 1) + .55 && Math.abs(local.across) < fortStairs.width / 2 + .3
  const shoulder = Math.abs(local.across) <= fortStairs.width / 2 ? 1
    : Math.min(1, Math.max(0, (fortStairs.width / 2 + 2 - Math.abs(local.across)) / 2)) * Math.min(1, Math.max(0, (z - 1.9) / 1.1))
  const slope = Math.min(fortStairs.count - 1, Math.max(0, local.along / fortStairs.run)), outside = Math.min(fortStairs.count - 1, Math.max(0, local.along / (fortStairs.run * .4)))
  const descent = (slope * shoulder + outside * (1 - shoulder)) * fortStairs.rise
  const roughness = stairBed ? 0 : Math.min(1, Math.max(0, local.along))
  return camp.floor - descent - Math.max(0, z - 9) * .35 - Math.abs(Math.sin(x * 1.3) * Math.cos(z * .9)) * .18 * roughness
}

export function courtyardTerrain(stairX = camp.stairX) {
  const columns = 48, rows = 96, positions: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let row = 0; row <= rows; row++) {
    const z = -8 + row * .75
    const left = -16 + Math.sin(z * .7) * .35
    const right = courtyardRightEdge(z)
    for (let column = 0; column <= columns; column++) {
      const x = left + (right - left) * column / columns
      positions.push(x, courtyardHeight(x, z, stairX), z); uvs.push(x / 22.5, z / 10)
      if (row < rows && column < columns) {
        const local = stairLocal(x + (right - left) / columns / 2, z + .375, stairX)
        if (Math.abs(local.across) < fortStairs.width / 2 + .5 && local.along > -.6 && local.along < fortStairs.run * (fortStairs.count - 1) + .3) continue
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
  return camp.floor - Math.max(0, Math.min(fortStairs.count - 1, index)) * fortStairs.rise
}

export function courtyardPavers(stairX = camp.stairX) {
  const random = seededRandom(407), stones = []
  for (let row = 0; row < 38; row++) {
    const z = -5 + row * .5
    for (let column = 0; column < 42; column++) {
      const x = -15 + column * .6 + (row % 2) * .3
      const jitterX = (random() - .5) * .08, jitterZ = (random() - .5) * .06, turn = (random() - .5) * .12
      const local = stairLocal(x, z, stairX)
      if (x > courtyardRightEdge(z) - .65 || (local.along > -.5 && local.along < fortStairs.run * (fortStairs.count - 1) + .85 && Math.abs(local.across) < fortStairs.width / 2 + .4)) continue
      stones.push({ x: x + jitterX, y: courtyardHeight(x + jitterX, z + jitterZ, stairX), z: z + jitterZ, turn })
    }
  }
  return stones
}

export function courtyardDebris() {
  const random = seededRandom(919)
  return [[4.2, 1.2], [4.5, 3.2], [-1.9, 6.7]].flatMap(([centerX, centerZ]) =>
    Array.from({ length: 4 }, () => {
      const x = centerX + (random() - .5) * .5, z = centerZ + (random() - .5) * .5
      return { x, y: courtyardHeight(x, z), z, turn: random() * Math.PI, width: .25 + random() * .35, height: .15 + random() * .2, depth: .3 + random() * .4 }
    }))
}

export function titleFraming(width: number, height: number) {
  const aspect = Math.max(1, width) / Math.max(1, height)
  const wide = Math.max(0, Math.min(1, (aspect - .65) / .75))
  const viewHeight = Math.max(14.5, 9 / aspect)
  return { aspect, height: viewHeight, centerX: -.8, centerY: 1.7, panX: -3.6 * (1 - wide) }
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
