import { env } from 'cloudflare:workers';
import { makeExamples, type SchoolData } from '@/lib/school';
import { applyMutation } from '@/lib/actions';
const headers = { 'Cache-Control': 'no-store' };
async function readWorkspace() {
  await env.DB.prepare(
    'INSERT OR IGNORE INTO workspace (id, data, revision) VALUES (?, ?, 0)',
  )
    .bind('personal', JSON.stringify(makeExamples()))
    .run();
  const row = await env.DB.prepare(
    'SELECT data, revision FROM workspace WHERE id = ?',
  )
    .bind('personal')
    .first<{ data: string; revision: number }>();
  if (!row) throw new Error('Workspace is unavailable.');
  return { data: JSON.parse(row.data) as SchoolData, revision: row.revision };
}
export async function GET() {
  try {
    return Response.json(await readWorkspace(), { headers });
  } catch (error) {
    console.error('Workspace read failed', error);
    return Response.json(
      { error: 'Your workspace could not be loaded. Please try again.' },
      { status: 503, headers },
    );
  }
}
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: 'Request origin does not match.' },
      { status: 403, headers },
    );
  try {
    if (Number(request.headers.get('content-length') || 0) > 100000)
      return Response.json(
        { error: 'This item is too large.' },
        { status: 413, headers },
      );
    const bodyText = await request.text();
    if (bodyText.length > 100000)
      return Response.json(
        { error: 'This item is too large.' },
        { status: 413, headers },
      );
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return Response.json(
        { error: 'Invalid request.' },
        { status: 400, headers },
      );
    }
    const current = await readWorkspace();
    if (body.revision !== current.revision)
      return Response.json(
        {
          error:
            'Your workspace changed in another tab. The latest version has been loaded. Please try saving again.',
          ...current,
        },
        { status: 409, headers },
      );
    let data;
    try {
      data = applyMutation(current.data, body.mutation);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : 'Invalid item.' },
        { status: 400, headers },
      );
    }
    const result = await env.DB.prepare(
      'UPDATE workspace SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?',
    )
      .bind(JSON.stringify(data), 'personal', current.revision)
      .run();
    if (!result.meta.changes)
      return Response.json(
        {
          error: 'Your workspace changed in another tab. Please try again.',
          ...(await readWorkspace()),
        },
        { status: 409, headers },
      );
    return Response.json({ data, revision: current.revision + 1 }, { headers });
  } catch (error) {
    console.error('Workspace save failed', error);
    return Response.json(
      { error: 'Your changes could not be saved. Please try again.' },
      { status: 503, headers },
    );
  }
}
