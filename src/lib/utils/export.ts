import type { Project, TradeType, TradeSymbolType, TradeView } from '$lib/models/types';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { detectRooms, getRoomPolygon, roomCentroid } from '$lib/utils/roomDetection';
import { projectSettings, formatArea } from '$lib/stores/settings';
import { activeTradeViewId } from '$lib/stores/project';
import { get } from 'svelte/store';
import jsPDF from 'jspdf';
import {
  drawWall as _drawWall,
  drawDoorOnWall as _drawDoorOnWall,
  drawWindowOnWall as _drawWindowOnWall,
  drawFurnitureItem as _drawFurnitureItem,
  drawStair as _drawStair,
  drawColumn as _drawColumn,
  drawRooms as _drawRooms,
  drawWallJoints as _drawWallJoints,
  drawPersistedMeasurements as _drawPersistedMeasurements,
  drawTextAnnotations as _drawTextAnnotations,
  drawAnnotations as _drawAnnotations,
} from '$lib/utils/canvasRenderer';
import { drawTradeSymbol, SYMBOL_RADIUS, getSymbolDefs, tradeMeta } from '$lib/data/tradeSymbols';

/** Escape text for safe SVG embedding */
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Render a single trade symbol to a small PNG data URL, for embedding in PDFs. */
const iconCache = new Map<string, string>();
function getSymbolIconDataURL(trade: TradeType, type: TradeSymbolType): string {
  const key = `${trade}:${type}`;
  let url = iconCache.get(key);
  if (url) return url;
  const size = 32;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  drawTradeSymbol(ctx, trade, type, size / 2, size / 2, size * 0.35, 0, false);
  url = c.toDataURL('image/png');
  iconCache.set(key, url);
  return url;
}

/** Draw a "Legend" box listing each distinct symbol type used in a trade view, with its icon and name. */
function drawTradeLegend(ctx: CanvasRenderingContext2D, offW: number, offH: number, tradeView: TradeView): void {
  const defs = getSymbolDefs(tradeView.trade);
  const seen = new Set<string>();
  const entries: { type: TradeSymbolType; name: string }[] = [];
  for (const sym of tradeView.symbols) {
    if (seen.has(sym.type)) continue;
    seen.add(sym.type);
    entries.push({ type: sym.type, name: defs.find(d => d.id === sym.type)?.name ?? sym.type });
  }
  if (entries.length === 0) return;
  entries.sort((a, b) => a.name.localeCompare(b.name));

  const pad = 18;
  const rowH = 36;
  const iconR = 15;
  const fontSize = 18;
  const titleH = 36;
  const margin = 24; // distance from canvas corner — keeps legend clear of the floor plan
  const maxRows = Math.max(4, Math.floor((offH * 0.6) / rowH));
  const rows = Math.min(entries.length, maxRows);
  const cols = Math.ceil(entries.length / rows);

  ctx.save();
  ctx.font = `${fontSize}px sans-serif`;
  let colW = 0;
  for (const e of entries) colW = Math.max(colW, ctx.measureText(e.name).width);
  colW += iconR * 2 + 20;

  const boxW = cols * colW + pad * 2;
  const boxH = titleH + rows * rowH + pad * 2;
  const boxX = margin;
  const boxY = offH - boxH - margin;

  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 8);
  else ctx.rect(boxX, boxY, boxW, boxH);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1e293b';
  ctx.font = `bold ${fontSize + 1}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${tradeMeta[tradeView.trade].label} Legend`, boxX + pad, boxY + pad + titleH / 2);

  entries.forEach((e, i) => {
    const col = Math.floor(i / rows);
    const row = i % rows;
    const cx = boxX + pad + col * colW + iconR;
    const cy = boxY + pad + titleH + row * rowH + rowH / 2;
    drawTradeSymbol(ctx, tradeView.trade, e.type, cx, cy, iconR, 0, false);
    ctx.fillStyle = '#1e293b';
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.name, cx + iconR + 8, cy);
  });

  ctx.restore();
}

/**
 * Export the full floor plan as a high-resolution PNG.
 * Uses the same renderer pipeline as the live editor so the result
 * matches exactly what you see on screen.
 */
