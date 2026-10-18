// User display preferences that must survive reloads and be readable from
// non-React code (the motion helpers read the reduced-motion flag directly).
//
// Flags are applied to <html> as data attributes, so CSS can honour them without
// any component needing to know about them.

import { useEffect, useState } from 'react';

export interface Prefs {
  /** Force reduced motion on regardless of the OS setting. */
  reduce: boolean;
  /** Simplified reading mode: larger text, plainer surfaces. */
  readable: boolean;
}

const STORAGE_KEY = 'f1:prefs';

function load(): Prefs {
  const fallback: Prefs = { reduce: false, readable: false };
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return { reduce: Boolean(parsed.reduce), readable: Boolean(parsed.readable) };
  } catch {
    return fallback;
  }
}

let prefs: Prefs = load();
const listeners = new Set<() => void>();

function apply(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (prefs.reduce) root.dataset.reduce = 'on';
  else delete root.dataset.reduce;
  if (prefs.readable) root.dataset.readable = 'on';
  else delete root.dataset.readable;
}

apply();

export function getPrefs(): Prefs {
  return prefs;
}

export function setPref(flag: keyof Prefs, value: boolean): void {
  prefs = { ...prefs, [flag]: value };
  apply();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage may be unavailable; the in-memory value still applies */
  }
  listeners.forEach((listener) => listener());
}

export function subscribePrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `true` when the visitor has explicitly asked for reduced motion here. */
export function reducedMotionOverride(): boolean {
  return prefs.reduce;
}

export function usePrefs(): Prefs {
  const [value, setValue] = useState(getPrefs);
  useEffect(() => subscribePrefs(() => setValue(getPrefs())), []);
  return value;
}
