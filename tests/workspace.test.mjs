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

void test('classes and notes accept safe URL, image, PDF, and generic file references', () => {
  const references = [
    {
      id: 'url',
      title: 'Course guide',
      kind: 'url',
      href: 'https://example.edu/guide',
      createdAt: '2026-09-08T12:00:00.000Z',
    },
    {
      id: 'image',
      title: 'Diagram.png',
      kind: 'image',
      href: 'data:image/png;base64,AA==',
      mimeType: 'image/png',
      size: 1,
      createdAt: '2026-09-08T12:00:00.000Z',
    },
    {
      id: 'pdf',
      title: 'Syllabus.pdf',
      kind: 'pdf',
      href: 'data:application/pdf;base64,AA==',
      mimeType: 'application/pdf',
      size: 1,
      createdAt: '2026-09-08T12:00:00.000Z',
    },
    {
      id: 'file',
      title: 'Formula.txt',
      kind: 'file',
      href: 'data:text/plain;base64,SGk=',
      mimeType: 'text/plain',
      size: 2,
      createdAt: '2026-09-08T12:00:00.000Z',
    },
  ];
  let state = save(empty(), 'classes', { ...course, references });
  assert.deepEqual(state.classes[0].references, references);
  state = save(state, 'notes', {
    id: 'reference-note',
    title: 'Readings',
    classId: course.id,
    content: '',
    references: [references[0]],
  });
  assert.equal(state.notes[0].references[0].href, references[0].href);
});

void test('references reject unsafe links, malformed uploads, and oversized lists', () => {
  for (const reference of [
    { id: 'x', title: 'Bad', kind: 'url', href: 'javascript:alert(1)' },
    { id: 'x', title: 'Bad', kind: 'url', href: 'not a url' },
    {
      id: 'x',
      title: 'Bad',
      kind: 'image',
      href: 'https://example.com/a.png',
      mimeType: 'image/png',
    },
    {
      id: 'x',
      title: 'Bad',
      kind: 'pdf',
      href: 'data:application/pdf;base64,AA==',
      mimeType: 'text/plain',
    },
  ]) {
    assert.throws(() =>
      save(empty(), 'classes', { ...course, references: [reference] }),
    );
  }
  const tooMany = Array.from({ length: 21 }, (_, i) => ({
    id: String(i),
    title: 'Link',
    kind: 'url',
    href: `https://example.com/${i}`,
  }));
  assert.throws(() =>
    save(empty(), 'classes', { ...course, references: tooMany }),
  );
  const tooLarge = `data:text/plain;base64,${'A'.repeat(4_500_000)}`;
  assert.throws(() =>
    save(empty(), 'classes', {
      ...course,
      references: [
        {
          id: 'large',
          title: 'Large',
          kind: 'file',
          href: tooLarge,
          mimeType: 'text/plain',
        },
      ],
    }),
  );
});
