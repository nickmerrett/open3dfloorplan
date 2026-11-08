/**
 * Regenerate fireplace.glb with a recognisable shape:
 *   - Stone/brick surround with side pilasters
 *   - Visible rectangular firebox opening (dark recess)
 *   - Prominent mantle shelf wider than body
 *   - Hearth slab protruding from base
 *   - Logs + orange fire glow inside the box
 *
 * Viewed isometrically from +X +Y +Z so the front face is visible.
 * Model sits on Y=0, faces +Z.
 * Run: node scripts/regen-fireplace.mjs
 */

import { Document, NodeIO } from '@gltf-transform/core';
import { writeFileSync } from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('static/models');
const io = new NodeIO();

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

function buildBox(cx, cy, cz, hw, hh, hd) {
  const [x0,x1,y0,y1,z0,z1] = [cx-hw,cx+hw,cy-hh,cy+hh,cz-hd,cz+hd];
  const positions = new Float32Array([
    x0,y1,z0, x1,y1,z0, x1,y1,z1, x0,y1,z1,
    x0,y0,z1, x1,y0,z1, x1,y0,z0, x0,y0,z0,
    x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1,
    x1,y0,z0, x0,y0,z0, x0,y1,z0, x1,y1,z0,
    x0,y0,z0, x0,y0,z1, x0,y1,z1, x0,y1,z0,
    x1,y0,z1, x1,y0,z0, x1,y1,z0, x1,y1,z1,
  ]);
  const fn = [[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[-1,0,0],[1,0,0]];
  const normals = new Float32Array(24*3);
  for (let f=0;f<6;f++) for (let v=0;v<4;v++) {
    normals[(f*4+v)*3]=fn[f][0]; normals[(f*4+v)*3+1]=fn[f][1]; normals[(f*4+v)*3+2]=fn[f][2];
  }
  const indices = new Uint16Array(36);
  for (let f=0;f<6;f++) {
    const b=f*4;
    indices[f*6]=b; indices[f*6+1]=b+1; indices[f*6+2]=b+2;
    indices[f*6+3]=b; indices[f*6+4]=b+2; indices[f*6+5]=b+3;
  }
  return { positions, normals, indices };
}

function newDoc() {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene();
  doc.getRoot().setDefaultScene(scene);
  return { doc, scene };
}

function addBox(doc, scene, cx, cy, cz, hw, hh, hd, hex, roughness = 0.9, metallic = 0) {
  const buf = doc.getRoot().listBuffers()[0];
  const { positions, normals, indices } = buildBox(cx, cy, cz, hw, hh, hd);
  const rgb = hexToRgb(hex);
  const mat = doc.createMaterial()
    .setBaseColorFactor([...rgb, 1])
    .setRoughnessFactor(roughness)
    .setMetallicFactor(metallic);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setArray(positions).setType('VEC3').setBuffer(buf))
    .setAttribute('NORMAL',   doc.createAccessor().setArray(normals).setType('VEC3').setBuffer(buf))
    .setIndices(doc.createAccessor().setArray(indices).setType('SCALAR').setBuffer(buf))
    .setMaterial(mat);
  scene.addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(prim)));
}

// ── Fireplace dimensions (in metres, ~Kenney scale) ─────────────────────────
// Total: ~1.0 W × 1.2 H × 0.35 D
// Faces +Z (front). Sits on Y=0 plane.
// Camera is isometric from +X +Y +Z so front (+Z face) and top are visible.

const { doc, scene } = newDoc();

const W  = 0.5;   // half-width of surround
const D  = 0.17;  // half-depth of surround body (wall-mounted, shallow)
const SH = 1.1;   // total surround height before mantle
const PW = 0.12;  // pilaster half-width
const PD = D + 0.03; // pilasters protrude slightly forward

