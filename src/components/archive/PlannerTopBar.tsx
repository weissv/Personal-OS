'use client';

import React from 'react';

export type MainView = 'spread' | 'cover';

interface UserOption {
  id: string;
  fullName: string;
  email: string;
  role: string;
  gradeLevel?: number | null;
}

interface PlannerTopBarProps {
  currentView: MainView;
  onChangeView: (view: MainView) => void;
  selectedWeek: number;
  onSelectWeek: (w: number) => void;
  currentUser: UserOption | null;
  availableUsers: UserOption[];
  onSwitchUser: (userId: string) => void;
  onOpenClassOverview: () => void;
}

export const PlannerTopBar: React.FC<PlannerTopBarProps> = ({
  currentView,
  onChangeView,
  selectedWeek,
  onSelectWeek,
  currentUser,
  availableUsers,
  onSwitchUser,
  onOpenClassOverview,
}) => {
  return (
    <header className="w-full bg-[#111827] text-white border-b border-slate-800 px-4 sm:px-6 py-2.5 sticky top-0 z-40 shadow-md">
      <div className="max-w-[1520px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left Side: Brand and Mode Toggle */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center">
              <span className="text-2xl font-black text-[#C026D3] tracking-tight">Me</span>
              <div className="w-2 h-2 rounded-full bg-[#3B82F6] -mt-2 ml-0.5" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                <span>MEZON SPRINT OS</span>
                <span className="text-[10px] bg-slate-800 text-amber-400 font-mono px-1.5 py-0.2 rounded border border-slate-700">
                  9 КЛАСС
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Цифровой еженедельник учебной субъектности
              </div>
            </div>
          </div>

          {/* View Mode Toggle: Spread vs Cover */}
          <div className="flex items-center bg-slate-800/90 p-0.5 rounded border border-slate-700 text-xs">
            <button
              onClick={() => onChangeView('spread')}
              className={`px-3 py-1 rounded font-bold transition-colors cursor-pointer ${
                currentView === 'spread'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              📖 Разворот недели
            </button>
            <button
              onClick={() => onChangeView('cover')}
              className={`px-3 py-1 rounded font-bold transition-colors cursor-pointer ${
                currentView === 'cover'
                  ? 'bg-white text-slate-900 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🎨 Обложка
            </button>
          </div>
        </div>

        {/* Center: 10-Week Sprint Selector */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1 hidden lg:inline">
            Спринт:
          </span>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => {
            const isSelected = selectedWeek === w;
            const isPast = w < 3;
            const isActive = w === 3;

            return (
              <button
                key={w}
                onClick={() => onSelectWeek(w)}
                className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 shadow-sm scale-105'
                    : isActive
                    ? 'bg-slate-700 text-amber-300 border border-amber-400/40'
                    : isPast
                    ? 'bg-slate-800/80 text-emerald-400/90'
                    : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                Н{w}
              </button>
            );
          })}
        </div>

        {/* Right Side: Role Selector and Curator Overview Button */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Curator Class Overview Button */}
          {currentUser?.role === 'MENTOR' && (
            <button
              onClick={onOpenClassOverview}
              className="px-3 py-1 rounded bg-[#86198F] hover:bg-[#701A75] text-white text-xs font-black uppercase tracking-wider shadow cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <span>📊 Сводка 9 «А»</span>
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
            </button>
          )}

          {/* Quick Role Switcher Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-2 py-1 rounded">
            <span className="text-[10px] font-mono text-slate-400">Роль:</span>
            <select
              value={currentUser?.id || ''}
              onChange={(e) => onSwitchUser(e.target.value)}
              className="bg-transparent text-xs text-white font-bold cursor-pointer focus:outline-none"
            >
              {availableUsers.map((u) => {
                let label = u.fullName;
                if (u.role === 'MENTOR') label += ' (Куратор)';
                else if (u.role === 'PARENT') label += ' (Родитель)';
                else if (u.email.includes('leila')) label += ' (🔴 Migrations)';
                else if (u.email.includes('sardor')) label += ' (🟡 Empty SR)';
                else label += ' (9 класс)';

                return (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

      </div>
    </header>
  );
};
