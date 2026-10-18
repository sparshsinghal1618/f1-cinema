// Single GSAP entry point so the ScrollTrigger plugin is registered exactly once,
// and so every timeline can be created with the same reduced-motion escape hatch.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from './motion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

export function motionAllowed(): boolean {
  return !prefersReducedMotion();
}

export function scrollTriggerSafe(callback: () => void): void {
  // ScrollTrigger can fire before layout settles on slow devices; deferring one
  // frame avoids measuring the wrong document height.
  requestAnimationFrame(() => requestAnimationFrame(callback));
}
