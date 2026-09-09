import type { Assignment, Course, Note } from './school.ts';

export function indexCourses(courses: Course[]) {
  return new Map(courses.map((course) => [course.id, course]));
}

export function summarizeAssignments(assignments: Assignment[]) {
  const byStatus: Record<Assignment['status'], Assignment[]> = {
    'To do': [],
    'In progress': [],
    Done: [],
  };
  const byDate = new Map<string, Assignment[]>();
  const byClass = new Map<string, { total: number; done: number }>();
  for (const assignment of assignments) {
    byStatus[assignment.status].push(assignment);
    const day = byDate.get(assignment.dueDate);
    if (day) day.push(assignment);
    else byDate.set(assignment.dueDate, [assignment]);
    const counts = byClass.get(assignment.classId) ?? { total: 0, done: 0 };
    counts.total++;
    if (assignment.status === 'Done') counts.done++;
    byClass.set(assignment.classId, counts);
  }
  return { byStatus, byDate, byClass };
}

export function filterAssignments(
  assignments: Assignment[],
  courses: Map<string, Course>,
  query: string,
  classId: string,
  status: string,
  today: string,
) {
  return assignments.filter(
    (a) =>
      (!classId || a.classId === classId) &&
      (status === 'All' ||
        (status === 'Overdue'
          ? a.status !== 'Done' && a.dueDate < today
          : a.status === status)) &&
      (!query ||
        [a.title, a.description, courses.get(a.classId)?.name].some((value) =>
          value?.toLowerCase().includes(query),
        )),
  );
}

export function filterNotes(
  notes: Note[],
  courses: Map<string, Course>,
  query: string,
  classId: string,
) {
  return notes.filter(
    (n) =>
      (!classId || n.classId === classId) &&
      (!query ||
        [n.title, n.content, courses.get(n.classId)?.name].some((value) =>
          value?.toLowerCase().includes(query),
        )),
  );
}
