export interface Point { x: number; y: number; }

export interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: number;
  height: number;
  color: string;
  /** Optional quadratic bezier control point for curved walls */
  curvePoint?: Point;
  texture?: string;
  /** Interior-specific overrides (if different from exterior) */
  interiorColor?: string;
  interiorTexture?: string;
  /** Exterior-specific overrides */
  exteriorColor?: string;
  exteriorTexture?: string;
}

export type RoomCategory = 'indoor' | 'outdoor' | 'garage' | 'utility';

export interface Room {
  id: string;
  name: string;
  walls: string[];
  floorTexture: string;
  area: number;
  color?: string;
  roomType?: RoomCategory;
  /** Custom label position offset from centroid (in world units) */
  labelOffset?: Point;
}

export interface Door {
  id: string;
  wallId: string;
  position: number; // 0-1 along wall
  width: number;
  height: number;
  type: 'single' | 'double' | 'sliding' | 'french' | 'pocket' | 'bifold';
  swingDirection: 'left' | 'right';
  flipSide: boolean; // flip which side of wall the door opens to (vertical flip)
}

export interface Window {
  id: string;
  wallId: string;
  position: number; // 0-1 along wall
  width: number;
  height: number;
  sillHeight: number;
  type: 'standard' | 'fixed' | 'casement' | 'sliding' | 'bay';
}

export interface FurnitureItem {
  id: string;
  catalogId: string;
  position: Point;
  rotation: number;
  scale: { x: number; y: number; z: number };
  // Per-item overrides (optional — falls back to catalog defaults)
  color?: string;
  width?: number;   // cm
  depth?: number;   // cm
  height?: number;  // cm
  material?: string; // material name/id
  locked?: boolean;
}

export interface ElementGroup {
  id: string;
  elementIds: string[];
}

export type StairType = 'straight' | 'l-shaped' | 'u-shaped' | 'spiral';

export interface Stair {
  id: string;
  position: Point;
  rotation: number;
  width: number;   // default 100cm
  depth: number;   // default 300cm
  riserCount: number; // default 14
  direction: 'up' | 'down';
  stairType: StairType; // default 'straight'
}

export interface Column {
  id: string;
  position: Point;
  rotation: number;
  shape: 'round' | 'square';
  diameter: number;  // cm (for round) or side length (for square)
  height: number;    // cm
  color: string;
}

export interface Measurement {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Annotation {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  offset: number; // perpendicular offset for dimension line (default 40)
}

export interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  rotation: number;
}

export interface GuideLine {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number; // world coordinate (x for vertical, y for horizontal)
}

export interface BackgroundImage {
  dataUrl: string;
  position: Point;
  scale: number;
  opacity: number;
  rotation: number;
  locked: boolean;
}

export interface Floor {
  id: string;
  name: string;
  level: number;
  walls: Wall[];
  rooms: Room[];
  doors: Door[];
  windows: Window[];
  furniture: FurnitureItem[];
  stairs: Stair[];
  columns: Column[];
  backgroundImage?: BackgroundImage;
  guides: GuideLine[];
  measurements: Measurement[];
  annotations: Annotation[];
  textAnnotations: TextAnnotation[];
  groups: ElementGroup[];
}

export type ElectricalSymbolType =
  // Power outlets
  | 'outlet-duplex'
  | 'outlet-gfci'
  | 'outlet-240v'
  | 'outlet-oven'
  | 'outlet-cooktop'
  | 'outlet-hotwater'
  | 'outlet-dryer'
  | 'outlet-ev'
  // Switches
  | 'switch-single'
  | 'switch-3way'
  | 'switch-4way'
  | 'switch-dimmer'
  | 'switch-isolator'
  | 'switch-rcd'
  // Lighting
  | 'light-ceiling'
  | 'light-recessed'
  | 'light-fan'
  | 'light-exhaust'
  | 'light-outdoor'
  | 'light-flood'
  | 'light-pendant'
  // Appliances
  | 'appliance-oven'
  | 'appliance-cooktop'
  | 'appliance-hotwater'
  | 'appliance-ac-indoor'
  | 'appliance-ac-outdoor'
  // Boards & Safety
  | 'panel'
  | 'subpanel'
  | 'smoke-detector'
  | 'co-detector'
  | 'heat-detector'
  // Data & comms
  | 'data-point'
  | 'tv-point'
  | 'doorbell';

export type PlumbingSymbolType =
  | 'sink-single'
  | 'sink-double'
  | 'sink-kitchen'
  | 'toilet'
  | 'bathtub'
  | 'shower'
  | 'dishwasher-point'
  | 'washer-point'
  | 'floor-drain'
  | 'cleanout'
  | 'valve-shutoff'
  | 'valve-hosebib'
  | 'gas-point'
  | 'water-meter'
  | 'hot-water-unit'
  | 'sump-pump';

export type HvacSymbolType =
  | 'ac-indoor'
  | 'ac-outdoor'
  | 'ducted-unit'
  | 'heat-pump'
  | 'furnace'
  | 'radiator'
  | 'underfloor-heating'
  | 'vent-supply'
  | 'vent-return'
  | 'vent-exhaust'
  | 'damper'
  | 'thermostat'
  | 'zone-controller'
  | 'co2-sensor';

export type SecuritySymbolType =
  | 'camera-dome'
  | 'camera-bullet'
  | 'camera-doorbell'
  | 'motion-sensor'
  | 'door-sensor'
  | 'glass-break'
  | 'keypad'
  | 'card-reader'
  | 'intercom'
  | 'electric-strike'
  | 'alarm-panel'
  | 'siren'
  | 'panic-button'
  | 'network-switch'
  | 'wifi-ap'
  | 'nvr';

export type TradeType = 'electrical' | 'plumbing' | 'hvac' | 'security';

export type TradeSymbolType = ElectricalSymbolType | PlumbingSymbolType | HvacSymbolType | SecuritySymbolType;

export interface TradeSymbol {
  id: string;
  type: TradeSymbolType;
  position: Point;
  rotation: number;
  label?: string;
  annotations?: Record<string, string>;
  roomId?: string;
  roomName?: string;
}

export interface TradeView {
  id: string;
  name: string;
  trade: TradeType;
  symbols: TradeSymbol[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  floors: Floor[];
  activeFloorId: string;
  createdAt: Date;
  updatedAt: Date;
  tradeViews?: TradeView[];
}
