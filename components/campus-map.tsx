import { useMemo, useState } from 'react';
import {
  Building2,
  DoorOpen,
  ExternalLink,
  GraduationCap,
  Info,
  Library,
  Map as MapIcon,
  MapPinned,
  Navigation,
  ParkingSquare,
  RotateCcw,
  Stethoscope,
  Target,
  Utensils,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react';
import type { Course } from '@/lib/school';
import { schedulesFor } from '@/lib/school';
import {
  campusById,
  campusFloors,
  DEFAULT_SCHOOL_ID,
  extractRoomCode,
  floorForRoom,
  positionForRoom,
  type CampusCategory,
  type CampusFloorId,
} from '@/lib/campus';

type CampusMapProps = {
  schoolId?: string;
  classes: Course[];
  selectedClassId?: string;
  onSelectClass: (id: string) => void;
};

type ClassPin = {
  room: string;
  floor: CampusFloorId;
  x: number;
  y: number;
  courses: Course[];
};

const categoryLabels: Record<CampusCategory, string> = {
  academic: 'Academic',
  services: 'Services',
  food: 'Food',
  wellness: 'Wellness',
  entrance: 'Entrance',
  parking: 'Parking',
};

const categoryIcons: Record<CampusCategory, LucideIcon> = {
  academic: GraduationCap,
  services: Info,
  food: Utensils,
  wellness: Stethoscope,
  entrance: DoorOpen,
  parking: ParkingSquare,
};

function campusPositionForRoom(room: string) {
  const prefix = room[0]?.toUpperCase();
  if (prefix === 'B') return { x: 67, y: 30 };
  if (prefix === 'F') return { x: 86, y: 30 };
  if (prefix === 'D' || prefix === 'E' || prefix === 'G' || prefix === 'H')
    return { x: 68, y: 56 };
  if (prefix === 'J') return { x: 80, y: 56 };
  const floor = floorForRoom(room);
  if (floor === 'basement') return { x: 27, y: 39 };
  if (floor === 'first') return { x: 38, y: 24 };
  if (floor === 'second') return { x: 30, y: 31 };
  if (floor === 'third') return { x: 40, y: 25 };
  if (floor === 'fourth') return { x: 45, y: 20 };
  return { x: 30, y: 30 };
}

function classLocations(classes: Course[]) {
  const map = new Map<string, ClassPin>();
  for (const course of classes) {
    const meetings = schedulesFor(course);
    const locations = meetings.length
      ? meetings.map((schedule) => schedule.location || course.schedule)
      : [course.schedule];
    for (const location of locations) {
      const room = extractRoomCode(location);
      const floor = floorForRoom(room);
      if (!room || !floor) continue;
      const key = `${floor}:${room}`;
      const current = map.get(key);
      if (current) {
        if (!current.courses.some((item) => item.id === course.id))
          current.courses.push(course);
        continue;
      }
      const position = positionForRoom(room, floor);
      map.set(key, { room, floor, ...position, courses: [course] });
    }
  }
  return [...map.values()];
}

function titleForPin(pin: ClassPin) {
  return `${pin.room}: ${pin.courses.map((course) => course.name).join(', ')}`;
}

const PDF_ZOOMS = [100, 125, 150, 200, 250, 300] as const;

function OfficialFloorPlanViewer({
  source,
  officialSource,
}: {
  source: string;
  officialSource: string;
}) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const zoom = PDF_ZOOMS[zoomIndex];
  const pdfSource = `${source}#page=1&zoom=${zoom}`;
  return (
    <section className="panel actual-floorplan">
      <div className="actual-floorplan-heading">
        <div>
          <span className="eyebrow">Official plan</span>
          <h2>Hallways and room layout</h2>
          <p>
            The complete St. Clair plan is embedded below so you can follow
            hallways, stairs, elevators, entrances, and room clusters.
          </p>
        </div>
        <div className="actual-floorplan-actions">
          <span aria-live="polite">{zoom}%</span>
          <button
            aria-label="Zoom out floor plan"
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
          >
            <ZoomOut size={16} />
          </button>
          <button
            aria-label="Zoom in floor plan"
            disabled={zoomIndex === PDF_ZOOMS.length - 1}
            onClick={() =>
              setZoomIndex((index) => Math.min(PDF_ZOOMS.length - 1, index + 1))
            }
          >
            <ZoomIn size={16} />
          </button>
          <button
            aria-label="Reset floor plan zoom"
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex(0)}
          >
            <RotateCcw size={15} />
          </button>
          <a href={officialSource} target="_blank" rel="noreferrer">
            <ExternalLink size={14} />
            Open PDF
          </a>
        </div>
      </div>
      <div className="actual-floorplan-frame">
        <iframe
          key={pdfSource}
          title="St. Clair College Main Windsor Campus official floor plans"
          src={pdfSource}
          loading="lazy"
        />
      </div>
      <p className="actual-floorplan-caption">
        Use the viewer scrollbar to move through the one-page plan. Zooming
        keeps the vector labels sharp for room and hallway details.
      </p>
    </section>
  );
}

