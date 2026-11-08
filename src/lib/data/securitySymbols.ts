import type { SecuritySymbolType } from '$lib/models/types';

export interface SecuritySymbolDef {
  id: SecuritySymbolType;
  name: string;
  category: 'cameras' | 'sensors' | 'access' | 'alarms' | 'network';
  description: string;
}

export const securityCategories: SecuritySymbolDef['category'][] = ['cameras', 'sensors', 'access', 'alarms', 'network'];

export const securitySymbolDefs: SecuritySymbolDef[] = [
  // Cameras
  { id: 'camera-dome',     name: 'Dome Camera',   category: 'cameras', description: 'CCTV dome camera' },
  { id: 'camera-bullet',   name: 'Bullet Camera', category: 'cameras', description: 'CCTV bullet camera' },
  { id: 'camera-doorbell', name: 'Video Doorbell', category: 'cameras', description: 'Video doorbell camera' },
  // Sensors
  { id: 'motion-sensor', name: 'Motion Sensor',  category: 'sensors', description: 'PIR motion sensor' },
  { id: 'door-sensor',   name: 'Door/Win Sensor', category: 'sensors', description: 'Door / window contact sensor' },
  { id: 'glass-break',   name: 'Glass Break',    category: 'sensors', description: 'Glass break sensor' },
  // Access control
  { id: 'keypad',          name: 'Keypad',          category: 'access', description: 'Access control keypad' },
  { id: 'card-reader',     name: 'Card Reader',     category: 'access', description: 'Access card / fob reader' },
  { id: 'intercom',        name: 'Intercom',        category: 'access', description: 'Intercom station' },
  { id: 'electric-strike', name: 'Electric Strike', category: 'access', description: 'Electric door strike / lock' },
  // Alarms
  { id: 'alarm-panel',  name: 'Alarm Panel',  category: 'alarms', description: 'Alarm control panel' },
  { id: 'siren',        name: 'Siren',        category: 'alarms', description: 'Siren / strobe' },
  { id: 'panic-button', name: 'Panic Button', category: 'alarms', description: 'Panic / duress button' },
  // Network
  { id: 'network-switch', name: 'Network Switch', category: 'network', description: 'Network switch / rack' },
  { id: 'wifi-ap',        name: 'WiFi AP',        category: 'network', description: 'Wireless access point' },
  { id: 'nvr',            name: 'NVR',            category: 'network', description: 'Network video recorder' },
];

/**
 * Draw a security/low-voltage symbol on a canvas context.
 * cx/cy are screen-space coordinates. r is radius in screen pixels.
 */
export function drawSecuritySymbol(
  ctx: CanvasRenderingContext2D,
  type: SecuritySymbolType,
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
    case 'camera-dome':     drawCameraDome(ctx, r); break;
    case 'camera-bullet':   drawCameraBullet(ctx, r); break;
    case 'camera-doorbell': drawCameraDoorbell(ctx, r); break;
    case 'motion-sensor':   drawMotionSensor(ctx, r); break;
    case 'door-sensor':     drawDoorSensor(ctx, r); break;
    case 'glass-break':     drawGlassBreak(ctx, r); break;
    case 'keypad':          drawKeypad(ctx, r); break;
    case 'card-reader':     drawCardReader(ctx, r); break;
    case 'intercom':        drawIntercom(ctx, r); break;
    case 'electric-strike': drawElectricStrike(ctx, r); break;
    case 'alarm-panel':     drawTagBox(ctx, r, 'ALM'); break;
    case 'siren':           drawSiren(ctx, r); break;
    case 'panic-button':    drawTagCircle(ctx, r, '!', 1.1); break;
    case 'network-switch':  drawNetworkSwitch(ctx, r); break;
    case 'wifi-ap':         drawWifiAp(ctx, r); break;
    case 'nvr':             drawTagBoxWide(ctx, r, 'NVR'); break;
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
  ctx.fillRect(-r * 0.8, -r, r * 1.6, r * 2);
  ctx.strokeRect(-r * 0.8, -r, r * 1.6, r * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.42}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, 0, 0);
}

