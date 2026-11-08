/**
 * Procedural GLB model generator for furniture items missing from the Kenney pack.
 * Run once: node scripts/generate-models.mjs
 * Outputs to static/models/
 */

import { Document, NodeIO, Primitive } from '@gltf-transform/core';
import { writeFileSync } from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('static/models');

// ── helpers ──────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

/**
 * Build a box mesh centered at (cx, cy, cz) with given half-extents.
 * Returns { positions, normals, indices }.
 */
function box(cx, cy, cz, hw, hh, hd) {
  // 24 vertices (4 per face, 6 faces) for correct per-face normals
  const p = cx, q = cy, r = cz;
  const x0 = p - hw, x1 = p + hw;
  const y0 = q - hh, y1 = q + hh;
  const z0 = r - hd, z1 = r + hd;

  const positions = new Float32Array([
    // +Y top
    x0,y1,z0, x1,y1,z0, x1,y1,z1, x0,y1,z1,
    // -Y bottom
    x0,y0,z1, x1,y0,z1, x1,y0,z0, x0,y0,z0,
    // +Z front
    x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1,
    // -Z back
    x1,y0,z0, x0,y0,z0, x0,y1,z0, x1,y1,z0,
    // -X left
    x0,y0,z0, x0,y0,z1, x0,y1,z1, x0,y1,z0,
    // +X right
    x1,y0,z1, x1,y0,z0, x1,y1,z0, x1,y1,z1,
  ]);

  const n = [
    [ 0, 1, 0], [ 0,-1, 0],
    [ 0, 0, 1], [ 0, 0,-1],
    [-1, 0, 0], [ 1, 0, 0],
  ];
  const normals = new Float32Array(24 * 3);
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      normals[(f * 4 + v) * 3 + 0] = n[f][0];
      normals[(f * 4 + v) * 3 + 1] = n[f][1];
      normals[(f * 4 + v) * 3 + 2] = n[f][2];
    }
  }

  const indices = new Uint16Array(6 * 6);
  for (let f = 0; f < 6; f++) {
    const b = f * 4;
    indices[f * 6 + 0] = b; indices[f * 6 + 1] = b + 1; indices[f * 6 + 2] = b + 2;
    indices[f * 6 + 3] = b; indices[f * 6 + 4] = b + 2; indices[f * 6 + 5] = b + 3;
  }

  return { positions, normals, indices };
}

/**
 * Append a coloured box to an existing document scene.
 */
function addBox(doc, scene, cx, cy, cz, hw, hh, hd, hexColor) {
  const { positions, normals, indices } = box(cx, cy, cz, hw, hh, hd);
  const rgb = hexToRgb(hexColor);

  const buffer = doc.getRoot().listBuffers()[0];

  const posAcc = doc.createAccessor()
    .setArray(positions).setType('VEC3').setBuffer(buffer);
  const normAcc = doc.createAccessor()
    .setArray(normals).setType('VEC3').setBuffer(buffer);
  const idxAcc = doc.createAccessor()
    .setArray(indices).setType('SCALAR').setBuffer(buffer);

  const mat = doc.createMaterial()
    .setBaseColorFactor([...rgb, 1])
    .setRoughnessFactor(0.8)
    .setMetallicFactor(0.0);

  const prim = doc.createPrimitive()
    .setAttribute('POSITION', posAcc)
    .setAttribute('NORMAL', normAcc)
    .setIndices(idxAcc)
    .setMaterial(mat);

  const mesh = doc.createMesh().addPrimitive(prim);
  const node = doc.createNode().setMesh(mesh);
  scene.addChild(node);
  return node;
}

async function writeGLB(doc, filename) {
  const io = new NodeIO();
  const glb = await io.writeBinary(doc);
  const outPath = path.join(OUT_DIR, filename);
  writeFileSync(outPath, glb);
  console.log(`  ✓ ${filename}`);
}

function newDoc() {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene();
  doc.getRoot().setDefaultScene(scene);
  return { doc, scene };
}

// ── models ───────────────────────────────────────────────────────────────────

// Dimensions are in metres (GLB convention), matching the Kenney pack scale.
// All furniture sits on Y=0 plane. Width=X, Height=Y, Depth=Z.

