'use client';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  type SetStateAction,
} from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  File,
  FileImage,
  FileText,
  GraduationCap,
  LayoutDashboard,
  List,
  ListTodo,
  Link2,
  Columns3,
  Pencil,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  localDate,
  makeOfflineWorkspace,
  meetingsOn,
  schedulesFor,
  type ClassSchedule,
  classScheduleLabel,
  weekdays,
  type Course,
  type Assignment,
  type Note,
  type Reference,
  type ReferenceKind,
  type SchoolData,
} from '@/lib/school';
import type { Mutation } from '@/lib/actions';
import {
  indexCourses,
  summarizeAssignments,
  filterAssignments,
  filterNotes,
} from '@/lib/workspace-index';
import {
  loadLocalWorkspace,
  saveLocalMutation,
  type LocalWorkspace,
} from '@/lib/local-workspace';

type View =
  | 'Overview'
  | 'Classes'
  | 'Assignments'
  | 'Notes'
  | 'References'
  | 'Calendar';
type Editor = {
  kind: 'classes' | 'assignments' | 'notes';
  item?: Course | Assignment | Note;
};
type ReferenceEntry = {
  reference: Reference;
  ownerKind: 'classes' | 'notes';
  ownerId: string;
  ownerClassId: string;
  ownerName: string;
};
const navigation: { icon: LucideIcon; label: View }[] = [
  { icon: LayoutDashboard, label: 'Overview' },
  { icon: BookOpen, label: 'Classes' },
  { icon: ListTodo, label: 'Assignments' },
  { icon: FileText, label: 'Notes' },
  { icon: Paperclip, label: 'References' },
  { icon: CalendarDays, label: 'Calendar' },
];
const statuses: Assignment['status'][] = ['To do', 'In progress', 'Done'];
const colors = [
  '#9170df',
  '#518dd1',
  '#d79446',
  '#54957d',
  '#d57790',
  '#737d91',
];
const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});
const dateLabel = (date: string) =>
  shortDate.format(new Date(date + 'T12:00:00'));

