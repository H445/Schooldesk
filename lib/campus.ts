export type CampusFloorId =
  | 'campus'
  | 'basement'
  | 'first'
  | 'second'
  | 'third'
  | 'fourth';

export type CampusCategory =
  | 'academic'
  | 'services'
  | 'food'
  | 'wellness'
  | 'entrance'
  | 'parking';

export type CampusZone = {
  id: string;
  label: string;
  detail: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tone: 'main' | 'connected' | 'health' | 'outdoor' | 'service';
};

export type CampusFloor = {
  id: CampusFloorId;
  label: string;
  shortLabel: string;
  description: string;
  roomRanges: string[];
  zones: CampusZone[];
};

export type CampusPoi = {
  id: string;
  name: string;
  category: CampusCategory;
  description: string;
  floor: CampusFloorId;
  room?: string;
  x: number;
  y: number;
};

export type CampusBuilding = {
  id: string;
  name: string;
  roomRanges: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tone: CampusZone['tone'];
};

export type CampusDefinition = {
  id: string;
  name: string;
  shortName: string;
  address: string;
  mapUrl: string;
  profileUrl: string;
  buildings: CampusBuilding[];
  floors: CampusFloor[];
  pois: CampusPoi[];
};

export const DEFAULT_SCHOOL_ID = 'st-clair-windsor-main';

export const campusFloors: CampusFloor[] = [
  {
    id: 'campus',
    label: 'Campus overview',
    shortLabel: 'Campus',
    description:
      'A quick orientation of the Main Windsor campus. Choose a floor to see room ranges, class pins, and nearby services.',
    roomRanges: [],
    zones: [],
  },
  {
    id: 'basement',
    label: 'Basement level',
    shortLabel: 'Basement',
    description:
      'The lower Main Building level, including safety, facilities, print, media, esthetician, and hairstyling spaces.',
    roomRanges: [
      'Main Building · A0100–A0613',
      'A0101–A0125 · A0201–A0220',
      'A0308–A0323 · A0335–A0507',
    ],
    zones: [
      {
        id: 'a0-west',
        label: 'Main Building · west wing',
        detail: 'A0100–A0323',
        x: 7,
        y: 14,
        width: 41,
        height: 30,
        tone: 'main',
      },
      {
        id: 'a0-east',
        label: 'Main Building · east wing',
        detail: 'A0335–A0613',
        x: 52,
        y: 14,
        width: 41,
        height: 30,
        tone: 'main',
      },
      {
        id: 'basement-services',
        label: 'Service corridor',
        detail: 'Facilities and campus support',
        x: 20,
        y: 49,
        width: 60,
        height: 7,
        tone: 'service',
      },
    ],
  },
  {
    id: 'first',
    label: 'First floor',
    shortLabel: '1st floor',
    description:
      'The main student-facing level, with the Welcome Centre, food, health, registrar, student life, and connected academic buildings.',
    roomRanges: [
      'Main Building · A1100–A1656',
      'FCEM · B1000–B1051',
      'Health Sciences · F1100–F3021A',
      'Connected wings · D1002–D1014 · E1002–E1003 · G1002–G1024',
    ],
    zones: [
      {
        id: 'main-first',
        label: 'Main Building',
        detail: 'A1100–A1656',
        x: 7,
        y: 12,
        width: 49,
        height: 35,
        tone: 'main',
      },
      {
        id: 'fcem-first',
        label: 'Ford Centre (FCEM)',
        detail: 'B1000–B1051',
        x: 60,
        y: 12,
        width: 18,
        height: 35,
        tone: 'connected',
      },
      {
        id: 'health-first',
        label: 'Toldo Centre (Health)',
        detail: 'F1100–F3021A',
        x: 82,
        y: 12,
        width: 11,
        height: 35,
        tone: 'health',
      },
      {
        id: 'first-connections',
        label: 'Connected wings',
        detail: 'D · E · G · H · J',
        x: 19,
        y: 50,
        width: 62,
        height: 7,
        tone: 'service',
      },
    ],
  },
  {
    id: 'second',
    label: 'Second floor',
    shortLabel: '2nd floor',
    description:
      'Main Building classrooms and student services, with the outdoor walkway connection to rooms A2100–A2200 and the FCEM bridge.',
    roomRanges: [
      'Main Building · A2100–A2628',
      'FCEM · B2000–B2027',
      'Classroom clusters · A2201–A2343 · A2401–A2520 · A2600–A2607',
    ],
    zones: [
      {
        id: 'main-second-west',
        label: 'Main Building · west',
        detail: 'A2100–A2200',
        x: 7,
        y: 12,
        width: 28,
        height: 35,
        tone: 'main',
      },
      {
        id: 'main-second-east',
        label: 'Main Building · east',
        detail: 'A2201–A2628',
        x: 39,
        y: 12,
        width: 39,
        height: 35,
        tone: 'main',
      },
      {
        id: 'fcem-second',
        label: 'Ford Centre (FCEM)',
        detail: 'B2000–B2027',
        x: 82,
        y: 12,
        width: 11,
        height: 35,
        tone: 'connected',
      },
      {
        id: 'second-bridge',
        label: 'Bridge / outdoor walkway',
        detail: 'Connection to FCEM and Zekelman classrooms',
        x: 23,
        y: 50,
        width: 56,
        height: 7,
        tone: 'outdoor',
      },
    ],
  },
  {
    id: 'third',
    label: 'Third floor',
    shortLabel: '3rd floor',
    description:
      'Upper academic and administration areas, including the A3100–A3501 classroom and office ranges.',
    roomRanges: [
      'Main Building · A3100–A3501',
      'Classroom cluster · A3101–A3123',
      'Administration / classrooms · A3312–A3501',
    ],
    zones: [
      {
        id: 'main-third-west',
        label: 'Main Building · west',
        detail: 'A3100–A3216',
        x: 7,
        y: 12,
        width: 41,
        height: 35,
        tone: 'main',
      },
      {
        id: 'main-third-east',
        label: 'Main Building · east',
        detail: 'A3300–A3501',
        x: 52,
        y: 12,
        width: 41,
        height: 35,
        tone: 'main',
      },
      {
        id: 'third-core',
        label: 'Stairs / elevators',
        detail: 'Vertical circulation',
        x: 24,
        y: 50,
        width: 52,
        height: 7,
        tone: 'service',
      },
    ],
  },
  {
    id: 'fourth',
    label: 'Fourth floor',
    shortLabel: '4th floor',
    description: 'The top Main Building level, with classrooms A4100–A4117.',
    roomRanges: ['Main Building · A4100–A4117'],
    zones: [
      {
        id: 'main-fourth',
        label: 'Main Building',
        detail: 'Classrooms A4100–A4117',
        x: 18,
        y: 15,
        width: 64,
        height: 30,
        tone: 'main',
      },
      {
        id: 'fourth-core',
        label: 'Stairs / elevators',
        detail: 'Vertical circulation',
        x: 30,
        y: 50,
        width: 40,
        height: 7,
        tone: 'service',
      },
    ],
  },
];

