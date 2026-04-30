/**
 * One-off: convert the JPEG-backed brand assets under public/branding/ into
 * true transparent PNGs by chroma-keying the solid background out.
 *
 *   cid-portal-app-icon.png  — source has a pure-black background, preserve
 *                              the badge + CID PORTAL wordmark in color.
 *   rcso-detective-badge.png — source has a pure-white background, preserve
 *                              the gold/blue badge.
 *   rcso-sheriff-badge-source.png — black-bg sheriff star; outputs
 *                              rcso-cfcs-watermark.png (Case File Cover Sheet).
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
  /**
   * When set, output is written here instead of overwriting `file`
   * (read from `file` in `public/branding/`).
   */
  outFile?: string
  /** Multiply alpha after keying (0–1) for watermarks / washout. Default 1. */
  alphaScale?: number
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
    keyR: 0,
    keyG: 0,
    keyB: 0,
    // Pure-black background on the 2026-04-18 asset. The badge itself has
    // dark navy + near-black filigree detail, so the "fully transparent"
    // band has to stay very tight — otherwise we punch holes in the dark
    // parts of the subject. The soft ramp handles the thin anti-aliased
    // halo around the star's outer edge.
    fullTransThreshold: 300, // ≈ 10/channel
    softTransThreshold: 2400, // ≈ 28/channel
  },
  {
    file: 'rcso-sheriff-badge-source.png',
    outFile: 'rcso-cfcs-watermark.png',
    // Slightly higher alpha than raw strip so the CFCS form text stays readable.
    alphaScale: 0.32,
    keyR: 0,
    keyG: 0,
    keyB: 0,
    fullTransThreshold: 300,
    softTransThreshold: 2400,
  },
]

async function strip(target: Target) {
  const src = path.join(BRAND_DIR, target.file)
  if (!fs.existsSync(src)) {
    console.warn('skip (missing):', src)
    return
  }

  const outPath = path.join(BRAND_DIR, target.outFile ?? target.file)

  const img = await loadImage(src)
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, img.width, img.height)
  const data = imageData.data

  const { keyR, keyG, keyB, fullTransThreshold, softTransThreshold } = target
  const alphaScale = target.alphaScale ?? 1
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
      data[i + 3] = Math.round(255 * t * alphaScale)
    } else {
      data[i + 3] = Math.min(255, Math.round(255 * alphaScale))
    }
  }

  ctx.putImageData(imageData, 0, 0)
  const out = canvas.toBuffer('image/png')
  fs.writeFileSync(outPath, out)
  console.log('wrote', outPath, `(${out.length} bytes, ${img.width}x${img.height})`)
}

async function main() {
  for (const t of targets) {
    await strip(t)
  }
}

void main()