export default function SchoolDashboard() {
  const [workspace, setWorkspace] = useState(() => {
    try {
      return { ...loadLocalWorkspace(), loaded: true, error: '' };
    } catch (e) {
      return {
        data: makeOfflineWorkspace(),
        revision: 0,
        loaded: false,
        error:
          e instanceof Error ? e.message : 'Unable to load your workspace.',
      };
    }
  });
  const { data, loaded, error } = workspace;
  const snapshot = useRef<LocalWorkspace>(workspace);
  const setError = useCallback(
    (error: string) => setWorkspace((current) => ({ ...current, error })),
    [],
  );
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [toast, setToast] = useState('');
  const [view, setView] = useState<View>('Overview');
  const [classId, setClassId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [referenceKindFilter, setReferenceKindFilter] = useState('All');
  const [layout, setLayout] = useState<'list' | 'board'>('list');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [referenceManagerOpen, setReferenceManagerOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    mutation: Mutation;
    title: string;
    description: string;
  } | null>(null);
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDay, setSelectedDay] = useState('');
  const today = localDate();
  const accept = useCallback(
    (result: { data: SchoolData; revision: number }) => {
      snapshot.current = result;
      setWorkspace({ ...result, loaded: true, error: '' });
    },
    [],
  );
  const reload = useCallback(async () => {
    setError('');
    try {
      const result = loadLocalWorkspace();
      accept(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to load your workspace.',
      );
    }
  }, [accept, setError]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  const mutate = useCallback(
    async (mutation: Mutation, message = 'Saved to your workspace') => {
      if (lock.current) throw new Error('A save is already in progress.');
      lock.current = true;
      setBusy(true);
      setError('');
      try {
        const result = saveLocalMutation(snapshot.current, mutation);
        accept(result);
        setToast(message);
        return result;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not save changes.');
        throw e;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [accept, setError],
  );
  const act = (m: Mutation, message?: string) => {
    void mutate(m, message).catch(() => {});
  };
  const navigate = (next: View, id = '') => {
    setView(next);
    setClassId(id);
    setStatusFilter('All');
    setReferenceKindFilter('All');
    setSelectedDay('');
    setQuery('');
  };
  const openEditor = (kind: Editor['kind'], item?: Editor['item']) => {
    if (loaded && !busy) {
      setError('');
      setEditor({ kind, item });
    }
  };
  const finish = (a: Assignment) =>
    act(
      {
        action: 'save',
        kind: 'assignments',
        record: { ...a, status: a.status === 'Done' ? 'To do' : 'Done' },
      },
      a.status === 'Done' ? 'Assignment reopened' : 'Assignment completed',
    );
  const courseIndex = useMemo(() => indexCourses(data.classes), [data.classes]);
  const activeClass = courseIndex.get(classId);
  const search = query.toLowerCase().trim();
  const sortedAssignments = useMemo(
    () =>
      [...data.assignments].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [data.assignments],
  );
  const sortedNotes = useMemo(
    () =>
      [...data.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.notes],
  );
  const assignments = useMemo(
    () =>
      filterAssignments(
        sortedAssignments,
        courseIndex,
        search,
        classId,
        statusFilter,
        today,
      ),
    [sortedAssignments, courseIndex, search, classId, statusFilter, today],
  );
  const notes = useMemo(
    () => filterNotes(sortedNotes, courseIndex, search, classId),
    [sortedNotes, courseIndex, search, classId],
  );
  const classes = useMemo(
    () =>
      data.classes.filter(
        (c) =>
          !search ||
          [c.name, c.code, c.teacher].some((v) =>
            v.toLowerCase().includes(search),
          ),
      ),
    [data.classes, search],
  );
  const calendarCourses = useMemo(
    () =>
      data.classes.filter(
        (c) =>
          (!classId || c.id === classId) &&
          (!search ||
            [c.name, c.code, c.schedule].some((v) =>
              v.toLowerCase().includes(search),
            )),
      ),
    [data.classes, classId, search],
  );
  const calendarMeetings = useMemo(() => {
    const days = new Map<string, Course[]>();
    if (view !== 'Calendar') return days;
    const count =
      Math.ceil(
        (month.getDay() +
          new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) /
          7,
      ) * 7;
    for (let i = 0; i < count; i++) {
      const day = localDate(
        new Date(month.getFullYear(), month.getMonth(), i - month.getDay() + 1),
      );
      days.set(day, meetingsOn(calendarCourses, day));
    }
    return days;
  }, [view, month, calendarCourses]);
  const totals = useMemo(
    () => summarizeAssignments(data.assignments),
    [data.assignments],
  );
  const filteredTotals = useMemo(
    () => summarizeAssignments(assignments),
    [assignments],
  );
  const allReferences = useMemo<ReferenceEntry[]>(
    () => [
      ...data.classes.flatMap((course) =>
        (course.references ?? []).map((reference) => ({
          reference,
          ownerKind: 'classes' as const,
          ownerId: course.id,
          ownerClassId: course.id,
          ownerName: course.name,
        })),
      ),
      ...data.notes.flatMap((note) =>
        (note.references ?? []).map((reference) => ({
          reference,
          ownerKind: 'notes' as const,
          ownerId: note.id,
          ownerClassId: note.classId,
          ownerName: note.title,
        })),
      ),
    ],
    [data.classes, data.notes],
  );
  const references = useMemo(
    () =>
      allReferences.filter(
        ({ reference, ownerClassId, ownerName }) =>
          (!classId ||
            (classId === '__general'
              ? ownerClassId === ''
              : ownerClassId === classId)) &&
          (referenceKindFilter === 'All' ||
            reference.kind === referenceKindFilter) &&
          (!search ||
            [
              reference.title,
              ownerName,
              ...(reference.kind === 'url' ? [reference.href] : []),
            ].some((value) => value.toLowerCase().includes(search))),
      ),
    [allReferences, classId, referenceKindFilter, search],
  );
  const completed = totals.byStatus.Done.length;
  const progress = data.assignments.length
    ? Math.round((completed / data.assignments.length) * 100)
    : 0;
  const hasExamples = useMemo(
    () =>
      data.classes.some((r) => r.example) ||
      data.assignments.some((r) => r.example) ||
      data.notes.some((r) => r.example),
    [data],
  );
  const incomplete = useMemo(
    () => assignments.filter((a) => a.status !== 'Done'),
    [assignments],
  );
  const upNext = useMemo(() => incomplete.slice(0, 5), [incomplete]);
  const stats: {
    icon: LucideIcon;
    label: string;
    value: number;

    color: string;
    target: View;
    filter?: string;
  }[] = [
    {
      icon: BookOpen,
      label: 'Active classes',
      value: data.classes.length,

      color: 'violet',
      target: 'Classes',
    },
    {
      icon: ListTodo,
      label: 'To do',
      value: totals.byStatus['To do'].length,

      color: 'blue',
      target: 'Assignments',
      filter: 'To do',
    },
    {
      icon: Target,
      label: 'In progress',
      value: totals.byStatus['In progress'].length,

      color: 'orange',
      target: 'Assignments',
      filter: 'In progress',
    },
    {
      icon: CheckCheck,
      label: 'Completed',
      value: completed,

      color: 'green',
      target: 'Assignments',
      filter: 'Done',
    },
  ];
  const heading = activeClass?.name || view;
  const primaryKind =
    view === 'Classes' && !activeClass
      ? 'classes'
      : view === 'Notes'
        ? 'notes'
        : 'assignments';
  const isReferenceView = view === 'References';
  const kindLabel = (kind: Editor['kind']) =>
    kind === 'classes' ? 'class' : kind === 'notes' ? 'note' : 'assignment';
  const removeReference = (entry: ReferenceEntry) => {
    const owner =
      entry.ownerKind === 'classes'
        ? courseIndex.get(entry.ownerId)
        : data.notes.find((note) => note.id === entry.ownerId);
    if (!owner) return;
    act(
      {
        action: 'save',
        kind: entry.ownerKind,
        record: {
          ...owner,
          references: (owner.references ?? []).filter(
            (reference) => reference.id !== entry.reference.id,
          ),
        },
      },
      'Reference removed',
    );
  };
  const addReferencesToOwner = async (
    ownerKind: 'classes' | 'notes',
    ownerId: string,
    added: Reference[],
  ) => {
    const owner =
      ownerKind === 'classes'
        ? courseIndex.get(ownerId)
        : data.notes.find((note) => note.id === ownerId);
    if (!owner) throw new Error('Choose an existing class or note.');
    await mutate(
      {
        action: 'save',
        kind: ownerKind,
        record: {
          ...owner,
          references: [...(owner.references ?? []), ...added],
        },
      },
      'References added',
    );
    setReferenceManagerOpen(false);
  };
  const removeExamples = () =>
    setConfirm({
      mutation: { action: 'clearExamples' },
      title: 'Make this workspace yours',
      description:
        'Remove the example classes, assignments, and notes. Anything you added or edited will be kept.',
    });
  const table = (items: Assignment[]) =>
    items.length ? (
      <PagedItems items={items} label="assignments">
        {(visible) => (
          <div className="table-scroll">
            <table className="assignment-table">
              <thead>
                <tr>
                  <th>Assignment</th>
                  <th>
                    Due date <ArrowDown size={12} />
                  </th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="assignment-name">
                        <button
                          disabled={!loaded || busy}
                          onClick={() => finish(a)}
                          className={`check-button ${a.status === 'Done' ? 'checked' : ''}`}
                          aria-label={`${a.status === 'Done' ? 'Reopen' : 'Complete'} ${a.title}`}
                        >
                          {a.status === 'Done' && <Check size={12} />}
                        </button>
                        <button
                          className={`assignment-title ${a.status === 'Done' ? 'completed-title' : ''}`}
                          onClick={() => openEditor('assignments', a)}
                        >
                          <strong>{a.title}</strong>
                          <CourseLabel course={courseIndex.get(a.classId)} />
                        </button>
                      </div>
                    </td>
                    <td>
                      <span
                        className={
                          a.status !== 'Done' && a.dueDate <= today
                            ? 'due-today'
                            : ''
                        }
                      >
                        {a.dueDate === today ? 'Today' : dateLabel(a.dueDate)}
                      </span>
                      {a.status !== 'Done' && a.dueDate < today && (
                        <small className="overdue-label">Overdue</small>
                      )}
                    </td>
                    <td>
                      <span
                        className={`priority priority-${a.priority.toLowerCase()}`}
                      >
                        <span />
                        {a.priority}
                      </span>
                    </td>
                    <td>
                      <select
                        aria-label={`Status of ${a.title}`}
                        disabled={!loaded || busy}
                        className={`status-select status status-${a.status.toLowerCase().replaceAll(' ', '-')}`}
                        value={a.status}
                        onChange={(e) =>
                          act({
                            action: 'save',
                            kind: 'assignments',
                            record: { ...a, status: e.target.value },
                          })
                        }
                      >
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PagedItems>
    ) : (
      <Empty
        icon={CheckCheck}
        title={query ? 'No matching assignments' : 'No assignments'}
        text={
          query
            ? 'Try another search or filter.'
            : 'Add an assignment to track it here.'
        }
      />
    );
  const cards = (items: Course[]) =>
    items.length ? (
      <PagedItems items={items} label="classes">
        {(visible) => (
          <div className="class-grid">
            {visible.map((c) => (
              <ClassCard
                key={`${c.id}-${c.calendarSchedule?.startTime || 'class'}`}
                course={c}
                counts={totals.byClass.get(c.id)}
                onClick={() => navigate('Classes', c.id)}
              />
            ))}
          </div>
        )}
      </PagedItems>
    ) : (
      <Empty
        icon={BookOpen}
        title={query ? 'No matching classes' : 'No classes'}
        text="Add a class to get started."
      />
    );
  const noteCards = (items: Note[]) =>
    items.length ? (
      <PagedItems items={items} label="notes">
        {(visible) => (
          <div className="notes-grid">
            {visible.map((n) => (
              <button
                className="note-card"
                key={n.id}
                onClick={() => openEditor('notes', n)}
              >
                <div className="note-card-top">
                  <span className="note-icon">
                    <FileText size={20} />
                  </span>
                  <CourseLabel course={courseIndex.get(n.classId)} />
                </div>
                <h3>{n.title}</h3>
                <p>
                  {n.content
                    ? n.content.length > 500
                      ? n.content.slice(0, 500) + '…'
                      : n.content
                    : 'No content yet. Open this note to start writing.'}
                </p>
                <div className="note-meta">
                  Edited {shortDate.format(new Date(n.updatedAt))}
                  {n.references?.length ? (
                    <span className="reference-count">
                      <Paperclip size={13} /> {n.references.length}
                    </span>
                  ) : null}
                  <ArrowRight size={15} />
                </div>
              </button>
            ))}
          </div>
        )}
      </PagedItems>
    ) : (
      <Empty
        icon={FileText}
        title={query ? 'No matching notes' : 'No notes'}
        text="Create a note using New note."
      />
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="/"
          aria-label="Schooldesk home"
          onClick={(event) => {
            event.preventDefault();
            navigate('Overview');
          }}
        >
          <span className="brand-symbol">
            <GraduationCap size={25} />
          </span>
          <span className="brand-word">
            schooldesk<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ icon: Icon, label }) => (
            <button
              key={label}
              title={label}
              aria-label={label}
              aria-current={view === label ? 'page' : undefined}
              onClick={() => navigate(label)}
              className={`nav-link ${view === label ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
              {label === 'Assignments' && (
                <span className="nav-count">
                  {data.assignments.length - completed}
                </span>
              )}
              {label === 'References' && allReferences.length > 0 && (
                <span className="nav-count">{allReferences.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="nav-label classes-label">
          MY CLASSES{' '}
          <button
            aria-label="Add class"
            disabled={!loaded || busy}
            onClick={() => openEditor('classes')}
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="side-courses">
          <PagedItems items={data.classes} label="sidebar classes">
            {(visible) =>
              visible.map((c) => (
                <button key={c.id} onClick={() => navigate('Classes', c.id)}>
                  <span className="color-dot" style={{ background: c.color }} />
                  {c.name}
                </button>
              ))
            }
          </PagedItems>
          {!data.classes.length && (
            <span className="sidebar-empty">No classes</span>
          )}
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            Workspace <span>/</span>
            <strong>{view}</strong>
            {activeClass && (
              <>
                <span>/</span>
                <strong className="breadcrumb-class">
                  {activeClass.code || activeClass.name}
                </strong>
              </>
            )}
          </div>
          <div className="topbar-right">
            <label className="search-box">
              <Search size={17} />
              <input
                aria-label="Search your workspace"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your workspace…"
              />
              {query ? (
                <button aria-label="Clear search" onClick={() => setQuery('')}>
                  <X size={15} />
                </button>
              ) : (
                <kbd>⌕</kbd>
              )}
            </label>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <h1>{heading}</h1>
              {activeClass && (
                <p>
                  {[
                    activeClass.code,
                    activeClass.teacher,
                    classScheduleLabel(activeClass),
                    activeClass.calendarSchedule ? activeClass.schedule : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
            <Button
              aria-label={`New ${isReferenceView ? 'reference' : kindLabel(primaryKind)}`}
              disabled={!loaded || busy}
              className="primary-button"
              onClick={() =>
                isReferenceView
                  ? setReferenceManagerOpen(true)
                  : openEditor(primaryKind)
              }
            >
              <Plus size={17} />
              <span>
                New {isReferenceView ? 'reference' : kindLabel(primaryKind)}
              </span>
            </Button>
          </div>
          <div className="date-line">
            <CalendarDays size={15} />
            {new Date(today + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
            {(busy || !loaded) && (
              <span role="status"> · {busy ? 'Saving…' : 'Loading…'}</span>
            )}
          </div>
          {error && (
            <div role="alert" className="error-banner">
              <span>{error}</span>
              {!loaded && (
                <button onClick={() => void reload()}>Try again</button>
              )}
              <button aria-label="Dismiss error" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {hasExamples && (
            <div className="example-banner">
              <div>
                <Sparkles size={16} />
                <span>Example data</span>
              </div>
              <button disabled={!loaded || busy} onClick={removeExamples}>
                Start fresh <ArrowRight size={15} />
              </button>
            </div>
          )}
          {view === 'Overview' && (
            <>
              <div className="stats-grid">
                {stats.map(
                  ({
                    icon: Icon,
                    label,
                    value,

                    color,
                    target,
                    filter,
                  }) => (
                    <button
                      className="stat-card"
                      key={label}
                      onClick={() => {
                        navigate(target);
                        if (filter) setStatusFilter(filter);
                      }}
                    >
                      <div className="stat-label">
                        {label}
                        <span className={`stat-icon ${color}`}>
                          <Icon size={18} />
                        </span>
                      </div>
                      <strong className="stat-value">
                        {value}
                        <span>
                          {label === 'Active classes'
                            ? 'this semester'
                            : 'assignments'}
                        </span>
                      </strong>
                    </button>
                  ),
                )}
              </div>
              <div className="overview-grid">
                <div className="overview-main">
                  <section className="panel assignments-panel">
                    <div className="section-heading">
                      <div>
                        <h2>
                          Up next{' '}
                          <span className="number-tag">
                            {incomplete.length}
                          </span>
                        </h2>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => navigate('Assignments')}
                      >
                        View all <ArrowRight size={15} />
                      </button>
                    </div>
                    {table(upNext)}
                    <button
                      className="panel-add"
                      disabled={!loaded || busy}
                      onClick={() => openEditor('assignments')}
                    >
                      <Plus size={16} />
                      Add assignment
                    </button>
                  </section>
                  <section className="classes-section">
                    <div className="section-heading">
                      <h2>
                        Your classes{' '}
                        <span className="number-tag">
                          {data.classes.length}
                        </span>
                      </h2>
                    </div>
                    {cards(classes)}
                    {!classes.length && !query && (
                      <Button
                        variant="outline"
                        className="empty-cta"
                        disabled={!loaded || busy}
                        onClick={() => openEditor('classes')}
                      >
                        <Plus />
                        Add your first class
                      </Button>
                    )}
                  </section>
                </div>
                <aside className="overview-aside">
                  <section className="progress-panel">
                    <div className="section-heading">
                      <h2>Making progress</h2>
                      <span className="stat-icon violet">
                        <Target size={18} />
                      </span>
                    </div>
                    <div
                      className="progress-ring"
                      role="img"
                      aria-label={`${progress}% of assignments complete`}
                      style={{
                        background: `conic-gradient(var(--link) ${progress}%, var(--surface-hover) 0)`,
                      }}
                    >
                      <div>
                        <strong>
                          {progress}
                          <span>%</span>
                        </strong>
                        <small>complete</small>
                      </div>
                    </div>
                    <p>
                      <strong>
                        {completed} of {data.assignments.length} assignments
                      </strong>{' '}
                      completed
                    </p>
                    <div className="progress-legend">
                      <span>
                        <i style={{ background: 'var(--link)' }} />
                        Completed
                      </span>
                      <span>
                        <i style={{ background: 'var(--surface-hover)' }} />
                        Remaining
                      </span>
                    </div>
                  </section>
                  <section className="panel notes-panel">
                    <div className="section-heading">
                      <h2>Recent notes</h2>
                      <button
                        className="icon-button"
                        aria-label="Add note"
                        disabled={!loaded || busy}
                        onClick={() => openEditor('notes')}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    {notes.slice(0, 3).map((n) => (
                      <button
                        className="note-preview"
                        key={n.id}
                        onClick={() => openEditor('notes', n)}
                      >
                        <span className="note-icon">
                          <FileText size={18} />
                        </span>
                        <div>
                          <strong>{n.title}</strong>
                          <CourseLabel course={courseIndex.get(n.classId)} />
                        </div>
                        <ArrowRight size={14} />
                      </button>
                    ))}
                    {!notes.length && <p className="mini-empty">No notes</p>}
                    <button
                      className="all-notes"
                      onClick={() => navigate('Notes')}
                    >
                      All notes <ArrowRight size={15} />
                    </button>
                  </section>
                </aside>
              </div>
            </>
          )}
          {view === 'Classes' && !activeClass && (
            <>
              <div className="section-heading view-section-heading">
                <h2>
                  All classes{' '}
                  <span className="number-tag">{classes.length}</span>
                </h2>
              </div>
              {cards(classes)}
            </>
          )}
          {view === 'Classes' && activeClass && (
            <>
              <div className="class-actions">
                <button
                  className="text-link"
                  onClick={() => navigate('Classes')}
                >
                  <ArrowLeft size={15} />
                  All classes
                </button>
                <Button
                  variant="outline"
                  onClick={() => openEditor('classes', activeClass)}
                >
                  <Pencil size={14} />
                  Edit class
                </Button>
              </div>
              <ReferencePreviewList references={activeClass.references} />
              <section className="panel assignments-panel">
                <div className="section-heading">
                  <h2>
                    Class assignments{' '}
                    <span className="number-tag">{assignments.length}</span>
                  </h2>
                  <button
                    className="text-link"
                    onClick={() => openEditor('assignments')}
                  >
                    <Plus size={15} />
                    Add assignment
                  </button>
                </div>
                {table(assignments)}
              </section>
              <div className="section-heading view-section-heading">
                <h2>
                  Class notes <span className="number-tag">{notes.length}</span>
                </h2>
                <button
                  className="text-link"
                  onClick={() => openEditor('notes')}
                >
                  <Plus size={15} />
                  Add note
                </button>
              </div>
              {noteCards(notes)}
            </>
          )}
          {(view === 'Assignments' ||
            view === 'Notes' ||
            view === 'References' ||
            view === 'Calendar') && (
            <div className="view-toolbar">
              <div className="filter-group">
                <select
                  aria-label="Filter by class"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  <option value="">All classes</option>
                  {data.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {view === 'References' && (
                    <option value="__general">General / no class</option>
                  )}
                </select>
                {view === 'Assignments' && (
                  <select
                    aria-label="Filter by status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option>All</option>
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                    <option>Overdue</option>
                  </select>
                )}
                {view === 'References' && (
                  <select
                    aria-label="Filter by reference type"
                    value={referenceKindFilter}
                    onChange={(e) => setReferenceKindFilter(e.target.value)}
                  >
                    <option>All</option>
                    <option value="url">Links</option>
                    <option value="image">Images</option>
                    <option value="pdf">PDFs</option>
                    <option value="file">Files</option>
                  </select>
                )}
                <span className="secondary-text">
                  {view === 'Notes'
                    ? notes.length
                    : view === 'References'
                      ? references.length
                      : assignments.length}{' '}
                  {view === 'Notes'
                    ? 'notes'
                    : view === 'References'
                      ? 'references'
                      : 'assignments'}
                </span>
              </div>
              {view === 'Assignments' && (
                <div className="view-toggle">
                  <button
                    aria-label="List view"
                    aria-pressed={layout === 'list'}
                    className={layout === 'list' ? 'selected' : ''}
                    onClick={() => setLayout('list')}
                  >
                    <List size={16} />
                    List
                  </button>
                  <button
                    aria-label="Board view"
                    aria-pressed={layout === 'board'}
                    className={layout === 'board' ? 'selected' : ''}
                    onClick={() => setLayout('board')}
                  >
                    <Columns3 size={16} />
                    Board
                  </button>
                </div>
              )}
            </div>
          )}
          {view === 'Assignments' &&
            (layout === 'list' ? (
              <section className="panel">
                {table(assignments)}
                <button
                  className="panel-add"
                  disabled={!loaded || busy}
                  onClick={() => openEditor('assignments')}
                >
                  <Plus size={16} />
                  Add assignment
                </button>
              </section>
            ) : (
              <div className="kanban-board">
                {statuses.map((s) => (
                  <section className="kanban-column" key={s}>
                    <h2>
                      <Status status={s} />
                      <span className="number-tag">
                        {filteredTotals.byStatus[s].length}
                      </span>
                    </h2>
                    <PagedItems
                      items={filteredTotals.byStatus[s]}
                      label={`${s} assignments`}
                    >
                      {(visible) =>
                        visible.map((a) => (
                          <article className="kanban-card" key={a.id}>
                            <button
                              className="board-open"
                              onClick={() => openEditor('assignments', a)}
                            >
                              <CourseLabel
                                course={courseIndex.get(a.classId)}
                              />
                              <h3>{a.title}</h3>
                              {a.description && (
                                <p>
                                  {a.description.length > 500
                                    ? a.description.slice(0, 500) + '…'
                                    : a.description}
                                </p>
                              )}
                              <div className="board-meta">
                                <span>
                                  <Clock3 size={13} />
                                  {dateLabel(a.dueDate)}
                                </span>
                                <span
                                  className={`priority priority-${a.priority.toLowerCase()}`}
                                >
                                  <span />
                                  {a.priority}
                                </span>
                              </div>
                            </button>
                            <select
                              aria-label={`Move ${a.title}`}
                              value={a.status}
                              disabled={!loaded || busy}
                              onChange={(e) =>
                                act({
                                  action: 'save',
                                  kind: 'assignments',
                                  record: { ...a, status: e.target.value },
                                })
                              }
                            >
                              {statuses.map((st) => (
                                <option key={st}>{st}</option>
                              ))}
                            </select>
                          </article>
                        ))
                      }
                    </PagedItems>
                    {!filteredTotals.byStatus[s].length && (
                      <p className="mini-empty">Nothing here yet.</p>
                    )}
                    <button
                      className="panel-add"
                      disabled={!loaded || busy}
                      onClick={() =>
                        openEditor('assignments', {
                          id: '',
                          title: '',
                          classId,
                          dueDate: today,
                          priority: 'Medium',
                          status: s,
                          description: '',
                        })
                      }
                    >
                      <Plus size={15} />
                      Add assignment
                    </button>
                  </section>
                ))}
              </div>
            ))}
          {view === 'Notes' && noteCards(notes)}
          {view === 'References' && (
            <section className="panel references-manager-panel">
              <div className="references-manager-heading">
                <div>
                  <h2>
                    All references{' '}
                    <span className="number-tag">{references.length}</span>
                  </h2>
                  <p>
                    Keep links, files, images, and PDFs close to the class or
                    note they support.
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={!loaded || busy}
                  onClick={() => setReferenceManagerOpen(true)}
                >
                  <Plus size={16} /> Add reference
                </Button>
              </div>
              {references.length ? (
                <PagedItems items={references} label="references">
                  {(visible) => (
                    <div className="reference-manager-grid">
                      {visible.map((entry) => (
                        <ReferencePreview
                          key={`${entry.ownerKind}-${entry.ownerId}-${entry.reference.id}`}
                          reference={entry.reference}
                          context={`${entry.ownerKind === 'classes' ? 'Class' : 'Note'} · ${entry.ownerName}`}
                          onRemove={() => removeReference(entry)}
                        />
                      ))}
                    </div>
                  )}
                </PagedItems>
              ) : (
                <Empty
                  icon={Paperclip}
                  title={
                    search || classId || referenceKindFilter !== 'All'
                      ? 'No matching references'
                      : 'No references yet'
                  }
                  text="Add a reference here, or attach one while editing a class or note."
                />
              )}
            </section>
          )}
          {view === 'Calendar' && (
            <section className="panel calendar-panel">
              <div className="calendar-heading">
                <h2>
                  {month.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h2>
                <div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMonth(
                        new Date(
                          new Date().getFullYear(),
                          new Date().getMonth(),
                          1,
                        ),
                      );
                      setSelectedDay(today);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Previous month"
                    onClick={() => {
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() - 1, 1),
                      );
                      setSelectedDay('');
                    }}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Next month"
                    onClick={() => {
                      setMonth(
                        new Date(month.getFullYear(), month.getMonth() + 1, 1),
                      );
                      setSelectedDay('');
                    }}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
              <div className="calendar-grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div className="weekday" key={d}>
                    {d}
                  </div>
                ))}
                {Array.from(
                  {
                    length:
                      Math.ceil(
                        (month.getDay() +
                          new Date(
                            month.getFullYear(),
                            month.getMonth() + 1,
                            0,
                          ).getDate()) /
                          7,
                      ) * 7,
                  },
                  (_, i) => {
                    const date = new Date(
                      month.getFullYear(),
                      month.getMonth(),
                      i - month.getDay() + 1,
                    );
                    const key = localDate(date);
                    const items = filteredTotals.byDate.get(key) ?? [];
                    const meetings = calendarMeetings.get(key) ?? [];
                    return (
                      <div
                        key={key}
                        className={`calendar-day ${date.getMonth() !== month.getMonth() ? 'outside-month' : ''} ${key === today ? 'is-today' : ''} ${key === selectedDay ? 'selected-day' : ''}`}
                      >
                        <button
                          className="day-number"
                          aria-label={`Show classes and assignments for ${key}`}
                          onClick={() =>
                            setSelectedDay(selectedDay === key ? '' : key)
                          }
                        >
                          {date.getDate()}
                        </button>
                        {meetings.slice(0, 4).map((c, meetingIndex) => (
                          <button
                            key={`${c.id}-${c.calendarSchedule?.startTime || 'class'}-${meetingIndex}`}
                            className="calendar-item calendar-meeting"
                            style={
                              { '--course-color': c.color } as CSSProperties
                            }
                            onClick={() =>
                              openEditor('classes', courseIndex.get(c.id) || c)
                            }
                            title={`${c.name} · ${c.calendarSchedule!.startTime}–${c.calendarSchedule!.endTime}`}
                          >
                            <span className="meeting-time">
                              <BookOpen size={13} />
                              {c.calendarSchedule!.startTime}–
                              {c.calendarSchedule!.endTime}
                            </span>
                            {c.code || c.name}
                            {c.calendarSchedule?.location && (
                              <small className="meeting-location">
                                {c.calendarSchedule.location}
                              </small>
                            )}
                          </button>
                        ))}
                        {meetings.length > 4 && (
                          <button
                            className="calendar-more"
                            onClick={() => setSelectedDay(key)}
                          >
                            +{meetings.length - 4} more meetings
                          </button>
                        )}
                        {items.slice(0, 3).map((a) => (
                          <button
                            className={`calendar-item ${a.status === 'Done' ? 'calendar-done' : ''}`}
                            style={
                              {
                                '--course-color':
                                  courseIndex.get(a.classId)?.color ||
                                  '#9170df',
                              } as CSSProperties
                            }
                            key={a.id}
                            onClick={() => openEditor('assignments', a)}
                          >
                            {a.title}
                          </button>
                        ))}
                        {items.length > 3 && (
                          <button
                            className="calendar-more"
                            onClick={() => setSelectedDay(key)}
                          >
                            +{items.length - 3} more
                          </button>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
              {selectedDay && (
                <div className="calendar-agenda">
                  <div className="section-heading">
                    <h2>{dateLabel(selectedDay)}</h2>
                    <button
                      className="text-link"
                      onClick={() =>
                        openEditor('assignments', {
                          id: '',
                          title: '',
                          classId,
                          dueDate: selectedDay,
                          priority: 'Medium',
                          status: 'To do',
                          description: '',
                        })
                      }
                    >
                      <Plus size={14} />
                      Add assignment
                    </button>
                  </div>
                  <PagedItems
                    items={calendarMeetings.get(selectedDay) ?? []}
                    label="meetings"
                  >
                    {(visible) => (
                      <div className="day-meetings">
                        {visible.map((c, meetingIndex) => (
                          <button
                            key={`${c.id}-${c.calendarSchedule?.startTime || 'class'}-${meetingIndex}`}
                            className="calendar-item"
                            style={
                              { '--course-color': c.color } as CSSProperties
                            }
                            onClick={() =>
                              openEditor('classes', courseIndex.get(c.id) || c)
                            }
                          >
                            <BookOpen size={16} />
                            <strong>{c.name}</strong>
                            <span>
                              {c.calendarSchedule!.startTime}–
                              {c.calendarSchedule!.endTime}
                            </span>
                            {(c.calendarSchedule?.location || c.schedule) && (
                              <span>
                                {c.calendarSchedule?.location || c.schedule}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </PagedItems>
                  {table(filteredTotals.byDate.get(selectedDay) ?? [])}
                </div>
              )}
            </section>
          )}
          <footer className="workspace-footer">
            <span>
              <span
                className="color-dot"
                style={{ background: loaded ? '#63977b' : '#aaa' }}
              />
              {busy
                ? 'Saving locally…'
                : loaded
                  ? 'Saved on this device'
                  : 'Loading locally…'}
            </span>
          </footer>
        </main>
      </div>
      <Dialog
        open={!!editor}
        onOpenChange={(open) => {
          if (!open && !busy) setEditor(null);
        }}
      >
        <DialogContent className="school-dialog">
          <DialogTitle>
            {editor?.item?.id ? 'Edit' : 'New'}{' '}
            {editor ? kindLabel(editor.kind) : 'item'}
          </DialogTitle>
          {editor && (
            <EditorForm
              key={`${editor.kind}-${editor.item?.id || 'new'}`}
              editor={editor}
              classes={data.classes}
              classId={classId}
              busy={busy}
              error={error}
              onCancel={() => setEditor(null)}
              onSave={async (record) => {
                await mutate({ action: 'save', kind: editor.kind, record });
                setEditor(null);
              }}
              onDelete={() => {
                if (!editor.item) return;
                setConfirm({
                  mutation: {
                    action: 'delete',
                    kind: editor.kind,
                    id: editor.item.id,
                  },
                  title: `Delete this ${kindLabel(editor.kind)}?`,
                  description:
                    editor.kind === 'classes'
                      ? 'The class will be removed. Its assignments and notes will be kept under General.'
                      : 'This item will be permanently removed from your workspace.',
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={referenceManagerOpen}
        onOpenChange={(open) => {
          if (!open && !busy) setReferenceManagerOpen(false);
        }}
      >
        <DialogContent className="school-dialog reference-manager-dialog">
          <DialogTitle>Add a reference</DialogTitle>
          <DialogDescription>
            Choose the class or note that should own this reference.
          </DialogDescription>
          <ReferenceManagerForm
            classes={data.classes}
            notes={data.notes}
            open={referenceManagerOpen}
            busy={busy}
            error={error}
            onCancel={() => setReferenceManagerOpen(false)}
            onSave={addReferencesToOwner}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null);
        }}
      >
        <DialogContent className="school-dialog confirm-dialog">
          <DialogTitle>{confirm?.title}</DialogTitle>
          <DialogDescription>{confirm?.description}</DialogDescription>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!loaded || busy}
              onClick={() => {
                if (confirm)
                  void mutate(
                    confirm.mutation,
                    confirm.mutation.action === 'clearExamples'
                      ? 'Examples removed'
                      : 'Item removed',
                  )
                    .then(() => {
                      setConfirm(null);
                      setEditor(null);
                      if (confirm.mutation.kind === 'classes') {
                        setClassId('');
                        setView('Classes');
                      }
                    })
                    .catch(() => {});
              }}
            >
              {busy
                ? 'Saving…'
                : confirm?.mutation.action === 'clearExamples'
                  ? 'Remove examples'
                  : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}

// Keep DOM work bounded even at the 2,000-record workspace limit. Reset the
// page when search/filter results change; every record remains reachable.
function PagedItems<T>({
  items,
  label,
  children,
}: {
  items: T[];
  label: string;
  children: (visible: T[]) => ReactNode;
}) {
  const pageSize = 60;
  const [selection, setSelection] = useState({ items, page: 0 });
  const page =
    selection.items === items
      ? Math.min(
          selection.page,
          Math.max(0, Math.ceil(items.length / pageSize) - 1),
        )
      : 0;
  const start = page * pageSize;
  return (
    <>
      {children(items.slice(start, start + pageSize))}
      {items.length > pageSize && (
        <nav className="list-pagination" aria-label={`${label} pages`}>
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setSelection({ items, page: page - 1 })}
          >
            Previous
          </Button>
          <output>
            {start + 1}–{Math.min(start + pageSize, items.length)} of{' '}
            {items.length} {label}
          </output>
          <Button
            variant="outline"
            disabled={start + pageSize >= items.length}
            onClick={() => setSelection({ items, page: page + 1 })}
          >
            Next
          </Button>
        </nav>
      )}
    </>
  );
}

const MAX_REFERENCE_BYTES = 3 * 1024 * 1024;

function formatReferenceSize(size?: number) {
  if (!size) return '';
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function referenceIcon(reference: Reference) {
  if (reference.kind === 'image') return <FileImage size={18} />;
  if (reference.kind === 'pdf') return <FileText size={18} />;
  if (reference.kind === 'url') return <Link2 size={18} />;
  return <File size={18} />;
}

function openReference(reference: Reference) {
  if (reference.kind !== 'url' || typeof window === 'undefined') return false;
  const desktop = (
    window as Window & {
      schooldeskDesktop?: { openExternal?: (url: string) => Promise<void> };
    }
  ).schooldeskDesktop;
  if (desktop?.openExternal) {
    void desktop.openExternal(reference.href);
    return true;
  }
  return false;
}

function ReferencePreviewList({
  references,
  title = 'References',
  onRemove,
}: {
  references?: Reference[];
  title?: string;
  onRemove?: (id: string) => void;
}) {
  if (!references?.length) return null;
  return (
    <section className="reference-section">
      <div className="reference-section-heading">
        <h3>
          <Paperclip size={16} />
          {title}
          <span className="number-tag">{references.length}</span>
        </h3>
      </div>
      <div className="reference-grid">
        {references.map((reference) => (
          <ReferencePreview
            key={reference.id}
            reference={reference}
            onRemove={onRemove}
          />
        ))}
      </div>
    </section>
  );
}

function ReferencePreview({
  reference,
  context,
  onRemove,
}: {
  reference: Reference;
  context?: string;
  onRemove?: (id: string) => void;
}) {
  const label =
    reference.kind === 'url'
      ? (() => {
          try {
            return new URL(reference.href).hostname.replace(/^www\./, '');
          } catch {
            return 'Web link';
          }
        })()
      : `${reference.kind.toUpperCase()}${reference.size ? ` · ${formatReferenceSize(reference.size)}` : ''}`;
  const localPreview =
    reference.kind === 'image' ? (
      <img
        className="reference-thumbnail"
        src={reference.href}
        alt=""
        loading="lazy"
      />
    ) : reference.kind === 'pdf' ? (
      <iframe
        className="reference-pdf-preview"
        src={reference.href}
        title={`Preview of ${reference.title}`}
      />
    ) : (
      <span className="reference-file-icon">{referenceIcon(reference)}</span>
    );
  return (
    <article className="reference-card">
      {localPreview}
      <div className="reference-card-body">
        <strong title={reference.title}>{reference.title}</strong>
        <small>
          {context ? `${context} · ` : ''}
          {label}
        </small>
        {reference.description && <p>{reference.description}</p>}
      </div>
      <div className="reference-card-actions">
        {reference.kind === 'url' ? (
          <a
            href={reference.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${reference.title}`}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              if (openReference(reference)) event.preventDefault();
            }}
          >
            <ExternalLink size={15} />
          </a>
        ) : (
          <a
            href={reference.href}
            download={reference.title}
            aria-label={`Download ${reference.title}`}
          >
            <Download size={15} />
          </a>
        )}
        {onRemove && (
          <button
            type="button"
            aria-label={`Remove ${reference.title}`}
            onClick={() => onRemove(reference.id)}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </article>
  );
}

function ReferenceEditor({
  references,
  onChange,
}: {
  references: Reference[];
  onChange: Dispatch<SetStateAction<Reference[]>>;
}) {
  const [url, setUrl] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [fileError, setFileError] = useState('');
  const addUrl = () => {
    const value = url.trim();
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      setFileError('Enter a complete URL, such as https://example.com.');
      return;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      setFileError('Only http and https links can be added.');
      return;
    }
    if (references.length >= 20) {
      setFileError('You can add up to 20 references.');
      return;
    }
    onChange((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        title: urlTitle.trim() || parsed.hostname.replace(/^www\./, ''),
        kind: 'url',
        href: value,
        createdAt: new Date().toISOString(),
      },
    ]);
    setUrl('');
    setUrlTitle('');
    setFileError('');
  };
  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.currentTarget.value = '';
    if (!files.length) return;
    if (references.length + files.length > 20) {
      setFileError('You can add up to 20 references.');
      return;
    }
    for (const file of files) {
      if (file.size > MAX_REFERENCE_BYTES) {
        setFileError(`${file.name} is larger than 3 MB.`);
        continue;
      }
      const kind: ReferenceKind =
        file.type === 'application/pdf'
          ? 'pdf'
          : file.type.startsWith('image/')
            ? 'image'
            : 'file';
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return;
        onChange((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            title: file.name,
            kind,
            href: reader.result as string,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            createdAt: new Date().toISOString(),
          },
        ]);
      };
      reader.onerror = () => setFileError(`Could not read ${file.name}.`);
      reader.readAsDataURL(file);
    }
    if (!files.some((file) => file.size > MAX_REFERENCE_BYTES))
      setFileError('');
  };
  return (
    <div className="reference-editor">
      <div className="field-label">
        <Paperclip size={15} /> References
        <span>{references.length}/20</span>
      </div>
      <ReferencePreviewList
        references={references}
        onRemove={(id) =>
          onChange((current) => current.filter((item) => item.id !== id))
        }
      />
      <div className="reference-add-row">
        <Input
          aria-label="Reference URL"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste a URL"
          maxLength={2000}
          type="url"
        />
        <Input
          aria-label="Reference title"
          value={urlTitle}
          onChange={(event) => setUrlTitle(event.target.value)}
          placeholder="Link title (optional)"
          maxLength={180}
        />
        <Button
          type="button"
          variant="outline"
          onClick={addUrl}
          disabled={!url.trim() || references.length >= 20}
        >
          <Link2 size={15} /> Add link
        </Button>
      </div>
      <label className="reference-file-picker">
        <Paperclip size={15} />
        Add files, images, or PDFs
        <input
          type="file"
          multiple
          accept="*/*"
          onChange={addFiles}
          disabled={references.length >= 20}
        />
        <small>Up to 3 MB each</small>
      </label>
      {fileError && <p className="form-error">{fileError}</p>}
    </div>
  );
}

