import type { ElectricalSymbolType } from '$lib/models/types';

export interface ElectricalSymbolDef {
  id: ElectricalSymbolType;
  name: string;
  category: 'outlets' | 'switches' | 'lighting' | 'appliances' | 'boards' | 'comms';
  description: string;
}

export const electricalSymbolDefs: ElectricalSymbolDef[] = [
  // Outlets / Power points
  { id: 'outlet-duplex',   name: 'GPO Double',      category: 'outlets',    description: 'General purpose double power point' },
  { id: 'outlet-gfci',     name: 'GPO Safety',      category: 'outlets',    description: 'Safety/RCD protected power point (GFCI)' },
  { id: 'outlet-240v',     name: 'Ded. Circuit',    category: 'outlets',    description: 'Dedicated 240V/high-current circuit' },
  { id: 'outlet-oven',     name: 'Oven Outlet',     category: 'outlets',    description: 'Oven / electric range outlet (32A)' },
  { id: 'outlet-cooktop',  name: 'Cooktop Outlet',  category: 'outlets',    description: 'Induction / electric cooktop (20A)' },
  { id: 'outlet-hotwater', name: 'Hot Water',       category: 'outlets',    description: 'Hot water heater / cylinder circuit' },
  { id: 'outlet-dryer',    name: 'Dryer Outlet',    category: 'outlets',    description: 'Clothes dryer outlet (240V)' },
  { id: 'outlet-ev',       name: 'EV Charger',      category: 'outlets',    description: 'Electric vehicle charger outlet' },
  // Switches
  { id: 'switch-single',   name: 'Switch',          category: 'switches',   description: 'Single-pole switch' },
  { id: 'switch-3way',     name: '2-Way Switch',    category: 'switches',   description: '2-way / 3-wire switch' },
  { id: 'switch-4way',     name: 'Intermediate',    category: 'switches',   description: 'Intermediate / 4-way switch' },
  { id: 'switch-dimmer',   name: 'Dimmer',          category: 'switches',   description: 'Dimmer switch' },
  { id: 'switch-isolator', name: 'Isolator',        category: 'switches',   description: 'Isolator switch (e.g. for AC or hot water)' },
  { id: 'switch-rcd',      name: 'RCD/RCBO',        category: 'switches',   description: 'Residual current device / breaker' },
  // Lighting
  { id: 'light-ceiling',   name: 'Ceiling Light',   category: 'lighting',   description: 'Surface-mount ceiling fixture' },
  { id: 'light-recessed',  name: 'Downlight',       category: 'lighting',   description: 'Recessed downlight / can light' },
  { id: 'light-fan',       name: 'Ceiling Fan',     category: 'lighting',   description: 'Ceiling fan with light' },
  { id: 'light-exhaust',   name: 'Exhaust Fan',     category: 'lighting',   description: 'Exhaust / ventilation fan' },
  { id: 'light-outdoor',   name: 'Outdoor Light',   category: 'lighting',   description: 'External wall / garden light' },
  { id: 'light-flood',     name: 'Flood Light',     category: 'lighting',   description: 'Floodlight / security spotlight' },
  { id: 'light-pendant',   name: 'Pendant',         category: 'lighting',   description: 'Pendant / hanging light' },
  // Appliances
  { id: 'appliance-oven',       name: 'Oven',          category: 'appliances', description: 'Built-in electric oven' },
  { id: 'appliance-cooktop',    name: 'Cooktop',        category: 'appliances', description: 'Induction / electric cooktop' },
  { id: 'appliance-hotwater',   name: 'Hot Water Sys.', category: 'appliances', description: 'Hot water system / cylinder' },
  { id: 'appliance-ac-indoor',  name: 'AC Indoor',      category: 'appliances', description: 'Split system AC indoor unit' },
  { id: 'appliance-ac-outdoor', name: 'AC Outdoor',     category: 'appliances', description: 'Split system AC outdoor unit' },
  // Boards & safety
  { id: 'panel',           name: 'Switchboard',     category: 'boards',     description: 'Main switchboard / consumer unit' },
  { id: 'subpanel',        name: 'Sub-board',       category: 'boards',     description: 'Sub-switchboard / distribution board' },
  { id: 'smoke-detector',  name: 'Smoke Detector',  category: 'boards',     description: 'Smoke alarm / detector' },
  { id: 'co-detector',     name: 'CO Detector',     category: 'boards',     description: 'Carbon monoxide detector' },
  { id: 'heat-detector',   name: 'Heat Detector',   category: 'boards',     description: 'Heat detector' },
  // Data & comms
  { id: 'data-point',      name: 'Data Point',      category: 'comms',      description: 'Network / Ethernet data point' },
  { id: 'tv-point',        name: 'TV Point',        category: 'comms',      description: 'TV aerial / coax point' },
  { id: 'doorbell',        name: 'Doorbell',        category: 'comms',      description: 'Doorbell / intercom' },
];