export function exportAsPNG(canvas: HTMLCanvasElement, project?: Project) {
  const name = project?.name || 'floorplan';

  if (!project) {
    canvas.toBlob((blob) => { if (blob) download(blob, `${name}.png`); });
    return;
  }

  const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
  if (!floor || floor.walls.length === 0) {
    canvas.toBlob((blob) => { if (blob) download(blob, `${name}.png`); });
    return;
  }

  const settings = get(projectSettings);
  const tradeViewId = get(activeTradeViewId);
  const tradeView = tradeViewId ? project.tradeViews?.find(v => v.id === tradeViewId) ?? null : null;

  // ── Compute world bounding box ──────────────────────────────────────
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  function expand(x: number, y: number) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  for (const w of floor.walls) { expand(w.start.x, w.start.y); expand(w.end.x, w.end.y); if (w.curvePoint) expand(w.curvePoint.x, w.curvePoint.y); }
  for (const fi of floor.furniture) {
    const cat = getCatalogItem(fi.catalogId);
    const hw = (fi.width ?? cat?.width ?? 60) * Math.abs(fi.scale?.x ?? 1) / 2;
    const hd = (fi.depth ?? cat?.depth ?? 60) * Math.abs(fi.scale?.y ?? 1) / 2;
    const a = (fi.rotation * Math.PI) / 180;
    const bx = hw * Math.abs(Math.cos(a)) + hd * Math.abs(Math.sin(a));
    const by = hw * Math.abs(Math.sin(a)) + hd * Math.abs(Math.cos(a));
    expand(fi.position.x - bx, fi.position.y - by); expand(fi.position.x + bx, fi.position.y + by);
  }
  if (floor.stairs) for (const st of floor.stairs) { expand(st.position.x - st.width / 2, st.position.y - st.depth / 2); expand(st.position.x + st.width / 2, st.position.y + st.depth / 2); }
  if (floor.columns) for (const col of floor.columns) { const r = col.diameter / 2; expand(col.position.x - r, col.position.y - r); expand(col.position.x + r, col.position.y + r); }
  if (tradeView) for (const sym of tradeView.symbols) expand(sym.position.x, sym.position.y);
  if (minX === Infinity) { canvas.toBlob((blob) => { if (blob) download(blob, `${name}.png`); }); return; }

  const pad = tradeView ? 160 : 80;
  const worldW = maxX - minX + pad * 2;
  const worldH = maxY - minY + pad * 2;

  // ── Offscreen canvas sizing ─────────────────────────────────────────
  // Target ~2400px on the longest edge for HQ output
  const targetPx = 2400;
  const zoom = Math.min(targetPx / worldW, targetPx / worldH, 3);
  const offW = Math.ceil(worldW * zoom);
  const offH = Math.ceil(worldH * zoom);
  const camX = (minX + maxX) / 2;
  const camY = (minY + maxY) / 2;

  const offscreen = document.createElement('canvas');
  offscreen.width = offW;
  offscreen.height = offH;
  const ctx = offscreen.getContext('2d')!;

  const cs = { ctx, width: offW, height: offH, zoom, camX, camY };

  // Background
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, offW, offH);

  // ── Render using the same pipeline as the live editor ───────────────
  const rooms = detectRooms(floor.walls);

  if (!tradeView) {
    // Normal mode: room fills + textures
    _drawRooms(cs, floor, rooms, null, true, settings.showInternalDimensions, settings);
  }

  // Walls
  for (const w of floor.walls) _drawWall(cs, w, false, settings.showExternalDimensions, settings);
  _drawWallJoints(cs, floor, null);

  // Doors
  for (const d of floor.doors) {
    const wall = floor.walls.find(wl => wl.id === d.wallId);
    if (wall) _drawDoorOnWall(cs, wall, d);
  }

  // Windows
  for (const win of floor.windows) {
    const wall = floor.walls.find(wl => wl.id === win.wallId);
    if (wall) _drawWindowOnWall(cs, wall, win);
  }

  if (!tradeView) {
    // Furniture
    for (const fi of floor.furniture) _drawFurnitureItem(cs, fi, false);
    // Stairs
    if (floor.stairs) for (const st of floor.stairs) _drawStair(cs, st, false);
    // Columns
    if (floor.columns) for (const col of floor.columns) _drawColumn(cs, col, false);
  }

  // Trade symbols
  if (tradeView) {
    for (const sym of tradeView.symbols) {
      const sx = (sym.position.x - camX) * zoom + offW / 2;
      const sy = (sym.position.y - camY) * zoom + offH / 2;
      drawTradeSymbol(ctx, tradeView.trade, sym.type, sx, sy, SYMBOL_RADIUS * zoom, sym.rotation, false, sym.label);
    }
  }

  // Annotations & measurements
  if (floor.measurements) _drawPersistedMeasurements(cs, floor, null, settings);
  if (floor.textAnnotations) _drawTextAnnotations(cs, floor, null, null);
  if (floor.annotations) _drawAnnotations(cs, floor, null, settings);

  // Trade symbol legend
  if (tradeView) drawTradeLegend(ctx, offW, offH, tradeView);

  offscreen.toBlob((blob) => {
    if (blob) download(blob, `${name}.png`);
  });
}

