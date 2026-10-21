'use client';

import React, { useState, useEffect } from 'react';

interface StudentRosterItem {
  student: {
    id: string;
    fullName: string;
    email: string;
    gradeLevel?: number;
  };
  flags: {
    highMigrations: boolean;
    emptySelfStudy: boolean;
    silentRetro: boolean;
    migrationRate: number;
    emptySelfStudyWeeksCount: number;
    silentRetroSnippet?: string;
  };
  metrics: {
    totalTasks: number;
    completedTasks: number;
    migratedTasks: number;
    droppedTasks: number;
    completionRate: number;
    migrationRate: number;
  };
  weeks: Array<{
    id: string;
    weekNumber: number;
    isSubmitted: boolean;
  }>;
}

interface MentorClassDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStudent: (studentId: string) => void;
}

export const MentorClassDrawer: React.FC<MentorClassDrawerProps> = ({
  isOpen,
  onClose,
  onSelectStudent,
}) => {
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/v1/mentor/dashboard')
        .then((res) => res.json())
        .then((data) => {
          setStudents(data.roster || []);
          setIsLoading(false);
        })
        .catch((e) => {
          console.error(e);
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl bg-white text-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-300">
        
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-[#FAF8F5]">
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-[#86198F]">
              Кабинет классного руководителя
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Сводная ведомость 9 «А» класса
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Legend of Risk Markers */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs flex flex-wrap gap-4 text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>High Migrations (&gt;50% переносов)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Empty Self-Study (≥2 субботы)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span>Silent Retro (&lt;10 символов)</span>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Анализ данных субъектности 9 «А»...
            </div>
          ) : (
            students.map((item) => {
              const hasRedFlag =
                item.flags.highMigrations ||
                item.flags.emptySelfStudy ||
                item.flags.silentRetro;

              const submittedCount = item.weeks?.filter((w) => w.isSubmitted).length || 0;

              return (
                <div
                  key={item.student.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    hasRedFlag
                      ? 'bg-rose-50/40 border-rose-200 hover:border-rose-400'
                      : 'bg-white border-slate-200 hover:border-slate-400 shadow-xs'
                  }`}
                  onClick={() => {
                    onSelectStudent(item.student.id);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-base text-slate-900">
                        {item.student.fullName}
                      </div>
                      <div className="text-xs font-mono text-slate-500">
                        {item.student.email}
                      </div>
                    </div>

                    {/* Flags Pills */}
                    <div className="flex items-center gap-1.5">
                      {item.flags.highMigrations && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                          🔴 Перенос {item.flags.migrationRate}%
                        </span>
                      )}
                      {item.flags.emptySelfStudy && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                          🟡 Пустая Сб ({item.flags.emptySelfStudyWeeksCount} нед)
                        </span>
                      )}
                      {item.flags.silentRetro && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-200 text-slate-700 border border-slate-300">
                          ⚪ Отписка &lt;10 симв
                        </span>
                      )}
                      {!hasRedFlag && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ✓ Норма
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Micro stats table */}
                  <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                    <div>
                      <div className="text-[10px] uppercase text-slate-400">Всего задач</div>
                      <div className="font-mono font-bold text-slate-800">
                        {item.metrics.totalTasks}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-400">Сделано</div>
                      <div className="font-mono font-bold text-emerald-700">
                        {item.metrics.completedTasks}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-400">Перенесено</div>
                      <div className="font-mono font-bold text-amber-700">
                        {item.metrics.migratedTasks}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-400">Ретро сдал</div>
                      <div className="font-mono font-bold text-slate-800">
                        {submittedCount}/10
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-[#FAF8F5] text-xs text-slate-500 text-center">
          Нажмите на карточку любого ученика для открытия его еженедельника
        </div>

      </div>
    </div>
  );
};
