import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const staticEntry = 'dist/client/index.html';
rmSync(staticEntry, { force: true });
const result = spawnSync(
  process.execPath,
  [resolve('node_modules/vinext/dist/cli.js'), 'build'],
  { stdio: 'inherit' },
);

// vinext can report a Windows libuv cleanup assertion (3221226505) after it
// completed every build step. Only accept that known post-build exit when the
// static renderer is present; all earlier failures remain blocking.
const postBuildCleanupExit =
  process.platform === 'win32' && result.status === 3221226505;
if (
  result.error ||
  (result.status !== 0 && (!postBuildCleanupExit || !existsSync(staticEntry)))
)
  process.exit(result.status ?? 1);
if (result.status !== 0)
  console.warn(
    `Build produced ${staticEntry}; ignoring post-build exit ${result.status ?? result.signal ?? 'unknown'}.`,
  );

// Static HTML normally assumes an HTTP origin and emits /_next URLs. Electron
// loads the same files from file://, so make generated assets relative to the
// bundled index before electron-builder packages them.
for (const file of [
  'dist/client/index.html',
  'dist/client/404.html',
  'dist/client/index.rsc',
]) {
  if (!existsSync(file)) continue;
  const content = readFileSync(file, 'utf8');
  writeFileSync(
    file,
    content
      .replaceAll('"/_next/', '"./_next/')
      .replaceAll("'/_next/", "'./_next/"),
  );
}
