
import * as React from "react"

/**
 * Anatomy Atlas — a scroll-scrubbed human body anatomy explorer.
 *
 * A full procedural human body wireframe is modelled in raw WebGL. As the user
 * scrolls, the camera zooms into specific body regions and the relevant organ
 * system lights up in crimson chrome while the rest dims to a ghostly outline.
 *
 * Six frames:
 *   0 · Full body overview
 *   1 · Cardiovascular — zoom to chest, heart & vessels glow
 *   2 · Skeletal — zoom to torso, spine & ribs glow
 *   3 · Nervous — zoom to head, brain & nerves glow
 *   4 · Respiratory — zoom to upper chest, lungs & trachea glow
 *   5 · Muscular — zoom to arm/torso, muscle fibers glow
 */

// #region types & math
type V3 = [number, number, number]

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}
const lerp3 = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

const rng = (seed: number) => {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// #endregion

// #region body model
/**
 * System IDs encoded in the stagger field:
 *   0.0  = body outline (always visible, ghostly)
 *   0.2  = cardiovascular
 *   0.4  = skeletal
 *   0.6  = nervous
 *   0.8  = respiratory
 *   1.0  = muscular
 */
const SYS_BODY = 0.0
const SYS_CARDIO = 0.2
const SYS_SKEL = 0.4
const SYS_NERVE = 0.6
const SYS_RESP = 0.8
const SYS_MUSCLE = 1.0

type Curve = {
  pts: V3[]
  kind: 0 | 1 | 2 // 0=ribbon, 1=thin tube, 2=thick tube
  w: number
  t: number
  lat: V3
  twist: number
  bulb: boolean
  phase: number
  stagger: number // encodes system ID
  base: V3
}

/** Build a tube curve between two points with slight bend */
const makeTube = (
  from: V3, to: V3, bend: V3, steps: number
): V3[] => {
  const pts: V3[] = []
  for (let k = 0; k <= steps; k++) {
    const s = k / steps
    // Quadratic bezier
    const mid = add(lerp3(from, to, 0.5), bend)
    const a = lerp3(from, mid, s)
    const b = lerp3(mid, to, s)
    pts.push(lerp3(a, b, s))
  }
  return pts
}

/** Build an elliptical ring of points (for cross-sections) */
const makeRing = (
  center: V3, rx: number, rz: number, y: number, count: number, phase = 0
): V3[] => {
  const pts: V3[] = []
  for (let i = 0; i <= count; i++) {
    const a = (i / count) * Math.PI * 2 + phase
    pts.push([center[0] + Math.cos(a) * rx, y, center[2] + Math.sin(a) * rz])
  }
  return pts
}

const buildBody = (seed: number) => {
  const r = rng(seed)
  const curves: Curve[] = []

  const addCurve = (
    pts: V3[], kind: 0 | 1 | 2, w: number, system: number,
    opts: Partial<Curve> = {}
  ) => {
    curves.push({
      pts, kind, w, t: kind === 0 ? 0.01 : 0,
      lat: opts.lat ?? [1, 0, 0],
      twist: opts.twist ?? 0,
      bulb: opts.bulb ?? false,
      phase: opts.phase ?? r() * Math.PI * 2,
      stagger: system,
      base: pts[0],
    })
  }

  // ==========================================
  // BODY OUTLINE (system 0.0) — ghostly wireframe
  // Body: head at y≈1.65, feet at y≈-1.8
  // ==========================================

  // --- Head: meridional arcs over a sphere ---
  const headC: V3 = [0, 1.65, 0]
  const headR = 0.26
  for (let i = 0; i < 8; i++) {
    const phi = (i / 8) * Math.PI * 2
    const pts: V3[] = []
    for (let k = 0; k <= 24; k++) {
      const theta = (k / 24) * Math.PI
      pts.push([
        headC[0] + Math.sin(theta) * Math.cos(phi) * headR,
        headC[1] + Math.cos(theta) * headR,
        headC[2] + Math.sin(theta) * Math.sin(phi) * headR * 0.85,
      ])
    }
    addCurve(pts, 1, 0.012, SYS_BODY)
  }
  // Head equator rings
  for (let j = 0; j < 4; j++) {
    const theta = (0.25 + j * 0.15) * Math.PI
    const ring: V3[] = []
    for (let i = 0; i <= 20; i++) {
      const phi = (i / 20) * Math.PI * 2
      ring.push([
        headC[0] + Math.sin(theta) * Math.cos(phi) * headR,
        headC[1] + Math.cos(theta) * headR,
        headC[2] + Math.sin(theta) * Math.sin(phi) * headR * 0.85,
      ])
    }
    addCurve(ring, 1, 0.008, SYS_BODY)
  }

  // --- Neck ---
  const neckPts = makeTube([0, 1.38, 0], [0, 1.46, 0], [0, 0, 0.02], 8)
  addCurve(neckPts, 2, 0.08, SYS_BODY)

  // --- Torso: vertical strips ---
  for (let i = 0; i < 12; i++) {
    const phi = (i / 12) * Math.PI * 2
    const pts: V3[] = []
    for (let k = 0; k <= 30; k++) {
      const s = k / 30
      const y = 1.35 - s * 1.15 // from shoulders to pelvis
      // Width varies: shoulders wide, waist narrow, hips widen
      const shoulderW = 0.48
      const waistW = 0.3
      const hipW = 0.36
      let wx: number
      if (s < 0.45) wx = shoulderW - (shoulderW - waistW) * (s / 0.45)
      else wx = waistW + (hipW - waistW) * ((s - 0.45) / 0.55)
      const wz = wx * 0.55
      // Chest depth variation
      const chestBulge = s < 0.3 ? Math.sin(s / 0.3 * Math.PI) * 0.06 : 0
      pts.push([
        Math.cos(phi) * wx,
        y,
        Math.sin(phi) * (wz + chestBulge),
      ])
    }
    addCurve(pts, 1, 0.012, SYS_BODY)
  }

  // Torso horizontal rings
  for (let j = 0; j < 6; j++) {
    const s = j / 5
    const y = 1.35 - s * 1.15
    const shoulderW = 0.48
    const waistW = 0.3
    const hipW = 0.36
    let wx: number
    if (s < 0.45) wx = shoulderW - (shoulderW - waistW) * (s / 0.45)
    else wx = waistW + (hipW - waistW) * ((s - 0.45) / 0.55)
    const wz = wx * 0.55
    const ring: V3[] = []
    for (let i = 0; i <= 20; i++) {
      const phi = (i / 20) * Math.PI * 2
      ring.push([Math.cos(phi) * wx, y, Math.sin(phi) * wz])
    }
    addCurve(ring, 1, 0.008, SYS_BODY)
  }

  // --- Arms ---
  const armData: [number, V3, V3, V3, V3, V3, V3][] = [
    // side, shoulder, elbow, wrist, elbowBend, wristBend
    [1, [0.5, 1.25, 0], [0.62, 0.7, 0.06], [0.55, 0.18, 0.12], [0.08, 0, 0.04], [0, 0, 0.03], [0, 0, 0]],
    [-1, [-0.5, 1.25, 0], [-0.62, 0.7, 0.06], [-0.55, 0.18, 0.12], [-0.08, 0, 0.04], [0, 0, 0.03], [0, 0, 0]],
  ]
  for (const [, shoulder, elbow, wrist, eb, wb] of armData) {
    const upper = makeTube(shoulder, elbow, eb, 16)
    addCurve(upper, 2, 0.055, SYS_BODY)
    const lower = makeTube(elbow, wrist, wb, 16)
    addCurve(lower, 2, 0.04, SYS_BODY)
    // Hand: small fan
    for (let f = 0; f < 5; f++) {
      const spread = ((f - 2) / 4) * 0.3
      const len = f === 0 ? 0.12 : f === 2 ? 0.18 : 0.15
      const tip: V3 = [wrist[0] + spread * 0.3, wrist[1] - len, wrist[2] + 0.04]
      const finger = makeTube(wrist, tip, [0, 0, 0], 6)
      addCurve(finger, 1, 0.008, SYS_BODY)
    }
  }

  // --- Legs ---
  const legData: [V3, V3, V3, V3, V3][] = [
    [[0.16, 0.2, 0], [0.18, -0.7, 0.06], [0.16, -1.55, 0], [0.02, 0, 0.03], [0, 0, -0.04]],
    [[-0.16, 0.2, 0], [-0.18, -0.7, 0.06], [-0.16, -1.55, 0], [-0.02, 0, 0.03], [0, 0, -0.04]],
  ]
  for (const [hip, knee, ankle, kb, ab] of legData) {
    const upper = makeTube(hip, knee, kb, 18)
    addCurve(upper, 2, 0.07, SYS_BODY)
    const lower = makeTube(knee, ankle, ab, 18)
    addCurve(lower, 2, 0.05, SYS_BODY)
    // Foot
    const toe: V3 = [ankle[0], ankle[1] - 0.05, ankle[2] + 0.2]
    const foot = makeTube(ankle, toe, [0, -0.04, 0.05], 8)
    addCurve(foot, 2, 0.04, SYS_BODY)
  }

  // ==========================================
  // CARDIOVASCULAR SYSTEM (system 0.2)
  // ==========================================

  // Heart — a small cluster of curves at chest center
  const heartC: V3 = [-0.05, 0.95, 0.18]
  for (let i = 0; i < 6; i++) {
    const phi = (i / 6) * Math.PI * 2
    const pts: V3[] = []
    for (let k = 0; k <= 16; k++) {
      const s = k / 16
      const t = s * Math.PI
      const rr = 0.08 * (1 - 0.25 * Math.cos(t)) * Math.sin(t)
      pts.push([
        heartC[0] + Math.cos(phi) * rr,
        heartC[1] + Math.cos(t) * 0.1 - 0.02,
        heartC[2] + Math.sin(phi) * rr * 0.8,
      ])
    }
    addCurve(pts, 1, 0.012, SYS_CARDIO)
  }

  // Aorta — arching up from heart
  const aorta = makeTube(
    [heartC[0], heartC[1] + 0.08, heartC[2]],
    [-0.08, 1.35, 0.06],
    [0.05, 0.12, 0.1],
    20
  )
  addCurve(aorta, 2, 0.03, SYS_CARDIO)

  // Major arteries branching down
  const arteries: [V3, V3, V3][] = [
    // Descending aorta
    [[0, 0.9, 0.1], [0, 0.0, 0.05], [0.03, 0, 0.04]],
    // Carotid arteries (to head)
    [[-0.05, 1.3, 0.04], [-0.04, 1.55, 0.02], [0, 0.02, 0]],
    [[0.05, 1.3, 0.04], [0.04, 1.55, 0.02], [0, 0.02, 0]],
    // Subclavian (to arms)
    [[-0.1, 1.25, 0.06], [-0.5, 1.2, 0.02], [-0.1, -0.05, 0.03]],
    [[0.1, 1.25, 0.06], [0.5, 1.2, 0.02], [0.1, -0.05, 0.03]],
    // Femoral (to legs)
    [[-0.08, 0.2, 0.04], [-0.16, -0.7, 0.03], [0, -0.02, 0.02]],
    [[0.08, 0.2, 0.04], [0.16, -0.7, 0.03], [0, -0.02, 0.02]],
    // Iliac arteries to lower legs
    [[-0.16, -0.7, 0.03], [-0.15, -1.4, 0.02], [0, 0, -0.02]],
    [[0.16, -0.7, 0.03], [0.15, -1.4, 0.02], [0, 0, -0.02]],
  ]
  for (const [from, to, bend] of arteries) {
    const pts = makeTube(from, to, bend, 14)
    addCurve(pts, 1, 0.008 + r() * 0.004, SYS_CARDIO)
  }

  // Smaller vessel branches
  for (let i = 0; i < 12; i++) {
    const y0 = 0.2 + r() * 0.9
    const side = r() > 0.5 ? 1 : -1
    const x0 = side * (0.05 + r() * 0.1)
    const from: V3 = [x0, y0, 0.06 + r() * 0.06]
    const to: V3 = [x0 + side * (0.1 + r() * 0.15), y0 - 0.15 + r() * 0.3, 0.02 + r() * 0.08]
    const pts = makeTube(from, to, [side * 0.03, 0, 0.02], 10)
    addCurve(pts, 1, 0.004, SYS_CARDIO)
  }

  // ==========================================
  // SKELETAL SYSTEM (system 0.4)
  // ==========================================

  // Spine — vertebral column
  const spinePts: V3[] = []
  for (let k = 0; k <= 40; k++) {
    const s = k / 40
    const y = 1.38 - s * 1.2 // neck to sacrum
    const wobble = Math.sin(s * Math.PI * 8) * 0.008
    spinePts.push([wobble, y, -0.06])
  }
  addCurve(spinePts, 2, 0.025, SYS_SKEL)

  // Vertebrae bumps (spinous processes)
  for (let i = 0; i < 24; i++) {
    const s = i / 23
    const y = 1.36 - s * 1.18
    const bump: V3[] = [
      [0, y, -0.06],
      [0, y, -0.12],
      [0, y - 0.015, -0.14],
    ]
    addCurve(bump, 1, 0.008, SYS_SKEL)
  }

  // Ribs — 12 pairs arcing from spine around torso
  for (let i = 0; i < 12; i++) {
    const y = 1.28 - i * 0.07
    const ribLen = i < 7 ? 1.0 : 0.6 + (12 - i) * 0.05 // lower ribs shorter
    for (const side of [-1, 1]) {
      const pts: V3[] = []
      for (let k = 0; k <= 16; k++) {
        const s = k / 16
        const angle = s * Math.PI * 0.55 * ribLen
        const rr = 0.28 + 0.1 * Math.sin(s * Math.PI) - i * 0.008
        pts.push([
          side * Math.sin(angle) * rr,
          y - Math.sin(s * Math.PI) * 0.03,
          -0.06 + Math.cos(angle) * rr * 0.5 - rr * 0.5,
        ])
      }
      addCurve(pts, 1, 0.008, SYS_SKEL)
    }
  }

  // Skull outline
  for (let i = 0; i < 4; i++) {
    const phi = (i / 4) * Math.PI * 2
    const pts: V3[] = []
    for (let k = 0; k <= 16; k++) {
      const theta = (k / 16) * Math.PI
      pts.push([
        headC[0] + Math.sin(theta) * Math.cos(phi) * (headR + 0.02),
        headC[1] + Math.cos(theta) * (headR + 0.02),
        headC[2] + Math.sin(theta) * Math.sin(phi) * (headR + 0.02) * 0.85,
      ])
    }
    addCurve(pts, 1, 0.01, SYS_SKEL)
  }

  // Pelvis bone outline
  for (const side of [-1, 1]) {
    const pts: V3[] = []
    for (let k = 0; k <= 12; k++) {
      const s = k / 12
      const angle = s * Math.PI * 0.8
      pts.push([
        side * (0.1 + Math.sin(angle) * 0.25),
        0.2 - Math.cos(angle) * 0.12,
        -0.04 + Math.sin(s * Math.PI) * 0.08,
      ])
    }
    addCurve(pts, 1, 0.01, SYS_SKEL)
  }

  // Shoulder blades (scapulae)
  for (const side of [-1, 1]) {
    const pts: V3[] = []
    for (let k = 0; k <= 10; k++) {
      const s = k / 10
      pts.push([
        side * (0.15 + s * 0.2),
        1.28 - s * 0.25,
        -0.1 - Math.sin(s * Math.PI) * 0.06,
      ])
    }
    addCurve(pts, 1, 0.008, SYS_SKEL)
  }

  // Limb bones (simplified)
  // Humerus
  for (const side of [-1, 1]) {
    const pts = makeTube(
      [side * 0.48, 1.22, 0],
      [side * 0.6, 0.7, 0.04],
      [side * 0.04, 0, 0.02], 12
    )
    addCurve(pts, 1, 0.014, SYS_SKEL)
  }
  // Radius/Ulna
  for (const side of [-1, 1]) {
    const pts = makeTube(
      [side * 0.6, 0.7, 0.04],
      [side * 0.53, 0.2, 0.1],
      [side * 0.02, 0, 0.02], 12
    )
    addCurve(pts, 1, 0.01, SYS_SKEL)
  }
  // Femur
  for (const side of [-1, 1]) {
    const pts = makeTube(
      [side * 0.16, 0.15, 0],
      [side * 0.18, -0.68, 0.04],
      [side * 0.01, 0, 0.02], 14
    )
    addCurve(pts, 1, 0.016, SYS_SKEL)
  }
  // Tibia
  for (const side of [-1, 1]) {
    const pts = makeTube(
      [side * 0.18, -0.68, 0.04],
      [side * 0.16, -1.5, 0.01],
      [0, 0, -0.02], 14
    )
    addCurve(pts, 1, 0.013, SYS_SKEL)
  }

  // ==========================================
  // NERVOUS SYSTEM (system 0.6)
  // ==========================================

  // Brain — folded curves inside the skull
  for (let i = 0; i < 10; i++) {
    const pts: V3[] = []
    const baseAngle = (i / 10) * Math.PI + r() * 0.3
    for (let k = 0; k <= 20; k++) {
      const s = k / 20
      const fold = Math.sin(s * Math.PI * (3 + i * 0.5)) * 0.03
      const rr = (headR - 0.05) * (0.7 + 0.3 * Math.sin(s * Math.PI))
      pts.push([
        headC[0] + Math.cos(baseAngle + s * 1.2) * rr + fold,
        headC[1] + 0.04 - s * 0.02 + Math.sin(s * Math.PI * 2) * 0.02,
        headC[2] + Math.sin(baseAngle + s * 1.2) * rr * 0.7,
      ])
    }
    addCurve(pts, 1, 0.006, SYS_NERVE)
  }

  // Brain stem
  const brainStem = makeTube(
    [0, headC[1] - headR + 0.04, -0.02],
    [0, 1.38, -0.04],
    [0, 0, -0.01],
    8
  )
  addCurve(brainStem, 1, 0.012, SYS_NERVE)

  // Spinal cord (inside the vertebral column)
  const cord: V3[] = []
  for (let k = 0; k <= 30; k++) {
    const s = k / 30
    cord.push([0, 1.36 - s * 1.16, -0.05])
  }
  addCurve(cord, 1, 0.008, SYS_NERVE)

  // Major nerve branches
  const nerves: [V3, V3, V3][] = [
    // Brachial plexus (to arms)
    [[0.05, 1.3, -0.02], [0.5, 1.15, 0.02], [0.1, -0.03, 0.03]],
    [[-0.05, 1.3, -0.02], [-0.5, 1.15, 0.02], [-0.1, -0.03, 0.03]],
    // Radial nerve (down arms)
    [[0.5, 1.15, 0.02], [0.55, 0.3, 0.08], [0.06, 0, 0.02]],
    [[-0.5, 1.15, 0.02], [-0.55, 0.3, 0.08], [-0.06, 0, 0.02]],
    // Lumbar plexus (to legs)
    [[0.03, 0.25, -0.04], [0.16, -0.3, 0.02], [0.02, 0, 0.03]],
    [[-0.03, 0.25, -0.04], [-0.16, -0.3, 0.02], [-0.02, 0, 0.03]],
    // Sciatic nerve (down legs)
    [[0.16, -0.3, 0.02], [0.17, -1.2, 0.01], [0.01, 0, -0.02]],
    [[-0.16, -0.3, 0.02], [-0.17, -1.2, 0.01], [-0.01, 0, -0.02]],
    // Intercostal nerves
    [[0.02, 1.1, -0.05], [0.3, 1.05, 0.1], [0.05, 0, 0.05]],
    [[-0.02, 1.1, -0.05], [-0.3, 1.05, 0.1], [-0.05, 0, 0.05]],
    [[0.02, 0.9, -0.05], [0.28, 0.85, 0.08], [0.04, 0, 0.04]],
    [[-0.02, 0.9, -0.05], [-0.28, 0.85, 0.08], [-0.04, 0, 0.04]],
  ]
  for (const [from, to, bend] of nerves) {
    const pts = makeTube(from, to, bend, 12)
    addCurve(pts, 1, 0.005, SYS_NERVE)
  }

  // Nerve endings (small branches)
  for (let i = 0; i < 16; i++) {
    const y0 = 0.3 + r() * 1.0
    const side = r() > 0.5 ? 1 : -1
    const from: V3 = [side * (0.02 + r() * 0.04), y0, -0.04]
    const to: V3 = [side * (0.08 + r() * 0.2), y0 - 0.1 + r() * 0.2, r() * 0.08]
    const pts = makeTube(from, to, [side * 0.02, 0, 0.01], 8)
    addCurve(pts, 1, 0.003, SYS_NERVE)
  }

  // ==========================================
  // RESPIRATORY SYSTEM (system 0.8)
  // ==========================================

  // Trachea
  const trachea = makeTube([0, 1.38, 0.04], [0, 1.08, 0.06], [0, 0, 0.01], 14)
  addCurve(trachea, 2, 0.025, SYS_RESP)

  // Main bronchi — splitting into left and right
  const bronchL = makeTube([0, 1.08, 0.06], [-0.12, 0.95, 0.04], [-0.03, -0.02, 0.01], 10)
  addCurve(bronchL, 1, 0.015, SYS_RESP)
  const bronchR = makeTube([0, 1.08, 0.06], [0.12, 0.95, 0.04], [0.03, -0.02, 0.01], 10)
  addCurve(bronchR, 1, 0.015, SYS_RESP)

  // Bronchioles — branching
  const bronchioles: [V3, V3, V3][] = [
    [[-0.12, 0.95, 0.04], [-0.22, 0.88, 0.03], [-0.03, 0, 0.01]],
    [[-0.12, 0.95, 0.04], [-0.18, 0.85, 0.08], [-0.02, -0.02, 0.02]],
    [[-0.22, 0.88, 0.03], [-0.28, 0.78, 0.02], [-0.02, 0, -0.01]],
    [[-0.18, 0.85, 0.08], [-0.25, 0.76, 0.06], [-0.02, 0, 0]],
    [[0.12, 0.95, 0.04], [0.22, 0.88, 0.03], [0.03, 0, 0.01]],
    [[0.12, 0.95, 0.04], [0.18, 0.85, 0.08], [0.02, -0.02, 0.02]],
    [[0.22, 0.88, 0.03], [0.28, 0.78, 0.02], [0.02, 0, -0.01]],
    [[0.18, 0.85, 0.08], [0.25, 0.76, 0.06], [0.02, 0, 0]],
    // Extra branches
    [[0.28, 0.78, 0.02], [0.32, 0.72, 0.04], [0.01, 0, 0.02]],
    [[-0.28, 0.78, 0.02], [-0.32, 0.72, 0.04], [-0.01, 0, 0.02]],
  ]
  for (const [from, to, bend] of bronchioles) {
    const pts = makeTube(from, to, bend, 8)
    addCurve(pts, 1, 0.008, SYS_RESP)
  }

  // Lung outlines — lobed shapes
  for (const side of [-1, 1]) {
    const cx = side * 0.2
    const cy = 0.92
    const lungW = side === 1 ? 0.18 : 0.16 // right lung slightly larger
    const lungH = 0.28

    // Outer boundary
    const pts: V3[] = []
    for (let k = 0; k <= 24; k++) {
      const s = k / 24
      const angle = s * Math.PI * 2
      const rr = lungW * (1 + 0.15 * Math.sin(angle * 3)) // lobed shape
      const ry = lungH * (1 + 0.1 * Math.cos(angle * 2))
      pts.push([
        cx + Math.cos(angle) * rr,
        cy + Math.sin(angle) * ry,
        0.05 + Math.sin(angle) * 0.04,
      ])
    }
    addCurve(pts, 1, 0.01, SYS_RESP)

    // Internal lobes
    for (let j = 0; j < 3; j++) {
      const lPts: V3[] = []
      const yOff = -0.08 + j * 0.1
      for (let k = 0; k <= 12; k++) {
        const s = k / 12
        lPts.push([
          cx - lungW * 0.6 + s * lungW * 1.2,
          cy + yOff + Math.sin(s * Math.PI) * 0.04,
          0.05 + Math.sin(s * Math.PI) * 0.02,
        ])
      }
      addCurve(lPts, 1, 0.005, SYS_RESP)
    }
  }

  // Diaphragm — curved line below lungs
  const diaph: V3[] = []
  for (let k = 0; k <= 16; k++) {
    const s = k / 16
    const x = -0.35 + s * 0.7
    diaph.push([x, 0.62 + Math.sin(s * Math.PI) * 0.06, 0.04])
  }
  addCurve(diaph, 1, 0.01, SYS_RESP)

  // ==========================================
  // MUSCULAR SYSTEM (system 1.0)
  // ==========================================

  // Pectorals — fiber lines across chest
  for (let i = 0; i < 6; i++) {
    for (const side of [-1, 1]) {
      const y = 1.18 - i * 0.04
      const pts: V3[] = []
      for (let k = 0; k <= 10; k++) {
        const s = k / 10
        pts.push([
          side * (0.04 + s * 0.32),
          y + Math.sin(s * Math.PI) * 0.02 * (1 + i * 0.3),
          0.2 + Math.sin(s * Math.PI * 0.5) * 0.08,
        ])
      }
      addCurve(pts, 1, 0.006, SYS_MUSCLE)
    }
  }

  // Abdominal bands
  for (let i = 0; i < 5; i++) {
    const y = 0.85 - i * 0.1
    const pts: V3[] = []
    for (let k = 0; k <= 10; k++) {
      const s = k / 10
      const x = -0.22 + s * 0.44
      pts.push([x, y, 0.18 + Math.cos(x * 4) * 0.03])
    }
    addCurve(pts, 1, 0.006, SYS_MUSCLE)
  }
  // Rectus abdominis vertical lines
  for (const x of [-0.08, 0, 0.08]) {
    const pts: V3[] = []
    for (let k = 0; k <= 14; k++) {
      const s = k / 14
      pts.push([x, 0.85 - s * 0.5, 0.2 + Math.sin(s * Math.PI) * 0.02])
    }
    addCurve(pts, 1, 0.007, SYS_MUSCLE)
  }

  // Deltoids — shoulder caps
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const pts: V3[] = []
      const angle = (i / 3) * Math.PI * 0.5
      for (let k = 0; k <= 8; k++) {
        const s = k / 8
        pts.push([
          side * (0.42 + Math.sin(s * Math.PI) * 0.08 * Math.cos(angle)),
          1.28 - s * 0.15,
          Math.sin(angle) * 0.08 * Math.sin(s * Math.PI) + 0.05,
        ])
      }
      addCurve(pts, 1, 0.006, SYS_MUSCLE)
    }
  }

  // Biceps/Triceps — fiber lines along upper arms
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const pts: V3[] = []
      const offset = (i - 1.5) * 0.02
      for (let k = 0; k <= 12; k++) {
        const s = k / 12
        const x = side * (0.5 + s * 0.12 + Math.sin(s * Math.PI) * 0.03)
        const y = 1.2 - s * 0.5
        pts.push([x + offset, y, 0.02 + Math.sin(s * Math.PI) * 0.04])
      }
      addCurve(pts, 1, 0.005, SYS_MUSCLE)
    }
  }

  // Quadriceps — front of thighs
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const pts: V3[] = []
      const offset = (i - 1.5) * 0.015
      for (let k = 0; k <= 14; k++) {
        const s = k / 14
        pts.push([
          side * (0.16 + offset) + Math.sin(s * Math.PI) * side * 0.02,
          0.15 - s * 0.8,
          0.04 + Math.sin(s * Math.PI) * 0.03,
        ])
      }
      addCurve(pts, 1, 0.005, SYS_MUSCLE)
    }
  }

  // Trapezius — upper back
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const pts: V3[] = []
      const yStart = 1.35 - i * 0.04
      for (let k = 0; k <= 10; k++) {
        const s = k / 10
        pts.push([
          side * s * (0.35 + i * 0.03),
          yStart - s * 0.08,
          -0.1 - Math.sin(s * Math.PI) * 0.04,
        ])
      }
      addCurve(pts, 1, 0.005, SYS_MUSCLE)
    }
  }

  // Latissimus dorsi — back
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const pts: V3[] = []
      for (let k = 0; k <= 12; k++) {
        const s = k / 12
        pts.push([
          side * (0.08 + s * 0.25 - i * 0.02),
          1.1 - s * 0.6 - i * 0.05,
          -0.08 - Math.sin(s * Math.PI) * 0.05,
        ])
      }
      addCurve(pts, 1, 0.005, SYS_MUSCLE)
    }
  }

  // Calf muscles — gastrocnemius
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const pts: V3[] = []
      const offset = (i - 1) * 0.012
      for (let k = 0; k <= 10; k++) {
        const s = k / 10
        pts.push([
          side * (0.18 + offset),
          -0.72 - s * 0.5,
          -0.02 + Math.sin(s * Math.PI) * 0.03,
        ])
      }
      addCurve(pts, 1, 0.005, SYS_MUSCLE)
    }
  }

  let radius = 0
  for (const c of curves) {
    for (const q of c.pts) {
      const d = Math.hypot(q[0], q[1] - 0.3, q[2])
      if (d > radius) radius = d
    }
  }
  return { curves, radius }
}
// #endregion

