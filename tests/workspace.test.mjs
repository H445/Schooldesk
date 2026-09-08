import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMutation } from '../lib/actions.ts';
import { makeExamples } from '../lib/school.ts';

const empty = () => ({ classes: [], assignments: [], notes: [] });
const course = {
  id: 'class-1',
  name: 'Chemistry',
  code: 'CHEM 101',
  teacher: 'Dr. Lee',
  schedule: 'Monday at 10',
  color: '#9170df',
};
const assignment = {
  id: 'assignment-1',
  title: 'Lab report',
  classId: 'class-1',
  dueDate: '2026-10-01',
  priority: 'High',
  status: 'To do',
  description: 'Include observations.',
};
const save = (state, kind, record) =>
  applyMutation(state, { action: 'save', kind, record });

test('create and edit class, assignment, and note without mutating previous state', () => {
  const initial = empty();
  let state = save(initial, 'classes', course);
  state = save(state, 'assignments', assignment);
  state = save(state, 'notes', {
    id: 'note-1',
    title: 'Lecture 1',
    classId: course.id,
    content: 'Original notes',
  });
  const previous = structuredClone(state);
  state = save(state, 'assignments', { ...assignment, status: 'Done' });
  state = save(state, 'notes', { ...state.notes[0], content: 'Updated notes' });
  assert.equal(state.assignments[0].status, 'Done');
  assert.equal(state.notes[0].content, 'Updated notes');
  assert.equal(previous.assignments[0].status, 'To do');
  assert.equal(initial.classes.length, 0);
  assert.equal(state.assignments.length, 1);
  assert.equal(state.notes.length, 1);
});
test('deleting a class keeps linked work under General', () => {
  let state = save(empty(), 'classes', course);
  state = save(state, 'assignments', assignment);
  state = save(state, 'notes', {
    id: 'n',
    title: 'Keep me',
    classId: course.id,
    content: 'Important',
  });
  state = applyMutation(state, {
    action: 'delete',
    kind: 'classes',
    id: course.id,
  });
  assert.equal(state.classes.length, 0);
  assert.equal(state.assignments[0].classId, '');
  assert.equal(state.notes[0].classId, '');
});
test('clearing examples preserves edits and their class relationships', () => {
  let state = makeExamples();
  state = save(state, 'notes', {
    id: 'my-note',
    title: 'My own notes',
    classId: 'example-bio',
    content: 'Keep this',
  });
  state = save(state, 'assignments', {
    ...state.assignments[1],
    title: 'My edited assignment',
  });
  state = applyMutation(state, { action: 'clearExamples' });
  assert.deepEqual(state.classes.map((c) => c.id).sort(), [
    'example-bio',
    'example-math',
  ]);
  assert.equal(state.notes.length, 1);
  assert.equal(state.assignments.length, 1);
  assert.ok(
    [...state.classes, ...state.notes, ...state.assignments].every(
      (r) => !r.example,
    ),
  );
});
test('invalid input is rejected without losing work', () => {
  const state = save(empty(), 'classes', course);
  for (const invalid of [
    { ...assignment, title: ' ' },
    { ...assignment, dueDate: '2026-02-30' },
    { ...assignment, classId: 'missing' },
    { ...assignment, priority: 'Urgent' },
    { ...assignment, status: 'Deleted' },
  ])
    assert.throws(() => save(state, 'assignments', invalid));
  assert.throws(() =>
    applyMutation(state, { action: 'save', kind: 'other', record: assignment }),
  );
  assert.throws(() => applyMutation(state, null));
  assert.equal(state.classes.length, 1);
  assert.equal(state.assignments.length, 0);
});
test('clear examples produces a truly empty workspace when untouched', () =>
  assert.deepEqual(
    applyMutation(makeExamples(), { action: 'clearExamples' }),
    empty(),
  ));
test('assignment deletion affects only the selected record', () => {
  let state = save(empty(), 'classes', course);
  state = save(state, 'assignments', assignment);
  state = save(state, 'assignments', { ...assignment, id: 'other' });
  state = applyMutation(state, {
    action: 'delete',
    kind: 'assignments',
    id: assignment.id,
  });
  assert.deepEqual(
    state.assignments.map((a) => a.id),
    ['other'],
  );
});

test(
  'API saves persist, reject stale writes, and validate input',
  { skip: !process.env.TEST_API_URL },
  async () => {
    const base = process.env.TEST_API_URL;
    const read = async () => {
      const r = await fetch(base + '/api/workspace');
      assert.equal(r.status, 200);
      return r.json();
    };
    const post = async (mutation, revision) => {
      const r = await fetch(base + '/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision, mutation }),
      });
      return { status: r.status, body: await r.json() };
    };
    let state = await read();
    const prefix = 'test-' + crypto.randomUUID();
    const ids = {
      class: prefix + '-c',
      assignment: prefix + '-a',
      note: prefix + '-n',
    };
    try {
      const first = await post(
        {
          action: 'save',
          kind: 'classes',
          record: { ...course, id: ids.class },
        },
        state.revision,
      );
      assert.equal(first.status, 200);
      const staleRevision = state.revision;
      state = first.body;
      const stale = await post(
        {
          action: 'save',
          kind: 'classes',
          record: { ...course, id: ids.class, name: 'Stale overwrite' },
        },
        staleRevision,
      );
      assert.equal(stale.status, 409);
      const bad = await post(
        {
          action: 'save',
          kind: 'assignments',
          record: {
            ...assignment,
            id: ids.assignment,
            classId: ids.class,
            dueDate: '2026-02-30',
          },
        },
        state.revision,
      );
      assert.equal(bad.status, 400);
      const created = await post(
        {
          action: 'save',
          kind: 'assignments',
          record: { ...assignment, id: ids.assignment, classId: ids.class },
        },
        state.revision,
      );
      assert.equal(created.status, 200);
      state = created.body;
      const note = await post(
        {
          action: 'save',
          kind: 'notes',
          record: {
            id: ids.note,
            classId: ids.class,
            title: 'Test note',
            content: 'Persisted note',
          },
        },
        state.revision,
      );
      assert.equal(note.status, 200);
      state = note.body;
      const saved = await read();
      assert.equal(
        saved.data.assignments.find((a) => a.id === ids.assignment).title,
        'Lab report',
      );
      assert.equal(
        saved.data.notes.find((n) => n.id === ids.note).content,
        'Persisted note',
      );
      const done = await post(
        {
          action: 'save',
          kind: 'assignments',
          record: {
            ...saved.data.assignments.find((a) => a.id === ids.assignment),
            status: 'Done',
          },
        },
        saved.revision,
      );
      assert.equal(done.status, 200);
      state = done.body;
      const removed = await post(
        { action: 'delete', kind: 'classes', id: ids.class },
        state.revision,
      );
      assert.equal(removed.status, 200);
      state = removed.body;
      assert.equal(
        state.data.assignments.find((a) => a.id === ids.assignment).classId,
        '',
      );
      const blocked = await fetch(base + '/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://unrelated.example',
        },
        body: JSON.stringify({
          revision: state.revision,
          mutation: { action: 'clearExamples' },
        }),
      });
      assert.equal(blocked.status, 403);
    } finally {
      state = await read();
      for (const [kind, id] of [
        ['notes', ids.note],
        ['assignments', ids.assignment],
        ['classes', ids.class],
      ]) {
        if (state.data[kind].some((r) => r.id === id)) {
          const result = await post(
            { action: 'delete', kind, id },
            state.revision,
          );
          assert.equal(result.status, 200);
          state = result.body;
        }
      }
    }
  },
);