// Symbol radius in world units (cm)
export const SYMBOL_RADIUS = 18;

/**
 * Draw an electrical symbol on a canvas context.
 * cx/cy are screen-space coordinates. r is radius in screen pixels.
 */
export function drawElectricalSymbol(
  ctx: CanvasRenderingContext2D,
  type: ElectricalSymbolType,
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
    case 'outlet-duplex':   drawOutletDuplex(ctx, r); break;
    case 'outlet-gfci':     drawOutletGFCI(ctx, r); break;
    case 'outlet-240v':     drawOutletDedicated(ctx, r, '~'); break;
    case 'outlet-oven':     drawOutletDedicated(ctx, r, 'OV'); break;
    case 'outlet-cooktop':  drawOutletDedicated(ctx, r, 'CT'); break;
    case 'outlet-hotwater': drawOutletDedicated(ctx, r, 'HW'); break;
    case 'outlet-dryer':    drawOutletDedicated(ctx, r, 'DR'); break;
    case 'outlet-ev':       drawOutletEV(ctx, r); break;
    case 'switch-single':   drawSwitch(ctx, r, ''); break;
    case 'switch-3way':     drawSwitch(ctx, r, '2'); break;
    case 'switch-4way':     drawSwitch(ctx, r, 'I'); break;
    case 'switch-dimmer':   drawSwitch(ctx, r, 'D'); break;
    case 'switch-isolator': drawSwitchIsolator(ctx, r); break;
    case 'switch-rcd':      drawRCD(ctx, r); break;
    case 'light-ceiling':   drawLightCeiling(ctx, r); break;
    case 'light-recessed':  drawLightRecessed(ctx, r); break;
    case 'light-fan':       drawLightFan(ctx, r); break;
    case 'light-exhaust':   drawExhaustFan(ctx, r); break;
    case 'light-outdoor':   drawLightOutdoor(ctx, r); break;
    case 'light-flood':     drawLightFlood(ctx, r); break;
    case 'light-pendant':   drawLightPendant(ctx, r); break;
    case 'appliance-oven':       drawApplianceBox(ctx, r, 'OVN'); break;
    case 'appliance-cooktop':    drawApplianceCooktop(ctx, r); break;
    case 'appliance-hotwater':   drawApplianceHotwater(ctx, r); break;
    case 'appliance-ac-indoor':  drawApplianceAC(ctx, r, 'IN'); break;
    case 'appliance-ac-outdoor': drawApplianceAC(ctx, r, 'OUT'); break;
    case 'panel':      drawPanel(ctx, r, 'SB'); break;
    case 'subpanel':   drawPanel(ctx, r, 'DB'); break;
    case 'smoke-detector': drawDetector(ctx, r, 'SD', false); break;
    case 'co-detector':    drawDetector(ctx, r, 'CO', false); break;
    case 'heat-detector':  drawDetector(ctx, r, 'HD', true); break;
    case 'data-point':  drawCommsPoint(ctx, r, 'D'); break;
    case 'tv-point':    drawCommsPoint(ctx, r, 'TV'); break;
    case 'doorbell':    drawDoorbell(ctx, r); break;
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

// ---- Outlets ----

function drawOutletDuplex(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  const slotW = r * 0.45, slotH = r * 0.12;
  ctx.lineWidth = Math.max(1, r * 0.1);
  for (const dy of [-r * 0.3, r * 0.3]) {
    ctx.beginPath();
    ctx.moveTo(-slotW, dy - slotH);
    ctx.lineTo(-slotW, dy + slotH);
    ctx.moveTo(slotW * 0.2, dy - slotH);
    ctx.lineTo(slotW * 0.2, dy + slotH);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, 0);
  ctx.lineTo(r * 0.6, 0);
  ctx.stroke();
}

function drawOutletGFCI(ctx: CanvasRenderingContext2D, r: number) {
  drawOutletDuplex(ctx, r);
  ctx.beginPath();
  ctx.arc(0, -r * 0.65, r * 0.2, 0, Math.PI, true);
  ctx.stroke();
}

function drawOutletDedicated(ctx: CanvasRenderingContext2D, r: number, tag: string) {
  circle(ctx, r);
  // Three horizontal lines
  const lw = r * 0.5;
  ctx.lineWidth = Math.max(1, r * 0.1);
  for (const dy of [-r * 0.35, 0, r * 0.35]) {
    ctx.beginPath();
    ctx.moveTo(-lw, dy);
    ctx.lineTo(lw, dy);
    ctx.stroke();
  }
  // Small tag in top right quadrant
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.38}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, r * 0.48, -r * 0.52);
}

