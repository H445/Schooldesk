import { applyMutation, type Mutation } from './actions.ts';
import { makeOfflineWorkspace, type SchoolData } from './school.ts';

const STORAGE_KEY = 'schooldesk.workspace.v1';
// Mutations preserve unchanged arrays. Reuse their serialized form, so
// completing an assignment does not re-encode every note on the device.
const serializedCollections = new WeakMap<object, string>();
function serializeCollection(collection: SchoolData[keyof SchoolData]) {
  let serialized = serializedCollections.get(collection);
  if (serialized === undefined) {
    serialized = JSON.stringify(collection);
    serializedCollections.set(collection, serialized);
  }
  return serialized;
}

export function serializeWorkspace(workspace: LocalWorkspace) {
  const { classes, assignments, notes } = workspace.data;
  return `{"data":{"classes":${serializeCollection(classes)},"assignments":${serializeCollection(assignments)},"notes":${serializeCollection(notes)}},"revision":${workspace.revision}}`;
}

export type LocalWorkspace = { data: SchoolData; revision: number };

function isWorkspace(value: unknown): value is LocalWorkspace {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LocalWorkspace>;
  return (
    Number.isInteger(candidate.revision) &&
    !!candidate.data &&
    Array.isArray(candidate.data.classes) &&
    Array.isArray(candidate.data.assignments) &&
    Array.isArray(candidate.data.notes)
  );
}

export function loadLocalWorkspace(): LocalWorkspace {
  if (typeof localStorage === 'undefined')
    return { data: makeOfflineWorkspace(), revision: 0 };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = { data: makeOfflineWorkspace(), revision: 0 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isWorkspace(parsed)) return parsed;
  } catch {
    // A malformed local record is replaced with a fresh workspace below.
  }
  const reset = { data: makeOfflineWorkspace(), revision: 0 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
  return reset;
}

export function saveLocalMutation(
  current: LocalWorkspace,
  mutation: Mutation,
): LocalWorkspace {
  const next = {
    data: applyMutation(current.data, mutation),
    revision: current.revision + 1,
  };
  localStorage.setItem(STORAGE_KEY, serializeWorkspace(next));
  return next;
}
