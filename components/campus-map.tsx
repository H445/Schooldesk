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
  detailedPlanForFloor,
  detailedPlanSource,
  positionForDetailedPlan,
  extractRoomCode,
  floorForRoom,
  positionForOfficialPlan,
  positionForPoi,
  type CampusCategory,
  type CampusFloor,
  type CampusFloorId,
  type CampusPoi,
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
      map.set(key, { room, floor, courses: [course] });
    }
  }
  return [...map.values()];
}

const PDF_ZOOMS = [100, 125, 150, 200, 250, 300] as const;

type MarkerItem = {
  id: string;
  label: string;
  shortLabel: string;
  kind: 'class' | 'poi';
  selected: boolean;
  onSelect: () => void;
};

type PlanMarker = { x: number; y: number; items: MarkerItem[] };

function OfficialFloorPlanViewer({
  source,
  officialSource,
  pins,
  pois,
  selectedClassId,
  selectedPoiId,
  selectedFloor,
  activeFloor,
  onSelectClass,
  onSelectPoi,
  onClearSelection,
}: {
  source: string;
  officialSource: string;
  pins: ClassPin[];
  pois: CampusPoi[];
  selectedClassId?: string;
  selectedPoiId?: string;
  selectedFloor: CampusFloorId;
  activeFloor: CampusFloor;
  onSelectClass: (course: Course, floor: CampusFloorId) => void;
  onSelectPoi: (id: string) => void;
  onClearSelection: () => void;
}) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [expandedMarker, setExpandedMarker] = useState('');
  const zoom = PDF_ZOOMS[zoomIndex];
  const showLabels = zoom >= 150;
  const detailedPlan = detailedPlanForFloor(selectedFloor);
  const roomPosition = (pin: ClassPin) =>
    detailedPlan
      ? positionForDetailedPlan(pin.room, selectedFloor)
      : positionForOfficialPlan(pin.room, pin.floor);
  const floorPins = pins.filter(
    (pin) => selectedFloor === 'campus' || pin.floor === selectedFloor,
  );
  const mapPins = floorPins.filter(roomPosition);
  const unlocatedPins = floorPins.filter((pin) => !roomPosition(pin));
  const markers = new Map<string, PlanMarker>();
  const addMarker = (position: { x: number; y: number }, item: MarkerItem) => {
    const key = `${position.x}:${position.y}`;
    const marker = markers.get(key) ?? { ...position, items: [] };
    marker.items.push(item);
    markers.set(key, marker);
  };
  for (const poi of pois) {
    const position = positionForPoi(poi, selectedFloor);
    if (!position) continue;
    addMarker(position, {
      id: poi.id,
      label: `${poi.name} · ${position.location}`,
      shortLabel: poi.name,
      kind: 'poi',
      selected: poi.id === selectedPoiId,
      onSelect: () => onSelectPoi(poi.id),
    });
  }
  for (const pin of mapPins) {
    for (const course of pin.courses) {
      addMarker(roomPosition(pin)!, {
        id: course.id,
        label: `${pin.room}: ${course.name}`,
        shortLabel: pin.room,
        kind: 'class',
        selected: course.id === selectedClassId,
        onSelect: () => onSelectClass(course, pin.floor),
      });
    }
  }
  return (
    <section className="panel actual-floorplan">
      <div className="actual-floorplan-heading">
        <div>
          <span className="eyebrow">Official plan</span>
          <h2>Hallways and room layout</h2>
          <p>
            {detailedPlan
              ? 'Main Building: individual rooms, corridors, washrooms, and exits from the college’s detailed drawings.'
              : 'Campus overview. Select a floor to see the Main Building’s detailed room and corridor plan.'}{' '}
            Click an empty area of the map to show all classes again.
          </p>
          <div className="floorplan-overlay-summary">
            <strong>{activeFloor.label}</strong>
            <span>
              {mapPins.length} room pin{mapPins.length === 1 ? '' : 's'}
            </span>
            <span>
              <i className="floorplan-legend-dot class" /> Your classes
            </span>
            <span>
              <i className="floorplan-legend-dot poi" /> Points of interest
            </span>
          </div>
        </div>
        <div className="actual-floorplan-actions">
          {(selectedClassId || selectedPoiId || selectedFloor !== 'campus') && (
            <button onClick={onClearSelection}>Show all classes</button>
          )}
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
          <a
            href={detailedPlan?.pdf ?? officialSource}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={14} />
            Open PDF
          </a>
        </div>
      </div>
      <div className="actual-floorplan-frame">
        <div className="floorplan-overlay-viewport">
          <div
            className="floorplan-overlay-canvas"
            style={{ width: `${zoom}%` }}
          >
            <img
              src={detailedPlan?.image ?? source}
              alt={
                detailedPlan
                  ? `Main Building detailed plan — ${activeFloor.label}`
                  : 'Official St. Clair College Main Windsor Campus floor plan'
              }
              draggable={false}
            />
            <fieldset
              className="floorplan-overlay-layer"
              aria-label="Class and point-of-interest overlays"
            >
              <button
                type="button"
                className="floorplan-overlay-background"
                aria-label="Clear map selection and show all classes"
                onClick={() => {
                  setExpandedMarker('');
                  onClearSelection();
                }}
              />
              {[...markers].map(([key, marker]) => {
                const active = marker.items.some((item) => item.selected);
                const hasClasses = marker.items.some(
                  (item) => item.kind === 'class',
                );
                const expanded = expandedMarker === key;
                const label = [
                  ...new Set(marker.items.map((item) => item.shortLabel)),
                ].join(' / ');
                const title = marker.items.map((item) => item.label).join('; ');
                return (
                  <div
                    key={key}
                    className={`floorplan-marker ${hasClasses ? 'floorplan-overlay-class' : 'floorplan-overlay-poi'} ${active ? 'selected' : ''} ${expanded ? 'expanded' : ''}`}
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                  >
                    <button
                      type="button"
                      className="floorplan-marker-dot"
                      aria-label={title}
                      title={title}
                      aria-expanded={
                        marker.items.length > 1 ? expanded : undefined
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') setExpandedMarker('');
                      }}
                      onClick={() => {
                        if (marker.items.length > 1) {
                          setExpandedMarker(expanded ? '' : key);
                        } else {
                          setExpandedMarker('');
                          marker.items[0].onSelect();
                        }
                      }}
                    >
                      {hasClasses || marker.items.length > 1 ? (
                        marker.items.length
                      ) : (
                        <span className="floorplan-poi-center" />
                      )}
                    </button>
                    {(showLabels ||
                      active ||
                      expanded ||
                      (detailedPlan && hasClasses)) && (
                      <span className="floorplan-overlay-label">{label}</span>
                    )}
                    {expanded && (
                      <fieldset
                        className="floorplan-marker-choices"
                        aria-label="Items at this location"
                      >
                        {marker.items.map((item) => (
                          <button
                            type="button"
                            key={`${item.kind}-${item.id}`}
                            onKeyDown={(event) => {
                              if (event.key === 'Escape') {
                                setExpandedMarker('');
                                event.currentTarget
                                  .closest('.floorplan-marker')
                                  ?.querySelector<HTMLButtonElement>(
                                    '.floorplan-marker-dot',
                                  )
                                  ?.focus();
                              }
                            }}
                            onClick={() => {
                              setExpandedMarker('');
                              item.onSelect();
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </fieldset>
                    )}
                  </div>
                );
              })}
            </fieldset>
          </div>
        </div>
      </div>
      {unlocatedPins.length > 0 && (
        <div className="floorplan-unlocated-rooms">
          <span>
            Rooms not individually marked on this{' '}
            {detailedPlan ? 'drawing' : 'overview'}:
          </span>
          {unlocatedPins.map((pin) => (
            <button
              key={`${pin.floor}-${pin.room}`}
              onClick={() => onSelectClass(pin.courses[0], pin.floor)}
            >
              {pin.room}
              {!detailedPlan && positionForDetailedPlan(pin.room, pin.floor)
                ? ' · View floor'
                : ''}
            </button>
          ))}
        </div>
      )}
      <p className="actual-floorplan-caption">
        {detailedPlan
          ? 'Pins use room-label positions from this drawing. Rooms absent from the drawing remain in the class list. Third and fourth floors share one drawing.'
          : 'Room pins align with printed room labels. Shared POI pins identify the building or room group shown on this overview; click one to choose a destination.'}{' '}
        Scroll to pan; open the PDF for full-resolution labels.
      </p>
      <nav
        className="campus-plan-sources"
        aria-label="Detailed campus plan sources"
      >
        <span>More official plans:</span>
        <a href={detailedPlanSource} target="_blank" rel="noreferrer">
          Main Building
        </a>
        <a
          href="https://www.stclaircollege.ca/sites/default/files/inline-files/maps/maps-building-b-fcem.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Ford Centre
        </a>
        <a
          href="https://www.stclaircollege.ca/sites/default/files/inline-files/maps/maps-building-f-toldo.pdf"
          target="_blank"
          rel="noreferrer"
        >
          Health Sciences
        </a>
        <a
          href="https://www.stclaircollege.ca/student-services/on-campus-services"
          target="_blank"
          rel="noreferrer"
        >
          Locker maps by floor
        </a>
      </nav>
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
        key={selectedFloor}
        source={campus.localMapImagePath}
        officialSource={campus.mapUrl}
        pins={pins}
        pois={campus.pois}
        selectedClassId={selectedClassId}
        selectedPoiId={selectedPoiId}
        selectedFloor={selectedFloor}
        activeFloor={activeFloor}
        onSelectClass={selectClass}
        onSelectPoi={(id) => setSelectedPoiId(id)}
        onClearSelection={() => {
          onSelectClass('');
          setSelectedPoiId('');
          setSelectedFloor('campus');
        }}
      />

      <div className="campus-details campus-details-unified">
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
            <p>
              {positionForPoi(selectedPoi, selectedFloor)?.location ??
                'This location is not individually marked on the current drawing.'}
            </p>
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
              Your class pins <span className="number-tag">{pins.length}</span>
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
                    <small>
                      {positionForPoi(poi, selectedFloor)?.location ??
                        `${poi.room || categoryLabels[poi.category]} · Not marked on this plan`}
                    </small>
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
      </div>
    </section>
  );
}
