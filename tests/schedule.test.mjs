import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMutation } from '../lib/actions.ts';
import { meetsOn, classScheduleLabel } from '../lib/school.ts';
const course = {
  id: 'c',
  name: 'Web Development',
  code: 'WEB 110',
  teacher: '',
  schedule: 'Room 204',
  color: '#9170df',
};
const calendarSchedule = {
  weekdays: [1, 3],
  startTime: '09:00',
  endTime: '10:30',
  startDate: '2026-09-07',
  endDate: '2026-12-16',
};
const empty = { classes: [], assignments: [], notes: [] };
const save = (state, record) =>
  applyMutation(state, { action: 'save', kind: 'classes', record });
test('weekly class recurrence honors weekdays and inclusive semester boundaries', () => {
  const c = save(empty, { ...course, calendarSchedule }).classes[0];
  for (const date of ['2026-09-07', '2026-09-09', '2026-11-02', '2026-12-16'])
    assert.ok(meetsOn(c, date), date);
  for (const date of ['2026-09-02', '2026-09-08', '2026-12-21'])
    assert.equal(meetsOn(c, date), false, date);
  assert.equal(classScheduleLabel(c), 'Mon & Wed · 09:00–10:30');
  assert.equal(c.schedule, 'Room 204');
});
test('old classes stay valid; editing, disabling and deleting recurrence updates calendar', () => {
  let state = save(empty, course);
  assert.equal(meetsOn(state.classes[0], '2026-09-07'), false);
  state = save(state, { ...course, calendarSchedule });
  state = save(state, { ...course, name: 'Renamed' });
  assert.deepEqual(state.classes[0].calendarSchedule, calendarSchedule);
  state = save(state, {
    ...course,
    calendarSchedule: { ...calendarSchedule, weekdays: [2] },
  });
  assert.equal(meetsOn(state.classes[0], '2026-09-07'), false);
  assert.ok(meetsOn(state.classes[0], '2026-09-08'));
  state = save(state, { ...course, calendarSchedule: null });
  assert.equal(meetsOn(state.classes[0], '2026-09-08'), false);
  state = applyMutation(state, { action: 'delete', kind: 'classes', id: 'c' });
  assert.equal(state.classes.length, 0);
});
test('invalid class dates, times and weekdays are rejected', () => {
  for (const change of [
    { weekdays: [] },
    { weekdays: [7] },
    { startTime: '25:00' },
    { endTime: '08:00' },
    { endDate: '2026-09-01' },
    { startDate: '2026-02-30' },
  ])
    assert.throws(() =>
      save(empty, {
        ...course,
        calendarSchedule: { ...calendarSchedule, ...change },
      }),
    );
});
