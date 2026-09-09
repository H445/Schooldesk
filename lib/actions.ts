import type {
  SchoolData,
  Course,
  Assignment,
  Note,
  Reference,
  ReferenceKind,
} from './school';
import { MAX_REFERENCE_BYTES, referenceAssetId } from './reference-storage.ts';
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
function validateReferences(input: unknown): Reference[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw new Error('References must be a list.');
  return input.map((value) => {
    const r = record(value);
    const id = text(r.id, 'reference ID', 100, true);
    const title = text(r.title, 'reference title', 180, true);
    const kind = text(r.kind, 'reference type', 10, true) as ReferenceKind;
    if (!['url', 'file', 'image', 'pdf'].includes(kind))
      throw new Error('Choose a valid reference type.');
    const href = text(
      r.href,
      'reference link',
      kind === 'url' ? 2_000 : Math.ceil(MAX_REFERENCE_BYTES * 1.4) + 128,
      true,
    );
    const mimeType =
      r.mimeType === undefined ? undefined : text(r.mimeType, 'file type', 100);
    const size = r.size === undefined ? undefined : Number(r.size);
    if (
      size !== undefined &&
      (!Number.isSafeInteger(size) || size < 0 || size > MAX_REFERENCE_BYTES)
    )
      throw new Error('Reference file is too large.');
    if (kind === 'url') {
      let parsed: URL;
      try {
        parsed = new URL(href);
      } catch {
        throw new Error('Enter a valid web link.');
      }
      if (!['http:', 'https:'].includes(parsed.protocol))
        throw new Error('Web links must use http or https.');
    } else {
      const assetId = referenceAssetId(href);
      if (assetId) {
        if (size === undefined)
          throw new Error('Uploaded references need a file size.');
      } else if (!href.startsWith('data:'))
        throw new Error('Uploaded references must contain local file data.');
      if (!assetId) {
        const comma = href.indexOf(',');
        const encoded = comma < 0 ? '' : href.slice(comma + 1);
        if (
          !comma ||
          !encoded ||
          encoded.length > Math.ceil(MAX_REFERENCE_BYTES * 1.4)
        )
          throw new Error('Reference file is too large.');
      }
      if (kind === 'image' && !mimeType?.startsWith('image/'))
        throw new Error('Image references must be image files.');
      if (kind === 'pdf' && mimeType !== 'application/pdf')
        throw new Error('PDF references must be PDF files.');
    }
    return {
      id,
      title,
      kind,
      href,
      ...(mimeType === undefined ? {} : { mimeType }),
      ...(size === undefined ? {} : { size }),
      ...(r.description === undefined
        ? {}
        : { description: text(r.description, 'reference description', 400) }),
      createdAt: text(
        r.createdAt ?? new Date().toISOString(),
        'reference date',
        40,
        true,
      ),
    };
  });
}
export function applyMutation(current: SchoolData, input: unknown): SchoolData {
  const m = record(input);
  // Preserve untouched records so large notes are not copied on every save
  // and derived UI caches stay valid for unchanged collections.
  const d = { ...current };
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
    const prior = previous as Course | undefined;
    const rawSchedules =
      r.calendarSchedules !== undefined
        ? r.calendarSchedules
        : r.calendarSchedule !== undefined
          ? r.calendarSchedule
            ? [r.calendarSchedule]
            : []
          : (prior?.calendarSchedules ??
            (prior?.calendarSchedule ? [prior.calendarSchedule] : []));
    if (!Array.isArray(rawSchedules) || rawSchedules.length > 20)
      throw new Error('A class can have up to 20 meeting schedules.');
    const calendarSchedules = rawSchedules.map((s) => {
      const validated = validateSchedule(s);
      if (!validated) throw new Error('Invalid meeting schedule.');
      return validated;
    });
    value = {
      id,
      name: text(r.name, 'class name', 150, true),
      code: text(r.code ?? '', 'class code', 30),
      teacher: text(r.teacher ?? '', 'teacher', 150),
      schedule: text(r.schedule ?? '', 'schedule', 200),
      calendarSchedule: calendarSchedules[0] ?? null,
      calendarSchedules,
      color,
      references:
        r.references === undefined
          ? (prior?.references ?? [])
          : validateReferences(r.references),
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
      // Assignments do not own references; keeping this branch explicit makes
      // the supported attachment targets clear.
      example: false,
    };
  } else
    value = {
      id,
      title: text(r.title, 'note title', 200, true),
      classId,
      content: text(r.content ?? '', 'note', 50000),
      references:
        r.references === undefined
          ? ((previous as Note | undefined)?.references ?? [])
          : validateReferences(r.references),
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

function validateSchedule(input: unknown): Course['calendarSchedule'] {
  if (input == null) return null;
  const s = record(input);
  if (
    !Array.isArray(s.weekdays) ||
    !s.weekdays.length ||
    s.weekdays.length > 7 ||
    s.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  )
    throw new Error('Select at least one valid weekday.');
  const startTime = text(s.startTime, 'start time', 5, true);
  const endTime = text(s.endTime, 'end time', 5, true);
  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) ||
    endTime <= startTime
  )
    throw new Error('End time must be later than start time on the same day.');
  const startDate = text(s.startDate, 'first date', 10, true);
  const endDate = text(s.endDate, 'last date', 10, true);
  for (const date of [startDate, endDate]) {
    const parsed = new Date(date + 'T12:00:00Z');
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date
    )
      throw new Error('Choose valid semester dates.');
  }
  if (endDate < startDate)
    throw new Error('Last date must be on or after the first date.');
  return {
    weekdays: [...new Set(s.weekdays as number[])].sort((a, b) => a - b),
    startTime,
    endTime,
    startDate,
    endDate,
    ...(s.location === undefined
      ? {}
      : { location: text(s.location, 'meeting location', 200) }),
  };
}
