import { useState } from 'react';
import { Grid, Printer, Download, CheckCircle2 } from 'lucide-react';

export default function SeatPlan() {
  const [selectedExam, setSelectedExam] = useState('CSE 311');
  const [generated, setGenerated] = useState(true);

  const examData = {
    'CSE 311': {
      name: 'CSE 311: Database Systems',
      students: 188,
      plans: [
        {
          room: '101',
          building: 'Building A',
          capacity: 40,
          allocated: 40,
          invigilator: 'Dr. Alan Turing'
        },
        {
          room: '102',
          building: 'Building A',
          capacity: 40,
          allocated: 38,
          invigilator: 'Dr. Ada Lovelace'
        },
        {
          room: '205',
          building: 'Building B',
          capacity: 120,
          allocated: 110,
          invigilator: 'Dr. Isaac Newton'
        }
      ]
    },

    'MTH 201': {
      name: 'MTH 201: Linear Algebra',
      students: 150,
      plans: [
        {
          room: '201',
          building: 'Building B',
          capacity: 40,
          allocated: 40,
          invigilator: 'Dr. Marie Curie'
        },
        {
          room: '202',
          building: 'Building B',
          capacity: 40,
          allocated: 40,
          invigilator: 'Dr. Albert Einstein'
        },
        {
          room: '205',
          building: 'Building B',
          capacity: 120,
          allocated: 70,
          invigilator: 'Dr. Isaac Newton'
        }
      ]
    }
  };

  const currentExam = examData[selectedExam];

  const totalAllocated = currentExam.plans.reduce(
    (total, plan) => total + plan.allocated,
    0
  );

  const totalCapacity = currentExam.plans.reduce(
    (total, plan) => total + plan.capacity,
    0
  );

  const handleGenerate = () => {
    setGenerated(false);

    setTimeout(() => {
      setGenerated(true);
    }, 700);
  };

  const handlePrintAll = () => {
    window.print();
  };

  const handlePrintRoom = (room) => {
    alert(`Printing seat plan for Room ${room}`);
    window.print();
  };

  const handleExport = (plan) => {
    const csv = [
      'Room,Building,Capacity,Allocated Students,Invigilator',
      `${plan.room},${plan.building},${plan.capacity},${plan.allocated},${plan.invigilator}`
    ].join('\n');

    const blob = new Blob([csv], {
      type: 'text/csv'
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `SeatPlan-Room-${plan.room}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Seat Plan Generation
          </h1>

          <p className="text-slate-500 mt-1">
            Auto-allocate students to rooms based on capacity.
          </p>
        </div>

        <div className="flex items-center space-x-3">

          <button
            onClick={handlePrintAll}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center space-x-2"
          >
            <Printer size={18} />
            <span>Print All</span>
          </button>

          <button
            onClick={handleGenerate}
            disabled={!generated}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm shadow-blue-600/20 flex items-center space-x-2"
          >
            <Grid size={18} />

            <span>
              {generated ? 'Generate Plan' : 'Generating...'}
            </span>
          </button>

        </div>
      </div>

      {/* Exam Selection */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div className="flex items-center space-x-4">

            <label className="text-sm font-medium text-slate-700">
              Select Exam:
            </label>

            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
            >
              <option value="CSE 311">
                CSE 311: Database Systems
              </option>

              <option value="MTH 201">
                MTH 201: Linear Algebra
              </option>
            </select>

          </div>

          {generated && (
            <div className="flex items-center space-x-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 font-medium">

              <CheckCircle2 size={16} />

              <span>
                Status: Generated successfully
              </span>

            </div>
          )}

        </div>

        {/* Summary */}
        <div className="p-6 border-b border-slate-100">

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-slate-500">
                Selected Exam
              </p>

              <p className="font-bold text-slate-900 mt-1">
                {currentExam.name}
              </p>
            </div>

            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-sm text-slate-500">
                Students Allocated
              </p>

              <p className="font-bold text-emerald-700 text-xl mt-1">
                {totalAllocated}
              </p>
            </div>

            <div className="bg-violet-50 rounded-xl p-4">
              <p className="text-sm text-slate-500">
                Available Capacity
              </p>

              <p className="font-bold text-violet-700 text-xl mt-1">
                {totalCapacity}
              </p>
            </div>

          </div>

          <div className="mt-5">

            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">
                Allocation Progress
              </span>

              <span className="font-semibold text-slate-900">
                {Math.round((totalAllocated / totalCapacity) * 100)}%
              </span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5">

              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    (totalAllocated / totalCapacity) * 100,
                    100
                  )}%`
                }}
              />

            </div>

          </div>

        </div>

        {/* Room Plans */}
        <div className="p-6">

          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Room Allocation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {currentExam.plans.map((plan, idx) => {

              const percentage = Math.round(
                (plan.allocated / plan.capacity) * 100
              );

              return (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-xl p-5 hover:border-blue-300 transition-colors"
                >

                  <div className="flex justify-between items-start mb-4">

                    <div>

                      <h3 className="text-lg font-bold text-slate-900">
                        Room {plan.room}
                      </h3>

                      <p className="text-sm text-slate-500">
                        {plan.building}
                      </p>

                    </div>

                    <div className="w-12 h-12 rounded-full border-4 border-emerald-100 flex items-center justify-center">

                      <span className="text-sm font-bold text-emerald-600">
                        {percentage}%
                      </span>

                    </div>

                  </div>

                  <div className="space-y-3 mb-6">

                    <div className="flex justify-between text-sm">

                      <span className="text-slate-500">
                        Allocated Students
                      </span>

                      <span className="font-semibold text-slate-900">
                        {plan.allocated} / {plan.capacity}
                      </span>

                    </div>

                    <div className="flex justify-between text-sm gap-3">

                      <span className="text-slate-500">
                        Invigilator
                      </span>

                      <span className="font-semibold text-slate-900 text-right">
                        {plan.invigilator}
                      </span>

                    </div>

                  </div>

                  <div className="flex space-x-2">

                    <button
                      onClick={() => handlePrintRoom(plan.room)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <Printer size={16} />
                      <span>Print</span>
                    </button>

                    <button
                      onClick={() => handleExport(plan)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <Download size={16} />
                      <span>Export</span>
                    </button>

                  </div>

                </div>
              );
            })}

          </div>

        </div>

      </div>

      {/* Explanation for demo */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">

        <h3 className="font-bold text-blue-900 mb-1">
          How ExamEase Seat Allocation Works
        </h3>

        <p className="text-sm text-blue-800">
          ExamEase distributes registered students across available
          examination rooms according to room capacity. The system
          tracks allocated students, available capacity and assigned
          invigilators to help administrators create an organized
          examination plan.
        </p>

      </div>

    </div>
  );
}