export const campusBuildings: CampusBuilding[] = [
  {
    id: 'main',
    name: 'Main Building',
    roomRanges: 'A0xxx–A4xxx · Main Building',
    description: 'The central Main Building and its classroom floors.',
    x: 7,
    y: 12,
    width: 46,
    height: 37,
    tone: 'main',
  },
  {
    id: 'fcem',
    name: 'Ford Centre (FCEM)',
    roomRanges: 'B1000–B1051 · B2000–B2027',
    description: 'Engineering Technology and Skilled Trades.',
    x: 58,
    y: 12,
    width: 17,
    height: 37,
    tone: 'connected',
  },
  {
    id: 'health',
    name: 'Toldo Centre',
    roomRanges: 'F1xxx–F3xxx · Health Sciences',
    description: 'Health Sciences, Nursing, and Dental Clinic.',
    x: 80,
    y: 12,
    width: 13,
    height: 37,
    tone: 'health',
  },
  {
    id: 'sports',
    name: 'SportsPlex / sports park',
    roomRanges: 'Across the campus drive',
    description: 'Fitness, gym, pool, and varsity athletics.',
    x: 12,
    y: 53,
    width: 32,
    height: 7,
    tone: 'outdoor',
  },
  {
    id: 'connections',
    name: 'Connected academic wings',
    roomRanges: 'D · E · G · H · J',
    description: 'Specialist labs and connected teaching spaces.',
    x: 49,
    y: 53,
    width: 40,
    height: 7,
    tone: 'service',
  },
];

