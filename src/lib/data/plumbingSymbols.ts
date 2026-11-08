import type { PlumbingSymbolType } from '$lib/models/types';

export interface PlumbingSymbolDef {
  id: PlumbingSymbolType;
  name: string;
  category: 'fixtures' | 'appliances' | 'drainage' | 'supply' | 'equipment';
  description: string;
}

export const plumbingCategories: PlumbingSymbolDef['category'][] = ['fixtures', 'appliances', 'drainage', 'supply', 'equipment'];

export const plumbingSymbolDefs: PlumbingSymbolDef[] = [
  // Fixtures
  { id: 'sink-single',  name: 'Sink',          category: 'fixtures', description: 'Single bowl sink (bathroom/laundry)' },
  { id: 'sink-double',  name: 'Double Sink',   category: 'fixtures', description: 'Double bowl vanity sink' },
  { id: 'sink-kitchen', name: 'Kitchen Sink',  category: 'fixtures', description: 'Kitchen sink with drainboard' },
  { id: 'toilet',       name: 'Toilet',        category: 'fixtures', description: 'Toilet / WC' },
  { id: 'bathtub',      name: 'Bathtub',       category: 'fixtures', description: 'Bathtub' },
  { id: 'shower',       name: 'Shower',        category: 'fixtures', description: 'Shower base' },
  // Appliances
  { id: 'dishwasher-point', name: 'Dishwasher',     category: 'appliances', description: 'Dishwasher water/waste connection' },
  { id: 'washer-point',     name: 'Washing Machine', category: 'appliances', description: 'Washing machine water/waste connection' },
  // Drainage
  { id: 'floor-drain', name: 'Floor Drain', category: 'drainage', description: 'Floor waste / drain' },
  { id: 'cleanout',    name: 'Cleanout',    category: 'drainage', description: 'Drain cleanout access point' },
  // Supply
  { id: 'valve-shutoff',  name: 'Shut-off Valve', category: 'supply', description: 'Isolation / shut-off valve' },
  { id: 'valve-hosebib',  name: 'Hose Bib',       category: 'supply', description: 'Outdoor tap / hose bib' },
  { id: 'gas-point',      name: 'Gas Point',      category: 'supply', description: 'Gas supply outlet' },
  { id: 'water-meter',    name: 'Water Meter',    category: 'supply', description: 'Water meter' },
  // Equipment
  { id: 'hot-water-unit', name: 'Hot Water Unit', category: 'equipment', description: 'Hot water system / cylinder' },
  { id: 'sump-pump',      name: 'Sump Pump',      category: 'equipment', description: 'Sump / waste water pump' },
];

/**
 * Draw a plumbing symbol on a canvas context.
 * cx/cy are screen-space coordinates. r is radius in screen pixels.
 */
