/**
 * One-off: convert the JPEG-backed brand assets under public/branding/ into
 * true transparent PNGs by chroma-keying the solid background out.
 *
 *   cid-portal-app-icon.png  — source has a pure-black background, preserve
 *                              the badge + CID PORTAL wordmark in color.
 *   rcso-detective-badge.png — source has a pure-white background, preserve
 *                              the gold/blue badge.
 *
 * Run:
 *   npx tsx scripts/strip-brand-backgrounds.ts
 *
 * After this runs, re-generate PWA icons:
 *   npm run generate:icons
 *
 * Note: This is a placeholder until the department provides true transparent
 * PNGs. When those arrive, just overwrite the two files and skip this script.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createCanvas, loadImage } from 'canvas'

type Target = {
  file: string
  /** Background color to strip. */
  keyR: number
  keyG: number
  keyB: number
  /**
   * Max sq-distance in RGB for a pixel to count as "fully background".
   * 0–195075 range (3 * 255^2).
   */
  fullTransThreshold: number
  /**
   * Max sq-distance for a pixel to count as "edge — partially transparent".
   * Should be larger than fullTransThreshold; creates a soft alpha ramp that
   * reduces fringe artifacts around the badge's filigree.
   */
  softTransThreshold: number
}

const BRAND_DIR = path.join(process.cwd(), 'public', 'branding')

const targets: Target[] = [
  {
    file: 'cid-portal-app-icon.png',
    keyR: 0,
    keyG: 0,
    keyB: 0,
    // Pure black is unambiguous on this logo — narrow bands are enough.
    fullTransThreshold: 900, // ≈ 17/channel
    softTransThreshold: 5000, // ≈ 41/channel
  },
  {
    file: 'rcso-detective-badge.png',
    keyR: 255,
    keyG: 255,
    keyB: 255,
    // White background with gold/blue subject — the gold has very light
    // highlights, so we keep the "fully transparent" band tight and let the
    // soft band feather the boundary.
    fullTransThreshold: 300, // ≈ 10/channel
    softTransThreshold: 3200, // ≈ 33/channel
  },
]

async function strip(target: Target) {
  const src = path.join(BRAND_DIR, target.file)
  if (!fs.existsSync(src)) {
    console.warn('skip (missing):', src)
    return
  }

  const img = await loadImage(src)
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, img.width, img.height)
  const data = imageData.data

  const { keyR, keyG, keyB, fullTransThreshold, softTransThreshold } = target
  const span = softTransThreshold - fullTransThreshold

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - keyR
    const dg = data[i + 1] - keyG
    const db = data[i + 2] - keyB
    const dist = dr * dr + dg * dg + db * db
    if (dist <= fullTransThreshold) {
      data[i + 3] = 0
    } else if (dist < softTransThreshold) {
      // Linear ramp: closer to background = more transparent.
      const t = (dist - fullTransThreshold) / span
      data[i + 3] = Math.round(255 * t)
    }
    // else: keep original alpha (255 for JPEG source)
  }

  ctx.putImageData(imageData, 0, 0)
  const out = canvas.toBuffer('image/png')
  fs.writeFileSync(src, out)
  console.log('wrote', src, `(${out.length} bytes, ${img.width}x${img.height})`)
}

async function main() {
  for (const t of targets) {
    await strip(t)
  }
}

void main()
