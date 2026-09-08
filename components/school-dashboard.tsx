'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  List,
  ListTodo,
  Columns3,
  Pencil,
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
  makeExamples,
  type Course,
  type Assignment,
  type Note,
  type SchoolData,
} from '@/lib/school';
import type { Mutation } from '@/lib/actions';

type View = 'Overview' | 'Classes' | 'Assignments' | 'Notes' | 'Calendar';
type Editor = {
  kind: 'classes' | 'assignments' | 'notes';
  item?: Course | Assignment | Note;
};
const navigation: { icon: LucideIcon; label: View }[] = [
  { icon: LayoutDashboard, label: 'Overview' },
  { icon: BookOpen, label: 'Classes' },
  { icon: ListTodo, label: 'Assignments' },
  { icon: FileText, label: 'Notes' },
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
const dateLabel = (date: string) =>
  new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

export default function SchoolDashboard() {
  const [data, setData] = useState<SchoolData>(makeExamples);
  const snapshot = useRef({ data, revision: 0 });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [view, setView] = useState<View>('Overview');
  const [classId, setClassId] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [layout, setLayout] = useState<'list' | 'board'>('list');
  const [editor, setEditor] = useState<Editor | null>(null);
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
      setData(result.data);
    },
    [],
  );
  const reload = useCallback(async () => {
    setError('');
    try {
      const r = await fetch('/api/workspace', { cache: 'no-store' });
      const result = (await r.json()) as {
        data: SchoolData;
        revision: number;
        error?: string;
      };
      if (!r.ok) throw new Error(result.error);
      accept(result);
      setLoaded(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Unable to load your workspace.',
      );
    }
  }, [accept]);
  useEffect(() => {
    void reload();
  }, [reload]);
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
        const r = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            revision: snapshot.current.revision,
            mutation,
          }),
        });
        const result = (await r.json()) as {
          data: SchoolData;
          revision: number;
          error?: string;
        };
        if (result.data) accept(result);
        if (!r.ok) throw new Error(result.error || 'Could not save changes.');
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
    [accept],
  );
  const act = (m: Mutation, message?: string) => {
    void mutate(m, message).catch(() => {});
  };
  const navigate = (next: View, id = '') => {
    setView(next);
    setClassId(id);
    setStatusFilter('All');
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
  const activeClass = data.classes.find((c) => c.id === classId);
  const matches = (...values: (string | undefined)[]) =>
    values.some((v) => v?.toLowerCase().includes(query.toLowerCase().trim()));
  const classMatches = (id: string) => !classId || id === classId;
  const assignments = data.assignments
    .filter(
      (a) =>
        classMatches(a.classId) &&
        matches(
          a.title,
          a.description,
          data.classes.find((c) => c.id === a.classId)?.name,
        ) &&
        (statusFilter === 'All' ||
          (statusFilter === 'Overdue'
            ? a.status !== 'Done' && a.dueDate < today
            : a.status === statusFilter)),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const notes = data.notes
    .filter(
      (n) =>
        classMatches(n.classId) &&
        matches(
          n.title,
          n.content,
          data.classes.find((c) => c.id === n.classId)?.name,
        ),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const classes = data.classes.filter((c) =>
    matches(c.name, c.code, c.teacher),
  );
  const completed = data.assignments.filter((a) => a.status === 'Done').length;
  const progress = data.assignments.length
    ? Math.round((completed / data.assignments.length) * 100)
    : 0;
  const hasExamples = [
    ...data.classes,
    ...data.assignments,
    ...data.notes,
  ].some((r) => r.example);
  const upNext = assignments.filter((a) => a.status !== 'Done').slice(0, 5);
  const stats: {
    icon: LucideIcon;
    label: string;
    value: number;
    sub: string;
    color: string;
    target: View;
    filter?: string;
  }[] = [
    {
      icon: BookOpen,
      label: 'Active classes',
      value: data.classes.length,
      sub: 'A place for every subject',
      color: 'violet',
      target: 'Classes',
    },
    {
      icon: ListTodo,
      label: 'To do',
      value: data.assignments.filter((a) => a.status === 'To do').length,
      sub: 'Ready when you are',
      color: 'blue',
      target: 'Assignments',
      filter: 'To do',
    },
    {
      icon: Target,
      label: 'In progress',
      value: data.assignments.filter((a) => a.status === 'In progress').length,
      sub: 'Keep the momentum going',
      color: 'orange',
      target: 'Assignments',
      filter: 'In progress',
    },
    {
      icon: CheckCheck,
      label: 'Completed',
      value: completed,
      sub: 'One step closer to your goals',
      color: 'green',
      target: 'Assignments',
      filter: 'Done',
    },
  ];
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool || !loaded) return;
    const lifecycle = new AbortController();
    const register = (tool: unknown) => {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {
        /* Unsupported registry does not affect the workspace. */
      }
    };
    register({
      name: 'read_school_workspace',
      description:
        'Read the saved classes, assignments, and notes in the personal school workspace.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => structuredClone(snapshot.current.data),
    });
    register({
      name: 'create_school_assignment',
      description:
        'Create and save a school assignment, then update the visible workspace.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          classId: { type: 'string' },
          dueDate: { type: 'string', description: 'YYYY-MM-DD' },
          priority: { type: 'string', enum: ['Low', 'Medium', 'High'] },
        },
        required: ['title', 'dueDate'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input: unknown) => {
        if (!input || typeof input !== 'object')
          throw new Error('Assignment details are required.');
        const r = input as Record<string, unknown>;
        const id = crypto.randomUUID();
        await mutate({
          action: 'save',
          kind: 'assignments',
          record: {
            id,
            title: r.title,
            classId: r.classId ?? '',
            dueDate: r.dueDate,
            priority: r.priority ?? 'Medium',
            status: 'To do',
            description: '',
          },
        });
        return { id, saved: true };
      },
    });
    return () => lifecycle.abort();
  }, [loaded, mutate]);
  const heading =
    view === 'Overview'
      ? 'A little more organized.'
      : activeClass
        ? activeClass.name
        : view === 'Classes'
          ? 'A place for every subject.'
          : view === 'Assignments'
            ? 'One task at a time.'
            : view === 'Notes'
              ? 'Keep your thoughts together.'
              : 'See the bigger picture.';
  const primaryKind =
    view === 'Classes' && !activeClass
      ? 'classes'
      : view === 'Notes'
        ? 'notes'
        : 'assignments';
  const kindLabel = (kind: Editor['kind']) =>
    kind === 'classes' ? 'class' : kind === 'notes' ? 'note' : 'assignment';
  const removeExamples = () =>
    setConfirm({
      mutation: { action: 'clearExamples' },
      title: 'Make this workspace yours',
      description:
        'Remove the example classes, assignments, and notes. Anything you added or edited will be kept.',
    });
  const table = (items: Assignment[]) =>
    items.length ? (
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
            {items.map((a) => (
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
                      <CourseLabel
                        course={data.classes.find((c) => c.id === a.classId)}
                      />
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
    ) : (
      <Empty
        icon={CheckCheck}
        title={
          query ? 'No matching assignments' : 'A clear desk. A fresh start.'
        }
        text={
          query
            ? 'Try another search or filter.'
            : 'Add an assignment to start planning your next step.'
        }
      />
    );
  const cards = (items: Course[]) =>
    items.length ? (
      <div className="class-grid">
        {items.map((c) => (
          <ClassCard
            key={c.id}
            course={c}
            assignments={data.assignments}
            onClick={() => navigate('Classes', c.id)}
          />
        ))}
      </div>
    ) : (
      <Empty
        icon={BookOpen}
        title={query ? 'No matching classes' : 'Your semester starts here'}
        text="Add your first class to give your assignments and notes a home."
      />
    );
  const noteCards = (items: Note[]) =>
    items.length ? (
      <div className="notes-grid">
        {items.map((n) => (
          <button
            className="note-card"
            key={n.id}
            onClick={() => openEditor('notes', n)}
          >
            <div className="note-card-top">
              <span className="note-icon">
                <FileText size={20} />
              </span>
              <CourseLabel
                course={data.classes.find((c) => c.id === n.classId)}
              />
            </div>
            <h3>{n.title}</h3>
            <p>
              {n.content || 'No content yet. Open this note to start writing.'}
            </p>
            <div className="note-meta">
              Edited{' '}
              {new Date(n.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
              <ArrowRight size={15} />
            </div>
          </button>
        ))}
      </div>
    ) : (
      <Empty
        icon={FileText}
        title={query ? 'No matching notes' : 'Good ideas deserve a home'}
        text="Capture a lecture, a question, or that thing you don’t want to forget."
      />
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Schooldesk home">
          <span className="brand-symbol">
            <GraduationCap size={25} />
          </span>
          <span className="brand-word">
            schooldesk<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-avatar">S</span>
          <div>
            <strong>My workspace</strong>
            <small>Personal workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>
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
          {data.classes.map((c) => (
            <button key={c.id} onClick={() => navigate('Classes', c.id)}>
              <span className="color-dot" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
          {!data.classes.length && (
            <span className="sidebar-empty">Your classes will live here.</span>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="small-tip">
            <Sparkles size={19} />
            <strong>A little progress, every day.</strong>
            <p>
              Big goals start with small steps.
              <br />
              You’ve got this.
            </p>
          </div>
          <div className="profile">
            <span className="profile-avatar">ME</span>
            <div>
              <strong>Student workspace</strong>
              <small>Your space to make progress</small>
            </div>
          </div>
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
            <span className="top-avatar">S</span>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {activeClass
                  ? activeClass.code || 'YOUR CLASS'
                  : 'YOUR SCHOOL, ALL TOGETHER'}
              </div>
              <h1>
                {heading}
                {view === 'Overview' && (
                  <span className="heading-spark">✳</span>
                )}
              </h1>
              <p>
                {activeClass
                  ? [activeClass.teacher, activeClass.schedule]
                      .filter(Boolean)
                      .join(' · ') || 'All your work for this class, together.'
                  : view === 'Overview'
                    ? 'Let’s make room for your best work.'
                    : view === 'Classes'
                      ? 'Your subjects, your notes, your next steps.'
                      : view === 'Assignments'
                        ? 'Plan it. Work on it. Check it off.'
                        : view === 'Notes'
                          ? 'A home for every lecture, idea, and lightbulb moment.'
                          : 'Your deadlines, with a little breathing room.'}
              </p>
            </div>
            <Button
              aria-label={`New ${kindLabel(primaryKind)}`}
              disabled={!loaded || busy}
              className="primary-button"
              onClick={() => openEditor(primaryKind)}
            >
              <Plus size={17} />
              <span>New {kindLabel(primaryKind)}</span>
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
            <span className="date-line-dot" />
            {busy
              ? 'Saving changes…'
              : loaded
                ? 'Your semester at a glance'
                : 'Loading your workspace…'}
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
                <span>
                  You’re viewing an example workspace. Make it yours by adding
                  your classes.
                </span>
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
                    sub,
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
                      <p>{sub}</p>
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
                            {
                              assignments.filter((a) => a.status !== 'Done')
                                .length
                            }
                          </span>
                        </h2>
                        <p>A clear view of what’s on your plate.</p>
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
                      <button
                        className="text-link"
                        onClick={() => navigate('Classes')}
                      >
                        View all <ArrowRight size={15} />
                      </button>
                    </div>
                    {cards(classes.slice(0, 4))}
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
                        background: `conic-gradient(#8060dd ${progress}%, #ece7f7 0)`,
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
                        <i style={{ background: '#8665dc' }} />
                        Completed
                      </span>
                      <span>
                        <i style={{ background: '#e6dff4' }} />
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
                          <CourseLabel
                            course={data.classes.find(
                              (c) => c.id === n.classId,
                            )}
                          />
                        </div>
                        <ArrowRight size={14} />
                      </button>
                    ))}
                    {!notes.length && (
                      <p className="mini-empty">
                        Your next good idea belongs here.
                      </p>
                    )}
                    <button
                      className="all-notes"
                      onClick={() => navigate('Notes')}
                    >
                      All notes <ArrowRight size={15} />
                    </button>
                  </section>
                  <div className="quote-card">
                    <span>“</span>
                    <p>
                      You don’t have to be great to start, but you have to start
                      to be great.
                    </p>
                    <small>A LITTLE REMINDER</small>
                  </div>
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
                <span className="secondary-text">
                  A little structure goes a long way.
                </span>
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
                <span className="secondary-text">
                  {view === 'Notes' ? notes.length : assignments.length}{' '}
                  {view === 'Notes' ? 'notes' : 'assignments'}
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
                        {assignments.filter((a) => a.status === s).length}
                      </span>
                    </h2>
                    {assignments
                      .filter((a) => a.status === s)
                      .map((a) => (
                        <article className="kanban-card" key={a.id}>
                          <button
                            className="board-open"
                            onClick={() => openEditor('assignments', a)}
                          >
                            <CourseLabel
                              course={data.classes.find(
                                (c) => c.id === a.classId,
                              )}
                            />
                            <h3>{a.title}</h3>
                            {a.description && <p>{a.description}</p>}
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
                      ))}
                    {!assignments.some((a) => a.status === s) && (
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
                    const items = assignments.filter((a) => a.dueDate === key);
                    return (
                      <div
                        key={key}
                        className={`calendar-day ${date.getMonth() !== month.getMonth() ? 'outside-month' : ''} ${key === today ? 'is-today' : ''} ${key === selectedDay ? 'selected-day' : ''}`}
                      >
                        <button
                          className="day-number"
                          aria-label={`Show assignments for ${key}`}
                          onClick={() =>
                            setSelectedDay(selectedDay === key ? '' : key)
                          }
                        >
                          {date.getDate()}
                        </button>
                        {items.slice(0, 3).map((a) => (
                          <button
                            className={`calendar-item ${a.status === 'Done' ? 'calendar-done' : ''}`}
                            style={
                              {
                                '--course-color':
                                  data.classes.find((c) => c.id === a.classId)
                                    ?.color || '#9170df',
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
                  {table(assignments.filter((a) => a.dueDate === selectedDay))}
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
                ? 'Saving…'
                : loaded
                  ? 'Your workspace is saved.'
                  : 'Connecting to your workspace…'}
            </span>
            <span>
              Made for your next chapter <BookOpen size={14} />
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
          <DialogDescription>
            {editor?.kind === 'classes'
              ? 'Give your subject a home.'
              : editor?.kind === 'notes'
                ? 'Capture what matters. Save it for later.'
                : 'A clear next step makes all the difference.'}
          </DialogDescription>
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
                      ? 'A fresh start. Make it yours.'
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
  assignments,
  onClick,
}: {
  course: Course;
  assignments: Assignment[];
  onClick: () => void;
}) {
  const all = assignments.filter((a) => a.classId === c.id);
  const done = all.filter((a) => a.status === 'Done').length;
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
        <span className="course-code">{c.code || 'CLASS'}</span>
        <ArrowRight size={16} />
      </div>
      <h3>{c.name}</h3>
      <p>{c.teacher || 'Your next chapter starts here'}</p>
      {c.schedule && (
        <p className="class-schedule">
          <CalendarDays size={12} />
          {c.schedule}
        </p>
      )}
      <div className="class-card-bottom">
        <span>{all.length - done} assignments left</span>
        <span>{all.length ? Math.round((done / all.length) * 100) : 0}%</span>
      </div>
      <div className="class-progress">
        <span
          style={{ width: `${all.length ? (done / all.length) * 100 : 0}%` }}
        />
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
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.currentTarget));
    void onSave({
      ...values,
      id: item?.id || crypto.randomUUID(),
      ...(editor.kind === 'classes' ? { color } : {}),
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
              Class schedule{' '}
              <Input
                name="schedule"
                defaultValue={item?.schedule}
                placeholder="e.g. Mon & Wed · 10:00 AM · Room 204"
                maxLength={200}
              />
            </label>
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
              <label>
                Your notes{' '}
                <Textarea
                  className="note-editor"
                  name="content"
                  defaultValue={item?.content}
                  placeholder="Start writing. This is your space to think…"
                  maxLength={50000}
                  rows={12}
                />
              </label>
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
