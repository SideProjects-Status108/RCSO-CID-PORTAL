/**
 * Resizes `public/branding/cid-portal-app-icon.png` to PWA sizes (requires `canvas`).
 * Run: npm run generate:icons
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createCanvas, loadImage } from 'canvas'

async function main() {
  const root = process.cwd()
  const src = path.join(root, 'public', 'branding', 'cid-portal-app-icon.png')
  if (!fs.existsSync(src)) {
    console.error('Missing source image:', src)
    process.exit(1)
  }

  const img = await loadImage(src)
  const outDir = path.join(root, 'public', 'icons')
  fs.mkdirSync(outDir, { recursive: true })

  for (const size of [192, 512]) {
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, size, size)
    const dest = path.join(outDir, `icon-${size}.png`)
    fs.writeFileSync(dest, canvas.toBuffer('image/png'))
    console.log('Wrote', dest)
  }
}

void main()
