import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadLocalWorkspace,
  saveLocalMutation,
} from '../lib/local-workspace.ts';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('offline workspace seeds the semester schedule and persists mutations locally', () => {
  globalThis.localStorage = memoryStorage();
  const first = loadLocalWorkspace();
  assert.equal(first.data.classes.length, 6);
  assert.equal(
    first.data.classes.flatMap((c) => c.calendarSchedules ?? []).length,
    10,
  );
  assert.equal(
    first.data.classes[0].calendarSchedules[0].startDate,
    '2026-09-08',
  );
  assert.equal(
    first.data.classes[0].calendarSchedules[0].endDate,
    '2026-12-18',
  );

  const next = saveLocalMutation(first, {
    action: 'save',
    kind: 'assignments',
    record: {
      id: 'offline-assignment',
      title: 'Read chapter one',
      classId: first.data.classes[0].id,
      dueDate: '2026-09-10',
      priority: 'Medium',
      status: 'To do',
      description: '',
    },
  });
  const reloaded = loadLocalWorkspace();
  assert.equal(next.revision, 1);
  assert.equal(reloaded.data.assignments[0].title, 'Read chapter one');
  assert.equal(reloaded.revision, 1);
});
