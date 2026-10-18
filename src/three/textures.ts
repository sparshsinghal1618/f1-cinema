// Canvas-generated textures.
//
// Nothing here is downloaded: the carbon weave, tyre rubber with sidewall
// lettering, decals, asphalt and brushed metal are all drawn at runtime, which
// keeps the bundle small and avoids shipping unlicensed material maps.

import * as THREE from 'three';

function createCanvas(width: number, height = width): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return { canvas, ctx };
}

/** Canvas letter-spacing is not in every TypeScript DOM lib yet. */
function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number): void {
  (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

function toTexture(canvas: HTMLCanvasElement, repeat: [number, number], srgb: boolean): THREE.Texture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

let carbonCache: THREE.Texture | null = null;

/** 2×2 twill carbon-fibre weave, drawn as interleaved anisotropic tows. */
export function carbonTexture(repeat: [number, number] = [10, 10]): THREE.Texture {
  if (carbonCache) return carbonCache;
  const size = 512;
  const { canvas, ctx } = createCanvas(size);
  ctx.fillStyle = '#08090b';
  ctx.fillRect(0, 0, size, size);

  const cell = 32;
  const tows = size / cell;

  for (let row = 0; row < tows; row += 1) {
    for (let col = 0; col < tows; col += 1) {
      const over = (row + col) % 2 === 0;
      const x = col * cell;
      const y = row * cell;
      const gradient = ctx.createLinearGradient(x, y, x + cell, y + cell);
      if (over) {
        gradient.addColorStop(0, '#1b1e23');
        gradient.addColorStop(0.45, '#24282e');
        gradient.addColorStop(1, '#141619');
      } else {
        gradient.addColorStop(0, '#101215');
        gradient.addColorStop(0.5, '#171a1e');
        gradient.addColorStop(1, '#0b0c0e');
      }
      ctx.fillStyle = gradient;
      ctx.beginPath();
      if (over) {
        ctx.moveTo(x + 3, y + 3);
        ctx.lineTo(x + cell - 3, y + 1);
        ctx.lineTo(x + cell - 1, y + cell - 3);
        ctx.lineTo(x + 1, y + cell - 1);
      } else {
        ctx.moveTo(x + 3, y + 1);
        ctx.lineTo(x + cell - 1, y + 3);
        ctx.lineTo(x + cell - 3, y + cell - 1);
        ctx.lineTo(x + 1, y + cell - 3);
      }
      ctx.closePath();
      ctx.fill();

      // Faint tow separation lines keep the weave readable up close.
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  // Slight sheen variation so the weave does not look perfectly uniform.
  for (let i = 0; i < 220; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.012 + Math.random() * 0.02})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  carbonCache = toTexture(canvas, repeat, true);
  return carbonCache;
}

let tyreCache: THREE.Texture | null = null;

/**
 * Slick tyre map. The lathe UV layout runs u = around the tyre, so the sidewall
 * band is where the lettering goes and it wraps the circumference as intended.
 */
export function tyreTexture(): THREE.Texture {
  if (tyreCache) return tyreCache;
  const width = 1024;
  const height = 512;
  const { canvas, ctx } = createCanvas(width, height);
  ctx.fillStyle = '#131315';
  ctx.fillRect(0, 0, width, height);

  // Profile: v 0 = inner face, sidewall, tread (middle), sidewall, inner face.
  const sidewallBand = (y: number, h: number) => {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#0d0d0f');
    g.addColorStop(0.5, '#1a1a1d');
    g.addColorStop(1, '#0d0d0f');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, width, h);
  };
  sidewallBand(30, 90);
  sidewallBand(height - 120, 90);

  // Tread band: fine circumferential grain.
  ctx.fillStyle = '#17171a';
  ctx.fillRect(0, 140, width, height - 280);
  for (let i = 0; i < 1600; i += 1) {
    ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.035})`;
    ctx.lineWidth = 1;
    const y = 140 + Math.random() * (height - 280);
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, y);
    ctx.lineTo(Math.random() * width, y);
    ctx.stroke();
  }

  // Sidewall lettering, repeated around the circumference.
  const drawLettering = (y: number, text: string) => {
    ctx.save();
    ctx.fillStyle = 'rgba(226,226,230,0.82)';
    ctx.font = '600 34px "Barlow Condensed", "Arial Narrow", sans-serif';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 4; i += 1) {
      const x = (i / 4) * width + 40;
      ctx.fillText(text, x, y);
    }
    ctx.fillStyle = 'rgba(225,6,0,0.75)';
    for (let i = 0; i < 4; i += 1) {
      const x = (i / 4) * width + width / 8;
      ctx.fillText('SLICK', x, y);
    }
    ctx.restore();
  };
  drawLettering(75, 'F1');
  drawLettering(height - 75, 'F1');

  // Carcass highlight near the shoulder.
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 138, width, 2);
  ctx.strokeRect(0, height - 140, width, 2);

  tyreCache = toTexture(canvas, [1, 1], true);
  return tyreCache;
}

let asphaltCache: THREE.Texture | null = null;

/** Dry asphalt: aggregate speckle with subtle tyre-rubber darkening. */
export function asphaltTexture(repeat: [number, number] = [24, 24]): THREE.Texture {
  if (asphaltCache) return asphaltCache;
  const size = 512;
  const { canvas, ctx } = createCanvas(size);
  ctx.fillStyle = '#26282b';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 26000; i += 1) {
    const grey = 20 + Math.random() * 70;
    ctx.fillStyle = `rgba(${grey},${grey + 4},${grey + 8},${0.25 + Math.random() * 0.5})`;
    const r = Math.random() * 2.2;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 260; i += 1) {
    ctx.strokeStyle = `rgba(12,12,14,${0.05 + Math.random() * 0.12})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 90, y + (Math.random() - 0.5) * 90);
    ctx.stroke();
  }
  asphaltCache = toTexture(canvas, repeat, true);
  return asphaltCache;
}

