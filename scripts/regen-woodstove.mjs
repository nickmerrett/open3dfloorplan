/**
 * Generate woodStove.glb — slow combustion / wood burning stove.
 * metallic=0 throughout (no envMap in viewer).
 * Flue pipe uses cylinder geometry, not boxes.
 * Run: node scripts/regen-woodstove.mjs
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

// ── Box geometry ──────────────────────────────────────────────────────────────
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

// ── Cylinder geometry (axis = Y) ─────────────────────────────────────────────
// cx,cy,cz = centre of cylinder, r = radius, h = full height, segs = segments
function buildCylinder(cx, cy, cz, r, h, segs = 12) {
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;

  const posArr = [];
  const normArr = [];
  const idxArr = [];

  // Side faces
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const x0s = cx + Math.cos(a0) * r, z0s = cz + Math.sin(a0) * r;
    const x1s = cx + Math.cos(a1) * r, z1s = cz + Math.sin(a1) * r;
    const nx0 = Math.cos(a0), nz0 = Math.sin(a0);
    const nx1 = Math.cos(a1), nz1 = Math.sin(a1);

    const base = posArr.length / 3;
    // Bottom-left, bottom-right, top-right, top-left
    posArr.push(x0s,y0,z0s, x1s,y0,z1s, x1s,y1,z1s, x0s,y1,z0s);
    normArr.push(nx0,0,nz0, nx1,0,nz1, nx1,0,nz1, nx0,0,nz0);
    idxArr.push(base,base+1,base+2, base,base+2,base+3);
  }

  // Top cap
  const topCentre = posArr.length / 3;
  posArr.push(cx, y1, cz);
  normArr.push(0, 1, 0);
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const vi = posArr.length / 3;
    posArr.push(cx + Math.cos(a0)*r, y1, cz + Math.sin(a0)*r);
    posArr.push(cx + Math.cos(a1)*r, y1, cz + Math.sin(a1)*r);
    normArr.push(0,1,0, 0,1,0);
    idxArr.push(topCentre, vi, vi+1);
  }

  // Bottom cap
  const botCentre = posArr.length / 3;
  posArr.push(cx, y0, cz);
  normArr.push(0, -1, 0);
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const vi = posArr.length / 3;
    posArr.push(cx + Math.cos(a0)*r, y0, cz + Math.sin(a0)*r);
    posArr.push(cx + Math.cos(a1)*r, y0, cz + Math.sin(a1)*r);
    normArr.push(0,-1,0, 0,-1,0);
    // Reversed winding for bottom cap
    idxArr.push(botCentre, vi+1, vi);
  }

  return {
    positions: new Float32Array(posArr),
    normals:   new Float32Array(normArr),
    indices:   new Uint16Array(idxArr),
  };
}

// ── Document helpers ──────────────────────────────────────────────────────────
function newDoc() {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene();
  doc.getRoot().setDefaultScene(scene);
  return { doc, scene };
}

function addPrim(doc, scene, geo, hex, roughness = 0.8) {
  const buf = doc.getRoot().listBuffers()[0];
  const rgb = hexToRgb(hex);
  const mat = doc.createMaterial()
    .setBaseColorFactor([...rgb, 1])
    .setRoughnessFactor(roughness)
    .setMetallicFactor(0);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setArray(geo.positions).setType('VEC3').setBuffer(buf))
    .setAttribute('NORMAL',   doc.createAccessor().setArray(geo.normals).setType('VEC3').setBuffer(buf))
    .setIndices(doc.createAccessor().setArray(geo.indices).setType('SCALAR').setBuffer(buf))
    .setMaterial(mat);
  scene.addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(prim)));
}

function addBox(doc, scene, cx, cy, cz, hw, hh, hd, hex, roughness = 0.8) {
  addPrim(doc, scene, buildBox(cx, cy, cz, hw, hh, hd), hex, roughness);
}

function addCylinder(doc, scene, cx, cy, cz, r, h, hex, roughness = 0.7, segs = 14) {
  addPrim(doc, scene, buildCylinder(cx, cy, cz, r, h, segs), hex, roughness);
}

// ── Model ────────────────────────────────────────────────────────────────────
const { doc, scene } = newDoc();

const IRON       = '#4A4A4A';
const IRON_LIGHT = '#666666';
const IRON_RIM   = '#585858';
const PIPE_COL   = '#505050';

const BW = 0.28;
const BD = 0.22;
const LEG_H = 0.08;
const BODY_H = 0.30;
const BODY_Y = LEG_H + BODY_H;

// Legs
for (const [x, z] of [[-BW+0.04,-BD+0.04],[BW-0.04,-BD+0.04],
                       [-BW+0.04, BD-0.04],[BW-0.04, BD-0.04]]) {
  addBox(doc, scene, x, LEG_H/2, z, 0.03, LEG_H/2, 0.03, IRON_LIGHT);
}

// Main body
addBox(doc, scene, 0, BODY_Y, 0, BW, BODY_H, BD, IRON);

// Top panel
addBox(doc, scene, 0, BODY_Y + BODY_H + 0.012, 0, BW + 0.005, 0.012, BD + 0.005, IRON_LIGHT);

// Door frame
const DOOR_W = BW * 0.72;
const DOOR_H = BODY_H * 0.72;
const DOOR_Y = BODY_Y - BODY_H * 0.05;
addBox(doc, scene, 0, DOOR_Y, BD + 0.012, DOOR_W + 0.025, DOOR_H + 0.025, 0.012, IRON_RIM);

// Glass door (dark sooty)
addBox(doc, scene, 0, DOOR_Y, BD + 0.024, DOOR_W, DOOR_H, 0.008, '#1C1008', 0.2);

// Fire glow through glass
addBox(doc, scene, 0, BODY_Y - BODY_H*0.35, BD*0.1, BW*0.55, 0.03, BD*0.3, '#CC3300', 0.9);
addBox(doc, scene, 0, BODY_Y - BODY_H*0.15, BD*0.1, BW*0.35, 0.1,  BD*0.2, '#FF6600', 0.9);
addBox(doc, scene, 0, BODY_Y + BODY_H*0.0,  BD*0.1, BW*0.18, 0.12, BD*0.1, '#FFCC00', 0.9);

// Door handle
addBox(doc, scene, DOOR_W * 0.78, DOOR_Y, BD + 0.03, 0.015, 0.06, 0.015, '#888888', 0.5);

// Air vent slot
addBox(doc, scene, 0, BODY_Y - BODY_H + 0.04, BD + 0.025, DOOR_W * 0.5, 0.012, 0.008, IRON_RIM);

// Hearth shelf
addBox(doc, scene, 0, LEG_H + 0.015, BD + 0.04, BW * 0.9, 0.015, 0.05, IRON_LIGHT);

// ── Flue pipe (cylinders) ────────────────────────────────────────────────────
const FLUE_R  = 0.055;          // pipe radius
const FX      = 0.0;            // centred on stove
const FZ      = -BD * 0.2;      // slightly toward back
const PIPE_BASE_Y = BODY_Y + BODY_H + 0.024;  // just above top panel

// Collar ring (wider cylinder at base of pipe)
addCylinder(doc, scene, FX, PIPE_BASE_Y + 0.025, FZ, FLUE_R + 0.018, 0.05, IRON_LIGHT, 0.7);

// Lower vertical pipe section
const LOWER_H = 0.40;
addCylinder(doc, scene, FX, PIPE_BASE_Y + 0.05 + LOWER_H/2, FZ, FLUE_R, LOWER_H, PIPE_COL);

// Elbow join (short wider cylinder at transition)
const ELBOW_Y = PIPE_BASE_Y + 0.05 + LOWER_H;
addCylinder(doc, scene, FX, ELBOW_Y + 0.03, FZ - 0.02, FLUE_R + 0.01, 0.06, IRON_LIGHT, 0.7);

// Upper angled pipe section — angled slightly toward back wall
// Approximate with a slightly tilted cylinder by using two segments
const UPPER_H = 0.35;
addCylinder(doc, scene, FX, ELBOW_Y + 0.06 + UPPER_H/2, FZ - 0.08, FLUE_R, UPPER_H, PIPE_COL);

// Cap at top of pipe
addCylinder(doc, scene, FX, ELBOW_Y + 0.06 + UPPER_H + 0.025, FZ - 0.08, FLUE_R + 0.02, 0.05, IRON_LIGHT, 0.7);

const glb = await io.writeBinary(doc);
writeFileSync(path.join(OUT_DIR, 'woodStove.glb'), glb);
console.log('✓ woodStove.glb regenerated with cylindrical flue pipe');