export function exportAsJSON(project: Project) {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  download(blob, `${project.name || 'project'}.json`);
}

export function exportAsSVG(project: Project) {
  const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
  if (!floor || floor.walls.length === 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of floor.walls) {
    for (const p of [w.start, w.end]) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
  }
  const pad = 50;
  const vw = maxX - minX + pad * 2;
  const vh = maxY - minY + pad * 2;

  let paths = '';

  // Room fills
  const ROOM_COLORS_SVG = ['#bfdbfe', '#fde68a', '#bbf7d0', '#fecaca', '#ddd6fe', '#a5f3fc', '#fed7aa'];
  const rooms = detectRooms(floor.walls);
  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri];
    const poly = getRoomPolygon(room, floor.walls);
    if (poly.length < 3) continue;
    const pts = poly.map(p => `${p.x - minX + pad},${p.y - minY + pad}`).join(' ');
    const color = ROOM_COLORS_SVG[ri % ROOM_COLORS_SVG.length];
    paths += `  <polygon points="${pts}" fill="${color}" fill-opacity="0.4" stroke="none"/>\n`;
    const c = roomCentroid(poly);
    const cx = c.x - minX + pad;
    const cy = c.y - minY + pad;
    paths += `  <text x="${cx}" y="${cy}" text-anchor="middle" font-size="12" fill="#444" font-family="sans-serif" font-weight="bold">${escapeXml(room.name)}</text>\n`;
    paths += `  <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="#888" font-family="sans-serif">${formatArea(room.area, get(projectSettings).units)}</text>\n`;
  }

  for (const w of floor.walls) {
    const x1 = w.start.x - minX + pad;
    const y1 = w.start.y - minY + pad;
    const x2 = w.end.x - minX + pad;
    const y2 = w.end.y - minY + pad;
    paths += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="${w.thickness}" stroke-linecap="round"/>\n`;
    // dimension label
    const len = Math.round(Math.hypot(x2 - x1, y2 - y1));
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    paths += `  <text x="${mx}" y="${my - 8}" text-anchor="middle" font-size="11" fill="#666" font-family="sans-serif">${len} cm</text>\n`;
  }

  // Draw doors as arcs
  for (const d of floor.doors) {
    const wall = floor.walls.find(w => w.id === d.wallId);
    if (!wall) continue;
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);
    const t = d.position;
    const px = wall.start.x + dx * t - minX + pad;
    const py = wall.start.y + dy * t - minY + pad;
    paths += `  <circle cx="${px}" cy="${py}" r="4" fill="#8B4513"/>\n`;
  }

  // Furniture rectangles (actual dimensions from catalog)
  for (const fi of floor.furniture) {
    const fx = fi.position.x - minX + pad;
    const fy = fi.position.y - minY + pad;
    const cat = getCatalogItem(fi.catalogId);
    const fw = fi.width ?? (cat ? cat.width : 30);
    const fd = fi.depth ?? (cat ? cat.depth : 30);
    const color = fi.color ?? (cat ? cat.color : '#a0c4e8');
    const rot = fi.rotation || 0;
    paths += `  <g transform="translate(${fx},${fy}) rotate(${rot})">\n`;
    paths += `    <rect x="${-fw / 2}" y="${-fd / 2}" width="${fw}" height="${fd}" fill="${color}" stroke="#555" stroke-width="0.5" rx="2" opacity="0.7"/>\n`;
    if (cat) {
      paths += `    <text x="0" y="4" text-anchor="middle" font-size="9" fill="#333" font-family="sans-serif">${escapeXml(cat.name)}</text>\n`;
    }
    paths += `  </g>\n`;
  }

  // Measurements
  if (floor.measurements) {
    for (const m of floor.measurements) {
      const x1 = m.x1 - minX + pad, y1 = m.y1 - minY + pad;
      const x2 = m.x2 - minX + pad, y2 = m.y2 - minY + pad;
      paths += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ef4444" stroke-width="1" stroke-dasharray="6,3" stroke-linecap="round"/>\n`;
      const dist = Math.round(Math.hypot(m.x2 - m.x1, m.y2 - m.y1));
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      paths += `  <text x="${mx}" y="${my - 6}" text-anchor="middle" font-size="10" fill="#ef4444" font-family="sans-serif" font-weight="bold">${dist} cm</text>\n`;
    }
  }

  // Annotations (dimension callouts)
  if (floor.annotations) {
    for (const a of floor.annotations) {
      const ax1 = a.x1 - minX + pad, ay1 = a.y1 - minY + pad;
      const ax2 = a.x2 - minX + pad, ay2 = a.y2 - minY + pad;
      const dx = ax2 - ax1, dy = ay2 - ay1;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;
      const ux = dx / len, uy = dy / len;
      const nx = -uy, ny = ux;
      const offset = a.offset || 40;
      const d1x = ax1 + nx * offset, d1y = ay1 + ny * offset;
      const d2x = ax2 + nx * offset, d2y = ay2 + ny * offset;
      // Leader lines
      paths += `  <line x1="${ax1}" y1="${ay1}" x2="${d1x}" y2="${d1y}" stroke="#6366f1" stroke-width="0.75"/>\n`;
      paths += `  <line x1="${ax2}" y1="${ay2}" x2="${d2x}" y2="${d2y}" stroke="#6366f1" stroke-width="0.75"/>\n`;
      // Dimension line
      paths += `  <line x1="${d1x}" y1="${d1y}" x2="${d2x}" y2="${d2y}" stroke="#6366f1" stroke-width="1"/>\n`;
      // Arrowheads
      const arrowLen = 7, arrowW = 3;
      for (const [px, py, dir] of [[d1x, d1y, 1], [d2x, d2y, -1]] as [number, number, number][]) {
        const adx = ux * arrowLen * dir, ady = uy * arrowLen * dir;
        const apx = -uy * arrowW, apy = ux * arrowW;
        paths += `  <polygon points="${px},${py} ${px + adx + apx},${py + ady + apy} ${px + adx - apx},${py + ady - apy}" fill="#6366f1"/>\n`;
      }
      // Label
      const dist = Math.round(Math.hypot(a.x2 - a.x1, a.y2 - a.y1));
      const label = a.label || `${dist} cm`;
      const mx = (d1x + d2x) / 2, my = (d1y + d2y) / 2;
      paths += `  <text x="${mx}" y="${my - 4}" text-anchor="middle" font-size="10" fill="#6366f1" font-family="sans-serif">${escapeXml(label)}</text>\n`;
    }
  }

  // Text annotations
  if (floor.textAnnotations) {
    for (const ta of floor.textAnnotations) {
      const tx = ta.x - minX + pad;
      const ty = ta.y - minY + pad;
      const transform = ta.rotation ? ` transform="rotate(${ta.rotation} ${tx} ${ty})"` : '';
      paths += `  <text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" font-size="${ta.fontSize}" fill="${escapeXml(ta.color)}" font-family="sans-serif"${transform}>${escapeXml(ta.text)}</text>\n`;
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}">
  <rect width="100%" height="100%" fill="white"/>
${paths}</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  download(blob, `${project.name || 'floorplan'}.svg`);
}