// #region mesh builder
const STRIDE = 13

const buildMesh = (curves: Curve[]) => {
  const v: number[] = []
  const idx: number[] = []
  let count = 0
  const push = (p: V3, n: V3, s: number, c: Curve) => {
    v.push(p[0], p[1], p[2], n[0], n[1], n[2], s, c.phase, c.kind, c.stagger, c.base[0], c.base[1], c.base[2])
    return count++
  }
  const tangent = (pts: V3[], i: number) =>
    norm(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]))

  for (const c of curves) {
    const n = c.pts.length
    if (c.kind === 0) {
      // Flat ribbon with thickness
      const rings: number[][] = []
      let first: V3[] = []
      let last: V3[] = []
      let T0: V3 = [0, 1, 0]
      let T1: V3 = [0, 1, 0]
      for (let i = 0; i < n; i++) {
        const s = i / (n - 1)
        const T = tangent(c.pts, i)
        let N = norm(cross(T, c.lat))
        let W = cross(N, T)
        const a = c.twist * Math.sin(Math.PI * s)
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        const W2 = add(mul(W, ca), mul(N, sa))
        N = sub(mul(N, ca), mul(W, sa))
        W = W2
        const hw = c.w * (0.42 + 0.58 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.12 + s * 0.9)), 0.6))
        const p = c.pts[i]
        const k0 = add(add(p, mul(W, hw)), mul(N, c.t))
        const k1 = add(sub(p, mul(W, hw)), mul(N, c.t))
        const k2 = sub(sub(p, mul(W, hw)), mul(N, c.t))
        const k3 = sub(add(p, mul(W, hw)), mul(N, c.t))
        const mW = mul(W, -1)
        const mN = mul(N, -1)
        rings.push([
          push(k0, N, s, c), push(k1, N, s, c),
          push(k1, mW, s, c), push(k2, mW, s, c),
          push(k2, mN, s, c), push(k3, mN, s, c),
          push(k3, W, s, c), push(k0, W, s, c),
        ])
        if (i === 0) { first = [k0, k1, k2, k3]; T0 = T }
        if (i === n - 1) { last = [k0, k1, k2, k3]; T1 = T }
      }
      for (let i = 0; i < n - 1; i++) {
        const a = rings[i]
        const b = rings[i + 1]
        for (let f = 0; f < 4; f++) {
          const x = f * 2
          idx.push(a[x], a[x + 1], b[x], a[x + 1], b[x + 1], b[x])
        }
      }
      const cap = (q: V3[], nrm: V3, s: number) => {
        const o = q.map((p) => push(p, nrm, s, c))
        idx.push(o[0], o[1], o[2], o[0], o[2], o[3])
      }
      cap(first, mul(T0, -1), 0)
      cap(last, T1, 1)
    } else {
      // Round tube
      const seg = c.kind === 2 ? 10 : 6
      let N = norm(cross(tangent(c.pts, 0), c.kind === 2 ? [0, 0, 1] : c.lat))
      const rings: number[] = []
      for (let i = 0; i < n; i++) {
        const s = i / (n - 1)
        const T = tangent(c.pts, i)
        N = norm(sub(N, mul(T, dot(N, T))))
        const B = cross(T, N)
        let rad = c.w * (c.kind === 1 ? 1 - 0.2 * s : 1)
        if (c.bulb && s > 0.9) rad = c.w * (0.8 + 1.5 * Math.sin(((s - 0.9) / 0.1) * Math.PI * 0.9))
        rings.push(count)
        for (let k = 0; k <= seg; k++) {
          const a = (k / seg) * Math.PI * 2
          const nr = add(mul(N, Math.cos(a)), mul(B, Math.sin(a)))
          push(add(c.pts[i], mul(nr, rad)), nr, s, c)
        }
      }
      for (let i = 0; i < n - 1; i++) {
        for (let k = 0; k < seg; k++) {
          const a = rings[i] + k
          const b = rings[i + 1] + k
          idx.push(a, a + 1, b, a + 1, b + 1, b)
        }
      }
    }
  }
  return { data: new Float32Array(v), index: new Uint32Array(idx), vertices: count }
}
// #endregion