function drawTagBoxWide(ctx: CanvasRenderingContext2D, r: number, tag: string) {
  ctx.fillRect(-r, -r * 0.6, r * 2, r * 1.2);
  ctx.strokeRect(-r, -r * 0.6, r * 2, r * 1.2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.font = `bold ${r * 0.45}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, 0, 0);
}

// ---- Cameras ----

function drawCameraDome(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.fill();
}

function drawCameraBullet(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillRect(-r * 0.9, -r * 0.4, r * 1.4, r * 0.8);
  ctx.strokeRect(-r * 0.9, -r * 0.4, r * 1.4, r * 0.8);
  ctx.beginPath();
  ctx.arc(r * 0.5, 0, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.9, 0);
  ctx.lineTo(r * 1.3, -r * 0.5);
  ctx.lineTo(r * 1.3, r * 0.5);
  ctx.closePath();
  ctx.stroke();
}

function drawCameraDoorbell(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.roundRect(-r * 0.55, -r, r * 1.1, r * 2, r * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -r * 0.45, r * 0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, r * 0.35, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.fill();
}

// ---- Sensors ----

function drawMotionSensor(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.roundRect(-r * 0.6, -r, r * 1.2, r * 1.2, r * 0.15);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.arc(0, r * 0.2, r * 0.9, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawDoorSensor(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillRect(-r * 0.95, -r * 0.35, r * 0.6, r * 0.7);
  ctx.strokeRect(-r * 0.95, -r * 0.35, r * 0.6, r * 0.7);
  ctx.fillRect(r * 0.35, -r * 0.35, r * 0.6, r * 0.7);
  ctx.strokeRect(r * 0.35, -r * 0.35, r * 0.6, r * 0.7);
}

function drawGlassBreak(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.5);
  ctx.lineTo(-r * 0.1, -r * 0.1);
  ctx.lineTo(-r * 0.35, r * 0.1);
  ctx.lineTo(r * 0.05, r * 0.3);
  ctx.lineTo(r * 0.5, r * 0.5);
  ctx.stroke();
}

// ---- Access control ----

function drawKeypad(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.roundRect(-r * 0.8, -r, r * 1.6, r * 2, r * 0.15);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ctx.strokeStyle as string;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = -r * 0.4 + col * r * 0.4;
      const y = -r * 0.55 + row * r * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCardReader(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.roundRect(-r * 0.7, -r, r * 1.4, r * 2, r * 0.15);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.1);
  ctx.lineTo(r * 0.4, -r * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, r * 0.25);
  ctx.lineTo(r * 0.4, r * 0.25);
  ctx.stroke();
}

function drawIntercom(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  ctx.roundRect(-r * 0.8, -r, r * 1.6, r * 2, r * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.08);
  for (const dy of [-r * 0.4, -r * 0.1, r * 0.2]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, dy);
    ctx.lineTo(r * 0.45, dy);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, r * 0.6, r * 0.18, 0, Math.PI * 2);
  ctx.stroke();
}

function drawElectricStrike(ctx: CanvasRenderingContext2D, r: number) {
  ctx.strokeRect(-r * 0.2, -r, r * 0.4, r * 2);
  ctx.fillRect(-r, -r * 0.25, r * 0.8, r * 0.5);
  ctx.strokeRect(-r, -r * 0.25, r * 0.8, r * 0.5);
}

// ---- Alarms ----

function drawSiren(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  ctx.lineWidth = Math.max(1, r * 0.08);
  for (const rad of [r * 0.4, r * 0.65]) {
    ctx.beginPath();
    ctx.arc(0, 0, rad, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, rad, Math.PI * 0.65, Math.PI * 1.35);
    ctx.stroke();
  }
}

// ---- Network ----

function drawNetworkSwitch(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillRect(-r, -r * 0.5, r * 2, r);
  ctx.strokeRect(-r, -r * 0.5, r * 2, r);
  ctx.fillStyle = ctx.strokeStyle as string;
  for (let i = 0; i < 5; i++) {
    const x = -r * 0.8 + i * r * 0.4;
    ctx.fillRect(x, -r * 0.15, r * 0.2, r * 0.3);
  }
}

function drawWifiAp(ctx: CanvasRenderingContext2D, r: number) {
  circle(ctx, r);
  ctx.lineWidth = Math.max(1, r * 0.09);
  for (const rad of [r * 0.3, r * 0.55]) {
    ctx.beginPath();
    ctx.arc(0, r * 0.3, rad, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, r * 0.3, r * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = ctx.strokeStyle as string;
  ctx.fill();
}