export function exportAs3DPNG(renderer: { domElement: HTMLCanvasElement }) {
  renderer.domElement.toBlob((blob: Blob | null) => {
    if (blob) download(blob, 'floorplan-3d.png');
  });
}

export function exportPDF(project: Project) {
  const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
  if (!floor || floor.walls.length === 0) return;

  const settings = get(projectSettings);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();   // ~297
  const ph = pdf.internal.pageSize.getHeight();   // ~210
  const margin = 10;
  const titleBlockH = 22;

  // ── helpers ──
  function drawPageBorder() {
    pdf.setDrawColor(40);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, margin, pw - margin * 2, ph - margin * 2);
    // inner border
    pdf.setLineWidth(0.15);
    pdf.rect(margin + 1, margin + 1, pw - margin * 2 - 2, ph - margin * 2 - 2);
  }

  function drawTitleBlock() {
    const tbY = ph - margin - titleBlockH;
    const tbW = pw - margin * 2;
    pdf.setDrawColor(40);
    pdf.setLineWidth(0.4);
    pdf.rect(margin, tbY, tbW, titleBlockH);
    // vertical dividers
    const col1 = margin + tbW * 0.45;
    const col2 = margin + tbW * 0.7;
    pdf.line(col1, tbY, col1, tbY + titleBlockH);
    pdf.line(col2, tbY, col2, tbY + titleBlockH);

    // Project name
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(project.name || 'Untitled Project', margin + 4, tbY + 9);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(floor.name, margin + 4, tbY + 15);
    if (project.description) {
      pdf.setFontSize(7);
      pdf.text(project.description.substring(0, 60), margin + 4, tbY + 19);
    }

    // Date / scale
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    pdf.setFontSize(8);
    pdf.text(`Date: ${today}`, col1 + 4, tbY + 9);
    pdf.text(`Units: ${settings.units}`, col1 + 4, tbY + 15);

    // Branding
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('openplan3d.com', col2 + 4, tbY + 9);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text('Created with Open 3D Floor Planner', col2 + 4, tbY + 15);
  }

  // ── Shared plan rendering ──
  // Base bounding box from walls + furniture + stairs + columns (consistent framing across pages)
  let baseMinX = Infinity, baseMinY = Infinity, baseMaxX = -Infinity, baseMaxY = -Infinity;
  function baseExpand(x: number, y: number) { if (x < baseMinX) baseMinX = x; if (x > baseMaxX) baseMaxX = x; if (y < baseMinY) baseMinY = y; if (y > baseMaxY) baseMaxY = y; }
  for (const w of floor.walls) { baseExpand(w.start.x, w.start.y); baseExpand(w.end.x, w.end.y); }
  for (const fi of floor.furniture) {
    const cat = getCatalogItem(fi.catalogId);
    const hw = (fi.width ?? cat?.width ?? 60) * Math.abs(fi.scale?.x ?? 1) / 2;
    const hd = (fi.depth ?? cat?.depth ?? 60) * Math.abs(fi.scale?.y ?? 1) / 2;
    const a = (fi.rotation * Math.PI) / 180;
    const bx = hw * Math.abs(Math.cos(a)) + hd * Math.abs(Math.sin(a));
    const by = hw * Math.abs(Math.sin(a)) + hd * Math.abs(Math.cos(a));
    baseExpand(fi.position.x - bx, fi.position.y - by); baseExpand(fi.position.x + bx, fi.position.y + by);
  }
  if (floor.stairs) for (const st of floor.stairs) { baseExpand(st.position.x - st.width / 2, st.position.y - st.depth / 2); baseExpand(st.position.x + st.width / 2, st.position.y + st.depth / 2); }
  if (floor.columns) for (const col of floor.columns) { const r = col.diameter / 2; baseExpand(col.position.x - r, col.position.y - r); baseExpand(col.position.x + r, col.position.y + r); }

  const rooms = detectRooms(floor.walls);
  let firstPage = true;

  /** Render a floor plan variant to an offscreen canvas and return it as a PNG data URL. */
  function renderPlanImage(opts: { tradeView: TradeView | null; showFills: boolean; showFurniture: boolean; forceDimensions: boolean }): { imgData: string; planW: number; planH: number } {
    let minX = baseMinX, minY = baseMinY, maxX = baseMaxX, maxY = baseMaxY;
    if (opts.tradeView) {
      for (const sym of opts.tradeView.symbols) {
        if (sym.position.x < minX) minX = sym.position.x;
        if (sym.position.x > maxX) maxX = sym.position.x;
        if (sym.position.y < minY) minY = sym.position.y;
        if (sym.position.y > maxY) maxY = sym.position.y;
      }
    }

    const pad = opts.tradeView ? 160 : 80;
    const planW = maxX - minX + pad * 2;
    const planH = maxY - minY + pad * 2;
    const scale = 2;
    const offscreen = document.createElement('canvas');
    offscreen.width = planW * scale;
    offscreen.height = planH * scale;
    const ctx = offscreen.getContext('2d')!;

    const zoom = scale;
    const camX = (minX + maxX) / 2;
    const camY = (minY + maxY) / 2;
    const cs = { ctx, width: offscreen.width, height: offscreen.height, zoom, camX, camY };

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);

    const dimSettings = opts.forceDimensions ? { ...settings, showExternalDimensions: true, showInternalDimensions: true } : settings;

    if (opts.showFills || opts.forceDimensions) {
      _drawRooms(cs, floor, rooms, null, true, dimSettings.showInternalDimensions, dimSettings, opts.showFills);
    }
    for (const wall of floor.walls) _drawWall(cs, wall, false, dimSettings.showExternalDimensions, dimSettings);
    _drawWallJoints(cs, floor, null);
    for (const d of floor.doors) { const wall = floor.walls.find(wl => wl.id === d.wallId); if (wall) _drawDoorOnWall(cs, wall, d); }
    for (const win of floor.windows) { const wall = floor.walls.find(wl => wl.id === win.wallId); if (wall) _drawWindowOnWall(cs, wall, win); }
    if (opts.showFurniture) {
      for (const fi of floor.furniture) _drawFurnitureItem(cs, fi, false);
      if (floor.stairs) for (const st of floor.stairs) _drawStair(cs, st, false);
      if (floor.columns) for (const col of floor.columns) _drawColumn(cs, col, false);
    }

    if (opts.tradeView) {
      for (const sym of opts.tradeView.symbols) {
        const sx = (sym.position.x - camX) * zoom + offscreen.width / 2;
        const sy = (sym.position.y - camY) * zoom + offscreen.height / 2;
        drawTradeSymbol(ctx, opts.tradeView.trade, sym.type, sx, sy, SYMBOL_RADIUS * zoom, sym.rotation, false, sym.label);
      }
    }

    if (floor.measurements) _drawPersistedMeasurements(cs, floor, null, settings);
    if (floor.textAnnotations) _drawTextAnnotations(cs, floor, null, null);
    if (floor.annotations) _drawAnnotations(cs, floor, null, settings);

    if (opts.tradeView) drawTradeLegend(ctx, offscreen.width, offscreen.height, opts.tradeView);

    return { imgData: offscreen.toDataURL('image/png'), planW, planH };
  }

  /** Add a new page (or use the first page) with a rendered plan image and title block. */
  function addPlanPage(title: string, opts: { tradeView: TradeView | null; showFills: boolean; showFurniture: boolean; forceDimensions: boolean }) {
    if (!firstPage) pdf.addPage('a4', 'landscape');
    firstPage = false;
    drawPageBorder();

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(40);
    pdf.text(title, margin + 6, margin + 12);

    const { imgData, planW, planH } = renderPlanImage(opts);
    const headingH = 16;
    const drawAreaW = pw - margin * 2 - 4;
    const drawAreaH = ph - margin * 2 - titleBlockH - headingH - 2;
    const aspect = planW / planH;
    let imgW = drawAreaW;
    let imgH = drawAreaW / aspect;
    if (imgH > drawAreaH) { imgH = drawAreaH; imgW = drawAreaH * aspect; }
    const imgX = margin + 2 + (drawAreaW - imgW) / 2;
    const imgY = margin + headingH + (drawAreaH - imgH) / 2;
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgW, imgH);

    drawTitleBlock();
  }

  // ── Page 1: Floor Plan (default drawing) ──
  addPlanPage('Floor Plan', { tradeView: null, showFills: true, showFurniture: true, forceDimensions: false });

  // ── Page 2: Dimensioned Plan (clean, no fills/objects, dimensions on) ──
  addPlanPage('Dimensioned Plan', { tradeView: null, showFills: false, showFurniture: false, forceDimensions: true });

  // ── Room Schedule ──
  if (rooms.length > 0) {
    pdf.addPage('a4', 'landscape');
    drawPageBorder();

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Room Schedule', margin + 6, margin + 12);
    pdf.setDrawColor(60);

    // Table setup
    const tX = margin + 6;
    let tY = margin + 20;
    const colWidths = [12, 70, 45, 55, 65]; // #, Name, Type, Area, Floor Texture
    const headers = ['#', 'Room Name', 'Type', 'Area', 'Floor Texture'];
    const rowH = 8;
    const tableW = colWidths.reduce((a, b) => a + b, 0);

    // Header row
    pdf.setFillColor(50, 50, 60);
    pdf.rect(tX, tY, tableW, rowH, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    let cx = tX;
    for (let i = 0; i < headers.length; i++) {
      pdf.text(headers[i], cx + 3, tY + 5.5);
      cx += colWidths[i];
    }
    tY += rowH;

    // Data rows
    pdf.setTextColor(40, 40, 40);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    let totalArea = 0;
    for (let ri = 0; ri < rooms.length; ri++) {
      const room = rooms[ri];
      // Merge with stored room data for texture info
      const storedRoom = floor.rooms.find(r => r.name === room.name);
      totalArea += room.area;

      // Alternating row background
      if (ri % 2 === 0) {
        pdf.setFillColor(245, 245, 250);
        pdf.rect(tX, tY, tableW, rowH, 'F');
      }
      // Row border
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.15);
      pdf.rect(tX, tY, tableW, rowH);

      cx = tX;
      const rowData = [
        String(ri + 1),
        room.name,
        storedRoom?.roomType || 'indoor',
        formatArea(room.area, settings.units),
        storedRoom?.floorTexture || '—'
      ];
      for (let i = 0; i < rowData.length; i++) {
        pdf.text(rowData[i].substring(0, 30), cx + 3, tY + 5.5);
        cx += colWidths[i];
      }
      tY += rowH;
    }

    // Total row
    pdf.setFillColor(50, 50, 60);
    pdf.rect(tX, tY, tableW, rowH, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', tX + colWidths[0] + 3, tY + 5.5);
    pdf.text(formatArea(totalArea, settings.units), tX + colWidths[0] + colWidths[1] + colWidths[2] + 3, tY + 5.5);
    pdf.setTextColor(0);

    // Summary stats below table
    tY += rowH + 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    pdf.text(`${rooms.length} rooms  ·  ${floor.walls.length} walls  ·  ${floor.doors.length} doors  ·  ${floor.windows.length} windows  ·  ${floor.furniture.length} furniture items`, tX, tY);

    drawTitleBlock();
  }

  // ── Trade Plan + Schedule page(s) ──
  const scheduleViews = project.tradeViews?.filter(v => v.symbols.length > 0) ?? [];
  for (const ev of scheduleViews) {
    // Plan page showing this trade's symbols overlaid on the floor plan
    addPlanPage(`${tradeMeta[ev.trade].label} Plan — ${ev.name}`, { tradeView: ev, showFills: false, showFurniture: false, forceDimensions: false });

    // Schedule page (table)
    pdf.addPage('a4', 'landscape');
    drawPageBorder();

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(40);
    pdf.text(`${tradeMeta[ev.trade].label} Schedule — ${ev.name}`, margin + 6, margin + 12);

    const tX = margin + 6;
    let tY = margin + 22;
    const rowH = 7;
    const pageBottom = ph - margin - titleBlockH - 4;

    // Column layout: Symbol | Circuit | Count | Height | Notes
    const colW = [60, 30, 18, 30, 90];
    const hdrs = ['Symbol Type', 'Circuit', 'Count', 'Height', 'Notes'];
    const tableW = colW.reduce((a, b) => a + b, 0);

    function drawTableHeader(y: number) {
      pdf.setFillColor(30, 41, 59);
      pdf.rect(tX, y, tableW, rowH, 'F');
      pdf.setTextColor(255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      let cx = tX;
      for (let i = 0; i < hdrs.length; i++) {
        pdf.text(hdrs[i], cx + 2, y + 5);
        cx += colW[i];
      }
      pdf.setTextColor(40);
    }

    function drawRoomHeader(y: number, roomName: string) {
      pdf.setFillColor(71, 85, 105);
      pdf.rect(tX, y, tableW, rowH, 'F');
      pdf.setTextColor(255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text(roomName.toUpperCase(), tX + 2, y + 5);
      pdf.setTextColor(40);
    }

    function drawCircuitHeader(y: number, circuit: string) {
      pdf.setFillColor(226, 232, 240);
      pdf.rect(tX, y, tableW, rowH, 'F');
      pdf.setFont('helvetica', 'bolditalic');
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Circuit: ${circuit}`, tX + 4, y + 5);
      pdf.setTextColor(40);
    }

    function checkPageBreak(y: number): number {
      if (y + rowH > pageBottom) {
        pdf.addPage('a4', 'landscape');
        drawPageBorder();
        drawTitleBlock();
        drawTableHeader(margin + 8);
        return margin + 8 + rowH;
      }
      return y;
    }

    drawTableHeader(tY);
    tY += rowH;

    // Group by room then circuit
    const byRoom = new Map<string, typeof ev.symbols>();
    for (const sym of ev.symbols) {
      const rKey = sym.roomName ?? '(Unassigned)';
      if (!byRoom.has(rKey)) byRoom.set(rKey, []);
      byRoom.get(rKey)!.push(sym);
    }

    // Sort rooms: named rooms first, unassigned last
    const roomKeys = [...byRoom.keys()].sort((a, b) => {
      if (a === '(Unassigned)') return 1;
      if (b === '(Unassigned)') return -1;
      return a.localeCompare(b);
    });

    let rowIdx = 0;
    for (const roomKey of roomKeys) {
      tY = checkPageBreak(tY);
      drawRoomHeader(tY, roomKey);
      tY += rowH;

      const syms = byRoom.get(roomKey)!;
      const byCircuit = new Map<string, typeof syms>();
      for (const sym of syms) {
        const cKey = sym.annotations?.circuit?.trim() || '(No Circuit)';
        if (!byCircuit.has(cKey)) byCircuit.set(cKey, []);
        byCircuit.get(cKey)!.push(sym);
      }

      const circuitKeys = [...byCircuit.keys()].sort((a, b) => {
        if (a === '(No Circuit)') return 1;
        if (b === '(No Circuit)') return -1;
        return a.localeCompare(b);
      });

      for (const circuitKey of circuitKeys) {
        tY = checkPageBreak(tY);
        drawCircuitHeader(tY, circuitKey);
        tY += rowH;

        const circuitSyms = byCircuit.get(circuitKey)!;

        // Group by symbol type for count
        const byType = new Map<string, typeof circuitSyms>();
        for (const sym of circuitSyms) {
          if (!byType.has(sym.type)) byType.set(sym.type, []);
          byType.get(sym.type)!.push(sym);
        }

        for (const [symType, typedSyms] of byType) {
          const defName = getSymbolDefs(ev.trade).find(d => d.id === symType)?.name ?? symType;

          // Summary row for this type
          tY = checkPageBreak(tY);
          if (rowIdx % 2 === 0) { pdf.setFillColor(248, 250, 252); pdf.rect(tX, tY, tableW, rowH, 'F'); }
          pdf.setDrawColor(220);
          pdf.setLineWidth(0.1);
          pdf.rect(tX, tY, tableW, rowH);

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(40);
          let cx = tX;
          pdf.addImage(getSymbolIconDataURL(ev.trade, symType as TradeSymbolType), 'PNG', cx + 1.5, tY + 1, 5, 5);
          pdf.text(defName, cx + 8, tY + 5); cx += colW[0];
          pdf.text(circuitKey === '(No Circuit)' ? '' : circuitKey, cx + 2, tY + 5); cx += colW[1];
          pdf.text(`×${typedSyms.length}`, cx + 2, tY + 5);
          tY += rowH;
          rowIdx++;

          // Per-symbol detail rows
          pdf.setFont('helvetica', 'normal');
          for (const sym of typedSyms) {
            const ann = sym.annotations ?? {};
            const hasDetail = ann.height || ann.notes;
            if (!hasDetail) continue;
            tY = checkPageBreak(tY);
            if (rowIdx % 2 === 0) { pdf.setFillColor(248, 250, 252); pdf.rect(tX, tY, tableW, rowH, 'F'); }
            pdf.setDrawColor(220);
            pdf.rect(tX, tY, tableW, rowH);
            pdf.setTextColor(100);
            pdf.setFontSize(7.5);
            cx = tX;
            pdf.text(`  ↳ ${defName}`, cx + 2, tY + 5); cx += colW[0];
            cx += colW[1]; // circuit (already in header)
            cx += colW[2]; // count
            pdf.text(ann.height ?? '', cx + 2, tY + 5); cx += colW[3];
            pdf.text((ann.notes ?? '').substring(0, 50), cx + 2, tY + 5);
            pdf.setTextColor(40);
            tY += rowH;
            rowIdx++;
          }
        }
      }
    }

    // Summary footer
    tY = checkPageBreak(tY + 4);
    tY += 4;
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    const totalCount = ev.symbols.length;
    const uniqueTypes = new Set(ev.symbols.map(s => s.type)).size;
    pdf.text(`Total: ${totalCount} symbols · ${uniqueTypes} types · ${roomKeys.length} rooms/areas`, tX, tY);

    drawTitleBlock();
  }

  // ── 3D Perspective View page (if a 3D canvas exists) ──
  const canvases = document.querySelectorAll('canvas');
  // Look for a WebGL canvas (the 3D renderer) — typically the second canvas or one with a webgl context
  let threeDCanvas: HTMLCanvasElement | null = null;
  canvases.forEach(c => {
    try {
      if (c.getContext('webgl2') || c.getContext('webgl')) {
        threeDCanvas = c;
      }
    } catch { /* ignore */ }
  });
  // Alternative: grab data attribute or just use last canvas if multiple
  if (!threeDCanvas && canvases.length > 1) {
    threeDCanvas = canvases[canvases.length - 1];
  }

  if (threeDCanvas && threeDCanvas.width > 10 && threeDCanvas.height > 10) {
    try {
      const img3d = threeDCanvas.toDataURL('image/png');
      if (img3d && img3d.length > 100) {
        pdf.addPage('a4', 'landscape');
        drawPageBorder();

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(40);
        pdf.text('3D Perspective View', margin + 6, margin + 12);

        const da3W = pw - margin * 2 - 4;
        const da3H = ph - margin * 2 - titleBlockH - 20;
        const a3 = threeDCanvas.width / threeDCanvas.height;
        let w3 = da3W;
        let h3 = da3W / a3;
        if (h3 > da3H) { h3 = da3H; w3 = da3H * a3; }
        const x3 = margin + 2 + (da3W - w3) / 2;
        const y3 = margin + 18 + (da3H - h3) / 2;
        pdf.addImage(img3d, 'PNG', x3, y3, w3, h3);

        drawTitleBlock();
      }
    } catch { /* 3D canvas tainted or unavailable — skip */ }
  }

  pdf.save(`${project.name || 'floorplan'}.pdf`);
}
