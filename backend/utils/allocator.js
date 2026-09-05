function allocateStudents(
  students,
  roomIds,
  options = {}
) {
  const maxCoursesPerRoom =
    Number(
      options.maxCoursesPerRoom
    ) || 4;

  const capacities =
    options.capacities || {};

  const roomLayouts =
    options.roomLayouts || {};

  if (!Array.isArray(students)) {
    throw new Error(
      'students must be an array'
    );
  }

  if (
    !Array.isArray(roomIds) ||
    roomIds.length === 0
  ) {
    throw new Error(
      'roomIds must be a non-empty array'
    );
  }

  if (students.length === 0) {
    return {
      allocations: {},
      roomInfo: {},
      warnings: [
        'No students available for allocation.'
      ]
    };
  }

  const warnings = [];
  const uniqueStudents = [];
  const studentIds = new Set();

  for (const student of students) {
    const studentId = String(
      student.student_id ??
        student.id ??
        ''
    ).trim();

    if (!studentId) {
      continue;
    }

    if (
      studentIds.has(studentId)
    ) {
      warnings.push(
        `Duplicate student ${studentId} was removed.`
      );

      continue;
    }

    studentIds.add(studentId);

    uniqueStudents.push({
      ...student,
      student_id: studentId
    });
  }

  const courseMap = new Map();

  for (const student of uniqueStudents) {
    const courseCode = String(
      student.course_code ||
        student.course ||
        'UNASSIGNED'
    ).trim();

    const section =
      student.section !==
        undefined &&
      student.section !== null
        ? String(
            student.section
          ).trim()
        : '';

    const courseKey = section
      ? `${courseCode}.${section}`
      : courseCode;

    if (
      !courseMap.has(courseKey)
    ) {
      courseMap.set(courseKey, {
        key: courseKey,
        course_code: courseCode,
        section,
        students: []
      });
    }

    courseMap
      .get(courseKey)
      .students.push(student);
  }

  const courses =
    Array.from(
      courseMap.values()
    );

  const rooms = roomIds.map(
    (roomId) => {
      const key = String(roomId);

      const layout =
        roomLayouts[key] || {};

      let capacity = Number(
        capacities[key]
      );

      const rows = Number(
        layout.rows
      );

      const columns =
        Number(layout.columns) ||
        6;

      if (
        Number.isInteger(rows) &&
        rows > 0 &&
        Number.isInteger(columns) &&
        columns > 0
      ) {
        capacity =
          rows * columns;
      }

      if (
        !Number.isFinite(
          capacity
        ) ||
        capacity <= 0
      ) {
        capacity = 0;
      }

      return {
        id: key,
        capacity,
        rows:
          Number.isInteger(rows) &&
          rows > 0
            ? rows
            : Math.ceil(
                capacity /
                  columns
              ),
        columns:
          Number.isInteger(
            columns
          ) && columns > 0
            ? columns
            : 6,
        students: [],
        courses: new Set()
      };
    }
  );

  const totalCapacity =
    rooms.reduce(
      (total, room) =>
        total + room.capacity,
      0
    );

  if (
    uniqueStudents.length >
    totalCapacity
  ) {
    return {
      allocations: null,
      roomInfo: {},
      warnings: [
        `Not enough room capacity. ${uniqueStudents.length} students require seats, but only ${totalCapacity} seats are available.`
      ]
    };
  }

  if (
    courses.length >
    rooms.length *
      maxCoursesPerRoom
  ) {
    return {
      allocations: null,
      roomInfo: {},
      warnings: [
        `Too many distinct courses (${courses.length}) for ${rooms.length} rooms with a maximum of ${maxCoursesPerRoom} courses per room.`
      ]
    };
  }

  courses.sort(
    (a, b) =>
      b.students.length -
      a.students.length
  );

  for (const course of courses) {
    for (const student of course.students) {
      let candidates =
        rooms.filter(
          (room) =>
            room.courses.has(
              course.key
            ) &&
            room.students.length <
              room.capacity
        );

      if (
        candidates.length === 0
      ) {
        candidates =
          rooms.filter(
            (room) =>
              room.courses.size <
                maxCoursesPerRoom &&
              room.students.length <
                room.capacity
          );
      }

      if (
        candidates.length === 0
      ) {
        return {
          allocations: null,
          roomInfo: {},
          warnings: [
            ...warnings,
            `No available seat for student ${student.student_id}.`
          ]
        };
      }

      candidates.sort(
        (a, b) => {
          const aHasCourse =
            a.courses.has(
              course.key
            )
              ? 0
              : 1;

          const bHasCourse =
            b.courses.has(
              course.key
            )
              ? 0
              : 1;

          if (
            aHasCourse !==
            bHasCourse
          ) {
            return (
              aHasCourse -
              bHasCourse
            );
          }

          if (
            a.courses.size !==
            b.courses.size
          ) {
            return (
              a.courses.size -
              b.courses.size
            );
          }

          return (
            a.students.length -
            b.students.length
          );
        }
      );

      const room =
        candidates[0];

      room.students.push({
        ...student,
        course_code:
          student.course_code ||
          course.course_code,
        section:
          student.section ||
          course.section ||
          null
      });

      room.courses.add(
        course.key
      );
    }
  }

  const allocations = {};
  const roomInfo = {};

  for (const room of rooms) {
    if (
      room.students.length === 0
    ) {
      continue;
    }

    const roomAllocations = [];

    const columns =
      room.columns || 6;

    const rows = Math.ceil(
      room.capacity /
        columns
    );

    const courseQueues =
      new Map();

    for (const student of room.students) {
      const courseKey =
        student.section
          ? `${student.course_code}.${student.section}`
          : student.course_code;

      if (
        !courseQueues.has(
          courseKey
        )
      ) {
        courseQueues.set(
          courseKey,
          []
        );
      }

      courseQueues
        .get(courseKey)
        .push(student);
    }

    const queueEntries =
      Array.from(
        courseQueues.entries()
      );

    let seatIndex = 0;

    while (
      seatIndex <
        room.capacity &&
      queueEntries.some(
        ([, queue]) =>
          queue.length > 0
      )
    ) {
      for (
        const [
          courseKey,
          queue
        ] of queueEntries
      ) {
        if (
          queue.length === 0
        ) {
          continue;
        }

        if (
          seatIndex >=
          room.capacity
        ) {
          break;
        }

        const student =
          queue.shift();

        const row =
          Math.floor(
            seatIndex /
              columns
          );

        const column =
          seatIndex %
          columns;

        roomAllocations.push({
          ...student,
          room_id: Number(
            room.id
          ),
          seat_no:
            seatIndex + 1,
          row: row + 1,
          column:
            column + 1,
          course_section:
            courseKey
        });

        seatIndex++;
      }
    }

    if (
      roomAllocations.length !==
      room.students.length
    ) {
      return {
        allocations: null,
        roomInfo: {},
        warnings: [
          ...warnings,
          `Room ${room.id} could not receive all assigned students.`
        ]
      };
    }

    allocations[room.id] =
      roomAllocations;

    roomInfo[room.id] = {
      capacity:
        room.capacity,
      rows,
      columns,
      studentCount:
        roomAllocations.length,
      courses:
        Array.from(
          room.courses
        )
    };
  }

  const finalStudentIds =
    new Set();

  for (const roomId of Object.keys(
    allocations
  )) {
    for (const student of
      allocations[roomId]) {
      if (
        finalStudentIds.has(
          student.student_id
        )
      ) {
        return {
          allocations: null,
          roomInfo: {},
          warnings: [
            ...warnings,
            `Student ${student.student_id} was assigned more than once.`
          ]
        };
      }

      finalStudentIds.add(
        student.student_id
      );
    }
  }

  if (
    finalStudentIds.size !==
    uniqueStudents.length
  ) {
    return {
      allocations: null,
      roomInfo: {},
      warnings: [
        ...warnings,
        `Allocation incomplete. ${finalStudentIds.size} of ${uniqueStudents.length} students received seats.`
      ]
    };
  }

  return {
    allocations,
    roomInfo,
    warnings
  };
}

module.exports = {
  allocateStudents
};

module.exports = {
  allocateStudents,
};
