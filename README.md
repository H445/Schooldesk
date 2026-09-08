# Schooldesk

A personal school workspace for classes, assignments, notes, and deadlines.

## Development

Requires Node 22.13 or newer. Install with `npm install`.

Workspace data is stored locally on the device. No account, server, or network connection is required.

## Desktop app

Schooldesk is distributed as an offline Electron desktop app. The desktop shell bundles the dashboard locally, stores classes, assignments, notes, and schedules on the device, and never contacts the hosted site or a remote API. It starts with a dark, resizable window and blocks network navigation.

Run `npm run desktop:package` to build the installer for the current operating system. The release workflow builds installer artifacts on native Windows, macOS, and Linux runners for tags such as `v1.0.0`.

The first launch includes the semester schedule provided for this workspace. Add and edit classes, assignments, notes, and calendar meetings directly on the device. Removing a class keeps its assignments and notes under General.

## Checks

- `npx tsc --noEmit`
- `node --experimental-strip-types --test tests/*.test.mjs`
- `npm run build`

The optional WebMCP interface exposes `read_school_workspace` and `create_school_assignment` when the browser provides `document.modelContext`. A supported WebMCP validation context was not available during implementation; these optional tools have not been verified in a live registry. They do not affect the normal interface.
