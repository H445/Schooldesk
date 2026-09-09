import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadLocalWorkspace,
  saveLocalMutation,
  serializeWorkspace,
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

void test('cached serialization round-trips edits and preserves the v1 storage format', () => {
  globalThis.localStorage = memoryStorage();
  let state = loadLocalWorkspace();
  assert.deepEqual(JSON.parse(serializeWorkspace(state)), state);
  state = saveLocalMutation(state, {
    action: 'save',
    kind: 'notes',
    record: {
      id: 'n',
      title: 'Quotes " and unicode 日本語',
      content: 'Line one\nLine two',
      classId: '',
    },
  });
  assert.deepEqual(JSON.parse(serializeWorkspace(state)), state);
  state = saveLocalMutation(state, {
    action: 'save',
    kind: 'notes',
    record: { ...state.data.notes[0], content: 'Changed' },
  });
  assert.deepEqual(loadLocalWorkspace(), state);
  state = saveLocalMutation(state, {
    action: 'delete',
    kind: 'notes',
    id: 'n',
  });
  assert.deepEqual(loadLocalWorkspace(), state);
});

void test('a failed write leaves the saved snapshot intact and can be retried', () => {
  const storage = memoryStorage();
  globalThis.localStorage = storage;
  const initial = loadLocalWorkspace();
  const mutation = {
    action: 'save',
    kind: 'notes',
    record: { id: 'n', title: 'Keep', classId: '', content: 'Content' },
  };
  globalThis.localStorage = {
    ...storage,
    setItem() {
      throw new Error('Quota exceeded');
    },
  };
  assert.throws(() => saveLocalMutation(initial, mutation), /Quota exceeded/);
  assert.deepEqual(loadLocalWorkspace(), initial);
  globalThis.localStorage = storage;
  const next = saveLocalMutation(initial, mutation);
  assert.equal(next.revision, initial.revision + 1);
  assert.deepEqual(loadLocalWorkspace(), next);
});
