<script lang="ts">
  import { activeFloor, currentProject } from '$lib/stores/project';
  import { projectSettings, formatArea, formatLength } from '$lib/stores/settings';
  import { detectRooms } from '$lib/utils/roomDetection';
  import { electricalSymbolDefs } from '$lib/data/electricalSymbols';
  import type { Floor, Room, Wall, RoomCategory } from '$lib/models/types';

  let floor = $state<Floor | null>(null);
  let settings = $state($projectSettings);
  let project = $state($currentProject);

  activeFloor.subscribe((f) => { floor = f; });
  projectSettings.subscribe((s) => { settings = s; });
  currentProject.subscribe((p) => { project = p; });

  // Always detect fresh from walls, then overlay stored metadata by ID
  let allRooms = $derived.by(() => {
    if (!floor) return [];
    const fresh = detectRooms(floor.walls);
    return fresh.map(r => {
      const rSet = new Set(r.walls);
      // Match by wall-set equality — ID is unstable (Date.now()), walls are stable
      const stored = floor!.rooms?.find(s =>
        s.walls.length === rSet.size && s.walls.every(w => rSet.has(w))
      );
      return stored ? { ...r, name: stored.name, color: stored.color, floorTexture: stored.floorTexture, roomType: stored.roomType } : r;
    });
  });

  let totalArea = $derived(allRooms.reduce((sum: number, r: Room) => sum + r.area, 0));

  let roomsByCategory = $derived.by(() => {
    const cats: Record<RoomCategory, Room[]> = { indoor: [], outdoor: [], garage: [], utility: [] };
    for (const r of allRooms) cats[r.roomType ?? 'indoor'].push(r);
    return cats;
  });

  let categoryTotals = $derived.by(() => {
    const labels: Record<RoomCategory, string> = { indoor: '🏠 Indoor', outdoor: '🌳 Outdoor', garage: '🚗 Garage', utility: '🔧 Utility' };
    return (Object.entries(roomsByCategory) as [RoomCategory, Room[]][])
      .filter(([, rooms]) => rooms.length > 0)
      .map(([cat, rooms]) => ({ category: cat, label: labels[cat], area: rooms.reduce((s: number, r: Room) => s + r.area, 0), count: rooms.length }));
  });

  let totalWalls = $derived(floor?.walls.length ?? 0);
  let totalDoors = $derived(floor?.doors.length ?? 0);
  let totalWindows = $derived(floor?.windows.length ?? 0);

  function calcWallLength(wall: Wall): number {
    if (wall.curvePoint) {
      let len = 0; const N = 20;
      let px = wall.start.x, py = wall.start.y;
      for (let i = 1; i <= N; i++) {
        const t = i / N, mt = 1 - t;
        const nx = mt*mt*wall.start.x + 2*mt*t*wall.curvePoint.x + t*t*wall.end.x;
        const ny = mt*mt*wall.start.y + 2*mt*t*wall.curvePoint.y + t*t*wall.end.y;
        len += Math.hypot(nx - px, ny - py); px = nx; py = ny;
      }
      return len;
    }
    return Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  }

  let totalWallLength = $derived((floor?.walls ?? []).reduce((s: number, w: Wall) => s + calcWallLength(w), 0));

  // Electrical summary
  let electricalViews = $derived(project?.tradeViews?.filter(v => v.trade === 'electrical') ?? []);
  let allSymbols = $derived(electricalViews.flatMap(v => v.symbols));

  let symbolCounts = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const s of allSymbols) counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
    return [...counts.entries()]
      .map(([type, count]) => ({ type, count, name: electricalSymbolDefs.find(d => d.id === type)?.name ?? type }))
      .sort((a, b) => b.count - a.count);
  });

  let symbolsByRoom = $derived.by(() => {
    const map = new Map<string, number>();
    for (const s of allSymbols) {
      const key = s.roomName ?? '(Unassigned)';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  });
</script>

<div class="space-y-3">
  <!-- Quick Stats -->
  <div class="grid grid-cols-2 gap-2">
    <div class="bg-blue-50 rounded-lg p-2 text-center">
      <div class="text-lg font-bold text-blue-700">{allRooms.length}</div>
      <div class="text-[10px] text-blue-500">Rooms</div>
    </div>
    <div class="bg-green-50 rounded-lg p-2 text-center">
      <div class="text-lg font-bold text-green-700">{formatArea(totalArea, settings.units)}</div>
      <div class="text-[10px] text-green-500">Total Area</div>
    </div>
    <div class="bg-amber-50 rounded-lg p-2 text-center">
      <div class="text-sm font-bold text-amber-700">{totalDoors}D / {totalWindows}W</div>
      <div class="text-[10px] text-amber-500">Doors / Windows</div>
    </div>
    <div class="bg-purple-50 rounded-lg p-2 text-center">
      <div class="text-sm font-bold text-purple-700">{formatLength(totalWallLength, settings.units)}</div>
      <div class="text-[10px] text-purple-500">Wall Length</div>
    </div>
  </div>

  <!-- Category Breakdown -->
  {#if categoryTotals.length > 0}
    <div>
      <h4 class="text-xs font-semibold text-gray-500 uppercase mb-1.5">By Category</h4>
      <div class="space-y-1">
        {#each categoryTotals as cat}
          <div class="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1.5">
            <span class="text-gray-700">{cat.label} <span class="text-gray-400">({cat.count})</span></span>
            <span class="font-medium text-gray-800">{formatArea(cat.area, settings.units)}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Per-Room Breakdown -->
  {#if allRooms.length > 0}
    <div>
      <h4 class="text-xs font-semibold text-gray-500 uppercase mb-1.5">Room Breakdown</h4>
      <div class="space-y-0.5">
        {#each allRooms as room}
          {@const pct = totalArea > 0 ? (room.area / totalArea * 100) : 0}
          <div class="flex items-center gap-1.5 text-xs px-1 py-1">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-gray-700 truncate">{room.name}</span>
                <span class="text-gray-500 ml-1 shrink-0">{formatArea(room.area, settings.units)}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-1 mt-0.5">
                <div class="bg-blue-400 h-1 rounded-full" style="width: {Math.min(pct, 100)}%"></div>
              </div>
            </div>
            <span class="text-[10px] text-gray-400 w-8 text-right shrink-0">{pct.toFixed(0)}%</span>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <p class="text-xs text-gray-400 text-center py-4">No rooms detected yet.<br/>Draw walls to create rooms.</p>
  {/if}

  <!-- Electrical Summary -->
  {#if allSymbols.length > 0}
    <div class="border-t border-gray-100 pt-3">
      <h4 class="text-xs font-semibold text-gray-500 uppercase mb-1.5">⚡ Electrical</h4>
      <div class="bg-blue-50 rounded-lg px-2 py-1.5 mb-2 flex items-center justify-between">
        <span class="text-xs text-blue-700">Total Symbols</span>
        <span class="text-sm font-bold text-blue-700">{allSymbols.length}</span>
      </div>

      <!-- By type -->
      <div class="space-y-0.5 mb-2">
        {#each symbolCounts as s}
          <div class="flex items-center justify-between text-xs px-1 py-0.5">
            <span class="text-gray-600 truncate">{s.name}</span>
            <span class="font-medium text-gray-800 ml-2 shrink-0">×{s.count}</span>
          </div>
        {/each}
      </div>

      <!-- By room -->
      {#if symbolsByRoom.length > 0}
        <h5 class="text-[10px] font-semibold text-gray-400 uppercase mb-1">By Room</h5>
        <div class="space-y-0.5">
          {#each symbolsByRoom as [roomName, count]}
            <div class="flex items-center justify-between text-xs px-1 py-0.5">
              <span class="text-gray-600 truncate">{roomName}</span>
              <span class="font-medium text-gray-800 ml-2 shrink-0">{count}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
