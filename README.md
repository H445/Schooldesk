# Schooldesk

A personal school workspace for classes, assignments, notes, and deadlines.

## Development

Requires Node 22.13 or newer. Install with `npm install`.

Initialize the local database with `npx wrangler d1 migrations apply DB --local --config wrangler.local.json`, then run `npm run dev`.

The database is stored in `.wrangler/state/`. User data is saved to Cloudflare D1 in production. The workspace is intended for a single owner and is privately hosted with Sites access controls. Do not make the site shared without first adding per-user data ownership.

New workspaces contain labeled example records. Start fresh removes the examples and preserves records the user has added or edited. Removing a class keeps its assignments and notes under General. Saves use revision checks to reject stale updates from other tabs.

## Checks

- `npx tsc --noEmit`
- `node --experimental-strip-types --test tests/workspace.test.mjs`
- Set `TEST_API_URL=http://localhost:3000` to include the local API test.
- `npm run build`

The optional WebMCP interface exposes `read_school_workspace` and `create_school_assignment` when the browser provides `document.modelContext`. A supported WebMCP validation context was not available during implementation; these optional tools have not been verified in a live registry. They do not affect the normal interface.

## Deploying

The Sites project is registered in `.openai/hosting.json`. Build the Worker and save and publish through Sites. Drizzle migrations are included in the deployment archive and applied by Sites.
