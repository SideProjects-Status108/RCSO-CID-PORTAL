/**
 * Generates PWA icons (requires `canvas` native module).
 * Run: npx tsx scripts/generate-icons.ts
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createCanvas } from 'canvas'

const BG = '#0E0F11'
const BLUE = '#1E6FD9'
const WHITE = '#FFFFFF'

function drawIcon(size: number) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, size, size)

  const pad = size * 0.12
  const w = size - pad * 2
  const h = size - pad * 2
  const cx = size / 2
  const top = pad + h * 0.08
  const bottom = pad + h * 0.92

  ctx.strokeStyle = BLUE
  ctx.lineWidth = Math.max(2, size / 64)
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx, top)
  ctx.lineTo(pad + w * 0.92, pad + h * 0.38)
  ctx.lineTo(pad + w * 0.78, bottom)
  ctx.lineTo(pad + w * 0.22, bottom)
  ctx.lineTo(pad + w * 0.08, pad + h * 0.38)
  ctx.closePath()
  ctx.stroke()

  ctx.fillStyle = WHITE
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(size * 0.22)}px sans-serif`
  ctx.fillText('CID', cx, pad + h * 0.52)

  return canvas
}

function main() {
  const outDir = path.join(process.cwd(), 'public', 'icons')
  fs.mkdirSync(outDir, { recursive: true })

  for (const size of [192, 512]) {
    const buf = drawIcon(size).toBuffer('image/png')
    const dest = path.join(outDir, `icon-${size}.png`)
    fs.writeFileSync(dest, buf)
    console.log('Wrote', dest)
  }
}

main()
