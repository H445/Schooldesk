import test from 'node:test';
import assert from 'node:assert/strict';
import {
  campusById,
  DEFAULT_SCHOOL_ID,
  extractRoomCode,
  floorForRoom,
  buildingForRoom,
  positionForRoom,
} from '../lib/campus.ts';
import { applyMutation } from '../lib/actions.ts';

void test('the initial school catalog covers St. Clair Main Windsor floors and navigation points', () => {
  const campus = campusById(DEFAULT_SCHOOL_ID);
  assert.equal(campus.id, DEFAULT_SCHOOL_ID);
  assert.equal(campus.address, '2000 Talbot Road West, Windsor, ON N9A 6S4');
  assert.deepEqual(
    campus.floors.map((floor) => floor.id),
    ['campus', 'basement', 'first', 'second', 'third', 'fourth'],
  );
  assert.ok(
    campus.floors
      .find((floor) => floor.id === 'second')
      .roomRanges.includes('Main Building · A2100–A2628'),
  );
  assert.ok(
    campus.pois.some(
      (poi) => poi.name === 'Student Services' && poi.room === 'A2110',
    ),
  );
  assert.ok(campus.pois.some((poi) => poi.name === 'SportsPlex'));
});

void test('room codes resolve to floor and building pins', () => {
  assert.equal(extractRoomCode('Main Building · A2134'), 'A2134');
  assert.equal(extractRoomCode('Room F3013'), 'F3013');
  assert.equal(extractRoomCode('Location TBA'), undefined);
  assert.equal(floorForRoom('A0336'), 'basement');
  assert.equal(floorForRoom('A2134'), 'second');
  assert.equal(floorForRoom('F3013'), 'third');
  assert.equal(buildingForRoom('B1006'), 'Ford Centre (FCEM)');
  const position = positionForRoom('A2134', 'second');
  assert.ok(position.x > 0 && position.x < 100);
  assert.ok(position.y > 0 && position.y < 64);
});

void test('school selection is validated and persists with workspace data', () => {
  const initial = { classes: [], assignments: [], notes: [] };
  const selected = applyMutation(initial, {
    action: 'setSchool',
    schoolId: DEFAULT_SCHOOL_ID,
  });
  assert.equal(selected.schoolId, DEFAULT_SCHOOL_ID);
  assert.throws(() =>
    applyMutation(initial, { action: 'setSchool', schoolId: 'unknown-school' }),
  );
});
