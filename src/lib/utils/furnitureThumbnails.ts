/**
 * Furniture Thumbnail Generator
 * Renders GLB models to small preview images using an offscreen Three.js renderer.
 * Cached as data URLs after first render.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const SIZE = 128;
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;

function ensureRenderer() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(SIZE, SIZE);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);

  scene = new THREE.Scene();

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(2, 4, 3);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4);
  fill.position.set(-2, 1, -1);
  scene.add(fill);

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
}

const loader = new GLTFLoader();

function loadModel(file: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    loader.load(
      `/models/${file}.glb`,
      (gltf) => resolve(gltf.scene),
      undefined,
      reject
    );
  });
}

export function getThumbnail(file: string): string | null {
  return cache.get(file) ?? null;
}

export async function generateThumbnail(file: string): Promise<string | null> {
  if (cache.has(file)) return cache.get(file)!;
  if (pending.has(file)) return pending.get(file)!;

  const promise = (async () => {
    try {
      ensureRenderer();
      const model = await loadModel(file);

      // Clear scene of previous models (keep lights)
      const toRemove: THREE.Object3D[] = [];
      scene!.children.forEach(c => { if (!(c instanceof THREE.Light)) toRemove.push(c); });
      toRemove.forEach(c => scene!.remove(c));

      scene!.add(model);

      // Fit camera to model
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim === 0) return null;

      const pad = 1.3;
      const half = (maxDim * pad) / 2;
      camera!.left = -half;
      camera!.right = half;
      camera!.top = half;
      camera!.bottom = -half;
      camera!.near = 0.01;
      camera!.far = maxDim * 10;

      // Isometric-ish angle
      const dist = maxDim * 2;
      camera!.position.set(
        center.x + dist * 0.7,
        center.y + dist * 0.8,
        center.z + dist * 0.7
      );
      camera!.lookAt(center);
      camera!.updateProjectionMatrix();

      renderer!.render(scene!, camera!);
      const dataUrl = renderer!.domElement.toDataURL('image/png');

      scene!.remove(model);
      cache.set(file, dataUrl);
      pending.delete(file);
      return dataUrl;
    } catch {
      pending.delete(file);
      return null;
    }
  })();

  pending.set(file, promise);
  return promise;
}

/** Get the GLB filename for a catalog ID (mirrors MODEL_MAP keys) */
const MODEL_FILES: Record<string, string> = {
  // Living Room
  sofa: 'loungeSofaLong',
  loveseat: 'loungeSofa',
  chair: 'loungeChair',
  coffee_table: 'tableCoffee',
  tv_stand: 'cabinetTelevision',
  bookshelf: 'bookcaseOpen',
  side_table: 'sideTable',
  fireplace: 'fireplace',
  wood_stove: 'woodStove',
  television: 'televisionModern',
  storage: 'bookcaseClosed',
  table: 'tableCross',
  ottoman_lr: 'loungeSofaOttoman',
  ac_wall: 'ac_wall',
  ac_floor: 'ac_floor',

  // Bedroom
  bed_king: 'bedDouble',
  bed_queen: 'bedDouble',
  bed_double: 'bedDouble',
  bed_single: 'bedSingle',
  bed_twin: 'bedSingle',
  nightstand: 'cabinetBedDrawerTable',
  dresser: 'cabinetBedDrawer',
  wardrobe: 'bookcaseClosedDoors',
  linen_cupboard: 'bookcaseClosed',
  ottoman: 'loungeSofaOttoman',

  // Kitchen
  stove: 'kitchenStove',
  cooktop: 'kitchenStoveElectric',
  cooktop_90: 'kitchenStoveElectric',
  oven: 'kitchenStoveElectric',
  range_hood: 'hoodModern',
  fridge: 'kitchenFridge',
  fridge_french: 'kitchenFridgeLarge',
  sink_k: 'kitchenSink',
  sink_k_double: 'kitchenSink',
  counter: 'kitchenCabinet',
  counter_900: 'kitchenCabinet',
  kitchen_island: 'kitchenBar',
  dishwasher: 'kitchenCabinetDrawer',
  microwave: 'kitchenMicrowave',

  // Bathroom
  toilet: 'toilet',
  toilet_wall: 'toiletSquare',
  bathtub: 'bathtub',
  bathtub_freestanding: 'bathtub',
  shower_900: 'shower',
  shower: 'shower',
  sink_b: 'bathroomSink',
  vanity_600: 'bathroomSink',
  vanity_1200: 'bathroomCabinet',
  vanity_1500: 'bathroomCabinetDrawer',

  // Laundry
  washer: 'washer',
  dryer: 'dryer',
  washer_dryer: 'washerDryerStacked',
  laundry_bench: 'kitchenCabinet',
  laundry_tub: 'laundryTub',
  ironing_board: 'ironingBoard',

  // Office
  desk: 'desk',
  desk_corner: 'desk',
  desk_standing: 'desk',
  office_chair: 'chairDesk',
  filing_cabinet: 'bookcaseClosed',

  // Dining
  dining_table_4: 'tableCross',
  dining_table: 'tableCross',
  dining_table_8: 'table',
  dining_table_round: 'tableRound',
  dining_table_round_6: 'tableRound',
  dining_chair: 'chair',
  bar_stool: 'stoolBar',

  // Decor
  potted_plant: 'pottedPlant',
  floor_plant: 'plantSmall1',
  hanging_plant: 'pottedPlant',
  rug: 'rugRectangle',
  round_rug: 'rugRound',
  runner_rug: 'rugRounded',
  mirror: 'bathroomMirror',
  wall_art: 'wall_art',
  clock: 'clock',
  curtain: 'curtain',
  sheer_curtain: 'curtain',
  string_lights: 'string_lights',

  // Lighting
  floor_lamp: 'lampRoundFloor',
  table_lamp: 'lampRoundTable',
  ceiling_light: 'lampSquareCeiling',
  wall_sconce: 'lampWall',
  wall_sconce_outdoor: 'lampWall',
  chandelier: 'chandelier',
  pendant_light: 'pendant_light',
  recessed_light: 'lampSquareCeiling',
  lamp_post: 'lamp_post',
  lamp_post_double: 'lamp_post',
  bollard_light: 'bollard_light',
  flood_light: 'flood_light',
  spot_light_outdoor: 'flood_light',
  solar_path_light: 'bollard_light',

  // Office extras
  printer: 'printer',
  tool_cabinet: 'bookcaseClosed',

  // Outdoor Furniture
  fire_pit: 'outdoor_campfire_stones',
  campfire: 'outdoor_campfire_logs',
  tent: 'outdoor_tent_detailedOpen',
  outdoor_sign: 'outdoor_sign',
  outdoor_pot_large: 'outdoor_pot_large',
  outdoor_pot_small: 'outdoor_pot_small',
  bench_outdoor: 'bench',
  patio_chair: 'loungeChairRelax',
  patio_table: 'tableCoffeeGlass',
  lounger: 'loungeChairRelax',
  umbrella: 'umbrella',
  bbq_grill: 'bbq_grill',
  picnic_table: 'tableCross',

  // Landscaping — Trees
  tree_oak: 'outdoor_tree_oak',
  tree_default: 'outdoor_tree_default',
  tree_detailed: 'outdoor_tree_detailed',
  tree_pine: 'outdoor_tree_pineRoundA',
  tree_pine_tall: 'outdoor_tree_pineTallA_detailed',
  tree_palm: 'outdoor_tree_palm',
  tree_palm_bend: 'outdoor_tree_palmBend',
  tree_palm_tall: 'outdoor_tree_palmTall',
  tree_fat: 'outdoor_tree_fat',
  tree_simple: 'outdoor_tree_simple',
  tree_thin: 'outdoor_tree_thin',
  tree_tall: 'outdoor_tree_tall',
  tree_cone: 'outdoor_tree_cone',
  tree_blocky: 'outdoor_tree_blocks',
  tree_small: 'outdoor_tree_small',

  // Landscaping — Bushes & Plants
  bush: 'outdoor_plant_bush',
  bush_detailed: 'outdoor_plant_bushDetailed',
  bush_large: 'outdoor_plant_bushLarge',
  bush_large_triangle: 'outdoor_plant_bushLargeTriangle',
  bush_small: 'outdoor_plant_bushSmall',
  bush_triangle: 'outdoor_plant_bushTriangle',
  cactus_short: 'outdoor_cactus_short',
  cactus_tall: 'outdoor_cactus_tall',
  hanging_moss: 'outdoor_hanging_moss',

  // Landscaping — Flowers
  flower_purple: 'outdoor_flower_purpleA',
  flower_red: 'outdoor_flower_redA',
  flower_yellow: 'outdoor_flower_yellowA',
  flower_purple_b: 'outdoor_flower_purpleB',
  flower_red_b: 'outdoor_flower_redB',
  flower_yellow_b: 'outdoor_flower_yellowB',
  lily: 'outdoor_lily_large',

  // Landscaping — Grass
  grass_tuft: 'outdoor_grass',
  grass_large: 'outdoor_grass_large',
  grass_leafs: 'outdoor_grass_leafs',
  grass_leafs_large: 'outdoor_grass_leafsLarge',

  // Landscaping — Rocks & Stones
  rock_large: 'outdoor_rock_largeA',
  rock_large_b: 'outdoor_rock_largeB',
  rock_tall: 'outdoor_rock_tallA',
  rock_small: 'outdoor_rock_smallA',
  rock_small_b: 'outdoor_rock_smallB',
  stone_large: 'outdoor_stone_largeA',
  stone_tall: 'outdoor_stone_tallA',

  // Landscaping — Misc
  mushroom_red: 'outdoor_mushroom_red',
  mushroom_group: 'outdoor_mushroom_redGroup',
  mushroom_tan: 'outdoor_mushroom_tan',
  log_single: 'outdoor_log',
  log_large: 'outdoor_log_large',
  log_stack: 'outdoor_log_stack',
  stump_old: 'outdoor_stump_old',
  stump_round: 'outdoor_stump_round',
  corn: 'outdoor_crops_cornStageD',
  pumpkin: 'outdoor_crop_pumpkin',
  statue_column: 'outdoor_statue_column',
  statue: 'outdoor_statue_column',
  obelisk: 'outdoor_statue_obelisk',
  boulder: 'outdoor_rock_largeA',

  // Fencing
  fence_simple: 'outdoor_fence_simple',
  fence_planks: 'outdoor_fence_planks',
  fence_gate: 'outdoor_fence_gate',
  fence_corner: 'outdoor_fence_corner',
  picket_fence: 'outdoor_fence_planks',
  metal_fence: 'outdoor_fence_simple',

  // Garden structures & features
  planter_box: 'planter_box',
  raised_bed: 'raised_bed',
  raised_garden_bed: 'raised_bed',
  flower_bed: 'raised_bed',
  sandbox: 'sandbox',
  bird_bath: 'bird_bath',
  fountain: 'fountain',
  trellis: 'trellis',
  mailbox: 'mailbox',
  rain_barrel: 'rain_barrel',
  compost_bin: 'compost_bin',
  workbench: 'bench',

  // Pools & outdoor water
  pool_rectangular: 'pool_rectangular',
  pool_round: 'pool_round',
  pool_kidney: 'pool_rectangular',
  pool_lshaped: 'pool_rectangular',
  hot_tub: 'hot_tub',
  pool_ladder: 'pool_rectangular',
  pool_lounge: 'loungeChairRelax',
  diving_board: 'pool_rectangular',

  // Structures
  shed: 'shed',
  gazebo: 'gazebo',
  pergola: 'pergola',
  arbor: 'pergola',
  greenhouse: 'greenhouse',
  greenhouse_small: 'greenhouse',
  trellis_arch: 'trellis',
  hedge_row: 'outdoor_plant_bushLarge',

  // Vehicles
  car_sedan: 'car_sedan',
  car_suv: 'car_suv',
  bike: 'bike',
  motorcycle: 'bike',

  // Surfaces (flat slabs)
  deck_patio: 'deck_slab',
  driveway: 'deck_slab',
  lawn_large: 'lawn_slab',
  lawn_rect: 'lawn_slab',
  lawn_square: 'lawn_slab',
  gravel_area: 'deck_slab',
  path_straight: 'deck_slab',
  path_wide: 'deck_slab',
  patio_stone: 'deck_slab',
  stepping_stones: 'deck_slab',
};

export function getModelFile(catalogId: string): string | null {
  return MODEL_FILES[catalogId] ?? null;
}

/** Preload all thumbnails */
export function preloadThumbnails(): void {
  const files = new Set(Object.values(MODEL_FILES));
  for (const file of files) {
    generateThumbnail(file);
  }
}
