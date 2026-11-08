import type { TradeType, TradeSymbolType } from '$lib/models/types';
import { electricalSymbolDefs, drawElectricalSymbol, SYMBOL_RADIUS, type ElectricalSymbolDef } from './electricalSymbols';
import { plumbingSymbolDefs, plumbingCategories, drawPlumbingSymbol, type PlumbingSymbolDef } from './plumbingSymbols';
import { hvacSymbolDefs, hvacCategories, drawHvacSymbol, type HvacSymbolDef } from './hvacSymbols';
import { securitySymbolDefs, securityCategories, drawSecuritySymbol, type SecuritySymbolDef } from './securitySymbols';

export { SYMBOL_RADIUS };

const electricalCategories: ElectricalSymbolDef['category'][] = ['outlets', 'switches', 'lighting', 'appliances', 'boards', 'comms'];

export interface TradeMeta {
  label: string;
  color: string;
}

export const tradeMeta: Record<TradeType, TradeMeta> = {
  electrical: { label: 'Electrical', color: '#2563eb' },
  plumbing:   { label: 'Plumbing',   color: '#0891b2' },
  hvac:       { label: 'HVAC',       color: '#16a34a' },
  security:   { label: 'Security',   color: '#7c3aed' },
};

export const tradeTypes: TradeType[] = ['electrical', 'plumbing', 'hvac', 'security'];

export function getSymbolDefs(trade: TradeType): (ElectricalSymbolDef | PlumbingSymbolDef | HvacSymbolDef | SecuritySymbolDef)[] {
  switch (trade) {
    case 'plumbing': return plumbingSymbolDefs;
    case 'hvac':     return hvacSymbolDefs;
    case 'security': return securitySymbolDefs;
    default:         return electricalSymbolDefs;
  }
}

export function getCategories(trade: TradeType): string[] {
  switch (trade) {
    case 'plumbing': return plumbingCategories;
    case 'hvac':     return hvacCategories;
    case 'security': return securityCategories;
    default:         return electricalCategories;
  }
}

export function drawTradeSymbol(
  ctx: CanvasRenderingContext2D,
  trade: TradeType,
  type: TradeSymbolType,
  cx: number,
  cy: number,
  r: number,
  rotation: number,
  selected: boolean,
  label?: string
) {
  switch (trade) {
    case 'plumbing': return drawPlumbingSymbol(ctx, type as never, cx, cy, r, rotation, selected, label);
    case 'hvac':     return drawHvacSymbol(ctx, type as never, cx, cy, r, rotation, selected, label);
    case 'security': return drawSecuritySymbol(ctx, type as never, cx, cy, r, rotation, selected, label);
    default:         return drawElectricalSymbol(ctx, type as never, cx, cy, r, rotation, selected, label);
  }
}
