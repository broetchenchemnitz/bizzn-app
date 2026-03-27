'use client'

/**
 * StickyHeader — Client Component
 *
 * Implements critical iOS Safari rendering fixes:
 *
 * 1. Backdrop-Filter Clipping:
 *    rgba(26, 26, 26, 0.01) minimum opacity injected via CSS @supports block
 *    in globals.css to force Safari to composite nested containers.
 *
 * 2. Event Bubbling Guard (transitionend):
 *    All transitionend listeners guard with:
 *      if (event.target !== event.currentTarget) return;
 *    This prevents child element transitions from triggering the parent
 *    callback multiple times (event bubbling).
 *    Additional guard: only fires for the longest-duration transition
 *    property to prevent multiple firings per transition lifecycle.
 *
 * 3. VRAM Flush via double requestAnimationFrame:
 *    will-change is reset to 'auto' inside a double-rAF callback.
 *    Pattern: rAF → rAF → reset
 *    This allows Safari's render tree (layout + paint) to fully commit
 *    before the GPU layer is released, preventing the VRAM flush flicker.
 */

import { useEffect, useRef, ReactNode } from 'react'

interface StickyHeaderProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

// The longest-duration transition property on this element.
// Used to filter transitionend events so the VRAM flush fires only once
// per transition lifecycle (on the longest-running property completing).
const LONGEST_TRANSITION_PROPERTY = 'background-color'

export default function StickyHeader({ children, className, style }: StickyHeaderProps) {
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return

    // ── Activate GPU hint on mount ────────────────────────────────────────
    // will-change: transform is set on mount (sticky element needs compositing).
    // It is NOT set via translate3d — that forces an immediate GPU layer with
    // no release mechanism and risks VRAM exhaustion in Safari.
    el.style.willChange = 'transform'

    // ── transitionend handler ─────────────────────────────────────────────
    const handleTransitionEnd = (event: TransitionEvent) => {
      // Guard 1 — event bubbling:
      // Prevent child element transitions from triggering this callback.
      // Without this, every nested element's transitionend bubbles up and
      // the VRAM flush would fire multiple times per lifecycle.
      if (event.target !== event.currentTarget) return

      // Guard 2 — longest property filter:
      // Only reset VRAM on the completion of the longest-running property
      // to ensure all sub-transitions have also completed before cleanup.
      if (event.propertyName !== LONGEST_TRANSITION_PROPERTY) return

      // ── VRAM Flush via double requestAnimationFrame ───────────────────
      // Pattern required by Safari's render pipeline:
      //   Frame 1: Safari commits layout changes (style recalc)
      //   Frame 2: Safari commits paint (compositing)
      //   → then safe to release the GPU layer
      //
      // Releasing will-change before both frames allows Safari to discard
      // the GPU layer while it still needs it — causing the flicker/flash.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (el) el.style.willChange = 'auto'
        })
      })
    }

    el.addEventListener('transitionend', handleTransitionEnd)

    return () => {
      el.removeEventListener('transitionend', handleTransitionEnd)
      // Cleanup: release GPU hint if component unmounts
      el.style.willChange = 'auto'
    }
  }, [])

  return (
    <header
      ref={headerRef}
      className={className}
      style={style}
    >
      {children}
    </header>
  )
}
