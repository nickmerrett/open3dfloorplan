/**
 * Procedural GLB model generator — batch 2.
 * Run: node scripts/generate-models-2.mjs
 * Outputs to static/models/
 */

import { Document, NodeIO } from '@gltf-transform/core';
import { writeFileSync } from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('static/models');
const io = new NodeIO();

// ── geometry helpers ──────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

function buildBox(cx, cy, cz, hw, hh, hd) {
  const x0 = cx-hw, x1 = cx+hw, y0 = cy-hh, y1 = cy+hh, z0 = cz-hd, z1 = cz+hd;
  const positions = new Float32Array([
    x0,y1,z0, x1,y1,z0, x1,y1,z1, x0,y1,z1,
    x0,y0,z1, x1,y0,z1, x1,y0,z0, x0,y0,z0,
    x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1,
    x1,y0,z0, x0,y0,z0, x0,y1,z0, x1,y1,z0,
    x0,y0,z0, x0,y0,z1, x0,y1,z1, x0,y1,z0,
    x1,y0,z1, x1,y0,z0, x1,y1,z0, x1,y1,z1,
  ]);
  const faceNormals = [[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[-1,0,0],[1,0,0]];
  const normals = new Float32Array(24*3);
  for (let f=0;f<6;f++) for (let v=0;v<4;v++) {
    normals[(f*4+v)*3+0]=faceNormals[f][0];
    normals[(f*4+v)*3+1]=faceNormals[f][1];
    normals[(f*4+v)*3+2]=faceNormals[f][2];
  }
  const indices = new Uint16Array(36);
  for (let f=0;f<6;f++) { const b=f*4; indices[f*6]=b; indices[f*6+1]=b+1; indices[f*6+2]=b+2; indices[f*6+3]=b; indices[f*6+4]=b+2; indices[f*6+5]=b+3; }
  return { positions, normals, indices };
}

function addBox(doc, scene, cx, cy, cz, hw, hh, hd, hex) {
  const buf = doc.getRoot().listBuffers()[0];
  const { positions, normals, indices } = buildBox(cx, cy, cz, hw, hh, hd);
  const rgb = hexToRgb(hex);
  const mat = doc.createMaterial().setBaseColorFactor([...rgb,1]).setRoughnessFactor(0.8).setMetallicFactor(0);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', doc.createAccessor().setArray(positions).setType('VEC3').setBuffer(buf))
    .setAttribute('NORMAL',   doc.createAccessor().setArray(normals).setType('VEC3').setBuffer(buf))
    .setIndices(doc.createAccessor().setArray(indices).setType('SCALAR').setBuffer(buf))
    .setMaterial(mat);
  const node = doc.createNode().setMesh(doc.createMesh().addPrimitive(prim));
  scene.addChild(node);
  return node;
}

function newDoc() {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene();
  doc.getRoot().setDefaultScene(scene);
  return { doc, scene };
}

async function save(doc, name) {
  const glb = await io.writeBinary(doc);
  writeFileSync(path.join(OUT_DIR, name + '.glb'), glb);
  console.log(`  ✓ ${name}.glb`);
}

// ── models ────────────────────────────────────────────────────────────────────

// Lighting fixtures
async function genChandelier() {
  const { doc, scene } = newDoc();
  // Ceiling canopy
  addBox(doc, scene, 0, 0.95, 0, 0.1, 0.03, 0.1, '#888888');
  // Drop rod
  addBox(doc, scene, 0, 0.75, 0, 0.02, 0.2, 0.02, '#888888');
  // Main ring body
  addBox(doc, scene, 0, 0.55, 0, 0.3, 0.04, 0.3, '#C0A050');
  // 4 arm extensions
  addBox(doc, scene,  0.3, 0.55, 0,    0.05, 0.02, 0.02, '#C0A050');
  addBox(doc, scene, -0.3, 0.55, 0,    0.05, 0.02, 0.02, '#C0A050');
  addBox(doc, scene, 0, 0.55,  0.3,    0.02, 0.02, 0.05, '#C0A050');
  addBox(doc, scene, 0, 0.55, -0.3,    0.02, 0.02, 0.05, '#C0A050');
  // Bulb glow spheres approximated as small boxes at arm tips
  for (const [x,z] of [[0.35,0],[-0.35,0],[0,0.35],[0,-0.35]]) {
    addBox(doc, scene, x, 0.48, z, 0.04, 0.06, 0.04, '#FFF8C0');
  }
  await save(doc, 'chandelier');
}

async function genPendantLight() {
  const { doc, scene } = newDoc();
  addBox(doc, scene, 0, 0.9, 0, 0.02, 0.2, 0.02, '#888888');
  // Shade (wider at bottom)
  addBox(doc, scene, 0, 0.65, 0, 0.14, 0.04, 0.14, '#4A4A4A');
  addBox(doc, scene, 0, 0.58, 0, 0.18, 0.08, 0.18, '#4A4A4A');
  addBox(doc, scene, 0, 0.54, 0, 0.16, 0.02, 0.16, '#3A3A3A');
  // Bulb
  addBox(doc, scene, 0, 0.60, 0, 0.06, 0.06, 0.06, '#FFF8C0');
  await save(doc, 'pendant_light');
}

async function genLampPost() {
  const { doc, scene } = newDoc();
  // Base plinth
  addBox(doc, scene, 0, 0.06, 0, 0.08, 0.06, 0.08, '#555555');
  // Pole
  addBox(doc, scene, 0, 1.1, 0, 0.04, 1.04, 0.04, '#444444');
  // Arm
  addBox(doc, scene, 0.15, 2.1, 0, 0.15, 0.03, 0.03, '#444444');
  // Lantern head
  addBox(doc, scene, 0.3, 2.05, 0, 0.06, 0.12, 0.06, '#333333');
  addBox(doc, scene, 0.3, 2.0,  0, 0.08, 0.04, 0.08, '#333333');
  addBox(doc, scene, 0.3, 2.01, 0, 0.05, 0.09, 0.05, '#FFF8C0');
  await save(doc, 'lamp_post');
}

async function genBollardLight() {
  const { doc, scene } = newDoc();
  addBox(doc, scene, 0, 0.05, 0, 0.07, 0.05, 0.07, '#555555');
  addBox(doc, scene, 0, 0.5,  0, 0.05, 0.45, 0.05, '#444444');
  addBox(doc, scene, 0, 0.95, 0, 0.07, 0.07, 0.07, '#333333');
  addBox(doc, scene, 0, 0.94, 0, 0.05, 0.05, 0.05, '#FFF8C0');
  await save(doc, 'bollard_light');
}

async function genFloodLight() {
  const { doc, scene } = newDoc();
  // Pole
  addBox(doc, scene, 0, 1.5, 0, 0.04, 1.5, 0.04, '#555555');
  // Arm
  addBox(doc, scene, 0.2, 2.9, 0, 0.2, 0.03, 0.03, '#555555');
  // Head (angled floodlight housing)
  addBox(doc, scene, 0.35, 2.85, 0, 0.12, 0.08, 0.16, '#333333');
  addBox(doc, scene, 0.35, 2.84, 0.13, 0.1, 0.07, 0.03, '#FFF8C0');
  await save(doc, 'flood_light');
}

async function genWallArt() {
  const { doc, scene } = newDoc();
  // Frame
  addBox(doc, scene, 0, 0.6, 0.01, 0.4, 0.3, 0.015, '#5A4A3A');
  // Canvas
  addBox(doc, scene, 0, 0.6, 0.025, 0.36, 0.26, 0.005, '#E8D5B0');
  // Abstract colour blocks
  addBox(doc, scene, -0.15, 0.65, 0.03, 0.1, 0.08, 0.003, '#4A7FC0');
  addBox(doc, scene,  0.1,  0.58, 0.03, 0.12, 0.12, 0.003, '#C04A4A');
  addBox(doc, scene,  0.0,  0.52, 0.03, 0.08, 0.05, 0.003, '#E0B040');
  await save(doc, 'wall_art');
}

async function genClock() {
  const { doc, scene } = newDoc();
  // Clock body (round approximated as square box)
  addBox(doc, scene, 0, 0.5, 0.01, 0.16, 0.16, 0.025, '#5A4A3A');
  addBox(doc, scene, 0, 0.5, 0.035, 0.14, 0.14, 0.005, '#F5F0E8');
  // Hour hand
  addBox(doc, scene, 0, 0.53, 0.04, 0.015, 0.07, 0.005, '#222222');
  // Minute hand
  addBox(doc, scene, 0.04, 0.5, 0.04, 0.005, 0.11, 0.005, '#222222');
  // Centre dot
  addBox(doc, scene, 0, 0.5, 0.04, 0.015, 0.015, 0.005, '#333333');
  await save(doc, 'clock');
}

async function genCurtain() {
  const { doc, scene } = newDoc();
  // Rod
  addBox(doc, scene, 0, 1.05, 0, 0.52, 0.025, 0.025, '#8B7355');
  // Left panel (slightly bunched)
  addBox(doc, scene, -0.3, 0.5, 0.02, 0.18, 0.5, 0.04, '#B0C4DE');
  addBox(doc, scene, -0.28, 0.5, -0.02, 0.16, 0.5, 0.03, '#A0B4CE');
  // Right panel
  addBox(doc, scene,  0.3, 0.5, 0.02, 0.18, 0.5, 0.04, '#B0C4DE');
  addBox(doc, scene,  0.28, 0.5, -0.02, 0.16, 0.5, 0.03, '#A0B4CE');
  await save(doc, 'curtain');
}

async function genStringLights() {
  const { doc, scene } = newDoc();
  // Wire segments approximated as thin boxes in a catenary-ish arc
  addBox(doc, scene, -0.4, 0.75, 0, 0.12, 0.005, 0.005, '#888888');
  addBox(doc, scene, -0.2, 0.70, 0, 0.12, 0.005, 0.005, '#888888');
  addBox(doc, scene,  0.0, 0.68, 0, 0.12, 0.005, 0.005, '#888888');
  addBox(doc, scene,  0.2, 0.70, 0, 0.12, 0.005, 0.005, '#888888');
  addBox(doc, scene,  0.4, 0.75, 0, 0.12, 0.005, 0.005, '#888888');
  // Bulbs
  for (const x of [-0.45, -0.3, -0.1, 0.1, 0.3, 0.45]) {
    const y = 0.72 - 0.04*Math.abs(x);
    addBox(doc, scene, x, y, 0, 0.025, 0.035, 0.025, '#FFF8A0');
  }
  await save(doc, 'string_lights');
}

async function genPrinter() {
  const { doc, scene } = newDoc();
  // Main body
  addBox(doc, scene, 0, 0.2, 0, 0.22, 0.2, 0.3, '#E8E8E8');
  // Paper output tray (top)
  addBox(doc, scene, 0.02, 0.4, -0.04, 0.18, 0.015, 0.2, '#DDDDDD');
  // Paper feed slot (back top)
  addBox(doc, scene, 0, 0.35, 0.28, 0.2, 0.05, 0.04, '#CCCCCC');
  // Control panel
  addBox(doc, scene, 0.12, 0.3, 0.29, 0.08, 0.06, 0.015, '#4A90D9');
  await save(doc, 'printer');
}

// Garden items
async function genBbqGrill() {
  const { doc, scene } = newDoc();
  // Kettle body
  addBox(doc, scene, 0, 0.7, 0, 0.25, 0.2, 0.25, '#2A2A2A');
  addBox(doc, scene, 0, 0.92, 0, 0.26, 0.03, 0.26, '#1A1A1A');
  // Grill grate
  addBox(doc, scene, 0, 0.72, 0, 0.22, 0.015, 0.22, '#444444');
  // Lid
  addBox(doc, scene, 0, 1.0, 0, 0.24, 0.12, 0.24, '#2A2A2A');
  addBox(doc, scene, 0, 1.12, 0, 0.04, 0.03, 0.04, '#888888');
  // Legs (3-leg kettle style)
  addBox(doc, scene, -0.18, 0.32, -0.1, 0.025, 0.32, 0.025, '#555555');
  addBox(doc, scene,  0.18, 0.32, -0.1, 0.025, 0.32, 0.025, '#555555');
  addBox(doc, scene,  0, 0.32, 0.2,    0.025, 0.32, 0.025, '#555555');
  // Shelf
  addBox(doc, scene, 0, 0.38, -0.18, 0.2, 0.02, 0.08, '#888888');
  await save(doc, 'bbq_grill');
}

async function genBirdBath() {
  const { doc, scene } = newDoc();
  // Basin bowl
  addBox(doc, scene, 0, 0.76, 0, 0.24, 0.04, 0.24, '#A0A0A0');
  addBox(doc, scene, 0, 0.73, 0, 0.20, 0.04, 0.20, '#C8D4D0');
  // Pedestal
  addBox(doc, scene, 0, 0.52, 0, 0.06, 0.24, 0.06, '#9A9A9A');
  addBox(doc, scene, 0, 0.28, 0, 0.1, 0.04, 0.1, '#888888');
  // Base
  addBox(doc, scene, 0, 0.04, 0, 0.18, 0.04, 0.18, '#888888');
  // Water (blue)
  addBox(doc, scene, 0, 0.76, 0, 0.2, 0.02, 0.2, '#5090C0');
  await save(doc, 'bird_bath');
}

async function genFountain() {
  const { doc, scene } = newDoc();
  // Outer basin
  addBox(doc, scene, 0, 0.2, 0, 0.5, 0.2, 0.5, '#A09080');
  // Inner water
  addBox(doc, scene, 0, 0.36, 0, 0.42, 0.04, 0.42, '#5090C0');
  // Centre tier
  addBox(doc, scene, 0, 0.5, 0, 0.18, 0.04, 0.18, '#B0A090');
  addBox(doc, scene, 0, 0.54, 0, 0.14, 0.06, 0.14, '#6098C0');
  // Upper tier
  addBox(doc, scene, 0, 0.62, 0, 0.08, 0.04, 0.08, '#B0A090');
  addBox(doc, scene, 0, 0.66, 0, 0.05, 0.1, 0.05, '#B0A090');
  // Spout glow
  addBox(doc, scene, 0, 0.77, 0, 0.02, 0.04, 0.02, '#90C8E0');
  await save(doc, 'fountain');
}

async function genPlanterBox() {
  const { doc, scene } = newDoc();
  // Outer box (wood)
  addBox(doc, scene, 0, 0.2, 0, 0.3, 0.2, 0.15, '#8B6540');
  // Inner soil
  addBox(doc, scene, 0, 0.34, 0, 0.26, 0.04, 0.11, '#5A3A1A');
  // Plants (green mounds)
  addBox(doc, scene, -0.12, 0.44, 0, 0.08, 0.1, 0.08, '#4A8A30');
  addBox(doc, scene,  0.12, 0.44, 0, 0.08, 0.1, 0.08, '#3A7A20');
  addBox(doc, scene,  0.0, 0.48, 0, 0.07, 0.12, 0.07, '#5A9A40');
  await save(doc, 'planter_box');
}

async function genRaisedBed() {
  const { doc, scene } = newDoc();
  // Timber frame walls (low)
  addBox(doc, scene,  0, 0.14, -0.45, 0.5, 0.14, 0.05, '#7B5230');
  addBox(doc, scene,  0, 0.14,  0.45, 0.5, 0.14, 0.05, '#7B5230');
  addBox(doc, scene, -0.45, 0.14, 0, 0.05, 0.14, 0.45, '#7B5230');
  addBox(doc, scene,  0.45, 0.14, 0, 0.05, 0.14, 0.45, '#7B5230');
  // Soil
  addBox(doc, scene, 0, 0.26, 0, 0.42, 0.04, 0.42, '#5A3A1A');
  // Plants/seedlings
  addBox(doc, scene, -0.2, 0.35, -0.2, 0.06, 0.1, 0.06, '#4A8A30');
  addBox(doc, scene,  0.2, 0.35, -0.2, 0.06, 0.1, 0.06, '#5A9A40');
  addBox(doc, scene, -0.2, 0.35,  0.2, 0.06, 0.1, 0.06, '#3A7A20');
  addBox(doc, scene,  0.2, 0.35,  0.2, 0.06, 0.1, 0.06, '#4A8A30');
  await save(doc, 'raised_bed');
}

async function genSandbox() {
  const { doc, scene } = newDoc();
  // Timber border
  addBox(doc, scene,  0, 0.08, -0.5, 0.5, 0.08, 0.05, '#8B6540');
  addBox(doc, scene,  0, 0.08,  0.5, 0.5, 0.08, 0.05, '#8B6540');
  addBox(doc, scene, -0.5, 0.08, 0, 0.05, 0.08, 0.5, '#8B6540');
  addBox(doc, scene,  0.5, 0.08, 0, 0.05, 0.08, 0.5, '#8B6540');
  // Sand fill
  addBox(doc, scene, 0, 0.05, 0, 0.44, 0.05, 0.44, '#DEB887');
  // Toy bucket & spade (decorative)
  addBox(doc, scene, 0.2, 0.14, 0.2, 0.05, 0.07, 0.05, '#FF6B35');
  addBox(doc, scene, -0.2, 0.12, -0.1, 0.02, 0.07, 0.01, '#FFD700');
  await save(doc, 'sandbox');
}

async function genTrellis() {
  const { doc, scene } = newDoc();
  // Two uprights
  addBox(doc, scene, -0.4, 1.0, 0, 0.025, 1.0, 0.025, '#8B6540');
  addBox(doc, scene,  0.4, 1.0, 0, 0.025, 1.0, 0.025, '#8B6540');
  // Horizontal rails
  for (let y = 0.2; y <= 1.8; y += 0.25) {
    addBox(doc, scene, 0, y, 0, 0.4, 0.015, 0.015, '#8B6540');
  }
  // Diagonal cross members
  addBox(doc, scene, 0, 1.0, 0, 0.56, 0.01, 0.01, '#7A5530');
  addBox(doc, scene, 0, 1.0, 0, 0.56, 0.01, 0.01, '#7A5530');
  // Vines
  addBox(doc, scene, -0.35, 0.6, 0.01, 0.04, 0.15, 0.04, '#4A8A30');
  addBox(doc, scene,  0.3, 1.1, 0.01, 0.05, 0.12, 0.05, '#5A9A40');
  await save(doc, 'trellis');
}

async function genMailbox() {
  const { doc, scene } = newDoc();
  // Post
  addBox(doc, scene, 0, 0.55, 0, 0.04, 0.55, 0.04, '#555555');
  // Box body
  addBox(doc, scene, 0, 1.08, 0, 0.18, 0.14, 0.26, '#C0392B');
  // Box lid (arched approximated as flat)
  addBox(doc, scene, 0, 1.22, 0, 0.19, 0.04, 0.27, '#A0302A');
  // Slot
  addBox(doc, scene, 0, 1.08, -0.26, 0.14, 0.03, 0.01, '#8A2020');
  // Flag
  addBox(doc, scene, 0.18, 1.1, -0.1, 0.005, 0.12, 0.005, '#888888');
  addBox(doc, scene, 0.2, 1.2,  -0.1, 0.06, 0.05, 0.005, '#E84040');
  await save(doc, 'mailbox');
}

async function genRainBarrel() {
  const { doc, scene } = newDoc();
  // Barrel body (octagonal approx with overlapping boxes)
  addBox(doc, scene, 0, 0.45, 0, 0.22, 0.45, 0.22, '#5A7A3A');
  addBox(doc, scene, 0, 0.45, 0, 0.28, 0.45, 0.16, '#5A7A3A');
  addBox(doc, scene, 0, 0.45, 0, 0.16, 0.45, 0.28, '#5A7A3A');
  // Barrel bands
  addBox(doc, scene, 0, 0.2, 0, 0.24, 0.02, 0.24, '#3A5A2A');
  addBox(doc, scene, 0, 0.7, 0, 0.24, 0.02, 0.24, '#3A5A2A');
  // Lid
  addBox(doc, scene, 0, 0.91, 0, 0.23, 0.025, 0.23, '#4A6A30');
  // Spigot
  addBox(doc, scene, 0.23, 0.15, 0, 0.04, 0.03, 0.03, '#888888');
  addBox(doc, scene, 0.28, 0.12, 0, 0.015, 0.06, 0.015, '#777777');
  await save(doc, 'rain_barrel');
}

async function genCompostBin() {
  const { doc, scene } = newDoc();
  // Main bin body (slightly tapered — approximate with box)
  addBox(doc, scene, 0, 0.5, 0, 0.28, 0.5, 0.28, '#3A5A2A');
  addBox(doc, scene, 0, 0.5, 0, 0.32, 0.5, 0.22, '#3A5A2A');
  addBox(doc, scene, 0, 0.5, 0, 0.22, 0.5, 0.32, '#3A5A2A');
  // Lid
  addBox(doc, scene, 0, 1.01, 0, 0.3, 0.025, 0.3, '#2A4A1A');
  // Access hatch at bottom front
  addBox(doc, scene, 0, 0.1, 0.29, 0.18, 0.1, 0.015, '#4A7A3A');
  await save(doc, 'compost_bin');
}

async function genUmbrella() {
  const { doc, scene } = newDoc();
  // Pole
  addBox(doc, scene, 0, 1.1, 0, 0.025, 1.1, 0.025, '#A08060');
  // Canopy (4 sections, overlapping to form circle)
  addBox(doc, scene, 0, 2.1, 0, 0.7, 0.06, 0.7, '#E84040');
  addBox(doc, scene, 0, 2.12, 0, 0.5, 0.04, 1.0, '#D03030');
  addBox(doc, scene, 0, 2.12, 0, 1.0, 0.04, 0.5, '#D03030');
  // Centre finial
  addBox(doc, scene, 0, 2.2, 0, 0.03, 0.08, 0.03, '#888888');
  // Base stand
  addBox(doc, scene, 0, 0.04, 0, 0.3, 0.04, 0.3, '#808080');
  addBox(doc, scene, 0, 0.08, 0, 0.04, 0.04, 0.3, '#707070');
  addBox(doc, scene, 0, 0.08, 0, 0.3, 0.04, 0.04, '#707070');
  await save(doc, 'umbrella');
}

// Pools
async function genPoolRectangular() {
  const { doc, scene } = newDoc();
  // Pool surround (coping)
  addBox(doc, scene, 0, 0.06, 0, 1.1, 0.06, 0.6, '#C8C0B0');
  // Water
  addBox(doc, scene, 0, 0.05, 0, 0.95, 0.05, 0.45, '#2080C0');
  // Lane markers
  addBox(doc, scene, 0, 0.1, -0.15, 0.9, 0.005, 0.005, '#FFFFFF');
  addBox(doc, scene, 0, 0.1,  0.15, 0.9, 0.005, 0.005, '#FFFFFF');
  await save(doc, 'pool_rectangular');
}

async function genPoolRound() {
  const { doc, scene } = newDoc();
  // Round pool approximated with 4 overlapping boxes
  addBox(doc, scene, 0, 0.06, 0, 0.7, 0.06, 0.7, '#C8C0B0');
  addBox(doc, scene, 0, 0.06, 0, 0.9, 0.06, 0.5, '#C8C0B0');
  addBox(doc, scene, 0, 0.06, 0, 0.5, 0.06, 0.9, '#C8C0B0');
  // Water
  addBox(doc, scene, 0, 0.05, 0, 0.65, 0.05, 0.65, '#2080C0');
  addBox(doc, scene, 0, 0.05, 0, 0.82, 0.05, 0.45, '#2080C0');
  addBox(doc, scene, 0, 0.05, 0, 0.45, 0.05, 0.82, '#2080C0');
  await save(doc, 'pool_round');
}

async function genHotTub() {
  const { doc, scene } = newDoc();
  // Outer shell
  addBox(doc, scene, 0, 0.5, 0, 0.55, 0.5, 0.55, '#4A3A2A');
  addBox(doc, scene, 0, 0.5, 0, 0.7, 0.5, 0.42, '#4A3A2A');
  addBox(doc, scene, 0, 0.5, 0, 0.42, 0.5, 0.7, '#4A3A2A');
  // Water
  addBox(doc, scene, 0, 0.88, 0, 0.5, 0.06, 0.5, '#40A0D0');
  addBox(doc, scene, 0, 0.88, 0, 0.62, 0.06, 0.36, '#40A0D0');
  addBox(doc, scene, 0, 0.88, 0, 0.36, 0.06, 0.62, '#40A0D0');
  // Jets (small dots)
  for (const [x,z] of [[-0.4,0],[0.4,0],[0,-0.4],[0,0.4]]) {
    addBox(doc, scene, x, 0.7, z, 0.04, 0.04, 0.04, '#888888');
  }
  // Steps
  addBox(doc, scene, 0.56, 0.2, 0, 0.08, 0.2, 0.3, '#3A2A1A');
  addBox(doc, scene, 0.62, 0.38, 0, 0.04, 0.04, 0.28, '#3A2A1A');
  await save(doc, 'hot_tub');
}

// Structures
async function genShed() {
  const { doc, scene } = newDoc();
  const W = 1.5, D = 2.0, H = 2.0, RH = 0.5;
  // Walls
  addBox(doc, scene,  0, H/2,  D/2, W/2, H/2, 0.05, '#8B7355');
  addBox(doc, scene,  0, H/2, -D/2, W/2, H/2, 0.05, '#8B7355');
  addBox(doc, scene, -W/2, H/2, 0, 0.05, H/2, D/2, '#8B7355');
  addBox(doc, scene,  W/2, H/2, 0, 0.05, H/2, D/2, '#8B7355');
  // Floor
  addBox(doc, scene, 0, 0.03, 0, W/2, 0.03, D/2, '#A09070');
  // Gabled roof — two slopes
  addBox(doc, scene, -0.35, H + RH/2, 0, 0.15, RH/2+0.05, D/2+0.05, '#6A4A30');
  addBox(doc, scene,  0.35, H + RH/2, 0, 0.15, RH/2+0.05, D/2+0.05, '#6A4A30');
  addBox(doc, scene, 0, H + RH + 0.05, 0, 0.06, 0.05, D/2+0.06, '#5A3A20');
  // Door
  addBox(doc, scene, 0, H*0.45, D/2+0.01, 0.2, H*0.45, 0.02, '#6A5040');
  await save(doc, 'shed');
}

async function genGazebo() {
  const { doc, scene } = newDoc();
  const R = 1.0, H = 2.2;
  // 4 corner posts
  for (const [x,z] of [[-R,-R],[R,-R],[-R,R],[R,R]]) {
    addBox(doc, scene, x, H/2, z, 0.06, H/2, 0.06, '#C8B090');
  }
  // Low railing between posts
  for (const [x,z,hw,hd] of [
    [0, -R, R, 0.04], [0, R, R, 0.04],
    [-R, 0, 0.04, R], [R, 0, 0.04, R],
  ]) {
    addBox(doc, scene, x, 0.5, z, hw, 0.04, hd, '#C8B090');
    addBox(doc, scene, x, 0.9, z, hw, 0.04, hd, '#C8B090');
  }
  // Roof (hip roof approx)
  addBox(doc, scene, 0, H + 0.15, 0, R + 0.1, 0.08, R + 0.1, '#8B6540');
  addBox(doc, scene, 0, H + 0.35, 0, R*0.6, 0.25, R*0.6, '#7A5530');
  addBox(doc, scene, 0, H + 0.62, 0, 0.06, 0.08, 0.06, '#6A4520');
  await save(doc, 'gazebo');
}

async function genPergola() {
  const { doc, scene } = newDoc();
  // 4 posts
  for (const [x,z] of [[-0.8,-0.8],[0.8,-0.8],[-0.8,0.8],[0.8,0.8]]) {
    addBox(doc, scene, x, 1.0, z, 0.06, 1.0, 0.06, '#A08060');
  }
  // Two main beams (lengthways)
  addBox(doc, scene, 0, 2.04, -0.8, 0.8, 0.06, 0.06, '#907050');
  addBox(doc, scene, 0, 2.04,  0.8, 0.8, 0.06, 0.06, '#907050');
  // Cross rafters
  for (let x = -0.7; x <= 0.7; x += 0.28) {
    addBox(doc, scene, x, 2.1, 0, 0.03, 0.04, 0.8, '#806040');
  }
  await save(doc, 'pergola');
}

async function genGreenhouse() {
  const { doc, scene } = newDoc();
  const W = 1.0, D = 1.5, H = 1.8, RH = 0.5;
  // Glass walls (light blue semi-transparent approx)
  addBox(doc, scene,  0, H/2,  D/2, W/2, H/2, 0.02, '#A8D0E8');
  addBox(doc, scene,  0, H/2, -D/2, W/2, H/2, 0.02, '#A8D0E8');
  addBox(doc, scene, -W/2, H/2, 0, 0.02, H/2, D/2, '#A8D0E8');
  addBox(doc, scene,  W/2, H/2, 0, 0.02, H/2, D/2, '#A8D0E8');
  // Frame posts (white)
  for (const [x,z] of [[-W/2,-D/2],[W/2,-D/2],[-W/2,D/2],[W/2,D/2]]) {
    addBox(doc, scene, x, H/2, z, 0.025, H/2, 0.025, '#FFFFFF');
  }
  // Gable roof
  addBox(doc, scene, -0.28, H+RH/2, 0, 0.12, RH/2+0.05, D/2+0.02, '#A8D0E8');
  addBox(doc, scene,  0.28, H+RH/2, 0, 0.12, RH/2+0.05, D/2+0.02, '#A8D0E8');
  addBox(doc, scene, 0, H+RH+0.03, 0, 0.025, 0.03, D/2+0.03, '#FFFFFF');
  // Floor
  addBox(doc, scene, 0, 0.02, 0, W/2, 0.02, D/2, '#8B7355');
  await save(doc, 'greenhouse');
}

// Vehicles
async function genCarSedan() {
  const { doc, scene } = newDoc();
  // Body lower
  addBox(doc, scene, 0, 0.3, 0, 1.1, 0.3, 0.5, '#4A6FA5');
  // Body cabin
  addBox(doc, scene, 0.05, 0.7, 0, 0.7, 0.22, 0.46, '#3A5F95');
  // Windshield
  addBox(doc, scene, 0.55, 0.68, 0, 0.15, 0.18, 0.44, '#C8E0F0');
  // Rear window
  addBox(doc, scene, -0.45, 0.68, 0, 0.12, 0.18, 0.44, '#C8E0F0');
  // Wheels
  for (const [x,z] of [[-0.65,-0.5],[0.65,-0.5],[-0.65,0.5],[0.65,0.5]]) {
    addBox(doc, scene, x, 0.16, z, 0.12, 0.16, 0.1, '#2A2A2A');
    addBox(doc, scene, x, 0.18, z, 0.08, 0.12, 0.06, '#888888');
  }
  // Headlights
  addBox(doc, scene, 1.1, 0.32, -0.28, 0.02, 0.06, 0.1, '#FFFFE0');
  addBox(doc, scene, 1.1, 0.32,  0.28, 0.02, 0.06, 0.1, '#FFFFE0');
  await save(doc, 'car_sedan');
}

async function genCarSuv() {
  const { doc, scene } = newDoc();
  // Larger body
  addBox(doc, scene, 0, 0.38, 0, 1.15, 0.38, 0.6, '#5A4A3A');
  // Cabin (taller, less tapered than sedan)
  addBox(doc, scene, 0, 0.88, 0, 0.9, 0.28, 0.57, '#4A3A2A');
  // Windshield
  addBox(doc, scene, 0.7, 0.84, 0, 0.18, 0.22, 0.52, '#C8E0F0');
  // Rear
  addBox(doc, scene, -0.76, 0.84, 0, 0.12, 0.22, 0.52, '#C8E0F0');
  // Roof rack
  addBox(doc, scene, 0, 1.17, 0, 0.85, 0.025, 0.55, '#333333');
  // Wheels (bigger)
  for (const [x,z] of [[-0.7,-0.6],[0.7,-0.6],[-0.7,0.6],[0.7,0.6]]) {
    addBox(doc, scene, x, 0.2, z, 0.14, 0.2, 0.12, '#2A2A2A');
    addBox(doc, scene, x, 0.22, z, 0.1, 0.15, 0.08, '#888888');
  }
  await save(doc, 'car_suv');
}

async function genBike() {
  const { doc, scene } = newDoc();
  // Frame (simplified)
  addBox(doc, scene, 0, 0.5, 0, 0.5, 0.04, 0.04, '#C0C0C0');
  addBox(doc, scene, 0.1, 0.6, 0, 0.04, 0.18, 0.04, '#C0C0C0');
  addBox(doc, scene, -0.3, 0.55, 0, 0.04, 0.1, 0.04, '#C0C0C0');
  // Wheels
  addBox(doc, scene, -0.45, 0.27, 0, 0.04, 0.27, 0.04, '#1A1A1A');
  addBox(doc, scene,  0.45, 0.27, 0, 0.04, 0.27, 0.04, '#1A1A1A');
  addBox(doc, scene, -0.45, 0.27, 0, 0.27, 0.04, 0.04, '#1A1A1A');
  addBox(doc, scene,  0.45, 0.27, 0, 0.27, 0.04, 0.04, '#1A1A1A');
  // Handlebar
  addBox(doc, scene, 0.44, 0.9, 0, 0.04, 0.04, 0.18, '#888888');
  addBox(doc, scene, 0.44, 0.88, 0, 0.04, 0.1, 0.04, '#888888');
  // Seat
  addBox(doc, scene, -0.1, 0.82, 0, 0.16, 0.025, 0.06, '#2A2A2A');
  await save(doc, 'bike');
}

// Flat surface slabs
async function genDeckSlab() {
  const { doc, scene } = newDoc();
  addBox(doc, scene, 0, 0.03, 0, 0.5, 0.03, 0.5, '#B09A78');
  // Plank lines (slight colour variation)
  addBox(doc, scene, -0.25, 0.058, 0, 0.005, 0.002, 0.5, '#A08860');
  addBox(doc, scene,  0.0,  0.058, 0, 0.005, 0.002, 0.5, '#A08860');
  addBox(doc, scene,  0.25, 0.058, 0, 0.005, 0.002, 0.5, '#A08860');
  await save(doc, 'deck_slab');
}

async function genLawnSlab() {
  const { doc, scene } = newDoc();
  addBox(doc, scene, 0, 0.02, 0, 0.5, 0.02, 0.5, '#5A9A40');
  await save(doc, 'lawn_slab');
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log('Generating procedural GLB models — batch 2...');
// Lighting
await genChandelier();
await genPendantLight();
await genLampPost();
await genBollardLight();
await genFloodLight();
// Decor
await genWallArt();
await genClock();
await genCurtain();
await genStringLights();
await genPrinter();
// Garden
await genBbqGrill();
await genBirdBath();
await genFountain();
await genPlanterBox();
await genRaisedBed();
await genSandbox();
await genTrellis();
await genMailbox();
await genRainBarrel();
await genCompostBin();
await genUmbrella();
// Pools
await genPoolRectangular();
await genPoolRound();
await genHotTub();
// Structures
await genShed();
await genGazebo();
await genPergola();
await genGreenhouse();
// Vehicles
await genCarSedan();
await genCarSuv();
await genBike();
// Surfaces
await genDeckSlab();
await genLawnSlab();
console.log('Done — 33 models generated.');
