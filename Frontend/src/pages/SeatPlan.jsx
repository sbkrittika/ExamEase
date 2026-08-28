
import { useEffect, useMemo, useState } from 'react';
import { Grid, Printer, Download } from 'lucide-react';
import { apiRequest } from '../api';

function escapeCsv(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function getSeatNumber(seatNo) {
  if (seatNo === null || seatNo === undefined) return null;

  const match = String(seatNo).match(/\d+/);
  return match ? Number(match[0]) : null;
}

function getSeatColumn(seatNo, columnCount) {
  const number = getSeatNumber(seatNo);
  if (!number || !columnCount) return null;

  return ((number - 1) % columnCount);
}

function getSeatRow(seatNo, columnCount) {
  const number = getSeatNumber(seatNo);
  if (!number || !columnCount) return null;

  return Math.floor((number - 1) / columnCount);
}

function getCourseLabel(item) {
  if (!item) return '—';

  const course = item.course_code || item.course || '—';
  const section =
    item.section !== undefined &&
    item.section !== null &&
    String(item.section).trim() !== ''
      ? `.${item.section}`
      : '';

  return `${course}${section}`;
}

function getRoomLabel(room) {
  if (!room) return '';

  const building = room.building ? `${room.building} ` : '';
  return `${building}${room.room_number || room.room_id || ''}`.trim();
}

function getDateText(exam) {
  if (!exam) return '';

  const date = exam.exam_date || exam.date;
  if (!date) return '';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return String(date);
  }

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getTimeText(exam) {
  if (!exam) return '';

  const start =
    exam.start_time ||
    exam.exam_time ||
    exam.time ||
    '';

  const end =
    exam.end_time ||
    exam.exam_end_time ||
    '';

  if (start && end) return `${start}-${end}`;
  return start || '';
}

function getExamTitle(exam) {
  if (!exam) return 'Seat Plan';

  if (exam.exam_type) {
    return exam.exam_type;
  }

  if (exam.title) {
    return exam.title;
  }

  if (exam.exam_name) {
    return exam.exam_name;
  }

  return 'Midterm Exam';
}

function getSemesterText(exam) {
  if (!exam) return '';

  return (
    exam.semester_name ||
    exam.semester ||
    exam.term ||
    ''
  );
}

function getBuildingText(exam, rooms) {
  if (exam?.building) return exam.building;

  const buildings = [
    ...new Set(
      rooms
        .map((room) => room.building)
        .filter(Boolean)
    ),
  ];

  return buildings.join(' and ');
}

function getRoomColumnCount(room, roomAllocations) {
  const possibleValues = [
    room?.columns,
    room?.column_count,
    room?.total_columns,
    room?.cols,
  ];

  for (const value of possibleValues) {
    const number = Number(value);
    if (Number.isInteger(number) && number > 0) {
      return number;
    }
  }

  /*
   * If the room itself does not contain column information,
   * determine the minimum number of columns required by the
   * allocated seat numbers.
   */
  const seatNumbers = roomAllocations
    .map((item) => getSeatNumber(item.seat_no))
    .filter(Boolean);

  if (!seatNumbers.length) return 6;

  const maxSeat = Math.max(...seatNumbers);

  /*
   * Your current application uses six seats per row.
   * This remains the fallback so existing allocations continue
   * to display correctly.
   */
  return Math.min(6, Math.max(1, maxSeat));
}

function buildRoomRows(room, allocations, columnCount) {
  if (!allocations.length) return [];

  const hasUsableSeatNumbers = allocations.some(
    (item) => getSeatNumber(item.seat_no)
  );

  /*
   * If seat_no contains actual seat numbers, use those numbers
   * to place students in the correct row/column.
   */
  if (hasUsableSeatNumbers) {
    const rowMap = {};

    allocations.forEach((item, index) => {
      const seatNumber =
        getSeatNumber(item.seat_no) || index + 1;

      const row = getSeatRow(seatNumber, columnCount);

      if (!rowMap[row]) {
        rowMap[row] = Array(columnCount).fill(null);
      }

      const column = getSeatColumn(seatNumber, columnCount);

      if (
        column !== null &&
        column >= 0 &&
        column < columnCount
      ) {
        rowMap[row][column] = item;
      }
    });

    return Object.keys(rowMap)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => rowMap[key]);
  }

  /*
   * Fallback for the current allocation structure.
   */
  const rows = [];

  for (let i = 0; i < allocations.length; i += columnCount) {
    rows.push(
      allocations.slice(i, i + columnCount)
    );
  }

  return rows;
}

