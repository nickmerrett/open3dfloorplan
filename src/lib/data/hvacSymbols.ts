import type { HvacSymbolType } from '$lib/models/types';

export interface HvacSymbolDef {
  id: HvacSymbolType;
  name: string;
  category: 'equipment' | 'heating' | 'ventilation' | 'controls';
  description: string;
}

export const hvacCategories: HvacSymbolDef['category'][] = ['equipment', 'heating', 'ventilation', 'controls'];

export const hvacSymbolDefs: HvacSymbolDef[] = [
  // Equipment
  { id: 'ac-indoor',  name: 'AC Indoor',   category: 'equipment', description: 'Split system AC indoor unit' },
  { id: 'ac-outdoor', name: 'AC Outdoor',  category: 'equipment', description: 'Split system AC outdoor / condenser unit' },
  { id: 'ducted-unit', name: 'Ducted Unit', category: 'equipment', description: 'Ducted air handling unit' },
  { id: 'heat-pump',  name: 'Heat Pump',   category: 'equipment', description: 'Heat pump unit' },
  // Heating
  { id: 'furnace',  name: 'Furnace',  category: 'heating', description: 'Furnace / central heater' },
  { id: 'radiator', name: 'Radiator', category: 'heating', description: 'Hydronic radiator' },
  { id: 'underfloor-heating', name: 'Underfloor Htg', category: 'heating', description: 'Underfloor heating zone' },
  // Ventilation
  { id: 'vent-supply',  name: 'Supply Vent', category: 'ventilation', description: 'Supply air diffuser' },
  { id: 'vent-return',  name: 'Return Vent', category: 'ventilation', description: 'Return air grille' },
  { id: 'vent-exhaust', name: 'Exhaust Vent', category: 'ventilation', description: 'Exhaust vent' },
  { id: 'damper', name: 'Damper', category: 'ventilation', description: 'Duct damper' },
  // Controls
  { id: 'thermostat',     name: 'Thermostat',     category: 'controls', description: 'Wall thermostat' },
  { id: 'zone-controller', name: 'Zone Controller', category: 'controls', description: 'HVAC zone controller' },
  { id: 'co2-sensor',     name: 'CO2 Sensor',     category: 'controls', description: 'CO2 / air quality sensor' },
];

/**
 * Draw an HVAC symbol on a canvas context.
 * cx/cy are screen-space coordinates. r is radius in screen pixels.
 */
export function drawHvacSymbol(
  ctx: CanvasRenderingContext2D,
  type: HvacSymbolType,
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
    case 'ac-indoor':   drawAcUnit(ctx, r, 'AC IN'); break;
    case 'ac-outdoor':  drawAcOutdoor(ctx, r); break;
    case 'ducted-unit': drawTagBox(ctx, r, 'AHU', 0.5); break;
    case 'heat-pump':   drawHeatPump(ctx, r); break;
    case 'furnace':     drawFurnace(ctx, r); break;
    case 'radiator':    drawRadiator(ctx, r); break;
    case 'underfloor-heating': drawUnderfloorHeating(ctx, r); break;
    case 'vent-supply': drawVentSupply(ctx, r); break;
    case 'vent-return': drawVentReturn(ctx, r); break;
    case 'vent-exhaust': drawTagBox(ctx, r, 'E', 0.9); break;
    case 'damper':      drawDamper(ctx, r); break;
    case 'thermostat':  drawThermostat(ctx, r); break;
    case 'zone-controller': drawZoneController(ctx, r); break;
    case 'co2-sensor':  drawTagCircle(ctx, r, 'CO2', 0.42); break;
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

function drawTagBox(ctx: CanvasRenderingContext2D, r: number, tag: string, fontScale: number) {
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * fontScale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, 0, 0);
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, size: number) {
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - Math.PI / 6), y - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x - size * Math.cos(angle + Math.PI / 6), y - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.fill();
}

// ---- Equipment ----

function drawAcUnit(ctx: CanvasRenderingContext2D, r: number, tag: string) {
  ctx.beginPath();
  ctx.roundRect(-r, -r * 0.6, r * 2, r * 1.2, r * 0.15);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.06);
  for (const dy of [-r * 0.25, 0, r * 0.25]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, dy);
    ctx.lineTo(r * 0.7, dy);
    ctx.stroke();
  }
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.42}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(tag, 0, r * 0.32);
}

function drawAcOutdoor(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 3);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.35, r * 0.15, r * 0.3, 0, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ---- Heating ----

function drawHeatPump(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, -Math.PI * 0.2, Math.PI * 0.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, Math.PI * 0.8, Math.PI * 1.9);
  ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.45}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HP', 0, 0);
}

function drawFurnace(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillRect(-r * 0.8, -r, r * 1.6, r * 2);
  ctx.strokeRect(-r * 0.8, -r, r * 1.6, r * 2);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.5);
  ctx.quadraticCurveTo(r * 0.35, 0, 0, r * 0.5);
  ctx.quadraticCurveTo(-r * 0.35, 0, 0, -r * 0.5);
  ctx.stroke();
}

function drawRadiator(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillRect(-r, -r * 0.7, r * 2, r * 1.4);
  ctx.strokeRect(-r, -r * 0.7, r * 2, r * 1.4);
  ctx.lineWidth = Math.max(1, r * 0.06);
  for (let i = -3; i <= 3; i++) {
    const x = i * r * 0.27;
    ctx.beginPath();
    ctx.moveTo(x, -r * 0.7);
    ctx.lineTo(x, r * 0.7);
    ctx.stroke();
  }
}

function drawUnderfloorHeating(ctx: CanvasRenderingContext2D, r: number) {
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.45}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('UFH', 0, -r * 0.15);
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  for (let i = -3; i <= 3; i++) {
    const x = i * r * 0.25;
    const y = r * 0.45 + (i % 2 === 0 ? -r * 0.08 : r * 0.08);
    if (i === -3) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// ---- Ventilation ----

function drawVentSupply(ctx: CanvasRenderingContext2D, r: number) {
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.lineWidth = Math.max(1, r * 0.1);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const ex = dx * r * 0.65, ey = dy * r * 0.65;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    drawArrowHead(ctx, ex, ey, dx, dy, r * 0.18);
  }
}

function drawVentReturn(ctx: CanvasRenderingContext2D, r: number) {
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.lineWidth = Math.max(1, r * 0.1);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const sx = dx * r * 0.85, sy = dy * r * 0.85;
    const ex = dx * r * 0.3, ey = dy * r * 0.3;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    drawArrowHead(ctx, ex, ey, -dx, -dy, r * 0.18);
  }
}

function drawDamper(ctx: CanvasRenderingContext2D, r: number) {
  ctx.strokeRect(-r, -r * 0.5, r * 2, r);
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, -r * 0.4);
  ctx.lineTo(r * 0.9, r * 0.4);
  ctx.stroke();
}

// ---- Controls ----

function drawThermostat(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  ctx.lineWidth = Math.max(1, r * 0.07);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI * 2) / 8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
    ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
    ctx.stroke();
  }
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

function drawZoneController(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillRect(-r * 0.8, -r, r * 1.6, r * 2);
  ctx.strokeRect(-r * 0.8, -r, r * 1.6, r * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Z', 0, 0);
}