let wetCache: THREE.Texture | null = null;

/** Wet asphalt: darker base, glossier patches and standing-water streaks. */
export function wetAsphaltTexture(repeat: [number, number] = [10, 10]): THREE.Texture {
  if (wetCache) return wetCache;
  const size = 512;
  const { canvas, ctx } = createCanvas(size);
  ctx.fillStyle = '#0d0f12';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i += 1) {
    const grey = 14 + Math.random() * 40;
    ctx.fillStyle = `rgba(${grey},${grey + 4},${grey + 10},${0.2 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 120; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 20 + Math.random() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(150,180,210,${0.05 + Math.random() * 0.08})`);
    g.addColorStop(1, 'rgba(150,180,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  wetCache = toTexture(canvas, repeat, true);
  return wetCache;
}

/** Roughness companion for asphalt: puddle-like smooth patches. */
export function asphaltRoughnessTexture(repeat: [number, number] = [10, 10]): THREE.Texture {
  const size = 256;
  const { canvas, ctx } = createCanvas(size);
  ctx.fillStyle = '#b9b9b9';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 8 + Math.random() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(20,20,20,${0.3 + Math.random() * 0.5})`);
    g.addColorStop(1, 'rgba(20,20,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(canvas, repeat, false);
}

/** Transparent decal texture with centred text (used for bodywork branding). */
export function textDecal(
  text: string,
  options: {
    width?: number;
    height?: number;
    color?: string;
    font?: string;
    letterSpacing?: number;
    weight?: number;
    align?: 'center' | 'left';
    sub?: string;
    subColor?: string;
  } = {},
): THREE.Texture {
  const {
    width = 1024,
    height = 256,
    color = '#f5f7f9',
    font = '"Barlow Condensed", "Arial Narrow", sans-serif',
    weight = 700,
    letterSpacing = 8,
    align = 'center',
    sub,
    subColor = '#e10600',
  } = options;
  const { canvas, ctx } = createCanvas(width, height);
  ctx.clearRect(0, 0, width, height);
  const fontSize = Math.floor(height * (sub ? 0.46 : 0.6));
  ctx.font = `${weight} ${fontSize}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  setLetterSpacing(ctx, letterSpacing);
  const x = align === 'center' ? width / 2 : 16;
  ctx.fillText(text, x, sub ? height * 0.42 : height * 0.52);

  if (sub) {
    ctx.font = `500 ${Math.floor(height * 0.24)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.fillStyle = subColor;
    setLetterSpacing(ctx, 4);
    ctx.fillText(sub, x, height * 0.78);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** Diagonal hazard stripes for wing endplates and floor edges. */
export function hazardStripeTexture(color = '#e10600', background = '#0c0d0f', stripes = 8): THREE.Texture {
  const size = 256;
  const { canvas, ctx } = createCanvas(size);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = color;
  const band = size / stripes;
  for (let i = -stripes; i < stripes * 2; i += 2) {
    ctx.beginPath();
    ctx.moveTo(i * band, 0);
    ctx.lineTo((i + 1) * band, 0);
    ctx.lineTo((i + 1) * band - size, size);
    ctx.lineTo(i * band - size, size);
    ctx.closePath();
    ctx.fill();
  }
  return toTexture(canvas, [1, 1], true);
}

/** Brushed metal for suspension and brake components. */
export function brushedMetalTexture(repeat: [number, number] = [1, 1]): THREE.Texture {
  const width = 512;
  const height = 128;
  const { canvas, ctx } = createCanvas(width, height);
  ctx.fillStyle = '#b7bcc3';
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 4200; i += 1) {
    const y = Math.random() * height;
    const shade = 120 + Math.random() * 110;
    ctx.strokeStyle = `rgba(${shade},${shade},${shade + 6},${0.05 + Math.random() * 0.16})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  return toTexture(canvas, repeat, true);
}

/** Checkered start/finish band for the game track. */
export function checkerTexture(columns = 12, rows = 3): THREE.Texture {
  const cell = 32;
  const { canvas, ctx } = createCanvas(columns * cell, rows * cell);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#f2f4f6' : '#0b0c0e';
      ctx.fillRect(col * cell, row * cell, cell, cell);
    }
  }
  return toTexture(canvas, [1, 1], true);
}

export function disposeTexture(texture: THREE.Texture | null): void {
  texture?.dispose();
}