function courseSummary(allocations, roomGroups) {
  const courseMap = {};

  allocations.forEach((item) => {
    const label = getCourseLabel(item);

    if (!courseMap[label]) {
      courseMap[label] = {
        course: label,
        total: 0,
        rooms: {},
      };
    }

    courseMap[label].total += 1;

    const roomId = item.room_id;

    if (!courseMap[label].rooms[roomId]) {
      courseMap[label].rooms[roomId] = 0;
    }

    courseMap[label].rooms[roomId] += 1;
  });

  return Object.values(courseMap).sort((a, b) =>
    a.course.localeCompare(b.course)
  );
}

export default function SeatPlan() {
  const [exams, setExams] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [allocations, setAllocations] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const selectedExamData = useMemo(
    () =>
      exams.find(
        (exam) =>
          String(exam.exam_id) === String(selectedExam)
      ),
    [exams, selectedExam]
  );

  const load = async (examId) => {
    if (!examId) {
      setAllocations([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const data = await apiRequest(
        `/api/exams/${examId}/allocations`
      );

      setAllocations(data.allocations || []);
    } catch (err) {
      setError(err.message || 'Failed to load seat plan.');
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError('');

        const [examData, roomData] = await Promise.all([
          apiRequest('/api/exams'),
          apiRequest('/api/rooms'),
        ]);

        setExams(examData.exams || []);

        setRooms(
          (roomData.rooms || []).filter(
            (room) =>
              room.status === 'Available' ||
              !room.status
          )
        );
      } catch (err) {
        setError(
          err.message || 'Failed to load seat plan data.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    load(selectedExam);
  }, [selectedExam]);

  const generate = async () => {
    if (!selectedExam) {
      setError('Please select an exam.');
      return;
    }

    if (!rooms.length) {
      setError(
        'Please add at least one available room before generating the seat plan.'
      );
      return;
    }

    try {
      setGenerating(true);
      setError('');

      await apiRequest('/api/exams/allocate', {
        method: 'POST',
        body: JSON.stringify({
          exam_id: selectedExam,
          roomIds: rooms.map((room) => room.room_id),
        }),
      });

      await load(selectedExam);
    } catch (err) {
      setError(
        err.message || 'Failed to generate seat plan.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const exportCsv = () => {
    if (!allocations.length) return;

    const csvRows = [
      [
        'Student ID',
        'Name',
        'Course',
        'Section',
        'Room',
        'Seat',
      ],
      ...allocations.map((item) => [
        item.student_id,
        item.student_name || item.name || '',
        item.course_code || '',
        item.section || '',
        item.room_number || item.room_id || '',
        item.seat_no || '',
      ]),
    ];

    const csv = csvRows
      .map((row) =>
        row.map(escapeCsv).join(',')
      )
      .join('\n');

    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    );

    const link = document.createElement('a');
    link.href = url;
    link.download = `seat-plan-${selectedExam}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  const roomGroups = useMemo(() => {
    const groups = {};

    allocations.forEach((item) => {
      const key =
        item.room_id ||
        item.room_number ||
        'unknown-room';

      if (!groups[key]) {
        const roomInfo =
          rooms.find(
            (room) =>
              String(room.room_id) === String(item.room_id) ||
              String(room.room_number) ===
                String(item.room_number)
          ) || {};

        groups[key] = {
          id: key,
          label:
            item.room_number ||
            roomInfo.room_number ||
            item.room_id ||
            roomInfo.room_id ||
            key,
          building:
            item.building ||
            roomInfo.building ||
            '',
          roomInfo,
          seats: [],
        };
      }

      groups[key].seats.push(item);
    });

    return Object.values(groups);
  }, [allocations, rooms]);

  const summary = useMemo(
    () =>
      courseSummary(
        allocations,
        roomGroups
      ),
    [allocations, roomGroups]
  );

  const summaryRooms = useMemo(
    () => roomGroups,
    [roomGroups]
  );

  return (
    <>
      {/* =========================
          NORMAL APPLICATION UI
          ========================= */}
      <div className="seat-plan-screen space-y-6">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Seat Plan Generation
            </h1>

            <p className="text-slate-500 mt-1">
              Allocate enrolled students to available rooms.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              disabled={!allocations.length}
              className="px-4 py-2 rounded-xl border bg-white flex gap-2 items-center disabled:opacity-50"
            >
              <Printer size={17} />
              Print
            </button>

            <button
              onClick={generate}
              disabled={generating}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white flex gap-2 items-center disabled:opacity-50"
            >
              <Grid size={17} />

              {generating
                ? 'Generating...'
                : 'Generate'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select exam
          </label>

          <select
            value={selectedExam}
            onChange={(e) =>
              setSelectedExam(e.target.value)
            }
            className="border rounded-xl px-3 py-2 w-full max-w-xl"
          >
            <option value="">
              Choose an exam...
            </option>

            {exams.map((exam) => (
              <option
                key={exam.exam_id}
                value={exam.exam_id}
              >
                {exam.course_code || 'Exam'} ·{' '}
                {exam.exam_date}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-5 flex justify-between">
            <h2 className="font-semibold">
              Allocated seats ({allocations.length})
            </h2>

            <button
              onClick={exportCsv}
              disabled={!allocations.length}
              className="text-blue-600 flex gap-1 items-center disabled:text-slate-300"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-500">
              Loading seat plan...
            </div>
          ) : !allocations.length ? (
            <div className="p-10 text-center text-slate-500">
              Generate a plan to see seat assignments.
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {roomGroups.map((room) => {
                const columnCount =
                  getRoomColumnCount(
                    room.roomInfo,
                    room.seats
                  );

                const rows = buildRoomRows(
                  room,
                  room.seats,
                  columnCount
                );

                return (
                  <div
                    key={room.id}
                    className="border rounded-xl overflow-hidden"
                  >
                    <div className="bg-slate-50 px-4 py-3 font-semibold text-slate-800">
                      Room {room.label}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="seat-table">
                        <thead>
                          <tr>
                            <th>Course / Section</th>

                            {Array.from(
                              {
                                length: columnCount,
                              },
                              (_, index) => (
                                <th key={index}>
                                  Column {index + 1}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>

                        <tbody>
                          {rows.map(
                            (row, rowIndex) => (
                              <tr key={rowIndex}>
                                <th>
                                  {getCourseLabel(
                                    row.find(Boolean)
                                  )}
                                </th>

                                {Array.from(
                                  {
                                    length: columnCount,
                                  },
                                  (_, columnIndex) => {
                                    const item =
                                      row[columnIndex];

                                    return (
                                      <td
                                        key={
                                          columnIndex
                                        }
                                      >
                                        {item ? (
                                          <>
                                            <strong>
                                              {
                                                item.student_id
                                              }
                                            </strong>

                                            <span>
                                              {item.student_name ||
                                                item.name ||
                                                ''}
                                            </span>
                                          </>
                                        ) : (
                                          '—'
                                        )}
                                      </td>
                                    );
                                  }
                                )}
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* =========================
          PRINT VERSION
          ========================= */}
      <div className="seat-plan-print">
        <div className="print-header">
          <h1>
            {getExamTitle(selectedExamData)}
            {getSemesterText(selectedExamData)
              ? ` - ${getSemesterText(
                  selectedExamData
                )}`
              : ''}
          </h1>

          <h2>
            Seat Plan
            {selectedExamData?.exam_date
              ? ` - ${getDateText(
                  selectedExamData
                )}`
              : ''}
            {getTimeText(selectedExamData)
              ? ` - ${getTimeText(
                  selectedExamData
                )}`
              : ''}
            {getBuildingText(
              selectedExamData,
              rooms
            )
              ? ` (${getBuildingText(
                  selectedExamData,
                  rooms
                )})`
              : ''}
          </h2>
        </div>

        {roomGroups.map((room) => {
          const columnCount =
            getRoomColumnCount(
              room.roomInfo,
              room.seats
            );

          const rows = buildRoomRows(
            room,
            room.seats,
            columnCount
          );

          const invigilators = [
            ...new Set(
              room.seats
                .map(
                  (item) =>
                    item.invigilator_name ||
                    item.invigilator ||
                    item.faculty_name ||
                    ''
                )
                .filter(Boolean)
            ),
          ];

          return (
            <section
              className="print-room"
              key={room.id}
            >
              <table className="print-seat-table">
                <thead>
                  <tr>
                    <th className="room-header">
                      Room
                    </th>

                    {Array.from(
                      {
                        length: columnCount,
                      },
                      (_, index) => (
                        <th key={index}>
                          Column {index + 1}
                        </th>
                      )
                    )}

                    <th>Invigilator</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map(
                    (row, rowIndex) => (
                      <tr key={rowIndex}>
                        {rowIndex === 0 ? (
                          <td
                            rowSpan={rows.length}
                            className="room-name"
                          >
                            {room.label}
                          </td>
                        ) : null}

                        {Array.from(
                          {
                            length: columnCount,
                          },
                          (_, columnIndex) => {
                            const item =
                              row[columnIndex];

                            return (
                              <td
                                key={
                                  columnIndex
                                }
                                className="course-seat"
                              >
                                {item ? (
                                  <span>
                                    {getCourseLabel(
                                      item
                                    )}
                                  </span>
                                ) : (
                                  ''
                                )}
                              </td>
                            );
                          }
                        )}

                        {rowIndex === 0 ? (
                          <td
                            rowSpan={rows.length}
                            className="invigilator-cell"
                          >
                            {invigilators.length
                              ? invigilators.join(
                                  ', '
                                )
                              : ''}
                          </td>
                        ) : null}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </section>
          );
        })}

        {summary.length > 0 && (
          <section className="print-summary">
            <h2>Course-wise Seat Allocation Summary</h2>

            <table className="summary-table">
              <thead>
                <tr>
                  <th>Course</th>

                  {summaryRooms.map(
                    (room) => (
                      <th key={room.id}>
                        {room.label}
                      </th>
                    )
                  )}

                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {summary.map((course) => (
                  <tr key={course.course}>
                    <td className="course-name">
                      {course.course}
                    </td>

                    {summaryRooms.map(
                      (room) => (
                        <td key={room.id}>
                          {course.rooms[
                            room.id
                          ] || 0}
                        </td>
                      )
                    )}

                    <td className="total-cell">
                      {course.total}
                    </td>
                  </tr>
                ))}

                <tr className="grand-total">
                  <td>Total</td>

                  {summaryRooms.map(
                    (room) => (
                      <td key={room.id}>
                        {room.seats.length}
                      </td>
                    )
                  )}

                  <td>
                    {allocations.length}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        )}
      </div>

      <style>{`
        .seat-table {
          width: 100%;
          border-collapse: collapse;
        }

        .seat-table th,
        .seat-table td {
          border: 1px solid #e2e8f0;
          padding: 10px;
          text-align: center;
        }

        .seat-table th {
          background: #f8fafc;
          font-weight: 600;
        }

        .seat-table td strong,
        .seat-table td span {
          display: block;
        }

        .seat-table td span {
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
        }

        /*
         * PRINT DOCUMENT
         */

        .seat-plan-print {
          display: none;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          body {
            background: white !important;
            color: black !important;
          }

          body * {
            visibility: hidden;
          }

          .seat-plan-print,
          .seat-plan-print * {
            visibility: visible;
          }

          .seat-plan-print {
            display: block;
            width: 100%;
            color: #000;
            font-family: Arial, Helvetica, sans-serif;
          }

          .seat-plan-screen {
            display: none !important;
          }

          .print-header {
            display: block;
            text-align: center;
            margin-bottom: 10mm;
          }

          .print-header h1 {
            margin: 0 0 4px;
            font-size: 18px;
            font-weight: 700;
          }

          .print-header h2 {
            margin: 0;
            font-size: 12px;
            font-weight: 600;
          }

          .print-room {
            width: 100%;
            margin-bottom: 8mm;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .print-seat-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 10px;
          }

          .print-seat-table th,
          .print-seat-table td {
            border: 1px solid #000;
            padding: 5px 3px;
            text-align: center;
            vertical-align: middle;
          }

          .print-seat-table th {
            font-weight: 700;
            background: #fff;
          }

          .print-seat-table .room-header {
            width: 12%;
          }

          .print-seat-table .room-name {
            font-size: 12px;
            font-weight: 700;
          }

          .print-seat-table .course-seat {
            font-weight: 600;
            min-height: 24px;
          }

          .print-seat-table .invigilator-cell {
            width: 16%;
            font-weight: 600;
          }

          .print-summary {
            margin-top: 8mm;
            page-break-before: auto;
          }

          .print-summary h2 {
            text-align: center;
            font-size: 14px;
            margin: 0 0 5mm;
          }

          .summary-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }

          .summary-table th,
          .summary-table td {
            border: 1px solid #000;
            padding: 5px 4px;
            text-align: center;
          }

          .summary-table th {
            font-weight: 700;
          }

          .summary-table .course-name {
            text-align: left;
            font-weight: 600;
          }

          .summary-table .total-cell,
          .summary-table .grand-total {
            font-weight: 700;
          }

          .summary-table .grand-total td {
            font-weight: 700;
          }

          .print-room:last-of-type {
            margin-bottom: 0;
          }
          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
    </>
  );
}