async function genFireplace() {
  // A fireplace surround: two side pillars + mantle + back wall + firebox opening
  // Overall ~1.0 W × 1.1 H × 0.35 D
  const { doc, scene } = newDoc();
  const W = 0.5, H = 1.0, D = 0.3;
  const tw = 0.12; // pillar width
  const th = 0.15; // mantle thickness

  // Left pillar
  addBox(doc, scene, -W/2 + tw/2, H/2 - th/2, 0, tw/2, (H-th)/2, D/2, '#8B7355');
  // Right pillar
  addBox(doc, scene,  W/2 - tw/2, H/2 - th/2, 0, tw/2, (H-th)/2, D/2, '#8B7355');
  // Mantle (top)
  addBox(doc, scene, 0, H - th/2, 0, W/2 + 0.04, th/2, D/2 + 0.04, '#A09070');
  // Back wall (firebox)
  addBox(doc, scene, 0, (H-th)/2, -D/2 + 0.01, (W - tw*2)/2, (H-th)/2, 0.01, '#2A2A2A');
  // Hearth base (floor slab)
  addBox(doc, scene, 0, 0.02, D/2 + 0.05, W/2 + 0.05, 0.02, 0.1, '#9E9E9E');
  // Fire glow box (orange emissive stand-in)
  addBox(doc, scene, 0, 0.12, -D/2 + 0.05, (W - tw*2 - 0.05)/2, 0.1, 0.05, '#FF6600');

  await writeGLB(doc, 'fireplace.glb');
}

async function genAcWall() {
  // Wall-mounted AC unit: wide flat box with intake/outlet strips
  // ~0.8 W × 0.3 H × 0.2 D
  const { doc, scene } = newDoc();
  // Main body
  addBox(doc, scene, 0, 0.15, 0, 0.4, 0.15, 0.1, '#E8E8E8');
  // Intake grille strip (bottom)
  addBox(doc, scene, 0, 0.04, 0.095, 0.38, 0.03, 0.005, '#CCCCCC');
  // Front face panel
  addBox(doc, scene, 0, 0.15, 0.1, 0.38, 0.12, 0.005, '#F0F0F0');
  // Brand accent line
  addBox(doc, scene, 0, 0.22, 0.104, 0.3, 0.01, 0.003, '#4A90D9');

  await writeGLB(doc, 'ac_wall.glb');
}

async function genAcFloor() {
  // Floor/tower AC unit: tall narrow tower
  // ~0.25 W × 1.0 H × 0.25 D
  const { doc, scene } = newDoc();
  // Main tower body
  addBox(doc, scene, 0, 0.5, 0, 0.125, 0.5, 0.125, '#F0F0F0');
  // Base plinth
  addBox(doc, scene, 0, 0.04, 0, 0.14, 0.04, 0.14, '#DDDDDD');
  // Front grille (lower half)
  addBox(doc, scene, 0, 0.25, 0.124, 0.1, 0.2, 0.003, '#CCCCCC');
  // Control panel (upper front)
  addBox(doc, scene, 0, 0.75, 0.124, 0.08, 0.1, 0.003, '#E8E8E8');
  // Brand accent
  addBox(doc, scene, 0, 0.78, 0.126, 0.06, 0.008, 0.002, '#4A90D9');

  await writeGLB(doc, 'ac_floor.glb');
}

async function genLaundryTub() {
  // A laundry tub/sink: deep square basin on a short cabinet
  // ~0.5 W × 0.9 H × 0.5 D
  const { doc, scene } = newDoc();
  const bw = 0.25, bd = 0.25, cabinet_h = 0.55;
  const basin_depth = 0.25;

  // Cabinet body
  addBox(doc, scene, 0, cabinet_h/2, 0, bw, cabinet_h/2, bd, '#D4C9B0');
  // Cabinet door line (just a dark strip)
  addBox(doc, scene, 0, 0.3, bd + 0.001, bw - 0.02, 0.18, 0.002, '#B0A090');

  // Basin outer shell
  const bo = bw - 0.02;
  const basin_y = cabinet_h + basin_depth/2;
  addBox(doc, scene, 0, basin_y, 0, bo, basin_depth/2, bo, '#E0DDD8');
  // Basin inner (darker)
  addBox(doc, scene, 0, basin_y + 0.02, 0, bo - 0.04, basin_depth/2 - 0.02, bo - 0.04, '#A8C8B0');
  // Tap
  addBox(doc, scene, 0, cabinet_h + basin_depth + 0.04, -bo + 0.03, 0.015, 0.04, 0.03, '#B0B0B0');

  await writeGLB(doc, 'laundryTub.glb');
}

async function genIroningBoard() {
  // Folding ironing board: narrow tapered top + two crossed legs
  // Lies along X axis, ~1.3 W × 0.9 H × 0.4 D
  const { doc, scene } = newDoc();
  // Board top (slightly tapered — approximate with a box)
  addBox(doc, scene, 0, 0.88, 0, 0.62, 0.02, 0.17, '#D4B896');
  // Leg A (front-left to back-right)
  addBox(doc, scene, -0.1, 0.44, -0.05, 0.02, 0.44, 0.02, '#888888');
  // Leg B
  addBox(doc, scene,  0.1, 0.44,  0.05, 0.02, 0.44, 0.02, '#888888');
  // Cross brace
  addBox(doc, scene, 0, 0.3, 0, 0.15, 0.01, 0.01, '#777777');

  await writeGLB(doc, 'ironingBoard.glb');
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log('Generating procedural GLB models...');
await genFireplace();
await genAcWall();
await genAcFloor();
await genLaundryTub();
await genIroningBoard();
console.log('Done.');
