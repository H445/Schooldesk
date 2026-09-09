import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performanceFixture } from '../tests/performance-fixture.mjs';
import { applyMutation } from '../lib/actions.ts';
import { meetingsOn } from '../lib/school.ts';
import { serializeWorkspace } from '../lib/local-workspace.ts';

const data = performanceFixture();
const mutation = {
  action: 'save',
  kind: 'assignments',
  record: { ...data.assignments[0], status: 'Done' },
};
function measure(fn) {
  for (let i = 0; i < 5; i++) fn();
  const samples = Array.from({ length: 25 }, () => {
    const start = performance.now();
    fn();
    return performance.now() - start;
  }).sort((a, b) => a - b);
  return Number(samples[12].toFixed(3));
}
function benchmark(mutate, meetings, serialize) {
  return {
    mutationMs: measure(() => mutate(data, mutation)),
    calendarMonthMs: measure(() => {
      for (let i = 1; i <= 30; i++)
        meetings(data.classes, `2026-09-${String(i).padStart(2, '0')}`);
    }),
    // Consume the entire string so lazy string concatenation cannot make the
    // cached serializer look artificially cheap. This excludes storage I/O.
    serializeAfterAssignmentEditMs: measure(() =>
      Buffer.byteLength(
        serialize({ data: mutate(data, mutation), revision: 1 }),
        'utf8',
      ),
    ),
  };
}
const result = {
  recordsPerCollection: 2000,
  optimized: benchmark(applyMutation, meetingsOn, serializeWorkspace),
};
if (process.argv[2]) {
  const baseline = resolve(process.argv[2]);
  const oldActions = await import(
    pathToFileURL(resolve(baseline, 'actions.ts')).href
  );
  const oldSchool = await import(
    pathToFileURL(resolve(baseline, 'school.ts')).href
  );
  result.baseline = benchmark(
    oldActions.applyMutation,
    oldSchool.meetingsOn,
    JSON.stringify,
  );
}
console.log(JSON.stringify(result, null, 2));
