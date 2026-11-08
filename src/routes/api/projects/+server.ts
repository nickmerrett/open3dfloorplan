import { json } from '@sveltejs/kit';
import db from '$lib/server/db';
import type { Project } from '$lib/models/types';

export function GET() {
  const rows = db.prepare('SELECT id, name, updated_at FROM projects ORDER BY updated_at DESC').all() as { id: string; name: string; updated_at: string }[];
  return json(rows.map(r => ({ id: r.id, name: r.name, updatedAt: r.updated_at })));
}

export async function POST({ request }) {
  const project: Project = await request.json();
  db.prepare(`
    INSERT INTO projects (id, name, data, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, data = excluded.data, updated_at = excluded.updated_at
  `).run(project.id, project.name, JSON.stringify(project), new Date().toISOString());
  return json({ ok: true });
}
