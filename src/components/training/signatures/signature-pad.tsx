'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

export type SignaturePadHandle = {
  getDataUrl: () => string | null
  clear: () => void
  isEmpty: () => boolean
}

type Props = {
  /**
   * Logical (CSS) height in px. The canvas always expands to 100% of the
   * parent's width and rescales its backing store when the width changes.
   */
  height?: number
  className?: string
  /** Fires whenever empty-state changes (e.g. to enable a Submit button). */
  onChange?: (isEmpty: boolean) => void
  disabled?: boolean
  label?: string
  ref?: React.RefObject<SignaturePadHandle | null>
  /**
   * Printed identity rendered below the pad. The portal always records the
   * authenticated user's full name and badge server-side; showing them here
   * makes it explicit to the signer exactly what will be attached to the
   * handwritten signature in the event it's illegible.
   */
  printedName?: string
  printedBadge?: string | null
}

/**
 * HTML5 Canvas signature pad.
 *
 * Responsive: the canvas is sized by CSS to 100% of its container width; a
 * ResizeObserver syncs the backing pixel store when the container resizes,
 * so strokes stay crisp at any DPR and the pad never overflows its parent
 * (e.g. inside a narrow modal).
 *
 * Smooth strokes: each pointermove segment is rendered using a quadratic
 * curve whose control point is the previous raw sample and whose endpoint
 * is the midpoint between previous and current samples. The next segment
 * starts at that midpoint, so there are no gaps (which previously produced
 * a dashed appearance).
 */
export function SignaturePad({
  height = 180,
  className,
  onChange,
  disabled = false,
  label = 'Signature',
  ref,
  printedName,
  printedBadge,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const lastMidRef = useRef<{ x: number; y: number } | null>(null)
  const emptyRef = useRef(true)
  const [isEmpty, setIsEmpty] = useState(true)

  const setEmpty = useCallback(
    (next: boolean) => {
      if (emptyRef.current === next) return
      emptyRef.current = next
      setIsEmpty(next)
      onChange?.(next)
    },
    [onChange]
  )

  const applyContextDefaults = (ctx: CanvasRenderingContext2D, dpr: number) => {
    // setTransform resets any prior scale so repeated resizes don't stack.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2.2
    ctx.strokeStyle = '#111827'
  }

  // Size the backing store to match the CSS box (responsive + high-DPI).
  // Note: resizing wipes the drawing. That's acceptable for a signature pad
  // because the container width is stable once the modal is mounted.
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const cssWidth = Math.max(1, Math.floor(container.clientWidth))
      const cssHeight = height
      canvas.style.width = `${cssWidth}px`
      canvas.style.height = `${cssHeight}px`
      canvas.width = Math.floor(cssWidth * dpr)
      canvas.height = Math.floor(cssHeight * dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      applyContextDefaults(ctx, dpr)
      setEmpty(true)
    }

    resize()

    const ro = new ResizeObserver(() => resize())
    ro.observe(container)
    return () => ro.disconnect()
  }, [height, setEmpty])

  useImperativeHandle<SignaturePadHandle, SignaturePadHandle>(
    ref as React.Ref<SignaturePadHandle>,
    () => ({
      getDataUrl: () => {
        const canvas = canvasRef.current
        if (!canvas || emptyRef.current) return null
        return canvas.toDataURL('image/png')
      },
      clear: () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const dpr = window.devicePixelRatio || 1
        // Reset transform to clear in raw pixel space, then reapply.
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        applyContextDefaults(ctx, dpr)
        setEmpty(true)
      },
      isEmpty: () => emptyRef.current,
    }),
    [setEmpty]
  )

  const getLocalCoords = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(event.pointerId)
    drawingRef.current = true
    const point = getLocalCoords(event)
    lastPointRef.current = point
    lastMidRef.current = point
    // Draw an initial dot so single taps register as ink.
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.arc(point.x, point.y, ctx.lineWidth / 2, 0, Math.PI * 2)
    ctx.fillStyle = '#111827'
    ctx.fill()
    setEmpty(false)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const point = getLocalCoords(event)
    const last = lastPointRef.current ?? point
    const prevMid = lastMidRef.current ?? last
    const mid = { x: (last.x + point.x) / 2, y: (last.y + point.y) / 2 }
    // Smooth quadratic: start at previous midpoint, use previous sample as
    // control, end at new midpoint. This keeps consecutive segments continuous.
    ctx.beginPath()
    ctx.moveTo(prevMid.x, prevMid.y)
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y)
    ctx.stroke()
    lastPointRef.current = point
    lastMidRef.current = mid
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    // Draw a final segment to the last raw sample so end strokes aren't cut short.
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      const last = lastPointRef.current
      const mid = lastMidRef.current
      if (ctx && last && mid) {
        ctx.beginPath()
        ctx.moveTo(mid.x, mid.y)
        ctx.lineTo(last.x, last.y)
        ctx.stroke()
      }
      canvas.releasePointerCapture(event.pointerId)
    }
    drawingRef.current = false
    lastPointRef.current = null
    lastMidRef.current = null
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    applyContextDefaults(ctx, dpr)
    setEmpty(true)
  }

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-text-secondary">{label}</span>
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || isEmpty}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-text-secondary hover:bg-bg-elevated hover:text-text-primary disabled:opacity-50"
        >
          <Eraser className="h-3 w-3" />
          Clear
        </button>
      </div>
      <div ref={containerRef} className="w-full">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={label}
          style={{ touchAction: 'none', display: 'block' }}
          className={`rounded-md border border-border-subtle bg-white ${
            disabled ? 'pointer-events-none opacity-60' : 'cursor-crosshair'
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
      {printedName ? (
        <div
          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 text-xs"
          aria-label="Printed signer identity"
        >
          <div>
            <span className="text-text-secondary">Signed by: </span>
            <span className="font-semibold text-text-primary">{printedName}</span>
          </div>
          <div className="text-text-secondary">
            Badge:{' '}
            <span className="font-mono text-text-primary">
              {printedBadge && printedBadge.trim() ? printedBadge : '—'}
            </span>
          </div>
        </div>
      ) : null}
      <p className="text-[11px] text-text-secondary">
        Sign with your finger, stylus, or mouse. Your printed name and badge above are recorded
        alongside the handwritten signature for legal clarity.
      </p>
    </div>
  )
}
