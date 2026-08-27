function allocateStudents(students, roomIds, options = {}) {
    const maxCoursesPerRoom = options.maxCoursesPerRoom || 4;
    const preferredRoomId = options.preferredRoomId;

    if (!Array.isArray(students)) throw new Error('students must be an array');
    if (!Array.isArray(roomIds) || roomIds.length === 0) throw new Error('roomIds must be a non-empty array');

    // Group students by course
    const courseMap = new Map();
    for (const s of students) {
        const course = s.course_code || 'UNASSIGNED';
        if (!courseMap.has(course)) courseMap.set(course, []);
        courseMap.get(course).push(s);
    }

    const distinctCourses = Array.from(courseMap.keys());
    if (distinctCourses.length > roomIds.length * maxCoursesPerRoom) {
        return {
            allocations: null,
            warnings: [`Too many distinct courses (${distinctCourses.length}) for ${roomIds.length} rooms with max ${maxCoursesPerRoom} courses/room`]
        };
    }

    // Prepare room objects
    const rooms = roomIds.map(room => typeof room === 'object' ?
        { id: room.room_id, capacity: Number(room.capacity), students: [], courses: new Set() } :
        { id: room, capacity: Number.POSITIVE_INFINITY, students: [], courses: new Set() });

    // Sort courses by descending student count to place large courses first
    const coursesBySize = Array.from(courseMap.entries()).sort((a, b) => b[1].length - a[1].length);

    for (const [course, studs] of coursesBySize) {
        for (const stud of studs) {
            // find candidate rooms where adding this student's course won't exceed maxCoursesPerRoom
            // prefer rooms that already have this course, then those with fewest students
            let candidates = rooms.filter(r => r.courses.has(course) && r.students.length < r.capacity);
            if (candidates.length === 0) {
                candidates = rooms.filter(r => r.courses.size < maxCoursesPerRoom && r.students.length < r.capacity);
            }
            if (preferredRoomId) {
                const preferred = candidates.filter(r => String(r.id) === String(preferredRoomId));
                if (preferred.length > 0) candidates = preferred;
            }
            if (candidates.length === 0) return { allocations: null, warnings: [`No room capacity or course slot remains for ${course}.`] };
            // choose room with minimal students
            candidates.sort((a, b) => a.students.length - b.students.length);
            const chosen = candidates[0];
            chosen.students.push(stud);
            chosen.courses.add(course);
        }
    }

    const allocations = {};
    for (const r of rooms) allocations[r.id] = r.students.map(s => ({ student_id: s.student_id, name: s.name, course_code: s.course_code }));

    return { allocations, warnings: [] };
}

module.exports = { allocateStudents };