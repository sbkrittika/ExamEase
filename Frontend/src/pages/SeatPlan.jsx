import { useEffect, useMemo, useState } from 'react';
import { Grid, Printer, Download, Check } from 'lucide-react';
import { apiRequest } from '../api';

function escapeCsv(value) {
  const text = String(value ?? '');

  if (
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n')
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function getSeatNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const match = String(value).match(/\d+/);

  return match ? Number(match[0]) : null;
}

function getCourseLabel(item) {
  if (!item) return '—';

  const course =
    item.course_code ||
    item.course ||
    '—';

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

  const building = room.building
    ? `${room.building} `
    : '';

  return `${building}${
    room.room_number ||
    room.roomNumber ||
    room.room_id ||
    ''
  }`.trim();
}

function getDateText(exam) {
  if (!exam) return '';

  const date =
    exam.exam_date ||
    exam.date;

  if (!date) return '';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return String(date);
  }

  return parsed.toLocaleDateString(
    'en-GB',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }
  );
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

  if (start && end) {
    return `${start}-${end}`;
  }

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

  return 'Exam';
}

function getColumnCount(room, seats) {
  const possibleValues = [
    room?.columns,
    room?.column_count,
    room?.total_columns,
    room?.cols
  ];

  for (const value of possibleValues) {
    const number = Number(value);

    if (
      Number.isInteger(number) &&
      number > 0
    ) {
      return number;
    }
  }

  return 6;
}

function buildRoomRows(
  seats,
  columnCount
) {
  if (!seats.length) return [];

  const rows = [];

  const sortedSeats = [...seats].sort(
    (a, b) =>
      (getSeatNumber(a.seat_no) || 0) -
      (getSeatNumber(b.seat_no) || 0)
  );

  sortedSeats.forEach((student) => {
    const seatNumber =
      getSeatNumber(student.seat_no);

    if (!seatNumber) {
      return;
    }

    const index = seatNumber - 1;

    const rowIndex = Math.floor(
      index / columnCount
    );

    const columnIndex =
      index % columnCount;

    if (!rows[rowIndex]) {
      rows[rowIndex] =
        Array(columnCount).fill(null);
    }

    rows[rowIndex][columnIndex] =
      student;
  });

  return rows;
}

function createSummary(allocations) {
  const courseMap = {};

  allocations.forEach((item) => {
    const label = getCourseLabel(item);

    if (!courseMap[label]) {
      courseMap[label] = {
        course: label,
        total: 0,
        rooms: {}
      };
    }

    courseMap[label].total += 1;

    const roomId =
      String(item.room_id);

    if (!courseMap[label].rooms[roomId]) {
      courseMap[label].rooms[roomId] = 0;
    }

    courseMap[label].rooms[roomId] += 1;
  });

  return Object.values(courseMap).sort(
    (a, b) =>
      a.course.localeCompare(b.course)
  );
}

