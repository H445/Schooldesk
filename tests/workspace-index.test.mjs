import test from 'node:test';
import assert from 'node:assert/strict';
import { makeExamples } from '../lib/school.ts';
import { applyMutation } from '../lib/actions.ts';
import {
  indexCourses,
  summarizeAssignments,
  filterAssignments,
  filterNotes,
} from '../lib/workspace-index.ts';

void test('indexes retain every record, order, and General relationships', () => {
  const data = makeExamples();
  data.assignments.push({ ...data.assignments[0], id: 'general', classId: '' });
  const summary = summarizeAssignments(data.assignments);
  for (const status of ['To do', 'In progress', 'Done']) {
    assert.deepEqual(
      summary.byStatus[status],
      data.assignments.filter((a) => a.status === status),
    );
  }
  for (const assignment of data.assignments) {
    assert.deepEqual(
      summary.byDate.get(assignment.dueDate),
      data.assignments.filter((a) => a.dueDate === assignment.dueDate),
    );
    const records = data.assignments.filter(
      (a) => a.classId === assignment.classId,
    );
    assert.deepEqual(summary.byClass.get(assignment.classId), {
      total: records.length,
      done: records.filter((a) => a.status === 'Done').length,
    });
  }
});

void test('search and filters agree with independent scans, including renamed courses', () => {
  const data = makeExamples();
  const courses = indexCourses(data.classes);
  for (const query of ['', 'biology', 'chapter', 'no-match']) {
    for (const classId of ['', data.classes[0].id]) {
      for (const status of ['All', 'To do', 'In progress', 'Done', 'Overdue']) {
        const today = '2026-09-10';
        const expected = data.assignments.filter(
          (a) =>
            (!classId || a.classId === classId) &&
            [
              a.title,
              a.description,
              data.classes.find((c) => c.id === a.classId)?.name,
            ].some((v) => v?.toLowerCase().includes(query)) &&
            (status === 'All' ||
              (status === 'Overdue'
                ? a.status !== 'Done' && a.dueDate < today
                : a.status === status)),
        );
        assert.deepEqual(
          filterAssignments(
            data.assignments,
            courses,
            query,
            classId,
            status,
            today,
          ),
          expected,
        );
      }
      assert.deepEqual(
        filterNotes(data.notes, courses, query, classId),
        data.notes.filter(
          (n) =>
            (!classId || n.classId === classId) &&
            [
              n.title,
              n.content,
              data.classes.find((c) => c.id === n.classId)?.name,
            ].some((v) => v?.toLowerCase().includes(query)),
        ),
      );
    }
  }
  const changed = applyMutation(data, {
    action: 'save',
    kind: 'classes',
    record: { ...data.classes[0], name: 'Renamed course' },
  });
  assert.ok(
    filterNotes(changed.notes, indexCourses(changed.classes), 'renamed', '')
      .length,
  );
});

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

void test('mutations preserve untouched identities and never write into frozen state', () => {
  const data = freeze(makeExamples());
  const next = applyMutation(data, {
    action: 'save',
    kind: 'assignments',
    record: { ...data.assignments[0], status: 'Done' },
  });
  assert.equal(next.classes, data.classes);
  assert.equal(next.notes, data.notes);
  assert.equal(next.assignments[1], data.assignments[1]);
  assert.notEqual(next.assignments[0], data.assignments[0]);
  const deleted = applyMutation(data, {
    action: 'delete',
    kind: 'classes',
    id: data.classes[0].id,
  });
  assert.equal(deleted.assignments[0].classId, '');
  assert.equal(deleted.assignments[1], data.assignments[1]);
  assert.notEqual(data.assignments[0].classId, '');
  assert.doesNotThrow(() => applyMutation(data, { action: 'clearExamples' }));
});