function drawOutletEV(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.72}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EV', 0, 0);
}

// ---- Switches ----

function drawSwitch(ctx: CanvasRenderingContext2D, r: number, sub: string) {
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 1.0}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', sub ? -r * 0.2 : 0, 0);
  if (sub) {
    ctx.font = `bold ${r * 0.55}px sans-serif`;
    ctx.fillText(sub, r * 0.5, r * 0.25);
  }
  ctx.beginPath();
  ctx.moveTo(r * 0.6, -r * 0.6);
  ctx.lineTo(r * 1.1, -r * 1.1);
  ctx.stroke();
}

function drawSwitchIsolator(ctx: CanvasRenderingContext2D, r: number) {
  // Square with 'ISO' text
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.62}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ISO', 0, 0);
}

function drawRCD(ctx: CanvasRenderingContext2D, r: number) {
  // Rounded rect with 'RCD'
  ctx.beginPath();
  ctx.roundRect(-r, -r * 0.7, r * 2, r * 1.4, r * 0.25);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.62}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RCD', 0, 0);
}

// ---- Lighting ----

function drawLightCeiling(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.6); ctx.lineTo(r * 0.6, r * 0.6);
  ctx.moveTo(r * 0.6, -r * 0.6);  ctx.lineTo(-r * 0.6, r * 0.6);
  ctx.stroke();
}

function drawLightRecessed(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.fill();
}

function drawLightFan(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI * 2) / 3);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.2, r * 0.35, 0, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.fill();
}

function drawExhaustFan(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.9}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('F', 0, 0);
}

function drawLightOutdoor(ctx: CanvasRenderingContext2D, r: number) {
  // Circle with an 'O' and rays
  circle(ctx, r);
  // Rays at 4 diagonals
  const d = r * 0.65;
  const short = r * 0.25;
  ctx.lineWidth = Math.max(1, r * 0.08);
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    ctx.beginPath();
    ctx.moveTo(dx * (r + 2), dy * (r + 2));
    ctx.lineTo(dx * (r + 2 + short), dy * (r + 2 + short));
    ctx.stroke();
  }
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.65}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('O', 0, 0);
}

