export type ClassSchedule = {
  weekdays: number[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  location?: string;
};
export type ReferenceKind = 'url' | 'file' | 'image' | 'pdf';
export type Reference = {
  id: string;
  title: string;
  kind: ReferenceKind;
  href: string;
  mimeType?: string;
  size?: number;
  description?: string;
  createdAt: string;
};
export const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function meetsOn(course: Course, date: string) {
  const weekday = new Date(date + 'T12:00:00').getDay();
  return schedulesFor(course).some(
    (s) =>
      date >= s.startDate && date <= s.endDate && s.weekdays.includes(weekday),
  );
}
export function schedulesFor(course: Partial<Course>) {
  return (
    course.calendarSchedules ??
    (course.calendarSchedule ? [course.calendarSchedule] : [])
  );
}
export function meetingsOn(courses: Course[], date: string): Course[] {
  const weekday = new Date(date + 'T12:00:00').getDay();
  const meetings: Course[] = [];
  for (const course of courses) {
    for (const schedule of schedulesFor(course)) {
      if (
        date >= schedule.startDate &&
        date <= schedule.endDate &&
        schedule.weekdays.includes(weekday)
      ) {
        meetings.push({ ...course, calendarSchedule: schedule });
      }
    }
  }
  return meetings.sort((a, b) =>
    a.calendarSchedule!.startTime.localeCompare(b.calendarSchedule!.startTime),
  );
}
export function classScheduleLabel(course: Course) {
  const schedules = schedulesFor(course);
  return schedules.length
    ? schedules
        .map(
          (s) =>
            `${s.weekdays.map((d) => weekdays[d]).join(' & ')} · ${s.startTime}–${s.endTime}${s.location ? ' · ' + s.location : ''}`,
        )
        .join('; ')
    : course.schedule;
}
export type Course = {
  id: string;
  name: string;
  code: string;
  teacher: string;
  schedule: string;
  calendarSchedule?: ClassSchedule | null;
  calendarSchedules?: ClassSchedule[];
  color: string;
  example?: boolean;
  references?: Reference[];
};
export type Assignment = {
  id: string;
  title: string;
  classId: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'To do' | 'In progress' | 'Done';
  description: string;
  example?: boolean;
};
export type Note = {
  id: string;
  title: string;
  classId: string;
  content: string;
  updatedAt: string;
  example?: boolean;
  references?: Reference[];
};
export type SchoolData = {
  schoolId?: string;
  classes: Course[];
  assignments: Assignment[];
  notes: Note[];
};
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function makeExamples(): SchoolData {
  const date = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return localDate(d);
  };
  return {
    classes: [
      {
        id: 'example-bio',
        name: 'Biology',
        code: 'BIO 101',
        teacher: 'Dr. Sarah Mitchell',
        schedule: 'Mon & Wed · 10:00 AM',
        color: '#9170df',
        example: true,
      },
      {
        id: 'example-math',
        name: 'Calculus',
        code: 'MATH 201',
        teacher: 'Prof. James Chen',
        schedule: 'Tue & Thu · 11:30 AM',
        color: '#518dd1',
        example: true,
      },
      {
        id: 'example-eng',
        name: 'English Literature',
        code: 'ENG 102',
        teacher: 'Prof. Emily Parker',
        schedule: 'Mon & Fri · 1:00 PM',
        color: '#d79446',
        example: true,
      },
      {
        id: 'example-psych',
        name: 'Psychology',
        code: 'PSY 101',
        teacher: 'Dr. Alex Rivera',
        schedule: 'Wed & Fri · 9:00 AM',
        color: '#54957d',
        example: true,
      },
    ],
    assignments: [
      {
        id: 'example-a1',
        title: 'Cell structure lab report',
        classId: 'example-bio',
        dueDate: date(0),
        priority: 'High',
        status: 'In progress',
        description:
          'Summarize observations and label the cell structures from the lab.',
        example: true,
      },
      {
        id: 'example-a2',
        title: 'Problem set: derivatives',
        classId: 'example-math',
        dueDate: date(1),
        priority: 'High',
        status: 'To do',
        description: 'Complete chapter 3 practice problems.',
        example: true,
      },
      {
        id: 'example-a3',
        title: 'The Great Gatsby — analysis',
        classId: 'example-eng',
        dueDate: date(2),
        priority: 'Medium',
        status: 'In progress',
        description: 'Draft a character analysis with supporting quotations.',
        example: true,
      },
      {
        id: 'example-a4',
        title: 'Research methods quiz',
        classId: 'example-psych',
        dueDate: date(4),
        priority: 'Medium',
        status: 'To do',
        description: 'Review experimental design and common biases.',
        example: true,
      },
      {
        id: 'example-a5',
        title: 'Chapter 4 reading response',
        classId: 'example-bio',
        dueDate: date(6),
        priority: 'Low',
        status: 'To do',
        description: 'Write a short response to the chapter questions.',
        example: true,
      },
      {
        id: 'example-a6',
        title: 'Limits practice',
        classId: 'example-math',
        dueDate: date(-1),
        priority: 'Medium',
        status: 'Done',
        description: 'Practice one-sided limits and continuity.',
        example: true,
      },
      {
        id: 'example-a7',
        title: 'Introduction to psychology',
        classId: 'example-psych',
        dueDate: date(-2),
        priority: 'Low',
        status: 'Done',
        description: 'Read the introductory chapter.',
        example: true,
      },
      {
        id: 'example-a8',
        title: 'Literary devices worksheet',
        classId: 'example-eng',
        dueDate: date(-3),
        priority: 'Low',
        status: 'Done',
        description: 'Identify metaphor, imagery, and symbolism.',
        example: true,
      },
    ],
    notes: [
      {
        id: 'example-n1',
        title: 'Cell biology essentials',
        classId: 'example-bio',
        content:
          'Cell theory\n\n• All living things are made of cells.\n• The cell is the basic unit of life.\n• All cells arise from existing cells.\n\nReview: compare prokaryotic and eukaryotic cells before the next lab.',
        updatedAt: new Date().toISOString(),
        example: true,
      },
      {
        id: 'example-n2',
        title: 'Derivative rules & shortcuts',
        classId: 'example-math',
        content:
          'Power rule: d/dx (xⁿ) = n · xⁿ⁻¹\n\nProduct rule: (fg)′ = f′g + fg′\n\nChain rule: (f(g(x)))′ = f′(g(x)) · g′(x)\n\nRemember to simplify before differentiating.',
        updatedAt: new Date().toISOString(),
        example: true,
      },
      {
        id: 'example-n3',
        title: 'Gatsby: themes & symbolism',
        classId: 'example-eng',
        content:
          'Themes to explore\n\n• The American Dream\n• Wealth and social class\n• The past and idealism\n\nThe green light: a symbol of hope and an unreachable future. Find specific passages to support the analysis.',
        updatedAt: new Date().toISOString(),
        example: true,
      },
    ],
  };
}