// Opening dimensions
const OW = W - PW*2 - 0.02;  // opening half-width
const OH = 0.45;               // opening height (from floor)
const LINTEL_H = 0.08;         // lintel beam thickness
const LINTEL_Y = OH + LINTEL_H/2;

// Stone colours
const STONE_LIGHT  = '#B8A898';
const STONE_MID    = '#A09080';
const STONE_DARK   = '#887868';
const FIREBOX_BACK = '#2A1A0A';

// ── 1. Hearth slab (floor, protrudes forward) ────────────────────────────────
addBox(doc, scene, 0, 0.03, D + 0.12, W + 0.05, 0.03, 0.15, STONE_MID);

// ── 2. Left pilaster ─────────────────────────────────────────────────────────
addBox(doc, scene, -(W - PW), SH/2, 0, PW, SH/2, PD, STONE_LIGHT);
// Raised panel detail on pilaster face
addBox(doc, scene, -(W - PW), SH*0.35, PD + 0.005, PW*0.6, SH*0.28, 0.01, STONE_DARK);

// ── 3. Right pilaster ────────────────────────────────────────────────────────
addBox(doc, scene,  (W - PW), SH/2, 0, PW, SH/2, PD, STONE_LIGHT);
addBox(doc, scene,  (W - PW), SH*0.35, PD + 0.005, PW*0.6, SH*0.28, 0.01, STONE_DARK);

// ── 4. Firebox surround back wall (full height of opening) ───────────────────
addBox(doc, scene, 0, OH/2, -D + 0.01, OW + 0.02, OH/2, 0.015, FIREBOX_BACK);

// ── 5. Firebox floor (inside, slightly raised) ───────────────────────────────
addBox(doc, scene, 0, 0.04, 0, OW, 0.04, D, '#3A2A1A');

// ── 6. Lintel (horizontal beam above opening) ────────────────────────────────
addBox(doc, scene, 0, LINTEL_Y, 0, OW + PW*0.4, LINTEL_H/2, PD + 0.01, STONE_MID);

// ── 7. Wall above lintel (between pilasters) ─────────────────────────────────
const wallAboveH = SH - LINTEL_Y - LINTEL_H/2;
addBox(doc, scene, 0, LINTEL_Y + LINTEL_H/2 + wallAboveH/2, 0,
  OW + PW*0.6, wallAboveH/2, D + 0.01, STONE_DARK);

// ── 8. Mantle shelf (protrudes forward and wider than body) ──────────────────
addBox(doc, scene, 0, SH + 0.04, 0, W + 0.1, 0.04, D + 0.1, STONE_LIGHT);
// Mantle fascia (decorative front face below shelf)
addBox(doc, scene, 0, SH - 0.04, D + 0.08, W + 0.09, 0.04, 0.025, STONE_MID);

// ── 9. Fire: logs ────────────────────────────────────────────────────────────
addBox(doc, scene, -0.08, 0.065, -0.01, 0.07, 0.02, 0.015, '#5A3010');
addBox(doc, scene,  0.06, 0.065,  0.02, 0.06, 0.02, 0.015, '#4A2808');
addBox(doc, scene,  0.00, 0.075, -0.02, 0.04, 0.015, 0.015, '#6A3818');
// Cross log
addBox(doc, scene, 0, 0.075, 0.01, 0.015, 0.015, 0.09, '#5A3010');

// ── 10. Fire: ember glow layers ──────────────────────────────────────────────
addBox(doc, scene, 0, 0.09, 0, 0.12, 0.02, 0.08, '#CC4400');   // deep orange
addBox(doc, scene, 0, 0.12, 0, 0.08, 0.04, 0.05, '#FF7700');   // bright orange
addBox(doc, scene, 0, 0.18, 0, 0.05, 0.06, 0.03, '#FFCC00');   // yellow tip

const glb = await io.writeBinary(doc);
writeFileSync(path.join(OUT_DIR, 'fireplace.glb'), glb);
console.log('✓ fireplace.glb regenerated');