export default function SeatPlan() {
  const [exams, setExams] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedExam, setSelectedExam] =
    useState('');
  const [selectedRoomIds, setSelectedRoomIds] =
    useState([]);
  const [allocations, setAllocations] =
    useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] =
    useState(false);
  const [generating, setGenerating] =
    useState(false);

  const selectedExamData = useMemo(
    () =>
      exams.find(
        (exam) =>
          String(exam.exam_id) ===
          String(selectedExam)
      ),
    [exams, selectedExam]
  );

  const selectedRooms = useMemo(
    () =>
      rooms.filter((room) =>
        selectedRoomIds.includes(
          String(room.room_id)
        )
      ),
    [rooms, selectedRoomIds]
  );

  const selectedCapacity = useMemo(
    () =>
      selectedRooms.reduce(
        (total, room) =>
          total +
          Number(room.capacity || 0),
        0
      ),
    [selectedRooms]
  );

  const loadAllocations = async (
    examId
  ) => {
    if (!examId) {
      setAllocations([]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const data =
        await apiRequest(
          `/api/exams/${examId}/allocations`
        );

      setAllocations(
        data.allocations || []
      );
    } catch (err) {
      setError(
        err.message ||
          'Failed to load seat plan.'
      );

      setAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        examData,
        roomData
      ] = await Promise.all([
        apiRequest('/api/exams'),
        apiRequest('/api/rooms')
      ]);

      setExams(
        examData.exams || []
      );

      const availableRooms =
        (roomData.rooms || [])
          .filter(
            (room) =>
              room.status ===
                'Available' ||
              !room.status
          );

      setRooms(availableRooms);
    } catch (err) {
      setError(
        err.message ||
          'Failed to load seat plan data.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadAllocations(selectedExam);
  }, [selectedExam]);

  const toggleRoom = (roomId) => {
    const id = String(roomId);

    setSelectedRoomIds(
      (previous) =>
        previous.includes(id)
          ? previous.filter(
              (item) => item !== id
            )
          : [...previous, id]
    );
  };

  const selectAllRooms = () => {
    setSelectedRoomIds(
      rooms.map((room) =>
        String(room.room_id)
      )
    );
  };

  const clearRooms = () => {
    setSelectedRoomIds([]);
  };

  const generate = async () => {
    if (!selectedExam) {
      setError(
        'Please select an exam.'
      );
      return;
    }

    if (!selectedRoomIds.length) {
      setError(
        'Please select at least one room.'
      );
      return;
    }

    try {
      setGenerating(true);
      setError('');

      const data =
        await apiRequest(
          '/api/exams/allocate',
          {
            method: 'POST',
            body: JSON.stringify({
              exam_id: selectedExam,
              roomIds: selectedRoomIds,
              maxCoursesPerRoom: 4
            })
          }
        );

      if (!data.success) {
        throw new Error(
          data.message ||
            'Failed to generate seat plan.'
        );
      }

      await loadAllocations(
        selectedExam
      );
    } catch (err) {
      setError(
        err.message ||
          'Failed to generate seat plan.'
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
        'Building',
        'Room',
        'Seat'
      ],
      ...allocations.map(
        (item) => [
          item.student_id,
          item.student_name ||
            item.name ||
            '',
          item.course_code || '',
          item.section || '',
          item.building || '',
          item.room_number ||
            item.room_id ||
            '',
          item.seat_no || ''
        ]
      )
    ];

    const csv =
      csvRows
        .map((row) =>
          row
            .map(escapeCsv)
            .join(',')
        )
        .join('\n');

    const url =
      URL.createObjectURL(
        new Blob([csv], {
          type: 'text/csv;charset=utf-8;'
        })
      );

    const link =
      document.createElement('a');

    link.href = url;

    link.download =
      `seat-plan-${selectedExam}.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  };

  const roomGroups = useMemo(() => {
    const groups = {};

    allocations.forEach((item) => {
      const key =
        String(
          item.room_id ||
            item.room_number ||
            'unknown'
        );

      if (!groups[key]) {
        const room =
          rooms.find(
            (roomItem) =>
              String(
                roomItem.room_id
              ) === key
          ) || {};

        groups[key] = {
          id: key,
          label:
            item.room_number ||
            room.room_number ||
            item.room_id ||
            room.room_id ||
            key,
          building:
            item.building ||
            room.building ||
            '',
          roomInfo: room,
          seats: []
        };
      }

      groups[key].seats.push(item);
    });

    return Object.values(groups);
  }, [allocations, rooms]);

  const summary = useMemo(
    () =>
      createSummary(
        allocations
      ),
    [allocations]
  );

  return (
    <>
      <div className="seat-plan-screen space-y-6">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Seat Plan Generation
            </h1>

            <p className="text-slate-500 mt-1">
              Select an exam and choose the rooms for the seat plan.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() =>
                window.print()
              }
              disabled={
                !allocations.length
              }
              className="px-4 py-2 rounded-xl border bg-white flex gap-2 items-center disabled:opacity-50"
            >
              <Printer size={17} />
              Print
            </button>

            <button
              onClick={generate}
              disabled={
                generating ||
                !selectedExam ||
                !selectedRoomIds.length
              }
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
            onChange={(e) => {
              setSelectedExam(
                e.target.value
              );

              setAllocations([]);
            }}
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
                {exam.course_code ||
                  'Exam'}{' '}
                ·{' '}
                {exam.exam_date}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                Select Rooms
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Only selected rooms will be used for this exam.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllRooms}
                className="px-3 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200"
              >
                Select All
              </button>

              <button
                type="button"
                onClick={clearRooms}
                className="px-3 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200"
              >
                Clear
              </button>
            </div>
          </div>

          {rooms.length === 0 ? (
            <div className="rounded-xl bg-amber-50 text-amber-700 p-4">
              No available rooms found. Please add an available room first.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rooms.map((room) => {
                const id = String(
                  room.room_id
                );

                const selected =
                  selectedRoomIds.includes(
                    id
                  );

                return (
                  <button
                    type="button"
                    key={room.room_id}
                    onClick={() =>
                      toggleRoom(
                        room.room_id
                      )
                    }
                    className={`text-left rounded-xl border-2 p-4 transition-all ${
                      selected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {room.building}
                        </p>

                        <p className="text-lg font-bold text-slate-800 mt-1">
                          Room{' '}
                          {room.room_number}
                        </p>

                        <p className="text-sm text-slate-500 mt-1">
                          Capacity:{' '}
                          {room.capacity}{' '}
                          students
                        </p>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                          selected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {selected && (
                          <Check
                            size={15}
                          />
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-sm text-blue-600">
                Selected Rooms
              </p>

              <p className="text-2xl font-bold text-blue-900">
                {selectedRooms.length}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-sm text-emerald-600">
                Selected Capacity
              </p>

              <p className="text-2xl font-bold text-emerald-900">
                {selectedCapacity}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Exam Students
              </p>

              <p className="text-2xl font-bold text-slate-900">
                {selectedExamData?.total_students ||
                  0}
              </p>
            </div>
          </div>

          {selectedExamData &&
            selectedCapacity <
              Number(
                selectedExamData.total_students ||
                  0
              ) && (
              <div className="mt-4 rounded-xl bg-red-50 text-red-700 p-4">
                Selected rooms have only{' '}
                <strong>
                  {selectedCapacity}
                </strong>{' '}
                seats, but this exam has{' '}
                <strong>
                  {selectedExamData.total_students}
                </strong>{' '}
                students.
              </div>
            )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="p-5 flex justify-between">
            <h2 className="font-semibold">
              Allocated Seats (
              {allocations.length})
            </h2>

            <button
              onClick={exportCsv}
              disabled={
                !allocations.length
              }
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
              Select an exam and rooms, then click Generate.
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {roomGroups.map(
                (room) => {
                  const columnCount =
                    getColumnCount(
                      room.roomInfo,
                      room.seats
                    );

                  const rows =
                    buildRoomRows(
                      room.seats,
                      columnCount
                    );

                  return (
                    <div
                      key={room.id}
                      className="border rounded-xl overflow-hidden"
                    >
                      <div className="bg-slate-50 px-4 py-3">
                        <p className="font-semibold text-slate-800">
                          {room.building}
                        </p>

                        <p className="text-sm text-slate-500">
                          Room{' '}
                          {room.label}
                        </p>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="seat-table">
                          <thead>
                            <tr>
                              <th>
                                Row
                              </th>

                              {Array.from(
                                {
                                  length:
                                    columnCount
                                },
                                (_, index) => (
                                  <th
                                    key={
                                      index
                                    }
                                  >
                                    Seat{' '}
                                    {index +
                                      1}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>

                          <tbody>
                            {rows.map(
                              (
                                row,
                                rowIndex
                              ) => (
                                <tr
                                  key={
                                    rowIndex
                                  }
                                >
                                  <th>
                                    {rowIndex +
                                      1}
                                  </th>

                                  {Array.from(
                                    {
                                      length:
                                        columnCount
                                    },
                                    (
                                      _,
                                      columnIndex
                                    ) => {
                                      const item =
                                        row[
                                          columnIndex
                                        ];

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

                                              <small>
                                                {getCourseLabel(
                                                  item
                                                )}
                                              </small>
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
                }
              )}
            </div>
          )}
        </div>
      </div>

      <div className="seat-plan-print">
        <div className="print-header">
          <h1>
            {getExamTitle(
              selectedExamData
            )}
          </h1>

          <h2>
            Seat Plan
            {selectedExamData?.exam_date
              ? ` - ${getDateText(
                  selectedExamData
                )}`
              : ''}
            {getTimeText(
              selectedExamData
            )
              ? ` - ${getTimeText(
                  selectedExamData
                )}`
              : ''}
          </h2>
        </div>

        {roomGroups.map((room) => {
          const columnCount =
            getColumnCount(
              room.roomInfo,
              room.seats
            );

          const rows =
            buildRoomRows(
              room.seats,
              columnCount
            );

          return (
            <section
              className="print-room"
              key={room.id}
            >
              <h3>
                {room.building} — Room{' '}
                {room.label}
              </h3>

              <table className="print-seat-table">
                <thead>
                  <tr>
                    <th>Row</th>

                    {Array.from(
                      {
                        length:
                          columnCount
                      },
                      (_, index) => (
                        <th key={index}>
                          Seat{' '}
                          {index + 1}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {rows.map(
                    (
                      row,
                      rowIndex
                    ) => (
                      <tr
                        key={
                          rowIndex
                        }
                      >
                        <td>
                          {rowIndex +
                            1}
                        </td>

                        {Array.from(
                          {
                            length:
                              columnCount
                          },
                          (
                            _,
                            columnIndex
                          ) => {
                            const item =
                              row[
                                columnIndex
                              ];

                            return (
                              <td
                                key={
                                  columnIndex
                                }
                              >
                                {item
                                  ? getCourseLabel(
                                      item
                                    )
                                  : ''}
                              </td>
                            );
                          }
                        )}
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
            <h2>
              Course-wise Seat Allocation Summary
            </h2>

            <table className="summary-table">
              <thead>
                <tr>
                  <th>
                    Course
                  </th>

                  {roomGroups.map(
                    (room) => (
                      <th
                        key={
                          room.id
                        }
                      >
                        {room.label}
                      </th>
                    )
                  )}

                  <th>
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                {summary.map(
                  (course) => (
                    <tr
                      key={
                        course.course
                      }
                    >
                      <td>
                        {
                          course.course
                        }
                      </td>

                      {roomGroups.map(
                        (room) => (
                          <td
                            key={
                              room.id
                            }
                          >
                            {course
                              .rooms[
                              room.id
                            ] || 0}
                          </td>
                        )
                      )}

                      <td>
                        {
                          course.total
                        }
                      </td>
                    </tr>
                  )
                )}

                <tr>
                  <td>
                    Total
                  </td>

                  {roomGroups.map(
                    (room) => (
                      <td
                        key={
                          room.id
                        }
                      >
                        {
                          room.seats
                            .length
                        }
                      </td>
                    )
                  )}

                  <td>
                    {
                      allocations.length
                    }
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
          min-width: 120px;
        }

        .seat-table th {
          background: #f8fafc;
          font-weight: 600;
        }

        .seat-table td strong,
        .seat-table td span,
        .seat-table td small {
          display: block;
        }

        .seat-table td span {
          margin-top: 3px;
          color: #64748b;
          font-size: 12px;
        }

        .seat-table td small {
          margin-top: 3px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 600;
        }

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
            text-align: center;
            margin-bottom: 10mm;
          }

          .print-header h1 {
            margin: 0 0 4px;
            font-size: 18px;
          }

          .print-header h2 {
            margin: 0;
            font-size: 12px;
          }

          .print-room {
            width: 100%;
            margin-bottom: 8mm;
            page-break-inside: avoid;
          }

          .print-room h3 {
            text-align: center;
            font-size: 13px;
            margin-bottom: 4mm;
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
          }

          .print-summary {
            margin-top: 8mm;
          }

          .print-summary h2 {
            text-align: center;
            font-size: 14px;
            margin-bottom: 5mm;
          }

          .summary-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }

          .summary-table th,
          .summary-table td {
            border: 1px solid #000;
            padding: 5px;
            text-align: center;
          }

          .summary-table th,
          .summary-table tr:last-child {
            font-weight: 700;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}