// #region scroll math
const clamp01 = (x: number) => (x <= 0 ? 0 : x > 1 ? 1 : x)
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const progressFrom = (top: number, height: number, viewport: number) => {
  const travel = height - viewport
  if (travel <= 0) return 0
  return clamp01(-top / travel)
}

const sceneCoord = (p: number, n: number, hold: number) => {
  if (n <= 1) return 0
  const t = clamp01(p) * (n - 1)
  const i = Math.min(Math.floor(t), n - 2)
  const h = hold / 2
  return i + easeInOut(clamp01((t - i - h) / (1 - 2 * h)))
}

const reveal = (coord: number, scene: number, delay: number) => {
  const d = coord - scene
  const lag = d < 0 ? delay : 1 - delay
  return clamp01((0.8 - Math.abs(d) - lag * 0.15) / 0.3)
}
// #endregion

// #region camera
type Key = {
  spin: number
  el: number
  size: number
  ox: number
  oy: number
  /** Which system is active (0=overview, 1-5=systems) */
  activeSystem: number
  /** Camera target Y offset — shifts focus to body region */
  focusY: number
}

// Body center is at y≈0.3 (midpoint between feet -1.8 and head 1.9)
const KEYS: Key[] = [
  // Cover: full body, pulled back, gentle angle
  { spin: 0.2, el: 8, size: 0.40, ox: 0, oy: 0, activeSystem: 0, focusY: 0.3 },
  // Cardiovascular: zoom to chest
  { spin: 1.4, el: 15, size: 0.70, ox: -0.3, oy: 0.1, activeSystem: 1, focusY: 0.9 },
  // Skeletal: zoom to torso/spine, slight rotation to see ribs
  { spin: 2.6, el: -10, size: 0.55, ox: 0.3, oy: 0, activeSystem: 2, focusY: 0.7 },
  // Nervous: zoom to head/brain
  { spin: 3.5, el: 20, size: 0.85, ox: -0.25, oy: -0.15, activeSystem: 3, focusY: 1.55 },
  // Respiratory: zoom to upper chest/lungs
  { spin: 4.3, el: 5, size: 0.72, ox: 0.35, oy: 0.1, activeSystem: 4, focusY: 0.95 },
  // Muscular: zoom to arm/torso
  { spin: 5.2, el: -5, size: 0.55, ox: -0.35, oy: 0.2, activeSystem: 5, focusY: 0.6 },
]