function drawLightFlood(ctx: CanvasRenderingContext2D, r: number) {
  // Square bracket shape with beam lines
  ctx.lineWidth = Math.max(1, r * 0.09);
  // Body (small square)
  ctx.fillRect(-r * 0.55, -r * 0.55, r * 1.1, r * 1.1);
  ctx.strokeRect(-r * 0.55, -r * 0.55, r * 1.1, r * 1.1);
  // Beam lines going right
  for (const dy of [-r * 0.35, 0, r * 0.35]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.55, dy);
    ctx.lineTo(r * 1.1, dy);
    ctx.stroke();
  }
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.52}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FL', -r * 0.1, 0);
}

function drawLightPendant(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  // Vertical drop line from top
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(0, -r * 1.45);
  ctx.stroke();
  // Small horizontal bar at top of drop
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 1.45);
  ctx.lineTo(r * 0.3, -r * 1.45);
  ctx.stroke();
  // X inside circle
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.5); ctx.lineTo(r * 0.5, r * 0.5);
  ctx.moveTo(r * 0.5, -r * 0.5);  ctx.lineTo(-r * 0.5, r * 0.5);
  ctx.stroke();
}

// ---- Appliances ----

function drawApplianceBox(ctx: CanvasRenderingContext2D, r: number, tag: string) {
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.62}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, 0, 0);
}

function drawApplianceCooktop(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.strokeRect(-r, -r, r * 2, r * 2);
  // 4 burner circles
  const off = r * 0.42;
  ctx.lineWidth = Math.max(1, r * 0.07);
  for (const [dx, dy] of [[-1,-1],[1,-1],[-1,1],[1,1]]) {
    ctx.beginPath();
    ctx.arc(dx * off, dy * off, r * 0.28, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawApplianceHotwater(ctx: CanvasRenderingContext2D, r: number) {
  // Tall cylinder shape
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
  ctx.font = `bold ${r * 0.5}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('HW', 0, 0);
}

function drawApplianceAC(ctx: CanvasRenderingContext2D, r: number, tag: string) {
  // Wide rectangle
  ctx.beginPath();
  ctx.roundRect(-r, -r * 0.6, r * 2, r * 1.2, r * 0.15);
  ctx.fill();
  ctx.stroke();
  // Horizontal lines (louvres)
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
  ctx.fillText('AC ' + tag, 0, r * 0.32);
}

// ---- Boards & Safety ----

function drawPanel(ctx: CanvasRenderingContext2D, r: number, tag: string) {
  ctx.fillRect(-r * 0.7, -r, r * 1.4, r * 2);
  ctx.strokeRect(-r * 0.7, -r, r * 1.4, r * 2);
  ctx.lineWidth = Math.max(1, r * 0.06);
  for (let i = 1; i < 4; i++) {
    const y = -r + (i * r * 2) / 4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, y); ctx.lineTo(r * 0.7, y);
    ctx.stroke();
  }
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.42}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(tag, 0, r * 0.45);
}

function drawDetector(ctx: CanvasRenderingContext2D, r: number, label: string, heat: boolean) {
  circle(ctx, r);
  if (heat) {
    // Outer ring for heat detector
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.62}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 0);
}

// ---- Comms ----

function drawCommsPoint(ctx: CanvasRenderingContext2D, r: number, tag: string) {
  // Diamond / square rotated 45°
  ctx.save();
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-r * 0.72, -r * 0.72, r * 1.44, r * 1.44);
  ctx.strokeRect(-r * 0.72, -r * 0.72, r * 1.44, r * 1.44);
  ctx.restore();
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.55}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, 0, 0);
}

function drawDoorbell(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  // Bell shape inside
  const bw = r * 0.55, bh = r * 0.5;
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.beginPath();
  ctx.arc(0, -r * 0.1, bw, Math.PI, 0);
  ctx.lineTo(bw, r * 0.35);
  ctx.lineTo(-bw, r * 0.35);
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.fill();
  // Clapper
  ctx.beginPath();
  ctx.arc(0, r * 0.45, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
}
