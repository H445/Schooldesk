import test from 'node:test';
import assert from 'node:assert/strict';
import {
  campusById,
  DEFAULT_SCHOOL_ID,
  extractRoomCode,
  floorForRoom,
  buildingForRoom,
  positionForRoom,
  detailedPlanForFloor,
  positionForDetailedPlan,
  positionForOfficialPlan,
  positionForPoi,
} from '../lib/campus.ts';
import { existsSync } from 'node:fs';
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

void test('overview room anchors come from individual labels, with no guessed fallback', () => {
  const room = positionForOfficialPlan('A3302', 'third');
  assert.ok(Math.abs(room.x - 51.1729) < 0.01);
  assert.ok(Math.abs(room.y - 7.805) < 0.01);
  assert.deepEqual(positionForOfficialPlan('a3302', 'third'), room);
  assert.equal(positionForOfficialPlan('A3302', 'second'), undefined);
  // These rooms are not individually labeled on the overview. A range endpoint
  // or a nearby building must not be passed off as an exact room location.
  for (const [room, floor] of [
    ['A0336', 'basement'],
    ['A2612', 'second'],
    ['F3013', 'third'],
    ['A9999', 'second'],
  ]) {
    assert.equal(positionForOfficialPlan(room, floor), undefined);
  }
});

void test('POIs use the current drawing and shared building anchors stay co-located', () => {
  const pois = campusById(DEFAULT_SCHOOL_ID).pois;
  const position = (id, floor = 'campus') =>
    positionForPoi(
      pois.find((poi) => poi.id === id),
      floor,
    );
  const sportsplex = position('sportsplex');
  assert.ok(
    sportsplex.x > 50 &&
      sportsplex.x < 55 &&
      sportsplex.y > 38 &&
      sportsplex.y < 41,
  );
  assert.deepEqual(position('dental'), position('nursing'));
  assert.match(position('dental').location, /building/);
  assert.ok(
    position('dental').y < 50,
    'Toldo is above the Main Building on the overview',
  );
  assert.equal(
    position('dental', 'first'),
    undefined,
    'Main Building drawing does not show Toldo rooms',
  );
  assert.equal(position('welcome', 'second'), undefined);
  const library = position('library', 'second');
  const room = positionForDetailedPlan('A2303', 'second');
  assert.equal(library.x, room.x);
  assert.equal(library.y, room.y);
  assert.equal(
    positionForPoi({ id: 'unverified', floor: 'first' }, 'campus'),
    undefined,
  );
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

void test('detailed drawings locate scheduled rooms on the correct floor without guessing', () => {
  for (const [room, floor, page] of [
    ['A2134', 'second', 3],
    ['A2612', 'second', 3],
    ['A3302', 'third', 4],
    ['A0336', 'basement', 1],
    ['A0341', 'basement', 1],
  ]) {
    const position = positionForDetailedPlan(room, floor);
    assert.equal(position.page, page);
    assert.ok(position.x > 0 && position.x < 100);
    assert.ok(position.y > 0 && position.y < 100);
    const plan = detailedPlanForFloor(floor);
    assert.ok(
      existsSync(new URL(`../public/${plan.image.slice(2)}`, import.meta.url)),
    );
  }
  // These two labels occupy different wings in the official second-floor drawing.
  assert.ok(
    positionForDetailedPlan('A2134', 'second').x <
      positionForDetailedPlan('A2612', 'second').x,
  );
  assert.equal(positionForDetailedPlan('A2134', 'first'), undefined);
  assert.equal(positionForDetailedPlan('A9999', 'second'), undefined);
  assert.equal(positionForDetailedPlan('F3013', 'third'), undefined);
  assert.equal(positionForDetailedPlan('A4101', 'third'), undefined);
  assert.equal(positionForDetailedPlan('A4101', 'fourth').page, 4);
  assert.equal(detailedPlanForFloor('campus'), undefined);
});