function ReferenceManagerForm({
  classes,
  notes,
  open,
  busy,
  error,
  onSave,
  onCancel,
}: {
  classes: Course[];
  notes: Note[];
  open: boolean;
  busy: boolean;
  error: string;
  onSave: (
    ownerKind: 'classes' | 'notes',
    ownerId: string,
    references: Reference[],
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const firstTarget = classes[0]
    ? `classes:${classes[0].id}`
    : notes[0]
      ? `notes:${notes[0].id}`
      : '';
  const [target, setTarget] = useState(firstTarget);
  const [references, setReferences] = useState<Reference[]>([]);
  const [formError, setFormError] = useState('');
  useEffect(() => {
    if (!open) return;
    setTarget(firstTarget);
    setReferences([]);
    setFormError('');
  }, [open, firstTarget]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const separator = target.indexOf(':');
    const ownerKind = target.slice(0, separator) as 'classes' | 'notes';
    const ownerId = target.slice(separator + 1);
    if (separator < 0 || !ownerId || !references.length) {
      setFormError('Add at least one reference and choose where it belongs.');
      return;
    }
    setFormError('');
    void onSave(ownerKind, ownerId, references).catch(() => {});
  };
  return (
    <form className="editor-form" onSubmit={submit}>
      <label>
        Attach to
        <select
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        >
          {classes.map((course) => (
            <option key={`classes:${course.id}`} value={`classes:${course.id}`}>
              Class · {course.name}
            </option>
          ))}
          {notes.map((note) => (
            <option key={`notes:${note.id}`} value={`notes:${note.id}`}>
              Note · {note.title}
            </option>
          ))}
        </select>
      </label>
      <ReferenceEditor references={references} onChange={setReferences} />
      {(formError || error) && (
        <p role="alert" className="form-error">
          {formError || error}
        </p>
      )}
      <div className="form-actions">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          className="primary-button"
          type="submit"
          disabled={busy || !target}
        >
          {busy ? 'Saving…' : 'Save reference'}
        </Button>
      </div>
    </form>
  );
}

function CourseLabel({ course }: { course?: Course }) {
  return (
    <span className="course-label">
      <span
        className="color-dot"
        style={{ background: course?.color || '#999' }}
      />
      {course?.code || course?.name || 'General'}
    </span>
  );
}
function Status({ status }: { status: Assignment['status'] }) {
  return (
    <span
      className={`status status-${status.toLowerCase().replaceAll(' ', '-')}`}
    >
      <span />
      {status}
    </span>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function ClassCard({
  course: c,
  counts,
  onClick,
}: {
  course: Course;
  counts?: { total: number; done: number };
  onClick: () => void;
}) {
  const { total, done } = counts ?? { total: 0, done: 0 };
  const scheduleLabel = classScheduleLabel(c);
  return (
    <button
      className="class-card"
      style={{ '--course-color': c.color } as CSSProperties}
      onClick={onClick}
    >
      <div className="class-card-top">
        <span className="class-icon">
          <BookOpen size={21} />
        </span>
        <div className="class-card-title">
          <h3>{c.name}</h3>
          {c.code && c.code !== c.name && (
            <span className="course-code">{c.code}</span>
          )}
        </div>
        <ArrowRight size={16} />
      </div>
      {c.teacher && <p>{c.teacher}</p>}
      {scheduleLabel && (
        <p className="class-schedule">
          <CalendarDays size={12} />
          {scheduleLabel}
        </p>
      )}
      <div className="class-card-bottom">
        <span>{total - done} assignments left</span>
        <span className="class-card-bottom-right">
          {c.references?.length ? (
            <span className="reference-count" title="References attached">
              <Paperclip size={12} /> {c.references.length}
            </span>
          ) : null}
          {total ? Math.round((done / total) * 100) : 0}%
        </span>
      </div>
      <div className="class-progress">
        <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
    </button>
  );
}

function EditorForm({
  editor,
  classes,
  classId,
  busy,
  error,
  onSave,
  onDelete,
  onCancel,
}: {
  editor: Editor;
  classes: Course[];
  classId: string;
  busy: boolean;
  error: string;
  onSave: (record: unknown) => Promise<void>;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const item = editor.item as Partial<Course & Assignment & Note> | undefined;
  const [color, setColor] = useState(item?.color || colors[0]);
  const [references, setReferences] = useState<Reference[]>(
    item?.references ?? [],
  );
  const initialMeetings = schedulesFor(item || {});
  const [onCalendar, setOnCalendar] = useState(initialMeetings.length > 0);
  const [meetingRows, setMeetingRows] = useState<ClassSchedule[]>(
    initialMeetings.length
      ? initialMeetings
      : [
          {
            weekdays: [],
            startTime: '09:00',
            endTime: '10:00',
            startDate: localDate(),
            endDate: '',
            location: '',
          },
        ],
  );
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const values = Object.fromEntries(form);
    void onSave({
      ...values,
      id: item?.id || crypto.randomUUID(),
      ...(editor.kind === 'classes'
        ? {
            color,
            calendarSchedules: onCalendar ? meetingRows : [],
          }
        : {}),
      ...(editor.kind === 'classes' || editor.kind === 'notes'
        ? { references }
        : {}),
    }).catch(() => {});
  };
  return (
    <form onSubmit={submit} className="editor-form">
      <fieldset disabled={busy}>
        {editor.kind === 'classes' ? (
          <>
            <label>
              Class name{' '}
              <Input
                name="name"
                defaultValue={item?.name}
                placeholder="e.g. Introduction to Biology"
                required
                maxLength={150}
                autoFocus
              />
            </label>
            <div className="form-row">
              <label>
                Class code{' '}
                <Input
                  name="code"
                  defaultValue={item?.code}
                  placeholder="e.g. BIO 101"
                  maxLength={30}
                />
              </label>
              <label>
                Teacher / professor{' '}
                <Input
                  name="teacher"
                  defaultValue={item?.teacher}
                  placeholder="e.g. Dr. Mitchell"
                  maxLength={150}
                />
              </label>
            </div>
            <label>
              Schedule notes / location{' '}
              <Input
                name="schedule"
                defaultValue={item?.schedule}
                placeholder="e.g. Mon & Wed · 10:00 AM · Room 204"
                maxLength={200}
              />
            </label>
            <label className="schedule-toggle">
              <input
                type="checkbox"
                checked={onCalendar}
                onChange={(e) => setOnCalendar(e.target.checked)}
              />
              Show recurring classes on calendar
            </label>
            {onCalendar && (
              <div className="meeting-editor-list">
                {meetingRows.map((meeting, index) => (
                  <div className="schedule-fields" key={index}>
                    <div className="section-heading">
                      <strong>Meeting {index + 1}</strong>
                      {meetingRows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setMeetingRows((rows) =>
                              rows.filter((_, i) => i !== index),
                            )
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <MeetingFields
                      meeting={meeting}
                      onChange={(next) =>
                        setMeetingRows((rows) =>
                          rows.map((row, i) => (i === index ? next : row)),
                        )
                      }
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={meetingRows.length >= 20}
                  onClick={() =>
                    setMeetingRows((rows) => [
                      ...rows,
                      { ...rows[0], weekdays: [], location: '' },
                    ])
                  }
                >
                  <Plus size={16} />
                  Add meeting
                </Button>
              </div>
            )}
            <div>
              <span className="field-label">Class color</span>
              <div className="color-options">
                {colors.map((c) => (
                  <button
                    type="button"
                    key={c}
                    style={{ background: c }}
                    aria-label={`Choose ${c}`}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                  >
                    {color === c && <Check size={17} />}
                  </button>
                ))}
              </div>
            </div>
            <ReferenceEditor references={references} onChange={setReferences} />
          </>
        ) : (
          <>
            <label>
              {editor.kind === 'notes' ? 'Note title' : 'Assignment title'}{' '}
              <Input
                name="title"
                defaultValue={item?.title}
                placeholder={
                  editor.kind === 'notes'
                    ? 'Give your note a title'
                    : 'What are you working on?'
                }
                required
                maxLength={200}
                autoFocus
              />
            </label>
            <label>
              Class{' '}
              <select name="classId" defaultValue={item?.classId ?? classId}>
                <option value="">General · no class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.code ? ` (${c.code})` : ''}
                  </option>
                ))}
              </select>
            </label>
            {editor.kind === 'assignments' ? (
              <>
                <div className="form-row">
                  <label>
                    Due date{' '}
                    <Input
                      type="date"
                      name="dueDate"
                      defaultValue={item?.dueDate || localDate()}
                      required
                    />
                  </label>
                  <label>
                    Priority{' '}
                    <select
                      name="priority"
                      defaultValue={item?.priority || 'Medium'}
                    >
                      {['Low', 'Medium', 'High'].map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Status{' '}
                  <select name="status" defaultValue={item?.status || 'To do'}>
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Description{' '}
                  <Textarea
                    name="description"
                    defaultValue={item?.description}
                    placeholder="Instructions, links, or your next steps…"
                    maxLength={10000}
                    rows={4}
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Your notes{' '}
                  <Textarea
                    className="note-editor"
                    name="content"
                    defaultValue={item?.content}
                    placeholder="Write your notes…"
                    maxLength={50000}
                    rows={12}
                  />
                </label>
                <ReferenceEditor
                  references={references}
                  onChange={setReferences}
                />
              </>
            )}
          </>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="form-actions">
        {item?.id && (
          <Button
            type="button"
            variant="ghost"
            className="delete-button"
            disabled={busy}
            onClick={onDelete}
          >
            <Trash2 size={15} />
            Delete
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button className="primary-button" type="submit" disabled={busy}>
          {busy
            ? 'Saving…'
            : 'Save ' +
              (editor.kind === 'classes'
                ? 'class'
                : editor.kind === 'notes'
                  ? 'note'
                  : 'assignment')}
        </Button>
      </div>
    </form>
  );
}

function MeetingFields({
  meeting: m,
  onChange,
}: {
  meeting: ClassSchedule;
  onChange: (next: ClassSchedule) => void;
}) {
  return (
    <>
      <fieldset className="weekday-picker">
        <legend>Meeting days</legend>
        <div>
          {weekdays.map((day, index) => (
            <label key={day}>
              <input
                type="checkbox"
                checked={m.weekdays.includes(index)}
                onChange={(e) =>
                  onChange({
                    ...m,
                    weekdays: e.target.checked
                      ? [...m.weekdays, index].sort((a, b) => a - b)
                      : m.weekdays.filter((d) => d !== index),
                  })
                }
              />
              <span>{day}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="form-row">
        <label>
          Start time
          <Input
            type="time"
            required
            value={m.startTime}
            onChange={(e) => onChange({ ...m, startTime: e.target.value })}
          />
        </label>
        <label>
          End time
          <Input
            type="time"
            required
            value={m.endTime}
            onChange={(e) => onChange({ ...m, endTime: e.target.value })}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          First date
          <Input
            type="date"
            required
            value={m.startDate}
            onChange={(e) => onChange({ ...m, startDate: e.target.value })}
          />
        </label>
        <label>
          Last date
          <Input
            type="date"
            required
            value={m.endDate}
            onChange={(e) => onChange({ ...m, endDate: e.target.value })}
          />
        </label>
      </div>
      <label>
        Room / location
        <Input
          maxLength={200}
          value={m.location || ''}
          onChange={(e) => onChange({ ...m, location: e.target.value })}
        />
      </label>
    </>
  );
}
