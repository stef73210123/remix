'use client'

import { useEffect, useRef } from 'react'

/**
 * Animated topographic contour background — matches the moving "topo" hero on
 * remixcre.com. Marching-squares contour lines over an evolving noise field,
 * in the Remix brand red (#CA615F) + white. Fixed, full-viewport, behind content.
 */
export default function TopoBackground() {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let time = 0
    let animId = 0

    function resize() {
      const dpr = window.devicePixelRatio || 1
      w = window.innerWidth
      h = window.innerHeight
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      canvas!.style.width = w + 'px'
      canvas!.style.height = h + 'px'
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function noise(x: number, y: number, t: number): number {
      return (
        Math.sin(x * 0.008 + t * 0.15) * Math.cos(y * 0.006 - t * 0.1) +
        Math.sin((x + y) * 0.005 + t * 0.08) * 0.7 +
        Math.cos(x * 0.012 - y * 0.01 + t * 0.12) * 0.5 +
        Math.sin(x * 0.003 + t * 0.05) * Math.sin(y * 0.004 - t * 0.07) * 0.8
      )
    }

    function draw() {
      const c = ctx!
      c.clearRect(0, 0, w, h)
      const step = 6
      const cols = Math.ceil(w / step) + 1
      const rows = Math.ceil(h / step) + 1

      const field = new Float32Array(cols * rows)
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          field[j * cols + i] = noise(i * step, j * step, time)
        }
      }

      const levels = [-1.2, -0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9, 1.2]
      levels.forEach((level, li) => {
        const isRed = li === 3 || li === 4 || li === 5 || li === 6
        const alpha = isRed ? 0.28 : 0.09 + (li % 2) * 0.04
        c.strokeStyle = isRed
          ? 'rgba(202, 97, 95, ' + alpha + ')'
          : 'rgba(255, 255, 255, ' + alpha + ')'
        c.lineWidth = isRed ? 1.5 : 0.8
        c.beginPath()

        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            const x = i * step
            const y = j * step
            const tl = field[j * cols + i]
            const tr = field[j * cols + i + 1]
            const br = field[(j + 1) * cols + i + 1]
            const bl = field[(j + 1) * cols + i]

            const code =
              (tl >= level ? 8 : 0) |
              (tr >= level ? 4 : 0) |
              (br >= level ? 2 : 0) |
              (bl >= level ? 1 : 0)
            if (code === 0 || code === 15) continue

            const lerp = (a: number, b: number) => (level - a) / (b - a)
            const top = x + lerp(tl, tr) * step
            const right = y + lerp(tr, br) * step
            const bottom = x + lerp(bl, br) * step
            const left = y + lerp(tl, bl) * step

            const seg: number[] = []
            switch (code) {
              case 1: case 14: seg.push(x, left, bottom, y + step); break
              case 2: case 13: seg.push(bottom, y + step, x + step, right); break
              case 3: case 12: seg.push(x, left, x + step, right); break
              case 4: case 11: seg.push(top, y, x + step, right); break
              case 5: seg.push(x, left, top, y); seg.push(bottom, y + step, x + step, right); break
              case 6: case 9: seg.push(top, y, bottom, y + step); break
              case 7: case 8: seg.push(x, left, top, y); break
              case 10: seg.push(x, left, bottom, y + step); seg.push(top, y, x + step, right); break
            }
            for (let s = 0; s < seg.length; s += 4) {
              c.moveTo(seg[s], seg[s + 1])
              c.lineTo(seg[s + 2], seg[s + 3])
            }
          }
        }
        c.stroke()
      })

      time += 0.008
      animId = requestAnimationFrame(draw)
    }

    resize()
    draw()

    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animId)
        animId = 0
      } else if (!animId) {
        draw()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className="topo-bg" />
}