export default function CampusMap({
  schoolId = DEFAULT_SCHOOL_ID,
  classes,
  selectedClassId,
  onSelectClass,
}: CampusMapProps) {
  const campus = campusById(schoolId);
  const [selectedFloor, setSelectedFloor] = useState<CampusFloorId>('campus');
  const [selectedPoiId, setSelectedPoiId] = useState('');
  const pins = useMemo(() => classLocations(classes), [classes]);
  const classesWithoutRoom = useMemo(() => {
    const mapped = new Set(
      pins.flatMap((pin) => pin.courses.map((course) => course.id)),
    );
    return classes.filter((course) => !mapped.has(course.id));
  }, [classes, pins]);
  const activeFloor =
    campus.floors.find((floor) => floor.id === selectedFloor) ??
    campusFloors[0];
  const visiblePois = campus.pois.filter(
    (poi) => selectedFloor === 'campus' || poi.floor === selectedFloor,
  );
  const visiblePins = pins.filter(
    (pin) => selectedFloor === 'campus' || pin.floor === selectedFloor,
  );
  const selectedPoi = campus.pois.find((poi) => poi.id === selectedPoiId);
  const classCountOnFloor = (floor: CampusFloorId) =>
    pins
      .filter((pin) => pin.floor === floor)
      .reduce((total, pin) => total + pin.courses.length, 0);
  const selectClass = (course: Course, floor?: CampusFloorId) => {
    onSelectClass(course.id);
    if (floor) setSelectedFloor(floor);
  };

  return (
    <section className="campus-workspace" aria-label="Campus map workspace">
      <div className="campus-intro panel">
        <div className="campus-intro-icon">
          <MapPinned size={22} />
        </div>
        <div>
          <span className="eyebrow">Selected school</span>
          <h2>{campus.name}</h2>
          <p>
            {campus.address} · Use the floor tabs to find a room, class, or
            everyday campus service.
          </p>
        </div>
        <a
          className="text-link campus-source-link"
          href={campus.mapUrl}
          target="_blank"
          rel="noreferrer"
        >
          <MapIcon size={15} /> Official map
        </a>
      </div>

      <div
        className="campus-floor-tabs"
        role="tablist"
        aria-label="Campus floors"
      >
        {campus.floors.map((floor) => (
          <button
            key={floor.id}
            role="tab"
            aria-selected={selectedFloor === floor.id}
            className={selectedFloor === floor.id ? 'selected' : ''}
            onClick={() => {
              setSelectedFloor(floor.id);
              setSelectedPoiId('');
            }}
          >
            <span>{floor.shortLabel}</span>
            {floor.id !== 'campus' && (
              <small>
                {classCountOnFloor(floor.id)} class
                {classCountOnFloor(floor.id) === 1 ? '' : 'es'}
              </small>
            )}
          </button>
        ))}
      </div>

      <OfficialFloorPlanViewer
        source={campus.localMapPath}
        officialSource={campus.mapUrl}
      />

      <div className="campus-map-grid">
        <div className="campus-plan panel">
          <div className="campus-plan-heading">
            <div>
              <span className="eyebrow">Floor plan</span>
              <h2>{activeFloor.label}</h2>
            </div>
            <span className="campus-plan-count">
              <MapPinned size={14} /> {visiblePins.length} room pin
              {visiblePins.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="campus-plan-description">{activeFloor.description}</p>
          <div className="campus-svg-wrap">
            <svg
              className={`campus-svg ${selectedFloor === 'campus' ? 'campus-overview-svg' : ''}`}
              viewBox="0 0 100 64"
              aria-label={`${activeFloor.label} schematic map`}
            >
              <defs>
                <pattern
                  id="campus-grid"
                  width="5"
                  height="5"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 5 0 L 0 0 0 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.08"
                  />
                </pattern>
              </defs>
              <rect
                className="campus-svg-background"
                x="0"
                y="0"
                width="100"
                height="64"
                rx="2"
              />
              <rect
                className="campus-svg-grid"
                x="0"
                y="0"
                width="100"
                height="64"
                rx="2"
              />
              {selectedFloor === 'campus'
                ? campus.buildings.map((building) => (
                    <g key={building.id}>
                      <rect
                        className={`campus-zone campus-zone-${building.tone}`}
                        x={building.x}
                        y={building.y}
                        width={building.width}
                        height={building.height}
                        rx="1.5"
                      />
                      <text
                        className="campus-zone-label"
                        x={building.x + 2}
                        y={building.y + 5}
                      >
                        {building.name}
                      </text>
                      <text
                        className="campus-zone-detail"
                        x={building.x + 2}
                        y={building.y + 9}
                      >
                        {building.roomRanges}
                      </text>
                    </g>
                  ))
                : activeFloor.zones.map((zone) => (
                    <g key={zone.id}>
                      <rect
                        className={`campus-zone campus-zone-${zone.tone}`}
                        x={zone.x}
                        y={zone.y}
                        width={zone.width}
                        height={zone.height}
                        rx="1.5"
                      />
                      <text
                        className="campus-zone-label"
                        x={zone.x + 2}
                        y={zone.y + 5}
                      >
                        {zone.label}
                      </text>
                      <text
                        className="campus-zone-detail"
                        x={zone.x + 2}
                        y={zone.y + 9}
                      >
                        {zone.detail}
                      </text>
                    </g>
                  ))}
              {selectedFloor === 'campus' && (
                <path
                  className="campus-route"
                  d="M 4 8 L 96 8 M 4 51 L 96 51"
                />
              )}
              {visiblePois.map((poi) => {
                const selected = poi.id === selectedPoiId;
                return (
                  <a
                    href={`#poi-${poi.id}`}
                    key={poi.id}
                    className={`campus-poi-marker ${selected ? 'selected' : ''}`}
                    aria-label={`${poi.name}${poi.room ? `, room ${poi.room}` : ''}`}
                    onClick={(event) => {
                      event.preventDefault();
                      setSelectedPoiId(poi.id);
                    }}
                  >
                    <circle
                      className="campus-poi-dot"
                      cx={poi.x}
                      cy={poi.y}
                      r="1.7"
                    />
                    <circle
                      className="campus-poi-halo"
                      cx={poi.x}
                      cy={poi.y}
                      r="2.8"
                    />
                    <text
                      className="campus-poi-label"
                      x={poi.x + 2.4}
                      y={poi.y + 1}
                    >
                      {poi.name}
                    </text>
                    <title>{poi.name}</title>
                  </a>
                );
              })}
              {visiblePins.map((pin) => {
                const position =
                  selectedFloor === 'campus'
                    ? campusPositionForRoom(pin.room)
                    : { x: pin.x, y: pin.y };
                const active = pin.courses.some(
                  (course) => course.id === selectedClassId,
                );
                const click = () => selectClass(pin.courses[0], pin.floor);
                return (
                  <a
                    href={`#class-${pin.floor}-${pin.room}`}
                    key={`${pin.floor}-${pin.room}`}
                    className={`campus-class-marker ${active ? 'selected' : ''}`}
                    aria-label={titleForPin(pin)}
                    onClick={(event) => {
                      event.preventDefault();
                      click();
                    }}
                  >
                    <circle
                      className="campus-class-halo"
                      cx={position.x}
                      cy={position.y}
                      r="3.4"
                    />
                    <circle
                      className="campus-class-dot"
                      cx={position.x}
                      cy={position.y}
                      r="2.2"
                    />
                    <text
                      className="campus-class-label"
                      x={position.x}
                      y={position.y + 0.7}
                      textAnchor="middle"
                    >
                      {pin.courses.length}
                    </text>
                    <text
                      className="campus-class-room"
                      x={position.x + 3.4}
                      y={position.y + 1}
                    >
                      {pin.room}
                    </text>
                    <title>{titleForPin(pin)}</title>
                  </a>
                );
              })}
              {selectedFloor === 'campus' && (
                <g className="campus-entrance-marker">
                  <circle cx="5" cy="30" r="2" />
                  <text x="8" y="31">
                    Main entrance
                  </text>
                </g>
              )}
            </svg>
          </div>
          <div className="campus-legend" aria-label="Map legend">
            <span>
              <i className="legend-dot class" /> Your classes
            </span>
            <span>
              <i className="legend-dot poi" /> Points of interest
            </span>
            <span>
              <i className="legend-line" /> Walkway / connection
            </span>
          </div>
        </div>

        <aside className="campus-details">
          {selectedPoi ? (
            <section className="panel campus-detail-card">
              <div className="campus-detail-heading">
                <span className="campus-detail-icon">
                  {(() => {
                    const Icon = categoryIcons[selectedPoi.category];
                    return <Icon size={18} />;
                  })()}
                </span>
                <div>
                  <span className="eyebrow">Point of interest</span>
                  <h3>{selectedPoi.name}</h3>
                </div>
                <button
                  className="icon-button"
                  aria-label="Close point of interest"
                  onClick={() => setSelectedPoiId('')}
                >
                  ×
                </button>
              </div>
              <p>{selectedPoi.description}</p>
              <div className="campus-detail-meta">
                <span>{categoryLabels[selectedPoi.category]}</span>
                <span>
                  {selectedPoi.floor === 'campus'
                    ? 'Campus grounds'
                    : campus.floors.find(
                        (floor) => floor.id === selectedPoi.floor,
                      )?.label}
                </span>
                {selectedPoi.room && <strong>{selectedPoi.room}</strong>}
              </div>
            </section>
          ) : (
            <section className="panel campus-help-card">
              <div className="section-heading">
                <h2>Find your way around</h2>
                <span className="stat-icon violet">
                  <Navigation size={16} />
                </span>
              </div>
              <p>
                Click a pin on the plan or choose a point of interest below for
                room and floor details.
              </p>
              <div className="campus-help-note">
                <Info size={14} /> Room numbers usually begin with the floor:
                A2xxx is second floor, A3xxx is third, and A0xxx is basement.
              </div>
            </section>
          )}

          <section className="panel campus-class-list">
            <div className="section-heading">
              <h2>
                Your class pins{' '}
                <span className="number-tag">{pins.length}</span>
              </h2>
              <Target size={17} />
            </div>
            {pins.length ? (
              <>
                {pins.map((pin) => (
                  <div
                    className="campus-class-row"
                    key={`${pin.floor}-${pin.room}`}
                  >
                    <span className="campus-room-badge">{pin.room}</span>
                    <div>
                      {pin.courses.map((course) => (
                        <button
                          className={`campus-class-link ${course.id === selectedClassId ? 'selected' : ''}`}
                          key={course.id}
                          onClick={() => selectClass(course, pin.floor)}
                        >
                          <span
                            className="color-dot"
                            style={{ background: course.color }}
                          />
                          {course.name}
                        </button>
                      ))}
                      <small>
                        {
                          campus.floors.find((floor) => floor.id === pin.floor)
                            ?.label
                        }{' '}
                        ·{' '}
                        {pin.courses.length > 1
                          ? `${pin.courses.length} classes`
                          : 'class pin'}
                      </small>
                    </div>
                  </div>
                ))}
                {classesWithoutRoom.map((course) => (
                  <div
                    className="campus-class-row campus-unmapped-row"
                    key={`unmapped-${course.id}`}
                  >
                    <span className="campus-room-badge">TBA</span>
                    <div>
                      <button
                        className={`campus-class-link ${course.id === selectedClassId ? 'selected' : ''}`}
                        onClick={() => onSelectClass(course.id)}
                      >
                        <span
                          className="color-dot"
                          style={{ background: course.color }}
                        />
                        {course.name}
                      </button>
                      <small>
                        Add a room such as A2134 to place this class on the map.
                      </small>
                    </div>
                  </div>
                ))}
              </>
            ) : classesWithoutRoom.length ? (
              classesWithoutRoom.map((course) => (
                <div
                  className="campus-class-row campus-unmapped-row"
                  key={`unmapped-${course.id}`}
                >
                  <span className="campus-room-badge">TBA</span>
                  <div>
                    <button
                      className="campus-class-link"
                      onClick={() => onSelectClass(course.id)}
                    >
                      <span
                        className="color-dot"
                        style={{ background: course.color }}
                      />
                      {course.name}
                    </button>
                    <small>
                      Add a room such as A2134 to place this class on the map.
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="mini-empty">
                Add a class meeting to place it on the map.
              </p>
            )}
          </section>

          <section className="panel campus-poi-list">
            <div className="section-heading">
              <h2>
                Points of interest{' '}
                <span className="number-tag">{visiblePois.length}</span>
              </h2>
              <Building2 size={17} />
            </div>
            <div className="campus-poi-list-grid">
              {visiblePois.map((poi) => {
                const Icon = categoryIcons[poi.category];
                return (
                  <button
                    className={`campus-poi-row ${poi.id === selectedPoiId ? 'selected' : ''}`}
                    key={poi.id}
                    onClick={() => setSelectedPoiId(poi.id)}
                  >
                    <Icon size={15} />
                    <span>
                      <strong>{poi.name}</strong>
                      <small>{poi.room || categoryLabels[poi.category]}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {activeFloor.roomRanges.length > 0 && (
            <section className="panel campus-ranges">
              <div className="section-heading">
                <h2>Room ranges</h2>
                <Library size={17} />
              </div>
              <ul>
                {activeFloor.roomRanges.map((range) => (
                  <li key={range}>{range}</li>
                ))}
              </ul>
            </section>
          )}

          <p className="campus-data-note">
            Floor and room ranges are transcribed from St. Clair College’s Main
            Windsor Campus Map. Confirm a room with the college if signage or
            construction has changed.
          </p>
        </aside>
      </div>
    </section>
  );
}
