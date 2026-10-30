import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { VoiceReadButton } from '@/components/voice/VoiceReadButton';
import type { Task } from '@/types/firestore';

interface CalendarViewProps {
  tasks: Task[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks }) => {
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const currentDayOfMonth = today.getDate();

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(currentDayOfMonth - 3 + i);
    return {
      dayName: daysOfWeek[d.getDay()],
      dateNumber: d.getDate(),
      isToday: d.getDate() === currentDayOfMonth,
    };
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-2xl shrink-0">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900 font-heading">
                Weekly Routine Calendar
              </h2>
              <VoiceReadButton
                textToRead="Weekly Routine Calendar. Scheduled daily routine tasks and multi-day adherence timeline."
                ariaLabel="Read Calendar description"
              />
            </div>
            <p className="text-xs text-gray-500">
              Clear visual schedule and timeline for medication, therapy drills, and rest periods.
            </p>
          </div>
        </div>
      </div>

      {/* 7-Day Day Selector Bar */}
      <Card className="p-4 bg-white border border-gray-100">
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const isSelected = selectedDay === day.dateNumber;
            return (
              <button
                key={day.dateNumber}
                type="button"
                onClick={() => setSelectedDay(day.dateNumber)}
                className={`flex flex-col items-center py-3 rounded-2xl transition-all min-h-touch ${
                  isSelected
                    ? 'bg-teal-700 text-white shadow-md shadow-teal-900/20'
                    : day.isToday
                    ? 'bg-teal-50 text-teal-900 border border-teal-300 font-bold'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <span className="text-[10px] font-semibold uppercase">{day.dayName}</span>
                <span className="text-lg font-black mt-0.5">{day.dateNumber}</span>
                {day.isToday && (
                  <span className="text-[9px] font-extrabold uppercase mt-0.5 opacity-90">Today</span>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Scheduled Timeline */}
      <Card className="p-5 bg-white border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">
          Schedule for Day {selectedDay}
        </h3>

        <div className="space-y-2.5">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50/70 border border-gray-100 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{task.icon || '📌'}</span>
                <div>
                  <span className="font-semibold text-gray-900 text-sm block">{task.label}</span>
                  <span className="text-gray-500 text-[11px]">{task.time}</span>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                  task.status === 'done'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {task.status}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
