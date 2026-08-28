

function allocateStudents(students, roomIds, options = {}) {
  const maxCoursesPerRoom =
    Number(options.maxCoursesPerRoom) || 4;

  const capacities = options.capacities || {};
  const roomLayouts = options.roomLayouts || {};

  if (!Array.isArray(students)) {
    throw new Error('students must be an array');
  }

  if (!Array.isArray(roomIds) || roomIds.length === 0) {
    throw new Error(
      'roomIds must be a non-empty array'
    );
  }

  if (students.length === 0) {
    return {
      allocations: {},
      warnings: ['No students available for allocation.'],
    };
  }



  const uniqueStudents = [];
  const studentIds = new Set();
  const duplicateStudents = [];

  for (const student of students) {
    const studentId = String(
      student.student_id ??
      student.id ??
      ''
    ).trim();

    if (!studentId) {
      continue;
    }

    if (studentIds.has(studentId)) {
      duplicateStudents.push(studentId);
      continue;
    }

    studentIds.add(studentId);

    uniqueStudents.push({
      ...student,
      student_id: studentId,
    });
  }

  const warnings = [];

  if (duplicateStudents.length > 0) {
    warnings.push(
      `Removed ${duplicateStudents.length} duplicate student record(s).`
    );
  }



  const courseMap = new Map();

  for (const student of uniqueStudents) {
    const courseCode =
      String(
        student.course_code ||
        student.course ||
        'UNASSIGNED'
      ).trim();

    const section =
      student.section !== undefined &&
      student.section !== null
        ? String(student.section).trim()
        : '';

    const courseKey = section
      ? `${courseCode}.${section}`
      : courseCode;

    if (!courseMap.has(courseKey)) {
      courseMap.set(courseKey, {
        key: courseKey,
        course_code: courseCode,
        section,
        students: [],
      });
    }

    courseMap.get(courseKey).students.push(student);
  }

  const courses = Array.from(courseMap.values());


  const rooms = roomIds.map((roomId) => {
    const layout = roomLayouts[roomId] || {};

    let capacity = Number(
      capacities[roomId]
    );

    const rows = Number(
      layout.rows
    );

    const columns = Number(
      layout.columns
    );

    
    if (
      Number.isInteger(rows) &&
      rows > 0 &&
      Number.isInteger(columns) &&
      columns > 0
    ) {
      capacity = rows * columns;
    }

   
    if (
      !Number.isFinite(capacity) ||
      capacity <= 0
    ) {
      capacity = Infinity;
    }

    return {
      id: roomId,
      capacity,
      rows:
        Number.isInteger(rows) && rows > 0
          ? rows
          : null,
      columns:
        Number.isInteger(columns) &&
        columns > 0
          ? columns
          : null,

      students: [],
      courses: new Set(),
    };
  });


  const totalCapacity = rooms.reduce(
    (total, room) =>
      total +
      (Number.isFinite(room.capacity)
        ? room.capacity
        : uniqueStudents.length),
    0
  );

  if (uniqueStudents.length > totalCapacity) {
    return {
      allocations: null,
      warnings: [
        `Not enough room capacity. ${uniqueStudents.length} students require seats, but only ${totalCapacity} seats are available.`,
      ],
    };
  }



  if (
    courses.length >
    rooms.length * maxCoursesPerRoom
  ) {
    return {
      allocations: null,
      warnings: [
        `Too many distinct courses (${courses.length}) for ${rooms.length} rooms with a maximum of ${maxCoursesPerRoom} courses per room.`,
      ],
    };
  }

 

  courses.sort(
    (a, b) =>
      b.students.length -
      a.students.length
  );



  for (const course of courses) {
  
    for (const student of course.students) {
      let candidates = rooms.filter(
        (room) =>
          room.courses.has(course.key) &&
          room.students.length <
            room.capacity
      );

     
      if (candidates.length === 0) {
        candidates = rooms.filter(
          (room) =>
            room.courses.size <
              maxCoursesPerRoom &&
            room.students.length <
              room.capacity
        );
      }

      if (candidates.length === 0) {
        candidates = rooms.filter(
          (room) =>
            room.courses.has(course.key) &&
            room.students.length <
              room.capacity
        );
      }

      if (candidates.length === 0) {
        return {
          allocations: null,
          warnings: [
            ...warnings,
            `No remaining seat available for student ${student.student_id} (${course.key}).`,
          ],
        };
      }

    
      candidates.sort((a, b) => {
        const aHasCourse =
          a.courses.has(course.key)
            ? 0
            : 1;

        const bHasCourse =
          b.courses.has(course.key)
            ? 0
            : 1;

        if (aHasCourse !== bHasCourse) {
          return aHasCourse - bHasCourse;
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
      });

      const room = candidates[0];

      room.students.push({
        ...student,
        course_code:
          student.course_code ||
          course.course_code,
        section:
          student.section ||
          course.section ||
          null,
      });

      room.courses.add(
        course.key
      );
    }
  }



  const usedRooms = rooms.filter(
    (room) => room.students.length > 0
  );



  const allocations = {};

  for (const room of usedRooms) {
    const roomAllocations = [];

    const columns =
      room.columns || 6;

    const rows =
      room.rows ||
      Math.ceil(
        room.students.length /
          columns
      );

    
    const courseQueues = new Map();

    for (const student of room.students) {
      const courseKey =
        student.section
          ? `${student.course_code}.${student.section}`
          : student.course_code;

      if (!courseQueues.has(courseKey)) {
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
      ).sort(
        (a, b) =>
          b[1].length -
          a[1].length
      );

    let placed = true;

    while (placed) {
      placed = false;

      for (
        let i = 0;
        i < queueEntries.length;
        i++
      ) {
        const [
          courseKey,
          queue,
        ] = queueEntries[i];

        if (queue.length === 0) {
          continue;
        }

        const student =
          queue.shift();

        const seatIndex =
          roomAllocations.length;

        const row =
          Math.floor(
            seatIndex / columns
          );

        const column =
          seatIndex % columns;

        const seatNo =
          seatIndex + 1;

        roomAllocations.push({
          ...student,

          room_id: room.id,

         
          seat_no: seatNo,

          row: row + 1,
          column: column + 1,

          course_code:
            student.course_code,

          section:
            student.section || null,

          course_section:
            courseKey,
        });

        placed = true;

        
        if (
          roomAllocations.length >=
          room.capacity
        ) {
          break;
        }
      }

      if (
        roomAllocations.length >=
        room.capacity
      ) {
        break;
      }
    }

   
    if (
      roomAllocations.length !==
      room.students.length
    ) {
      warnings.push(
        `Room ${room.id}: some students could not be assigned a physical seat.`
      );
    }

    allocations[room.id] =
      roomAllocations;
  }



  const finalStudentIds =
    new Set();

  let duplicateAllocationCount =
    0;

  for (const roomId of Object.keys(
    allocations
  )) {
    for (const allocation of
      allocations[roomId]) {
      if (
        finalStudentIds.has(
          allocation.student_id
        )
      ) {
        duplicateAllocationCount++;
      }

      finalStudentIds.add(
        allocation.student_id
      );
    }
  }

  if (
    duplicateAllocationCount > 0
  ) {
    return {
      allocations: null,
      warnings: [
        ...warnings,
        `Allocation failed because ${duplicateAllocationCount} duplicate student allocation(s) were detected.`,
      ],
    };
  }



  const allocatedCount =
    Object.values(allocations)
      .reduce(
        (total, roomStudents) =>
          total + roomStudents.length,
        0
      );

  if (
    allocatedCount !==
    uniqueStudents.length
  ) {
    return {
      allocations: null,
      warnings: [
        ...warnings,
        `Allocation incomplete. ${allocatedCount} of ${uniqueStudents.length} students received seats.`,
      ],
    };
  }



  const roomInfo = {};

  for (const room of usedRooms) {
    roomInfo[room.id] = {
      capacity: room.capacity,
      rows:
        room.rows ||
        Math.ceil(
          room.students.length /
            (room.columns || 6)
        ),
      columns:
        room.columns || 6,

      studentCount:
        allocations[room.id]
          ?.length || 0,

      courses:
        Array.from(
          room.courses
        ),
    };
  }

  return {
    allocations,
    roomInfo,
    warnings,
  };
}

module.exports = {
  allocateStudents,
};