const KEYS_TALL: Partial<Key>[] = [
  { size: 0.35, oy: 0 },
  { size: 0.6, ox: 0, oy: 0.15 },
  { size: 0.5, ox: 0, oy: 0.05 },
  { size: 0.75, ox: 0, oy: -0.1 },
  { size: 0.65, ox: 0, oy: 0.12 },
  { size: 0.5, ox: 0, oy: 0.15 },
]

const SCENES = KEYS.length
const HOLD = 0.32
const NAV_LABELS = ["Overview", "Cardio", "Skeletal", "Nervous", "Respiratory", "Muscular"]

const keyAt = (coord: number, tall: boolean): Key => {
  const i = Math.max(0, Math.min(SCENES - 1, Math.floor(coord)))
  const j = Math.min(SCENES - 1, i + 1)
  const f = coord - i
  const a = { ...KEYS[i], ...(tall ? KEYS_TALL[i] : {}) }
  const b = { ...KEYS[j], ...(tall ? KEYS_TALL[j] : {}) }
  const l = (x: number, y: number) => x + (y - x) * f
  return {
    spin: l(a.spin, b.spin), el: l(a.el, b.el), size: l(a.size, b.size),
    ox: l(a.ox, b.ox), oy: l(a.oy, b.oy),
    activeSystem: l(a.activeSystem, b.activeSystem),
    focusY: l(a.focusY, b.focusY),
  }
}
// #endregion

