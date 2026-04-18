'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

export type SignaturePadHandle = {
  getDataUrl: () => string | null
  clear: () => void
  isEmpty: () => boolean
}

type Props = {
  /** Logical (CSS) width; canvas scales to device pixel ratio internally. */
  width?: number
  height?: number
  className?: string
  /** Fires whenever the stroke count changes (e.g. to enable a Submit button). */
  onChange?: (isEmpty: boolean) => void
  disabled?: boolean
  label?: string
  ref?: React.RefObject<SignaturePadHandle | null>
}

/**
 * HTML5 Canvas signature pad. Captures pointer events (pen / touch / mouse)
 * and renders to a high-DPI offscreen canvas. Export via getDataUrl() on the
 * imperative handle.
 *
 * Note: if stroke smoothness proves insufficient on real tablets, upgrade to
 * signature_pad.js (explicitly scoped in the plan). For now, a plain canvas
 * keeps the bundle small.
 */
export function SignaturePad({
  width = 520,
  height = 180,
  className,
  onChange,
  disabled = false,
  label = 'Signature',
  ref,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const setEmpty = useCallback(
    (next: boolean) => {
      setIsEmpty((prev) => {
        if (prev !== next) onChange?.(next)
        return next
      })
    },
    [onChange]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2
    ctx.strokeStyle = '#111827'
  }, [width, height])

  useImperativeHandle<SignaturePadHandle, SignaturePadHandle>(
    ref as React.Ref<SignaturePadHandle>,
    () => ({
      getDataUrl: () => {
        const canvas = canvasRef.current
        if (!canvas || isEmpty) return null
        return canvas.toDataURL('image/png')
      },
      clear: () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        setEmpty(true)
      },
      isEmpty: () => isEmpty,
    }),
    [isEmpty, setEmpty]
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
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    ctx.lineTo(point.x + 0.01, point.y + 0.01)
    ctx.stroke()
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
    const midX = (last.x + point.x) / 2
    const midY = (last.y + point.y) / 2
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.quadraticCurveTo(last.x, last.y, midX, midY)
    ctx.stroke()
    lastPointRef.current = point
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    canvas?.releasePointerCapture(event.pointerId)
    drawingRef.current = false
    lastPointRef.current = null
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
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
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-text-tertiary hover:bg-bg-subtle hover:text-text-primary disabled:opacity-50"
        >
          <Eraser className="h-3 w-3" />
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        style={{ width, height, touchAction: 'none' }}
        className={`rounded-md border border-border-subtle bg-white ${
          disabled ? 'pointer-events-none opacity-60' : 'cursor-crosshair'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
      <p className="text-[11px] text-text-tertiary">
        Sign with your finger, stylus, or mouse. Your signature is recorded with a timestamp and
        device metadata.
      </p>
    </div>
  )
}
