import React, { useState } from 'react';
import type { Task } from '@/types/firestore';
import { TaskCard } from './TaskCard';

interface TaskListProps {
  tasks: Task[];
  loading: boolean;
  onComplete: (taskId: number) => void;
  onSnooze: (taskId: number) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  loading,
  onComplete,
  onSnooze,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-gray-100 animate-pulse rounded-2xl w-full"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return t.status !== 'done';
    if (filter === 'done') return t.status === 'done';
    return true;
  });

  return (
    <section aria-labelledby="tasks-heading" className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 id="tasks-heading" className="text-xl font-bold text-gray-900">
            Today's Routine & Tasks
          </h2>
          <p className="text-sm text-gray-500">
            {completedCount} of {tasks.length} completed
          </p>
        </div>

        {/* Accessible Filter Pills with large touch targets */}
        <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-2xl self-start sm:self-auto">
          {(['all', 'pending', 'done'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold capitalize transition-all min-h-[38px] ${
                filter === tab
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-2xl border border-gray-100 p-6">
          <p className="text-3xl mb-2" aria-hidden="true">
            {filter === 'done' ? '🎯' : '✨'}
          </p>
          <p className="text-base font-semibold text-gray-700">
            {filter === 'done'
              ? 'No completed tasks yet. Tap Complete on a task above!'
              : 'All caught up! No pending tasks right now.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              onSnooze={onSnooze}
            />
          ))}
        </div>
      )}
    </section>
  );
};
