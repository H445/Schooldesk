import type { SchoolData, Course, Assignment, Note } from './school';
export type Mutation = {
  action: 'save' | 'delete' | 'clearExamples';
  kind?: 'classes' | 'assignments' | 'notes';
  record?: unknown;
  id?: string;
};
const text = (v: unknown, name: string, max = 200, required = false) => {
  if (typeof v !== 'string' || v.length > max || (required && !v.trim()))
    throw new Error(`Enter a valid ${name}${required ? ' (required)' : ''}.`);
  return v.trim();
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid record.');
  return value as Record<string, unknown>;
}
export function applyMutation(current: SchoolData, input: unknown): SchoolData {
  const m = record(input);
  const d = structuredClone(current);
  if (m.action === 'clearExamples') {
    const keepClasses = new Set(
      [...d.assignments, ...d.notes]
        .filter((r) => !r.example)
        .map((r) => r.classId),
    );
    d.classes = d.classes
      .filter((c) => !c.example || keepClasses.has(c.id))
      .map((c) => ({ ...c, example: false }));
    d.assignments = d.assignments.filter((a) => !a.example);
    d.notes = d.notes.filter((n) => !n.example);
    return d;
  }
  if (!['classes', 'assignments', 'notes'].includes(String(m.kind)))
    throw new Error('Invalid item type.');
  const kind = m.kind as 'classes' | 'assignments' | 'notes';
  if (m.action === 'delete') {
    const id = text(m.id, 'item ID', 100, true);
    if (!d[kind].some((r) => r.id === id))
      throw new Error('This item no longer exists.');
    if (kind === 'classes') {
      d.classes = d.classes.filter((c) => c.id !== id);
      d.assignments = d.assignments.map((a) =>
        a.classId === id ? { ...a, classId: '' } : a,
      );
      d.notes = d.notes.map((n) =>
        n.classId === id ? { ...n, classId: '' } : n,
      );
    } else if (kind === 'assignments')
      d.assignments = d.assignments.filter((a) => a.id !== id);
    else d.notes = d.notes.filter((n) => n.id !== id);
    return d;
  }
  if (m.action !== 'save') throw new Error('Unknown action.');
  const r = record(m.record);
  const id = text(r.id, 'item ID', 100, true);
  const previous = d[kind].find((item) => item.id === id);
  if (!previous && d[kind].length >= 2000)
    throw new Error('Workspace limit reached. Remove some items first.');
  const classId = kind === 'classes' ? '' : text(r.classId ?? '', 'class', 100);
  if (classId && !d.classes.some((c) => c.id === classId))
    throw new Error('Choose an existing class.');
  let value: Course | Assignment | Note;
  if (kind === 'classes') {
    const color = text(r.color, 'color', 7, true);
    if (!/^#[a-f\d]{6}$/i.test(color))
      throw new Error('Choose a valid class color.');
    value = {
      id,
      name: text(r.name, 'class name', 150, true),
      code: text(r.code ?? '', 'class code', 30),
      teacher: text(r.teacher ?? '', 'teacher', 150),
      schedule: text(r.schedule ?? '', 'schedule', 200),
      color,
      example: false,
    };
  } else if (kind === 'assignments') {
    const dueDate = text(r.dueDate, 'due date', 10, true);
    const date = new Date(dueDate + 'T12:00:00Z');
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dueDate
    )
      throw new Error('Choose a valid due date.');
    if (
      !['Low', 'Medium', 'High'].includes(String(r.priority)) ||
      !['To do', 'In progress', 'Done'].includes(String(r.status))
    )
      throw new Error('Choose a valid priority and status.');
    value = {
      id,
      title: text(r.title, 'assignment title', 200, true),
      classId,
      dueDate,
      priority: r.priority as Assignment['priority'],
      status: r.status as Assignment['status'],
      description: text(r.description ?? '', 'description', 10000),
      example: false,
    };
  } else
    value = {
      id,
      title: text(r.title, 'note title', 200, true),
      classId,
      content: text(r.content ?? '', 'note', 50000),
      updatedAt: new Date().toISOString(),
      example: false,
    };
  // Editing an example turns it into your own record.
  if (kind === 'classes')
    d.classes = previous
      ? d.classes.map((c) => (c.id === id ? (value as Course) : c))
      : [...d.classes, value as Course];
  if (kind === 'assignments')
    d.assignments = previous
      ? d.assignments.map((a) => (a.id === id ? (value as Assignment) : a))
      : [...d.assignments, value as Assignment];
  if (kind === 'notes')
    d.notes = previous
      ? d.notes.map((n) => (n.id === id ? (value as Note) : n))
      : [value as Note, ...d.notes];
  return d;
}