// #region matrices
type M4 = Float32Array
const perspective = (fovy: number, aspect: number, near: number, far: number): M4 => {
  const f = 1 / Math.tan(fovy / 2)
  const m = new Float32Array(16)
  m[0] = f / aspect; m[5] = f
  m[10] = (far + near) / (near - far); m[11] = -1
  m[14] = (2 * far * near) / (near - far)
  return m
}
const lookAt = (eye: V3, at: V3): M4 => {
  const z = norm(sub(eye, at))
  const x = norm(cross([0, 1, 0], z))
  const y = cross(z, x)
  const m = new Float32Array(16)
  m[0] = x[0]; m[4] = x[1]; m[8] = x[2]
  m[1] = y[0]; m[5] = y[1]; m[9] = y[2]
  m[2] = z[0]; m[6] = z[1]; m[10] = z[2]
  m[12] = -dot(x, eye); m[13] = -dot(y, eye); m[14] = -dot(z, eye); m[15] = 1
  return m
}
const matmul = (a: M4, b: M4): M4 => {
  const o = new Float32Array(16)
  for (let c = 0; c < 4; c++)
    for (let rr = 0; rr < 4; rr++)
      o[c * 4 + rr] = a[rr] * b[c * 4] + a[4 + rr] * b[c * 4 + 1] + a[8 + rr] * b[c * 4 + 2] + a[12 + rr] * b[c * 4 + 3]
  return o
}
const rotY = (t: number): M4 => {
  const c = Math.cos(t); const s = Math.sin(t)
  return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1])
}
const rotX = (t: number): M4 => {
  const c = Math.cos(t); const s = Math.sin(t)
  return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1])
}

const hexToLinear = (hex: string): V3 => {
  let h = hex.replace("#", "").trim()
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return [0.8, 0.02, 0.03]
  const ch = (v: number) => Math.pow(v / 255, 2.2)
  return [ch((n >> 16) & 255), ch((n >> 8) & 255), ch(n & 255)]
}
// #endregion

// #region shaders
const VERT = `
attribute vec3 a_pos;
attribute vec3 a_nrm;
attribute vec4 a_aux;
attribute vec3 a_base;
uniform mat4 u_vp;
uniform mat4 u_model;
uniform vec2 u_offset;
uniform float u_time;
uniform float u_bloom;
uniform float u_sway;
uniform float u_active; // 0-5 active system (0.0 steps of 0.2)
varying vec3 v_n;
varying vec3 v_w;
varying float v_s;
varying float v_sys;
varying float v_highlight;
void main() {
  vec3 p = a_pos;
  float sys = a_aux.w; // system ID in stagger

  // Bloom-in animation
  float g = clamp(u_bloom * 1.8 - sys * 0.3, 0.0, 1.0);
  g = 1.0 - pow(1.0 - g, 3.0);
  p = a_base + (p - a_base) * g;

  // Gentle breathing motion for body outline
  if (sys < 0.05) {
    float breath = sin(u_time * 1.2) * 0.005 * u_sway;
    p.x *= 1.0 + breath;
    p.z *= 1.0 + breath * 0.5;
  }

  // Pulse for active system
  float sysMatch = 1.0 - smoothstep(0.0, 0.12, abs(sys - u_active * 0.2));
  if (sysMatch > 0.1 && sys > 0.05) {
    float pulse = sin(u_time * 3.5 + a_aux.y) * 0.5 + 0.5;
    pulse = pow(pulse, 3.0) * 0.008 * u_sway * sysMatch;
    p += normalize(a_nrm) * pulse;
  }

  // Gentle sway for organ curves
  if (sys > 0.05) {
    float amp = 0.008 * u_sway * a_aux.x;
    p += amp * vec3(sin(u_time * 0.6 + a_aux.y), 0.3 * sin(u_time * 0.9 + a_aux.y * 1.3), cos(u_time * 0.5 + a_aux.y * 1.1));
  }

  vec4 w = u_model * vec4(p, 1.0);
  v_w = w.xyz;
  v_n = (u_model * vec4(a_nrm, 0.0)).xyz;
  v_s = a_aux.x;
  v_sys = sys;
  v_highlight = sysMatch;
  gl_Position = u_vp * w;
  gl_Position.xy += u_offset * gl_Position.w;
}
`

const FRAG = `
precision highp float;
uniform vec3 u_eye;
uniform vec3 u_red;
uniform vec3 u_hot;
uniform float u_alpha;
uniform float u_active;
uniform float u_time;
varying vec3 v_n;
varying vec3 v_w;
varying float v_s;
varying float v_sys;
varying float v_highlight;

float studio(vec3 r) {
  float key = pow(max(dot(r, normalize(vec3(-0.4, 0.9, 0.3))), 0.0), 14.0) * 2.6;
  float strip = smoothstep(0.5, 0.85, r.x) * smoothstep(-0.6, 0.4, r.y) * 1.4;
  float rim = smoothstep(0.5, 0.9, -r.z) * smoothstep(-0.3, 0.4, r.y) * 0.9;
  float hz = exp(-abs(r.y - 0.05) * 7.0) * 0.4;
  return key + strip + rim + hz;
}

void main() {
  vec3 n = normalize(v_n);
  vec3 v = normalize(u_eye - v_w);
  if (dot(n, v) < 0.0) n = -n;
  vec3 r = reflect(-v, n);
  float e = studio(r);
  float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  float dif = max(dot(n, normalize(vec3(-0.3, 0.8, 0.6))), 0.0);

  // Determine coloring based on system
  bool isBody = v_sys < 0.05;
  bool isActive = v_highlight > 0.3;
  bool isOverview = u_active < 0.3; // scene 0

  vec3 col;
  float alpha = u_alpha;

  if (isBody) {
    // Body outline: ghostly blue-white wireframe
    vec3 bodyCol = vec3(0.35, 0.4, 0.5);
    col = bodyCol * (0.08 + 0.15 * dif);
    col += bodyCol * e * 0.3;
    col += vec3(0.5, 0.55, 0.65) * pow(e, 3.0) * 0.1;
    col += bodyCol * fr * 0.4;
    alpha *= isOverview ? 0.65 : 0.35;
  } else if (isActive || isOverview) {
    // Active system or overview: full crimson chrome
    float intensity = isOverview ? 0.7 : 1.0;
    col = u_red * (0.05 + 0.25 * dif) * intensity;
    col += u_red * e * 1.2 * intensity;
    col += u_hot * pow(e, 3.0) * 0.3 * intensity;
    col += u_red * fr * 1.1 * intensity;

    // Pulsing glow for active system
    if (isActive && !isOverview) {
      float pulse = sin(u_time * 2.5) * 0.15 + 0.85;
      col *= pulse;
    }
  } else {
    // Inactive system: very dim
    vec3 dimCol = u_red * 0.2;
    col = dimCol * (0.04 + 0.1 * dif);
    col += dimCol * e * 0.2;
    alpha *= 0.2;
  }

  col *= 0.8 + 0.2 * smoothstep(0.0, 0.25, v_s);
  col = col / (1.0 + col);
  col = pow(col, vec3(1.0 / 2.2));
  gl_FragColor = vec4(col * alpha, alpha);
}
`
// #endregion

