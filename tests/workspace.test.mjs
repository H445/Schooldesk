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
