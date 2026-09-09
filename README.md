# Schooldesk

A personal school workspace for classes, assignments, notes, and deadlines.

## Development

Building from source requires Node 22.13 or newer. Install the development dependencies with `npm install`.

The packaged Schooldesk desktop app bundles Electron, including its own Node runtime. People installing a Windows, macOS, or Linux release do not need Node.js or npm installed.

Workspace data is stored locally on the device. No account, server, or network connection is required.

Notes and classes can hold up to 20 references each. Paste an `http` or `https` link, or attach a local file, image, or PDF (up to 3 MB per file). Images and PDFs show an inline preview; other files have a download action. References stay in the local workspace and are included in the normal workspace export format.

## Desktop app

Schooldesk is distributed as an offline Electron desktop app. The desktop shell bundles the dashboard locally, stores classes, assignments, notes, and schedules on the device, and never contacts the hosted site or a remote API. It starts with a dark, resizable window and blocks network navigation.

Run `npm run desktop:package` to build the installer for the current operating system. The release workflow builds installer artifacts on native Windows, macOS, and Linux runners for tags such as `v1.0.0`.

The first launch includes the semester schedule provided for this workspace. Add and edit classes, assignments, notes, and calendar meetings directly on the device. Removing a class keeps its assignments and notes under General.

### IDE testing

Run `npm install` once, then use `npm run desktop:test` to rebuild the offline renderer and open the Electron app. Rider can use the checked-in `Schooldesk Desktop` run configuration under `.run/`. In Visual Studio, open the folder with **File → Open → Folder**, choose the `Schooldesk Desktop (build + run)` debug target, and press **F5**. The **Build** menu also includes `Schooldesk: Build offline renderer` and `Schooldesk: Package desktop app` from `tasks.vs.json`.

## Checks

- `npx tsc --noEmit`
- `node --experimental-strip-types --test tests/*.test.mjs`
- `npm run build`
- `npm run desktop:smoke` (hidden Electron checks with a temporary profile under `outputs/`)
- `npm run benchmark` (median CPU timings for 2,000 classes, assignments, and notes)

The desktop renderer uses a single Vite client build with relative asset paths. Lists display 60 records per page, and calendar cells show four meetings before linking to the full day's agenda. Search still covers all records and the complete text of notes. Saving keeps the existing local workspace format and reports success only after the local write succeeds.

Tailwind sources in `app/globals.css` list the components used by this renderer, so the unused UI library does not add CSS to the desktop bundle. Add new renderer components to those sources when introducing them.
