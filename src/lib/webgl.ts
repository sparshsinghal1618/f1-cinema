// WebGL capability probe. Used to pick a starting quality preset, to decide whether
// the 3D layers can mount at all, and to warn before CINEMA is forced on weak GPUs.

export interface GpuInfo {
  webgl: boolean;
  webgl2: boolean;
  renderer: string;
  vendor: string;
  tier: 'low' | 'mid' | 'high';
  maxTextureSize: number;
  cores: number;
  deviceMemory: number | null;
  coarsePointer: boolean;
}

const SOFTWARE_HINTS = ['swiftshader', 'software', 'llvmpipe', 'basic render', 'microsoft basic'];
const LOW_HINTS = ['intel', 'uhd', 'hd graphics', 'iris', 'mali', 'adreno', 'powervr', 'apple a'];
const HIGH_HINTS = ['rtx', 'geforce', 'radeon rx', 'radeon pro', 'quadro', 'arc a', 'apple m', 'rtx 40', 'rtx 50'];

let cached: GpuInfo | null = null;

export function detectGpu(): GpuInfo {
  if (cached) return cached;

  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const deviceMemory =
    typeof navigator !== 'undefined' && 'deviceMemory' in navigator
      ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0) || null
      : null;
  const coarsePointer =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false;

  const result: GpuInfo = {
    webgl: false,
    webgl2: false,
    renderer: 'unknown',
    vendor: 'unknown',
    tier: 'mid',
    maxTextureSize: 0,
    cores,
    deviceMemory,
    coarsePointer,
  };

  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2');
    const gl = gl2 ?? canvas.getContext('webgl');
    if (gl) {
      result.webgl = true;
      result.webgl2 = Boolean(gl2);
      result.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        result.renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? 'unknown');
        result.vendor = String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) ?? 'unknown');
      } else {
        result.renderer = String(gl.getParameter(gl.RENDERER) ?? 'unknown');
        result.vendor = String(gl.getParameter(gl.VENDOR) ?? 'unknown');
      }
      const lose = gl.getExtension('WEBGL_lose_context');
      lose?.loseContext();
    }
  } catch {
    result.webgl = false;
  }

  const haystack = `${result.renderer} ${result.vendor}`.toLowerCase();
  if (!result.webgl || SOFTWARE_HINTS.some((h) => haystack.includes(h))) {
    result.tier = 'low';
  } else if (HIGH_HINTS.some((h) => haystack.includes(h))) {
    result.tier = 'high';
  } else if (LOW_HINTS.some((h) => haystack.includes(h)) || cores <= 4) {
    result.tier = 'low';
  } else {
    result.tier = 'mid';
  }

  if (coarsePointer && result.tier === 'high') result.tier = 'mid';
  if (!result.webgl2 && result.tier === 'high') result.tier = 'mid';

  cached = result;
  return result;
}
