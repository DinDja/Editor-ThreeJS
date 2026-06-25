import type { DataCollection, DataSchema } from '@/lib/data-model/types';
import type { ExportFile } from './types';

const routeName = (collection: DataCollection) =>
  collection.name.replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || collection.id;

const requiredFields = (collection: DataCollection) =>
  collection.fields.filter((field) => field.required && !field.system).map((field) => field.name);

const routeFile = (collection: DataCollection) => `import { NextRequest, NextResponse } from 'next/server';

const records = new Map<string, Record<string, unknown>>();
const requiredFields = ${JSON.stringify(requiredFields(collection))};

const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
const validate = (body: Record<string, unknown>) => {
  const missing = requiredFields.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');
  return missing.length > 0 ? { ok: false, missing } : { ok: true, missing: [] };
};

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const limit = Number(search.get('limit') ?? 50);
  const data = Array.from(records.values()).slice(0, Number.isFinite(limit) ? limit : 50);
  return json({ data, total: records.size });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return json({ error: 'INVALID_JSON' }, 400);
  const parsed = validate(body);
  if (!parsed.ok) return json({ error: 'VALIDATION_ERROR', missing: parsed.missing }, 400);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const record = { id, ...body, createdAt: now, updatedAt: now };
  records.set(id, record);
  return json({ data: record }, 201);
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => null) as { id?: string } | null;
  if (!body?.id || !records.has(body.id)) return json({ error: 'NOT_FOUND' }, 404);
  const current = records.get(body.id)!;
  const record = { ...current, ...body, id: body.id, updatedAt: new Date().toISOString() };
  records.set(body.id, record);
  return json({ data: record });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id || !records.has(id)) return json({ error: 'NOT_FOUND' }, 404);
  records.delete(id);
  return json({ ok: true });
}
`;

export const generateApiRouteFiles = (schema?: DataSchema): ExportFile[] => {
  if (!schema) return [];
  return schema.collections.map((collection) => ({
    path: `app/api/${routeName(collection)}/route.ts`,
    language: 'ts',
    content: routeFile(collection),
  }));
};