export function drawPlumbingSymbol(
  ctx: CanvasRenderingContext2D,
  type: PlumbingSymbolType,
  cx: number,
  cy: number,
  r: number,
  rotation: number,
  selected: boolean,
  label?: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotation * Math.PI) / 180);

  const strokeColor = selected ? '#2563eb' : '#1e293b';
  const fillColor = selected ? '#dbeafe' : '#ffffff';
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = fillColor;
  ctx.lineWidth = Math.max(1, r * 0.08);

  switch (type) {
    case 'sink-single':       drawSinkSingle(ctx, r); break;
    case 'sink-double':       drawSinkDouble(ctx, r); break;
    case 'sink-kitchen':      drawSinkKitchen(ctx, r); break;
    case 'toilet':            drawToilet(ctx, r); break;
    case 'bathtub':           drawBathtub(ctx, r); break;
    case 'shower':            drawShower(ctx, r); break;
    case 'dishwasher-point':  drawTagBox(ctx, r, 'DW'); break;
    case 'washer-point':      drawTagBox(ctx, r, 'WM'); break;
    case 'floor-drain':       drawFloorDrain(ctx, r); break;
    case 'cleanout':          drawTagCircle(ctx, r, 'CO', 0.55); break;
    case 'valve-shutoff':     drawValveShutoff(ctx, r); break;
    case 'valve-hosebib':     drawTagCircle(ctx, r, 'HB', 0.5); break;
    case 'gas-point':         drawTagCircle(ctx, r, 'G', 0.85); break;
    case 'water-meter':       drawTagCircle(ctx, r, 'M', 0.85); break;
    case 'hot-water-unit':    drawHotWaterUnit(ctx, r); break;
    case 'sump-pump':         drawTagCircle(ctx, r, 'SP', 0.5); break;
  }

  ctx.restore();

  // Label (unrotated, below symbol)
  if (label) {
    ctx.save();
    ctx.fillStyle = selected ? '#2563eb' : '#374151';
    ctx.font = `${Math.max(8, r * 0.7)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, cx, cy + r + 3);
    ctx.restore();
  }

  // Selection ring
  if (selected) {
    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

// ---- Helpers ----

function circle(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawTagCircle(ctx: CanvasRenderingContext2D, r: number, tag: string, fontScale: number) {
  circle(ctx, r);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * fontScale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, 0, 0);
}

function drawTagBox(ctx: CanvasRenderingContext2D, r: number, tag: string) {
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.5}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, 0, 0);
}

// ---- Fixtures ----

function drawSinkSingle(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.roundRect(-r * 0.9, -r * 0.6, r * 1.8, r * 1.2, r * 0.2);
  ctx.fill();
  ctx.stroke();
  // drain
  ctx.beginPath();
  ctx.arc(0, r * 0.1, r * 0.12, 0, Math.PI * 2);
  ctx.stroke();
  // faucet
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.6);
  ctx.lineTo(0, -r * 1.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -r * 1.05, r * 0.15, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSinkDouble(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.roundRect(-r * 1.05, -r * 0.6, r * 0.95, r * 1.2, r * 0.15);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(r * 0.1, -r * 0.6, r * 0.95, r * 1.2, r * 0.15);
  ctx.fill();
  ctx.stroke();
  for (const dx of [-r * 0.575, r * 0.575]) {
    ctx.beginPath();
    ctx.arc(dx, r * 0.1, r * 0.1, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.6);
  ctx.lineTo(0, -r * 1.0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -r * 1.0, r * 0.14, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSinkKitchen(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.roundRect(-r * 1.1, -r * 0.65, r * 2.2, r * 1.3, r * 0.15);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-r * 0.85, -r * 0.4, r * 1.7, r * 0.8, r * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.65);
  ctx.lineTo(0, -r * 1.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -r * 1.05, r * 0.14, 0, Math.PI * 2);
  ctx.stroke();
}

function drawToilet(ctx: CanvasRenderingContext2D, r: number) {
  // tank
  ctx.fillRect(-r * 0.7, -r * 1.05, r * 1.4, r * 0.5);
  ctx.strokeRect(-r * 0.7, -r * 1.05, r * 1.4, r * 0.5);
  // bowl
  ctx.beginPath();
  ctx.ellipse(0, r * 0.15, r * 0.75, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // seat opening
  ctx.beginPath();
  ctx.ellipse(0, r * 0.15, r * 0.4, r * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBathtub(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.roundRect(-r * 1.3, -r * 0.85, r * 2.6, r * 1.7, r * 0.4);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-r * 1.05, -r * 0.6, r * 2.1, r * 1.2, r * 0.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(r * 0.85, 0, r * 0.12, 0, Math.PI * 2);
  ctx.stroke();
}

function drawShower(ctx: CanvasRenderingContext2D, r: number) {
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
  ctx.stroke();
  for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(dx * r * 0.95, dy * r * 0.95);
    ctx.lineTo(dx * r * 0.4, dy * r * 0.4);
    ctx.stroke();
  }
}

// ---- Drainage ----

function drawFloorDrain(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  ctx.lineWidth = Math.max(1, r * 0.08);
  for (const dy of [-r * 0.5, 0, r * 0.5]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, dy);
    ctx.lineTo(r * 0.8, dy);
    ctx.stroke();
  }
}

// ---- Supply ----

function drawValveShutoff(ctx: CanvasRenderingContext2D, r: number) {
  // Standard "bowtie" valve symbol
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, -r * 0.6);
  ctx.lineTo(r * 0.9, r * 0.6);
  ctx.lineTo(r * 0.9, -r * 0.6);
  ctx.lineTo(-r * 0.9, r * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ---- Equipment ----

function drawHotWaterUnit(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.7, r * 0.6, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-r * 0.6, -r * 0.7, r * 1.2, r * 1.4);
  ctx.strokeRect(-r * 0.6, -r * 0.7, r * 1.2, r * 1.4);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.7, r * 0.6, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.42}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HWS', 0, 0);
}