export const campusPois: CampusPoi[] = [
  {
    id: 'welcome',
    name: 'Welcome Centre',
    category: 'entrance',
    description: 'A practical first stop for directions and campus help.',
    floor: 'first',
    x: 16,
    y: 38,
  },
  {
    id: 'student-services',
    name: 'Student Services',
    category: 'services',
    description:
      'Tutoring, counselling, accessibility, and accommodation plans.',
    floor: 'second',
    room: 'A2110',
    x: 20,
    y: 24,
  },
  {
    id: 'library',
    name: 'Library Resource Centre',
    category: 'services',
    description: 'Library resources and study support.',
    floor: 'second',
    room: 'A2303',
    x: 49,
    y: 25,
  },
  {
    id: 'international',
    name: 'International Students Office',
    category: 'services',
    description: 'Support for international students.',
    floor: 'second',
    room: 'A2401',
    x: 61,
    y: 31,
  },
  {
    id: 'one-card',
    name: 'One Card / Student Card Office',
    category: 'services',
    description: 'Student cards and campus access support.',
    floor: 'second',
    room: 'A2409',
    x: 69,
    y: 38,
  },
  {
    id: 'lockers',
    name: 'Lockers',
    category: 'services',
    description: 'Main Building lockers and storage.',
    floor: 'second',
    room: 'A2504',
    x: 73,
    y: 21,
  },
  {
    id: 'caeqa',
    name: 'Centre for Academic Excellence',
    category: 'services',
    description: 'Academic excellence and quality assurance.',
    floor: 'second',
    room: 'A2332',
    x: 41,
    y: 40,
  },
  {
    id: 'registrar',
    name: 'Registrar and Financial Assistance',
    category: 'services',
    description: 'Registration, records, and financial assistance.',
    floor: 'first',
    room: 'A1401',
    x: 38,
    y: 23,
  },
  {
    id: 'career-services',
    name: 'Career Services',
    category: 'services',
    description: 'Career planning, employment, and placement support.',
    floor: 'second',
    x: 55,
    y: 20,
  },
  {
    id: 'health-centre',
    name: 'Health Centre',
    category: 'wellness',
    description: 'On-campus health services.',
    floor: 'first',
    room: 'A1341',
    x: 31,
    y: 30,
  },
  {
    id: 'bookstore',
    name: 'Bookstore',
    category: 'services',
    description: 'Course materials, supplies, and campus merchandise.',
    floor: 'first',
    room: 'A1154',
    x: 23,
    y: 19,
  },
  {
    id: 'continuing-education',
    name: 'Continuing Education',
    category: 'services',
    description: 'Continuing education and training services.',
    floor: 'first',
    room: 'A1104',
    x: 13,
    y: 20,
  },
  {
    id: 'student-life',
    name: 'Student Life Centre',
    category: 'services',
    description: 'Student Life, lounge, and community spaces.',
    floor: 'second',
    room: 'SC',
    x: 31,
    y: 53,
  },
  {
    id: 'esports',
    name: 'Esports Nexus Arena',
    category: 'academic',
    description: 'Esports arena and gaming computer lab.',
    floor: 'first',
    room: 'A1295',
    x: 47,
    y: 39,
  },
  {
    id: 'eatery',
    name: 'Eatery 101',
    category: 'food',
    description: 'Main campus food service.',
    floor: 'first',
    room: 'A1305',
    x: 42,
    y: 45,
  },
  {
    id: 'campus-eats',
    name: 'Campus Eats and Hangar',
    category: 'food',
    description: 'Campus dining and cafeteria spaces.',
    floor: 'campus',
    x: 39,
    y: 56,
  },
  {
    id: 'engineering',
    name: 'School of Engineering Technology',
    category: 'academic',
    description: 'Engineering Technology teaching spaces.',
    floor: 'first',
    room: 'B1006',
    x: 68,
    y: 26,
  },
  {
    id: 'skilled-trades',
    name: 'School of Skilled Trades',
    category: 'academic',
    description: 'Skilled Trades teaching spaces.',
    floor: 'first',
    room: 'B1006',
    x: 69,
    y: 37,
  },
  {
    id: 'health-sciences',
    name: 'School of Health Sciences',
    category: 'academic',
    description: 'Health Sciences learning labs.',
    floor: 'third',
    room: 'F3013',
    x: 87,
    y: 24,
  },
  {
    id: 'nursing',
    name: 'School of Nursing',
    category: 'academic',
    description: 'Nursing learning spaces.',
    floor: 'third',
    room: 'F3007',
    x: 87,
    y: 35,
  },
  {
    id: 'dental',
    name: 'Dental Clinic',
    category: 'academic',
    description: 'Dental Clinic teaching and patient spaces.',
    floor: 'first',
    room: 'F1001',
    x: 87,
    y: 42,
  },
  {
    id: 'security',
    name: 'Safety, Security and Facilities',
    category: 'services',
    description: 'Security and facilities support.',
    floor: 'basement',
    room: 'A0324',
    x: 47,
    y: 40,
  },
  {
    id: 'print-shop',
    name: 'Print Shop',
    category: 'services',
    description: 'Campus print and production support.',
    floor: 'basement',
    room: 'A0330',
    x: 58,
    y: 40,
  },
  {
    id: 'sportsplex',
    name: 'SportsPlex',
    category: 'wellness',
    description: 'Fitness centre, pool, gyms, and varsity athletics.',
    floor: 'campus',
    x: 24,
    y: 55,
  },
  {
    id: 'parking',
    name: 'Visitor and student parking',
    category: 'parking',
    description: 'Parking areas shown on the official campus map.',
    floor: 'campus',
    x: 73,
    y: 56,
  },
  {
    id: 'tennis',
    name: 'Zekelman Tennis Centre',
    category: 'wellness',
    description: 'Outdoor tennis and recreation facility.',
    floor: 'campus',
    x: 57,
    y: 56,
  },
];

