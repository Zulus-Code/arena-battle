// ─── Procedural Textures ──────────────────────────────────────────────────────
// Runtime-generated textures via Canvas API — no external assets needed.

import * as THREE from 'three';

// Simple seeded PRNG
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Concrete/gravel floor texture — dark green-grey with grit speckles.
 */
export function createFloorTexture(): THREE.CanvasTexture {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2d3d2d';
  ctx.fillRect(0, 0, S, S);

  const rand = mulberry32(7);
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = rand();
    const g = 45 + r * 16;
    d[i]     = g * 0.68;   // R
    d[i + 1] = g;           // G
    d[i + 2] = g * 0.62;   // B
    d[i + 3] = 255;
    // Dark grit specks
    if (r < 0.025) {
      d[i] = 22;
      d[i + 1] = 24;
      d[i + 2] = 20;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Sandstone/limestone column texture with subtle horizontal strata.
 */
export function createColumnStoneTexture(): THREE.CanvasTexture {
  const W = 128, H = 256;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b8a88a';
  ctx.fillRect(0, 0, W, H);

  const rand = mulberry32(13);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;

  for (let i = 0; i < d.length; i += 4) {
    const r = rand();
    const v = 160 + r * 38;
    d[i]     = v * 0.72;
    d[i + 1] = v * 0.65;
    d[i + 2] = v * 0.52;
    d[i + 3] = 255;
    // Horizontal strata
    const y = Math.floor(i / 4 / W);
    if (y % 28 < 2 && r < 0.55) {
      d[i]     *= 0.78;
      d[i + 1] *= 0.78;
      d[i + 2] *= 0.78;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Roughness variation map — breaks up uniform shiny surfaces on vehicle bodies.
 */
export function createBodyRoughnessMap(): THREE.CanvasTexture {
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  const rand = mulberry32(99);
  const img = ctx.createImageData(S, S);
  const d = img.data;

  for (let i = 0; i < d.length; i += 4) {
    // Base roughness ≈ 0.35–0.55
    const v = 90 + rand() * 140;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;

    // Subtle panel seam darkening
    const x = (i / 4) % S;
    const y = Math.floor(i / 4 / S);
    if ((Math.abs(x - 32) < 2 || Math.abs(x - 96) < 2 || Math.abs(y - 64) < 2) && rand() < 0.65) {
      d[i] = d[i + 1] = d[i + 2] = 50;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // Roughness maps are linear — no sRGB color space
  return tex;
}

/**
 * Subtle metallic noise for body paint (combined with roughness map).
 */
export function createMetallicFlakeTexture(): THREE.CanvasTexture {
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  const rand = mulberry32(42);
  const img = ctx.createImageData(S, S);
  const d = img.data;

  for (let i = 0; i < d.length; i += 4) {
    const v = rand() < 0.06 ? 180 + rand() * 75 : 30 + rand() * 40;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