// #region content
const DISPLAY = '"Playfair Display", "Didot", "Bodoni MT", Georgia, serif'
const SANS = '"Inter", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif'
const MONO = '"JetBrains Mono", "SF Mono", "Fira Code", monospace'
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400&display=swap"

const DEFAULT_SYSTEMS = [
  {
    name: "Cardiovascular System",
    icon: "❤️",
    region: "Heart & Blood Vessels",
    stat: "100,000",
    unit: "heartbeats per day",
    detail: "The heart pumps ~7,570 litres of blood daily through 96,500 km of vessels. The aorta is nearly the diameter of a garden hose, while capillaries are so narrow that red blood cells pass single-file.",
    parts: ["Heart", "Aorta", "Arteries", "Veins", "Capillaries"],
  },
  {
    name: "Skeletal System",
    icon: "🦴",
    region: "Spine, Ribs & Bones",
    stat: "206",
    unit: "bones in adult body",
    detail: "Babies are born with ~270 bones that fuse to 206 in adulthood. The femur can support 30× body weight. Bone is five times stronger than steel of the same density.",
    parts: ["Spine", "Ribs", "Skull", "Pelvis", "Femur", "Scapula"],
  },
  {
    name: "Nervous System",
    icon: "🧠",
    region: "Brain, Spinal Cord & Nerves",
    stat: "86 Billion",
    unit: "neurons in the brain",
    detail: "The brain processes signals at up to 431 km/h along myelinated fibres. It generates ~70,000 thoughts per day and uses 20% of the body's energy despite being only 2% of its mass.",
    parts: ["Brain", "Spinal Cord", "Brachial Plexus", "Sciatic Nerve"],
  },
  {
    name: "Respiratory System",
    icon: "🫁",
    region: "Lungs, Trachea & Airways",
    stat: "480 Million",
    unit: "alveoli in the lungs",
    detail: "Unfolded, the lung alveoli would cover a tennis court (~70 m²). Adults breathe 12–20 times per minute, moving ~6 litres of air. The right lung is slightly larger than the left.",
    parts: ["Trachea", "Bronchi", "Lungs", "Diaphragm", "Alveoli"],
  },
  {
    name: "Muscular System",
    icon: "💪",
    region: "Skeletal & Cardiac Muscles",
    stat: "600+",
    unit: "skeletal muscles",
    detail: "Muscles comprise ~40% of body weight. The strongest by force is the masseter (jaw). The hardest-working is the heart — it never voluntarily rests. The smallest, the stapedius, is ~1 mm long.",
    parts: ["Pectorals", "Deltoids", "Biceps", "Quadriceps", "Abs", "Trapezius"],
  },
]

// Scoped CSS
const CSS = `
.ana-stage{container-type:size;container-name:ana}
.ana-char{display:inline-block;animation:ana-in 1.2s cubic-bezier(.2,.8,.2,1) both}
@keyframes ana-in{from{opacity:0;transform:translateY(0.5em) scale(0.9);filter:blur(10px)}to{opacity:1;transform:none;filter:blur(0)}}
.ana-nav button{display:flex;align-items:center;gap:10px;justify-content:flex-end;background:none;border:0;padding:6px 0;cursor:pointer;color:inherit;font:inherit}
.ana-nav .ana-tick{display:block;height:2px;width:14px;background:currentColor;opacity:.35;transition:width .4s cubic-bezier(.2,.8,.2,1),opacity .3s,background-color .3s}
.ana-nav .ana-lab{opacity:0;transform:translateX(6px);transition:opacity .3s,transform .3s}
.ana-nav button:hover .ana-lab,.ana-nav button:focus-visible .ana-lab{opacity:1;transform:none}
.ana-nav button[aria-current=step] .ana-tick{width:36px;opacity:1;background:var(--ana-red)}
.ana-nav button[aria-current=step] .ana-lab{opacity:0.7}
.ana-card{backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:clamp(14px,2.5cqw,28px);background:rgba(255,255,255,0.025)}
.ana-pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03)}
.ana-pulse{animation:ana-beat 1.6s ease-in-out infinite}
@keyframes ana-beat{0%,100%{transform:scale(1);opacity:1}15%{transform:scale(1.08)}30%{transform:scale(1);opacity:0.8}45%{transform:scale(1.04)}60%{transform:scale(1)}}
.ana-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08)}
@container ana (orientation:portrait){.ana-wide{display:none}.ana-tall{display:block}}
@container ana (max-width:720px){.ana-hide-sm{display:none!important}}
@container ana (max-width:1020px){.ana-hide-md{display:none!important}}
@media (prefers-reduced-motion:reduce){.ana-char{animation:none}.ana-pulse{animation:none}}
`

type Fx = "rise" | "clip" | "fade"
const sc = (scene: number, fx: Fx = "rise", delay = 0) => ({
  "data-sc": scene, "data-fx": fx, "data-d": delay,
})

// ECG SVG
const ECG = ({ color, w = 180 }: { color: string; w?: number }) => (
  <svg width={w} height={24} viewBox="0 0 200 24" fill="none" aria-hidden>
    <polyline
      points="0,12 35,12 45,12 52,5 56,19 60,1 64,22 68,12 80,12 110,12 120,12 127,5 131,19 135,1 139,22 143,12 155,12 200,12"
      stroke={color} strokeWidth={1.5} opacity={0.5}
    />
  </svg>
)
// #endregion

// ---- MAIN COMPONENT -------------------------------------------------------

