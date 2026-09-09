export function performanceFixture(classCount = 2000, recordCount = 2000) {
  const classes = Array.from({ length: classCount }, (_, i) => ({
    id: `c${i}`,
    name: `Class ${i}`,
    code: `C${i}`,
    teacher: 'Teacher',
    schedule: 'Campus',
    color: '#9170df',
    calendarSchedules: [9, 14].map((hour) => ({
      weekdays: [1, 3, 5],
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
      startDate: '2026-09-01',
      endDate: '2026-12-31',
      location: 'Room 1',
    })),
  }));
  return {
    classes,
    assignments: Array.from({ length: recordCount }, (_, i) => ({
      id: `a${i}`,
      title: `Assignment ${i}`,
      classId: `c${i % classCount}`,
      dueDate: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
      priority: 'Medium',
      status: ['To do', 'In progress', 'Done'][i % 3],
      description: 'Homework',
    })),
    notes: Array.from({ length: recordCount }, (_, i) => ({
      id: `n${i}`,
      title: `Note ${i}`,
      classId: `c${i % classCount}`,
      content: 'Lecture notes. '.repeat(80),
      updatedAt: '2026-09-08T12:00:00Z',
    })),
  };
}
