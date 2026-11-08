import { json, error } from '@sveltejs/kit';
import db from '$lib/server/db';

export function GET({ params }) {
  const row = db.prepare('SELECT data FROM projects WHERE id = ?').get(params.id) as { data: string } | undefined;
  if (!row) throw error(404, 'Not found');
  const p = JSON.parse(row.data);
  p.createdAt = new Date(p.createdAt);
  p.updatedAt = new Date(p.updatedAt);
  for (const floor of (p.floors ?? [])) {
    if (!floor.rooms) floor.rooms = [];
    if (!floor.doors) floor.doors = [];
    if (!floor.windows) floor.windows = [];
    if (!floor.furniture) floor.furniture = [];
    if (!floor.stairs) floor.stairs = [];
    if (!floor.columns) floor.columns = [];
  }
  return json(p);
}

export function DELETE({ params }) {
  db.prepare('DELETE FROM projects WHERE id = ?').run(params.id);
  return json({ ok: true });
}