export const stClairMainCampus: CampusDefinition = {
  id: DEFAULT_SCHOOL_ID,
  name: 'St. Clair College · Main Windsor Campus',
  shortName: 'St. Clair · Main Windsor',
  address: '2000 Talbot Road West, Windsor, ON N9A 6S4',
  mapUrl:
    'https://www.stclaircollege.ca/sites/default/files/campus-maps/windsor-campus-map.pdf',
  profileUrl: 'https://www.stclaircollege.ca/campus-profiles',
  buildings: campusBuildings,
  floors: campusFloors,
  pois: campusPois,
};

export const availableCampuses: CampusDefinition[] = [stClairMainCampus];

export function campusById(id: string | undefined) {
  return (
    availableCampuses.find((campus) => campus.id === id) ?? stClairMainCampus
  );
}

const ROOM_PATTERN = /\b([A-Z]\d{3,5}[A-Z]?)\b/i;

/** Extract the first campus room code from a meeting location or free text. */
export function extractRoomCode(value: string | undefined) {
  const match = value?.toUpperCase().match(ROOM_PATTERN);
  return match?.[1];
}

export function floorForRoom(
  room: string | undefined,
): CampusFloorId | undefined {
  if (!room) return undefined;
  const numeric = Number(room.match(/\d+/)?.[0]);
  if (!Number.isFinite(numeric)) return undefined;
  const floor = Math.floor(numeric / 1000);
  return floor === 0
    ? 'basement'
    : floor === 1
      ? 'first'
      : floor === 2
        ? 'second'
        : floor === 3
          ? 'third'
          : floor === 4
            ? 'fourth'
            : undefined;
}

export function buildingForRoom(room: string | undefined) {
  const prefix = room?.[0]?.toUpperCase();
  if (prefix === 'A') return 'Main Building';
  if (prefix === 'B') return 'Ford Centre (FCEM)';
  if (prefix === 'F') return 'Toldo Centre for Applied Health Sciences';
  if (prefix === 'D') return 'Truck & Coach / Automobility Hub';
  if (prefix === 'E') return 'Connected academic wing E';
  if (prefix === 'G') return 'Connected academic wing G';
  if (prefix === 'H') return 'Connected academic wing H';
  if (prefix === 'J') return 'Connected academic wing J';
  return 'Main Windsor campus';
}

const ROOM_ANCHORS: Record<
  string,
  { floor: CampusFloorId; x: number; y: number }
> = {
  A0336: { floor: 'basement', x: 31, y: 31 },
  A0341: { floor: 'basement', x: 67, y: 31 },
  A2134: { floor: 'second', x: 26, y: 30 },
  A2612: { floor: 'second', x: 70, y: 31 },
  A3302: { floor: 'third', x: 22, y: 29 },
  A4101: { floor: 'fourth', x: 28, y: 30 },
  B1006: { floor: 'first', x: 69, y: 28 },
  F1001: { floor: 'first', x: 87, y: 42 },
  F3007: { floor: 'third', x: 87, y: 35 },
  F3013: { floor: 'third', x: 87, y: 24 },
};

export function positionForRoom(room: string, floor: CampusFloorId) {
  const anchor = ROOM_ANCHORS[room.toUpperCase()];
  if (anchor && anchor.floor === floor) return { x: anchor.x, y: anchor.y };
  const number = Number(room.match(/\d+/)?.[0] ?? 0);
  const lastTwo = number % 100;
  const lastThree = number % 1000;
  return {
    x: 13 + ((lastThree * 7) % 74),
    y: 20 + ((lastTwo * 11) % 24),
  };
}