export default function AnatomyAtlas({
  crimson = "#c41e3a",
  bone = "#a8a48a",
  ink = "#050505",
  height = "100svh",
  sceneScroll = 1.3,
  seed = 42,
  className = "",
}: {
  crimson?: string
  bone?: string
  ink?: string
  height?: string
  sceneScroll?: number
  seed?: number
  className?: string
}) {
  const rootRef = React.useRef<HTMLElement | null>(null)
  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const glowRef = React.useRef<HTMLDivElement | null>(null)
  const [reduced, setReduced] = React.useState(false)
  const [active, setActive] = React.useState(0)

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  // Load fonts
  React.useEffect(() => {
    const exists = Array.from(document.querySelectorAll("link[rel=stylesheet]")).some(
      (l) => (l as HTMLLinkElement).href === FONT_HREF,
    )
    if (exists) return
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = FONT_HREF
    document.head.appendChild(link)
  }, [])

  const look = React.useRef({ crimson, reduced, seed })
  look.current = { crimson, reduced, seed }

  React.useEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    const canvas = canvasRef.current
    const glow = glowRef.current
    if (!root || !stage || !canvas || !glow) return

    const { curves, radius } = buildBody(look.current.seed)
    const mesh = buildMesh(curves)

    // ---- GL setup -----------------------------------------------------------
    let gl: WebGLRenderingContext | null = null
    let ctx2d: CanvasRenderingContext2D | null = null
    let prog: WebGLProgram | null = null
    let vbo: WebGLBuffer | null = null
    let ibo: WebGLBuffer | null = null
    const loc: Record<string, WebGLUniformLocation | null> = {}

    const initGL = () => {
      gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true }) as WebGLRenderingContext | null
      if (!gl) return false

      // Enable uint32 indices for large meshes
      const ext = gl.getExtension("OES_element_index_uint")
      if (!ext) { console.warn("OES_element_index_uint not supported"); return false }

      const compile = (type: number, src: string) => {
        const sh = gl!.createShader(type)!
        gl!.shaderSource(sh, src)
        gl!.compileShader(sh)
        if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) {
          console.error(gl!.getShaderInfoLog(sh))
          return null
        }
        return sh
      }
      const vs = compile(gl.VERTEX_SHADER, VERT)
      const fs = compile(gl.FRAGMENT_SHADER, FRAG)
      if (!vs || !fs) return false
      prog = gl.createProgram()!
      gl.attachShader(prog, vs)
      gl.attachShader(prog, fs)
      gl.linkProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false
      gl.useProgram(prog)
      vbo = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
      gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW)
      ibo = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.index, gl.STATIC_DRAW)
      const attr = (n: string, size: number, off: number) => {
        const a = gl!.getAttribLocation(prog!, n)
        if (a < 0) return
        gl!.enableVertexAttribArray(a)
        gl!.vertexAttribPointer(a, size, gl!.FLOAT, false, STRIDE * 4, off * 4)
      }
      attr("a_pos", 3, 0)
      attr("a_nrm", 3, 3)
      attr("a_aux", 4, 6)
      attr("a_base", 3, 10)
      for (const n of ["u_vp", "u_model", "u_offset", "u_time", "u_bloom", "u_sway", "u_active", "u_eye", "u_red", "u_hot", "u_alpha"])
        loc[n] = gl.getUniformLocation(prog, n)
      gl.enable(gl.DEPTH_TEST)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.clearColor(0, 0, 0, 0)
      return true
    }
    if (!initGL()) {
      gl = null
      ctx2d = canvas.getContext("2d")
    }
    const onLost = (e: Event) => { e.preventDefault(); gl = null }
    const onRestored = () => { if (!initGL()) gl = null }
    canvas.addEventListener("webglcontextlost", onLost)
    canvas.addEventListener("webglcontextrestored", onRestored)

    // ---- measuring ----------------------------------------------------------
    let W = 1, H = 1, dpr = 1
    const measure = () => {
      const sr = stage.getBoundingClientRect()
      W = Math.max(1, sr.width)
      H = Math.max(1, sr.height)
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cw = Math.round(W * dpr)
      const ch = Math.round(H * dpr)
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw; canvas.height = ch
      }
    }
    const ro = new ResizeObserver(measure)
    ro.observe(stage)
    measure()

    // ---- frame elements -----------------------------------------------------
    const items = Array.from(stage.querySelectorAll<HTMLElement>("[data-sc]")).map((el) => ({
      el, scene: Number(el.dataset.sc), fx: el.dataset.fx as Fx, delay: Number(el.dataset.d) || 0, last: -1,
    }))

    // ---- input ----------------------------------------------------------------
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    let spin = 0, spinVel = 0
    let drag: { id: number; x: number } | null = null
    const onMove = (e: PointerEvent) => {
      const rr = stage.getBoundingClientRect()
      pointer.tx = ((e.clientX - rr.left) / rr.width) * 2 - 1
      pointer.ty = ((e.clientY - rr.top) / rr.height) * 2 - 1
      if (drag && drag.id === e.pointerId) {
        spinVel += (e.clientX - drag.x) * 0.002
        drag.x = e.clientX
      }
    }
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return
      const t = e.target as HTMLElement
      if (t.closest("a,button")) return
      drag = { id: e.pointerId, x: e.clientX }
      stage.style.cursor = "grabbing"
    }
    const onUp = () => { drag = null; stage.style.cursor = "" }
    stage.addEventListener("pointermove", onMove)
    stage.addEventListener("pointerdown", onDown)
    window.addEventListener("pointerup", onUp)

    // ---- render loop --------------------------------------------------------
    let raf = 0, running = false, visible = true
    let last = performance.now()
    const born = last
    let time = 0, prog01 = -1, shownScene = -1

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const L = look.current
      const moving = !L.reduced
      if (moving) time += dt

      const rr = root.getBoundingClientRect()
      const p = progressFrom(rr.top, rr.height, H)
      prog01 = prog01 < 0 || L.reduced ? p : prog01 + (p - prog01) * (1 - Math.exp(-dt * 9))
      const coord = sceneCoord(prog01, SCENES, HOLD)
      const scene = Math.round(coord)
      if (scene !== shownScene) { shownScene = scene; setActive(scene) }

      const tall = H > W * 1.05
      const k = keyAt(coord, tall)
      pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 4))
      pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 4))
      if (moving) {
        spin += spinVel + dt * 0.06
        spinVel *= Math.exp(-dt * 3)
      } else { spin += spinVel; spinVel = 0 }
      const px = moving ? pointer.x : 0
      const py = moving ? pointer.y : 0

      // Camera focuses on different body regions
      const focusPoint: V3 = [0, k.focusY, 0]
      const fov = (30 * Math.PI) / 180
      const minDim = Math.min(W, H)
      const dist = (radius * H) / (k.size * minDim * Math.tan(fov / 2))
      const el = Math.max(-88, Math.min(88, k.el + py * 8)) * (Math.PI / 180)
      const eye: V3 = [
        focusPoint[0], focusPoint[1] + Math.sin(el) * dist,
        focusPoint[2] + Math.cos(el) * dist,
      ]
      const proj = perspective(fov, W / H, Math.max(0.05, dist - 8), dist + 10)
      const vp = matmul(proj, lookAt(eye, focusPoint))
      const model = matmul(rotY(k.spin + spin + px * 0.3), rotX(py * 0.04))
      const bloom = L.reduced ? 1 : clamp01((now - born) / 2500)

      // Glow
      const gx = (0.5 + k.ox / 2) * W
      const gy = (0.5 - k.oy / 2) * H
      const gr = k.size * minDim * 1.1
      glow.style.transform = "translate(" + (gx - gr).toFixed(1) + "px," + (gy - gr).toFixed(1) + "px)"
      glow.style.width = glow.style.height = (gr * 2).toFixed(1) + "px"

      // Active system (0=overview, 1-5=systems)
      const activeNorm = Math.round(k.activeSystem)

      if (gl && prog) {
        const g = gl
        g.viewport(0, 0, canvas.width, canvas.height)
        g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT)
        const red = hexToLinear(L.crimson)
        g.uniformMatrix4fv(loc.u_vp, false, vp)
        g.uniformMatrix4fv(loc.u_model, false, model)
        g.uniform2f(loc.u_offset, k.ox, k.oy)
        g.uniform1f(loc.u_time, time)
        g.uniform1f(loc.u_bloom, bloom)
        g.uniform1f(loc.u_sway, moving ? 1 : 0)
        g.uniform1f(loc.u_active, activeNorm)
        g.uniform3f(loc.u_eye, eye[0], eye[1], eye[2])
        g.uniform3f(loc.u_red, red[0] * 2.2, red[1] * 2.2, red[2] * 2.2)
        g.uniform3f(loc.u_hot, 1, 0.55 + red[1], 0.5 + red[2])
        g.uniform1f(loc.u_alpha, 1)
        g.drawElements(g.TRIANGLES, mesh.index.length, g.UNSIGNED_INT, 0)
      } else if (ctx2d) {
        const c = ctx2d
        const mvp = matmul(vp, model)
        c.setTransform(dpr, 0, 0, dpr, 0, 0)
        c.clearRect(0, 0, W, H)
        c.lineCap = "round"
        for (const cv of curves) {
          const isBody = cv.stagger < 0.05
          const isMatch = Math.abs(cv.stagger - activeNorm * 0.2) < 0.12
          c.strokeStyle = isBody ? bone : (isMatch || activeNorm === 0 ? L.crimson : "rgba(196,30,58,0.15)")
          c.shadowColor = isMatch ? L.crimson : "transparent"
          c.shadowBlur = isMatch ? 8 : 0
          c.globalAlpha = isBody ? (activeNorm === 0 ? 0.5 : 0.15) : (isMatch || activeNorm === 0 ? 0.8 : 0.1)
          c.beginPath()
          cv.pts.forEach((q, i) => {
            const cx = mvp[0] * q[0] + mvp[4] * q[1] + mvp[8] * q[2] + mvp[12]
            const cy = mvp[1] * q[0] + mvp[5] * q[1] + mvp[9] * q[2] + mvp[13]
            const cw = mvp[3] * q[0] + mvp[7] * q[1] + mvp[11] * q[2] + mvp[15]
            const sx = ((cx / cw + k.ox) * 0.5 + 0.5) * W
            const sy = (0.5 - (cy / cw + k.oy) * 0.5) * H
            if (i === 0) c.moveTo(sx, sy); else c.lineTo(sx, sy)
          })
          c.lineWidth = cv.kind === 0 ? 2 : cv.kind === 2 ? 1.5 : 0.8
          c.stroke()
        }
        c.globalAlpha = 1
      }

      // ---- type animations --------------------------------------------------
      const still = L.reduced
      for (const it of items) {
        const v = reveal(coord, it.scene, it.delay)
        const q = Math.round(v * 500) / 500
        if (q === it.last) continue
        it.last = q
        const s = it.el.style
        const dir = coord < it.scene ? 1 : -1
        s.visibility = q <= 0 ? "hidden" : ""
        s.opacity = String(q)
        if (still || it.fx === "fade") continue
        if (it.fx === "clip") {
          const hid = ((1 - q) * 100).toFixed(1)
          s.clipPath = dir > 0 ? "inset(0 0 " + hid + "% 0)" : "inset(" + hid + "% 0 0 0)"
          s.transform = "translateY(" + ((1 - q) * 0.3 * dir).toFixed(3) + "em)"
        } else {
          s.transform = "translateY(" + ((1 - q) * 30 * dir).toFixed(1) + "px)"
          s.filter = q > 0.995 ? "" : "blur(" + ((1 - q) * 7).toFixed(1) + "px)"
        }
      }
    }

    const start = () => {
      if (running || !visible || document.hidden) return
      running = true; last = performance.now(); raf = requestAnimationFrame(frame)
    }
    const stop = () => { running = false; cancelAnimationFrame(raf) }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting; if (visible) start(); else stop()
    })
    io.observe(root)
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener("visibilitychange", onVis)
    start()

    return () => {
      stop(); io.disconnect(); ro.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      stage.removeEventListener("pointermove", onMove)
      stage.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup", onUp)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
      const g = gl as WebGLRenderingContext | null
      if (g) { g.deleteBuffer(vbo); g.deleteBuffer(ibo); g.deleteProgram(prog) }
    }
  }, [seed])

  const jump = (i: number) => {
    const root = rootRef.current
    const stage = stageRef.current
    if (!root || !stage) return
    const rootTop = root.getBoundingClientRect().top + window.scrollY
    const travel = root.offsetHeight - stage.clientHeight
    const target = rootTop + (i / (SCENES - 1)) * travel
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth"
    window.scrollTo({ top: target, behavior })
  }

  const display: React.CSSProperties = { fontFamily: DISPLAY }
  const sans: React.CSSProperties = { fontFamily: SANS }
  const mono: React.CSSProperties = { fontFamily: MONO }
  const hidden: React.CSSProperties = { opacity: 0 }

  return (
    <section
      ref={rootRef}
      className={"relative w-full " + className}
      style={{
        height: "calc(" + height + " * " + (1 + (SCENES - 1) * sceneScroll).toFixed(3) + ")",
        background: ink,
      }}
      aria-label="Human Body Anatomy Atlas"
    >
      <style>{CSS}</style>
      <div
        ref={stageRef}
        className="ana-stage sticky top-0 w-full overflow-hidden select-none"
        style={{
          height, color: bone, background: ink,
          ["--ana-red" as string]: crimson,
        } as React.CSSProperties}
      >
        {/* Ambient edge glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(120% 90% at 50% 45%, transparent 55%, " + crimson + "0d 100%)" }}
        />
        {/* Glow behind body */}
        <div ref={glowRef} aria-hidden className="pointer-events-none absolute left-0 top-0 rounded-full"
          style={{ background: "radial-gradient(closest-side, " + crimson + "2a, " + crimson + "08 50%, transparent 100%)", willChange: "transform" }}
        />
        {/* WebGL canvas */}
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block"
          style={{ width: "100%", height: "100%", maxWidth: "none" }}
        />

        {/* ========================== SCENE 0: COVER ========================== */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute" style={{ left: "5cqw", top: "5cqh" }}>
            <div {...sc(0, "clip", 0)} style={{ ...sans, ...hidden, fontSize: "clamp(8px, 0.65cqw, 10px)", letterSpacing: "0.3em", textTransform: "uppercase", opacity: 0.4, marginBottom: 10 }}>
              PulseCare · Interactive Anatomy · 2026
            </div>
            <div {...sc(0, "clip", 0.05)} style={{ ...display, ...hidden, fontSize: "clamp(28px, 4.5cqw, 64px)", lineHeight: 0.88, fontWeight: 900, letterSpacing: "-0.02em" }}>
              Human<br />Body<br />Atlas
            </div>
            <p {...sc(0, "rise", 0.2)} style={{ ...sans, ...hidden, maxWidth: "min(35cqw, 400px)", fontSize: "clamp(10px, 0.85cqw, 13px)", lineHeight: 1.5, marginTop: 16, fontWeight: 300 }}>
              Explore the extraordinary complexity of the human body — trillions of cells, kilometres of blood vessels, and billions of neurons working in seamless concert.
            </p>
          </div>

          {/* Stats column */}
          <div {...sc(0, "rise", 0.3)} className="absolute ana-hide-md" style={{
            ...mono, ...hidden, right: "5cqw", top: "5cqh",
            fontSize: "clamp(9px, 0.75cqw, 11px)", lineHeight: 1.6,
          }}>
            {["11 organ systems", "206 bones", "37.2T cells", "100K km vessels", "86B neurons"].map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.6 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: crimson, flexShrink: 0 }} />
                {s}
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="absolute flex items-end justify-between" style={{ left: "5cqw", right: "5cqw", bottom: "5cqh" }}>
            <div {...sc(0, "rise", 0.4)} style={{ ...hidden, display: "flex", alignItems: "center", gap: 12 }}>
              <div className="ana-pulse" style={{ fontSize: 24, lineHeight: 1 }}>❤️</div>
              <span style={{ ...sans, fontSize: "clamp(16px, 2cqw, 28px)", fontWeight: 300 }}>PulseCare</span>
            </div>
            <div {...sc(0, "fade", 0.5)} className="ana-hide-sm flex items-center" style={{ ...hidden, gap: 12 }}>
              <ECG color={crimson} w={140} />
              <span style={{ ...mono, fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: crimson, opacity: 0.6 }}>
                SCROLL TO EXPLORE
              </span>
            </div>
          </div>
        </div>

        {/* ==================== SCENES 1–5: BODY SYSTEMS ==================== */}
        {DEFAULT_SYSTEMS.map((sys, idx) => (
          <div key={sys.name} className="pointer-events-none absolute inset-0">
            {/* System header */}
            <div {...sc(idx + 1, "clip", 0)} className="absolute" style={{ ...hidden, left: "5cqw", top: "6cqh" }}>
              <div className="ana-tag" style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>{sys.icon}</span>
                <span style={{ color: crimson }}>{sys.region}</span>
              </div>
              <div style={{ ...display, fontSize: "clamp(24px, 3.5cqw, 52px)", lineHeight: 0.92, fontWeight: 900 }}>
                {sys.name.split(" ").map((w, wi) => (
                  <React.Fragment key={wi}>{wi > 0 && <br />}{w}</React.Fragment>
                ))}
              </div>
            </div>

            {/* Giant statistic */}
            <div {...sc(idx + 1, "rise", 0.15)} className="absolute" style={{ ...hidden, left: "5cqw", top: "34cqh" }}>
              <div style={{ ...display, fontSize: "clamp(40px, 7cqw, 100px)", lineHeight: 0.85, fontWeight: 900, color: crimson, fontStyle: "italic" }}>
                {sys.stat}
              </div>
              <div style={{ ...sans, fontSize: "clamp(10px, 0.9cqw, 13px)", marginTop: 6, fontWeight: 300, letterSpacing: "0.04em" }}>
                {sys.unit}
              </div>
            </div>

            {/* Detail card */}
            <div {...sc(idx + 1, "rise", 0.3)} className="ana-card absolute ana-hide-sm" style={{
              ...hidden, left: "5cqw", bottom: "8cqh", maxWidth: "min(42cqw, 480px)",
            }}>
              <p style={{ ...sans, fontSize: "clamp(10px, 0.8cqw, 12px)", lineHeight: 1.6, margin: 0, fontWeight: 300 }}>
                {sys.detail}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {sys.parts.map((part) => (
                  <span key={part} className="ana-pill" style={{ color: bone, opacity: 0.7 }}>{part}</span>
                ))}
              </div>
            </div>

            {/* Scene counter */}
            <div {...sc(idx + 1, "fade", 0.6)} className="absolute" style={{
              ...sans, ...hidden, right: "5cqw", top: "5cqh",
              fontSize: 9, letterSpacing: "0.3em", textTransform: "uppercase",
            }}>
              <span style={{ color: crimson }}>0{idx + 1}</span> / 05
            </div>
          </div>
        ))}

        {/* ========================== NAV DOTS ============================== */}
        <nav
          aria-label="Anatomy sections"
          className="ana-nav pointer-events-auto absolute flex flex-col"
          style={{ right: "2cqw", top: "50%", transform: "translateY(-50%)", zIndex: 10, gap: 4 }}
        >
          {NAV_LABELS.map((label, i) => (
            <button
              key={label}
              aria-current={active === i ? "step" : undefined}
              aria-label={"Go to " + label}
              onClick={() => jump(i)}
            >
              <span className="ana-lab" style={{
                ...sans, fontSize: 9, letterSpacing: "0.12em",
                textTransform: "uppercase", whiteSpace: "nowrap",
              }}>
                {label}
              </span>
              <span className="ana-tick" />
            </button>
          ))}
        </nav>

        {/* Scroll hint */}
        <div className="absolute ana-pulse" {...sc(0, "fade", 0.7)}
          style={{ left: "50%", bottom: "2cqh", transform: "translateX(-50%)", zIndex: 5, opacity: 0 }}
        >
          <svg width="14" height="22" viewBox="0 0 14 22" fill="none" aria-hidden>
            <rect x="3" y="1" width="8" height="12" rx="4" stroke={bone} strokeWidth={1} opacity={0.35} />
            <circle cx="7" cy="5" r="1.5" fill={crimson} />
            <path d="M7 16l-2.5 2.5M7 16l2.5 2.5" stroke={bone} strokeWidth={1} opacity={0.25} />
          </svg>
        </div>
      </div>
    </section>
  )
}
