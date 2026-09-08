export type ClassSchedule = {
  weekdays: number[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  location?: string;
};
export const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function meetsOn(course: Course, date: string) {
  return schedulesFor(course).some(
    (s) =>
      date >= s.startDate &&
      date <= s.endDate &&
      s.weekdays.includes(new Date(date + 'T12:00:00').getDay()),
  );
}
export function schedulesFor(course: Partial<Course>) {
  return (
    course.calendarSchedules ??
    (course.calendarSchedule ? [course.calendarSchedule] : [])
  );
}
export function meetingsOn(courses: Course[], date: string): Course[] {
  return courses
    .flatMap((c) =>
      schedulesFor(c)
        .filter((s) => meetsOn({ ...c, calendarSchedules: [s] }, date))
        .map((s) => ({ ...c, calendarSchedule: s })),
    )
    .sort((a, b) =>
      a.calendarSchedule!.startTime.localeCompare(
        b.calendarSchedule!.startTime,
      ),
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
};
export type SchoolData = {
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