/** The first-run workspace for the offline desktop app. */
export function makeOfflineWorkspace(): SchoolData {
  const meeting = (
    day: number,
    startTime: string,
    endTime: string,
    room: string,
  ): ClassSchedule => ({
    weekdays: [day],
    startTime,
    endTime,
    startDate: '2026-09-08',
    endDate: '2026-12-18',
    location: `Main Building · ${room}`,
  });
  const course = (
    id: string,
    code: string,
    name: string,
    color: string,
    calendarSchedules: ClassSchedule[],
    teacher = '',
  ): Course => ({
    id,
    name,
    code,
    teacher,
    schedule: '',
    calendarSchedule: calendarSchedules[0] ?? null,
    calendarSchedules,
    color,
  });
  return {
    schoolId: 'st-clair-windsor-main',
    classes: [
      course('mad-103-002', 'MAD 103 - 002', 'MAD 103 - 002', '#518dd1', [
        meeting(1, '11:00', '14:00', 'A2134'),
      ]),
      course('mit-313g-002', 'MIT 313G - 002', 'MIT 313G - 002', '#d79446', [
        meeting(1, '15:00', '18:00', 'Location TBA'),
      ]),
      course('mth-100a-001', 'MTH 100A - 001', 'MTH 100A - 001', '#54957d', [
        meeting(2, '11:00', '12:00', 'A2612'),
        meeting(5, '12:00', '14:00', 'A2612'),
      ]),
      course(
        'web-110-002',
        'WEB 110 - 002',
        'HTML + CSS',
        '#9170df',
        [
          meeting(2, '15:00', '17:00', 'A2134'),
          meeting(5, '10:00', '12:00', 'A2134'),
        ],
        'Chad Woodward',
      ),
      course('mit-146-002', 'MIT 146 - 002', 'MIT 146 - 002', '#d57790', [
        meeting(3, '08:00', '10:00', 'A3302'),
        meeting(3, '11:00', '14:00', 'A0336'),
      ]),
      course('mad-107-002', 'MAD 107 - 002', 'MAD 107 - 002', '#737d91', [
        meeting(3, '15:00', '17:00', 'A0341'),
        meeting(4, '12:00', '14:00', 'A0341'),
      ]),
    ],
    assignments: [],
    notes: [],
  };
}
