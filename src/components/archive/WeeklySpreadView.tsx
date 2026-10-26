'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface DaySlot {
  id: string;
  dayId: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  type: string;
  isGhost: boolean;
  taskGoal: string | null;
  deliverable: string | null;
  status: string;
  orderIndex: number;
}

export interface DayData {
  id: string;
  weekId: string;
  date: string;
  dayOfWeek: number;
  isSelfStudy: boolean;
  slots: DaySlot[];
}

export interface WeekDetails {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  weekGoal: string | null;
  deadlinesEvents: string | null;
  notes: string | null;
  ideas: string | null;
  sketchesNote: string | null;
  retroSuccess: string | null;
  retroBlockers: string | null;
  retroNextPlan: string | null;
  isSubmitted: boolean;
  parentAccessLevel: 'REVOKED' | 'SUMMARY_ONLY' | 'FULL_ACCESS';
  days: DayData[];
  mediaAssets: Array<{
    id: string;
    fileUrl: string;
    fileType: string;
    fileName: string;
    fileSize: number;
    note: string | null;
    createdAt: string;
  }>;
  mentorReview?: {
    feedback: string;
    signedAt: string;
    mentor: {
      fullName: string;
    };
  } | null;
  parentReview?: {
    comment: string;
    signedAt: string;
  } | null;
}

interface WeeklySpreadViewProps {
  week: WeekDetails;
  currentUserRole: string;
  onRefreshWeek: () => void;
  onOpenClassOverview?: () => void;
}

export const WeeklySpreadView: React.FC<WeeklySpreadViewProps> = ({
  week,
  currentUserRole,
  onRefreshWeek,
  onOpenClassOverview,
}) => {
  // Mobile page tab state
  const [activeMobilePage, setActiveMobilePage] = useState<'left' | 'right'>('left');

  // Local state for strategic fields
  const [weekGoal, setWeekGoal] = useState(week.weekGoal || '');
  const [deadlinesEvents, setDeadlinesEvents] = useState(week.deadlinesEvents || '');
  const [notes, setNotes] = useState(week.notes || '');
  const [ideas, setIdeas] = useState(week.ideas || '');
  const [sketchesNote, setSketchesNote] = useState(week.sketchesNote || '');

  // Local state for retro
  const [retroSuccess, setRetroSuccess] = useState(week.retroSuccess || '');
  const [retroBlockers, setRetroBlockers] = useState(week.retroBlockers || '');
  const [retroNextPlan, setRetroNextPlan] = useState(week.retroNextPlan || '');
  const [accessLevel, setAccessLevel] = useState<'REVOKED' | 'SUMMARY_ONLY' | 'FULL_ACCESS'>(
    week.parentAccessLevel || 'SUMMARY_ONLY'
  );

  // Signatures state
  const [parentComment, setParentComment] = useState(week.parentReview?.comment || '');
  const [mentorFeedback, setMentorFeedback] = useState(week.mentorReview?.feedback || '');

  // Status saving flags
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // In-place slot editing modal or inline
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [slotEditState, setSlotEditState] = useState<{
    startTime: string;
    title: string;
    deliverable: string;
  }>({ startTime: '', title: '', deliverable: '' });

  // Adding slot state
  const [addingDayId, setAddingDayId] = useState<string | null>(null);
  const [newSlotTime, setNewSlotTime] = useState('14:00');
  const [newSlotTitle, setNewSlotTitle] = useState('');
  const [newSlotDeliverable, setNewSlotDeliverable] = useState('');

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync props to state on week change
  useEffect(() => {
    setWeekGoal(week.weekGoal || '');
    setDeadlinesEvents(week.deadlinesEvents || '');
    setNotes(week.notes || '');
    setIdeas(week.ideas || '');
    setSketchesNote(week.sketchesNote || '');
    setRetroSuccess(week.retroSuccess || '');
    setRetroBlockers(week.retroBlockers || '');
    setRetroNextPlan(week.retroNextPlan || '');
    setAccessLevel(week.parentAccessLevel || 'SUMMARY_ONLY');
    setParentComment(week.parentReview?.comment || '');
    setMentorFeedback(week.mentorReview?.feedback || '');
  }, [week]);

  // Autosave helper for week fields
  const saveWeekFields = async (updates: Partial<{
    weekGoal: string;
    deadlinesEvents: string;
    notes: string;
    ideas: string;
    sketchesNote: string;
  }>) => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/v1/weeks/${week.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        showSaveToast('Запись сохранена');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const showSaveToast = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(null), 2500);
  };

  // Toggle Slot Status
  const handleToggleStatus = async (slot: DaySlot) => {
    let nextStatus = 'DONE';
    if (slot.status === 'PENDING') nextStatus = 'DONE';
    else if (slot.status === 'DONE') nextStatus = 'MIGRATED';
    else if (slot.status === 'MIGRATED') nextStatus = 'DROPPED';
    else nextStatus = 'PENDING';

    try {
      const res = await fetch(`/api/v1/slots/${slot.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        onRefreshWeek();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save in-place edited slot
  const handleSaveSlotEdit = async (slotId: string) => {
    try {
      const res = await fetch(`/api/v1/slots/${slotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: slotEditState.startTime,
          title: slotEditState.title,
          deliverable: slotEditState.deliverable,
          isGhost: false,
        }),
      });
      if (res.ok) {
        setEditingSlotId(null);
        onRefreshWeek();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create new slot
  const handleCreateSlot = async (dayId: string) => {
    if (!newSlotTitle.trim()) return;
    try {
      const res = await fetch('/api/v1/slots/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayId,
          title: newSlotTitle,
          startTime: newSlotTime,
          deliverable: newSlotDeliverable,
        }),
      });
      if (res.ok) {
        setAddingDayId(null);
        setNewSlotTitle('');
        setNewSlotDeliverable('');
        onRefreshWeek();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Retro & Privacy
  const handleSaveRetro = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/v1/weeks/${week.id}/retro`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retroSuccess,
          retroBlockers,
          retroNextPlan,
          parentAccessLevel: accessLevel,
        }),
      });
      if (res.ok) {
        showSaveToast('Итоги недели и приватность сохранены');
        onRefreshWeek();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  // Sign Parent Review
  const handleSignParentReview = async () => {
    if (!parentComment.trim()) return;
    try {
      const res = await fetch('/api/v1/parent/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekId: week.id,
          comment: parentComment,
        }),
      });
      if (res.ok) {
        showSaveToast('Комментарий родителя подписан!');
        onRefreshWeek();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sign Mentor Review
  const handleSignMentorReview = async () => {
    if (!mentorFeedback.trim()) return;
    try {
      const res = await fetch('/api/v1/mentor/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekId: week.id,
          feedback: mentorFeedback,
        }),
      });
      if (res.ok) {
        showSaveToast('Неделя подписана классным руководителем!');
        onRefreshWeek();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Client-Side Photo Compression (Canvas WebP)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          async (blob) => {
            if (!blob) return;
            // Upload to server
            try {
              const urlRes = await fetch('/api/v1/media/upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  weekId: week.id,
                  fileName: `sketch_${Date.now()}.webp`,
                  fileType: 'image/webp',
                  fileSize: blob.size,
                }),
              });
              const urlData = await urlRes.json();
              await fetch(urlData.uploadUrl, {
                method: 'PUT',
                body: blob,
              });
              showSaveToast(`Фото наброска сохранено (${Math.round(blob.size / 1024)} KB)`);
              onRefreshWeek();
            } catch (err) {
              console.error('Upload failed:', err);
            }
          },
          'image/webp',
          0.82
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Audio Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const urlRes = await fetch('/api/v1/media/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              weekId: week.id,
              fileName: `voice_${Date.now()}.webm`,
              fileType: 'audio/webm',
              fileSize: audioBlob.size,
            }),
          });
          const urlData = await urlRes.json();
          await fetch(urlData.uploadUrl, {
            method: 'PUT',
            body: audioBlob,
          });
          showSaveToast('Аудиозаметка сохранена!');
          onRefreshWeek();
        } catch (err) {
          console.error(err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      alert('Микрофон недоступен в данном окружении');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Helper for day dates formatting
  const formatDateDay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  // Days grouping
  const monday = week.days.find((d) => d.dayOfWeek === 1);
  const tuesday = week.days.find((d) => d.dayOfWeek === 2);
  const wednesday = week.days.find((d) => d.dayOfWeek === 3);
  const thursday = week.days.find((d) => d.dayOfWeek === 4);
  const friday = week.days.find((d) => d.dayOfWeek === 5);
  const saturday = week.days.find((d) => d.dayOfWeek === 6);
  const sunday = week.days.find((d) => d.dayOfWeek === 7);

  // Status icon formatter
  const renderStatusBadge = (slot: DaySlot) => {
    if (slot.status === 'DONE') {
      return (
        <span
          title="Выполнено (кликните для смены статуса)"
          className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-400 flex items-center justify-center font-bold text-xs cursor-pointer hover:scale-110 transition-transform"
        >
          ✓
        </span>
      );
    }
    if (slot.status === 'MIGRATED') {
      return (
        <span
          title="Перенесено (кликните для смены статуса)"
          className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 border border-amber-400 flex items-center justify-center font-bold text-xs cursor-pointer hover:scale-110 transition-transform"
        >
          ➔
        </span>
      );
    }
    if (slot.status === 'DROPPED') {
      return (
        <span
          title="Отменено (кликните для смены статуса)"
          className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 border border-slate-400 flex items-center justify-center font-bold text-[10px] cursor-pointer hover:scale-110 transition-transform"
        >
          ✕
        </span>
      );
    }
    return (
      <span
        title="Ожидает выполнения (кликните для отметки)"
        className="w-5 h-5 rounded-full border-2 border-slate-400 hover:border-slate-800 flex items-center justify-center cursor-pointer transition-colors"
      />
    );
  };

  // Day Column Component (matches the 3 columns per page)
  const renderDayColumn = (
    dayTitle: string,
    dayObj: DayData | undefined,
    isSaturdayOrSunday: boolean = false,
    isSpecialSaturday: boolean = false
  ) => {
    const slots = dayObj?.slots || [];
    const isAdding = addingDayId === dayObj?.id;

    return (
      <div
        className={`flex-1 flex flex-col border-r border-[#CBD5E1] last:border-r-0 min-w-0 ${
          isSpecialSaturday ? 'bg-[#FFFBEB]/40' : ''
        }`}
      >
        {/* Day Column Header */}
        <div
          className={`px-2.5 py-1.5 border-b border-[#1E293B] flex items-baseline justify-between ${
            isSpecialSaturday ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#F8F6F0] text-[#0F172A]'
          }`}
        >
          <span className="font-black text-xs uppercase tracking-wider truncate">
            {dayTitle}
          </span>
          <span className="text-[11px] font-mono font-semibold text-[#475569] shrink-0 ml-1">
            {dayObj ? formatDateDay(dayObj.date) : '__ / __'}
          </span>
        </div>

        {/* Sub-headers row (Table header) */}
        <div className="grid grid-cols-12 text-[9px] font-bold uppercase tracking-wider text-[#64748B] border-b border-[#CBD5E1] bg-[#F1EFE8]/60 py-0.5 px-1.5">
          <div className="col-span-3">Время</div>
          {!isSaturdayOrSunday ? (
            <>
              <div className="col-span-3">Предмет</div>
              <div className="col-span-6">Подготовка / Задачи / Результат</div>
            </>
          ) : (
            <div className="col-span-9">Подготовка / Задачи / Что делать</div>
          )}
        </div>

        {/* Rows of lessons/events */}
        <div className="flex-1 divide-y divide-[#E2E8F0] min-h-[220px]">
          {slots.length === 0 ? (
            <div className="h-full flex items-center justify-center p-4 text-[11px] italic text-[#94A3B8]">
              Свободный день
            </div>
          ) : (
            slots.map((slot) => {
              const isEditing = editingSlotId === slot.id;

              if (isEditing) {
                return (
                  <div key={slot.id} className="p-2 bg-amber-50/80 border-b border-amber-300 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={slotEditState.startTime}
                        onChange={(e) =>
                          setSlotEditState({ ...slotEditState, startTime: e.target.value })
                        }
                        placeholder="08:30"
                        className="w-16 px-1.5 py-0.5 text-xs bg-white border border-slate-300 rounded font-mono"
                      />
                      <input
                        type="text"
                        value={slotEditState.title}
                        onChange={(e) =>
                          setSlotEditState({ ...slotEditState, title: e.target.value })
                        }
                        placeholder="Название"
                        className="flex-1 px-1.5 py-0.5 text-xs bg-white border border-slate-300 rounded font-bold"
                      />
                    </div>
                    <input
                      type="text"
                      value={slotEditState.deliverable}
                      onChange={(e) =>
                        setSlotEditState({ ...slotEditState, deliverable: e.target.value })
                      }
                      placeholder="Подготовка / Результат (DoD)"
                      className="w-full px-1.5 py-0.5 text-xs bg-white border border-slate-300 rounded"
                    />
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        onClick={() => setEditingSlotId(null)}
                        className="text-[10px] px-2 py-0.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={() => handleSaveSlotEdit(slot.id)}
                        className="text-[10px] px-2.5 py-0.5 bg-slate-900 text-white rounded font-semibold cursor-pointer"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={slot.id}
                  className={`grid grid-cols-12 py-1.5 px-1.5 text-xs transition-colors group items-start hover:bg-slate-50/90 ${
                    slot.isGhost ? 'diary-ghost-row' : ''
                  }`}
                >
                  {/* Column 1: Time */}
                  <div className="col-span-3 text-[10px] font-mono text-[#475569] leading-tight pt-0.5">
                    {slot.startTime || '—'}
                  </div>

                  {/* Column 2: Subject */}
                  {!isSaturdayOrSunday ? (
                    <>
                      <div className="col-span-3 font-semibold text-[#0F172A] leading-tight pr-1 truncate">
                        {slot.title}
                      </div>

                      {/* Column 3: Intention & Deliverable + Status toggle */}
                      <div className="col-span-6 flex items-start justify-between gap-1">
                        <div
                          className="flex-1 text-[11px] text-[#334155] leading-tight cursor-pointer hover:underline"
                          onClick={() => {
                            setEditingSlotId(slot.id);
                            setSlotEditState({
                              startTime: slot.startTime || '',
                              title: slot.title,
                              deliverable: slot.deliverable || slot.taskGoal || '',
                            });
                          }}
                        >
                          {slot.deliverable || slot.taskGoal || (
                            <span className="text-[#94A3B8] italic">
                              {slot.isGhost ? 'Кликните, чтобы задать цель' : '—'}
                            </span>
                          )}
                        </div>
                        <div
                          onClick={() => handleToggleStatus(slot)}
                          className="shrink-0 pt-0.5"
                        >
                          {renderStatusBadge(slot)}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-9 flex items-start justify-between gap-1">
                      <div
                        className="flex-1 text-[11px] text-[#334155] leading-tight cursor-pointer hover:underline"
                        onClick={() => {
                          setEditingSlotId(slot.id);
                          setSlotEditState({
                            startTime: slot.startTime || '',
                            title: slot.title,
                            deliverable: slot.deliverable || slot.taskGoal || '',
                          });
                        }}
                      >
                        <span className="font-bold text-[#0F172A] block">{slot.title}</span>
                        {slot.deliverable || (
                          <span className="text-[#94A3B8] italic">Задать цель...</span>
                        )}
                      </div>
                      <div
                        onClick={() => handleToggleStatus(slot)}
                        className="shrink-0 pt-0.5"
                      >
                        {renderStatusBadge(slot)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add row button / form */}
        {dayObj && (
          <div className="p-1 border-t border-[#E2DDD3] bg-[#FAF8F5]">
            {isAdding ? (
              <div className="p-1.5 bg-white border border-[#CBD5E1] rounded text-xs space-y-1 shadow-sm">
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    placeholder="Время"
                    className="w-16 px-1.5 py-0.5 border rounded font-mono text-xs"
                  />
                  <input
                    type="text"
                    value={newSlotTitle}
                    onChange={(e) => setNewSlotTitle(e.target.value)}
                    placeholder="Предмет / Событие"
                    className="flex-1 px-1.5 py-0.5 border rounded font-semibold text-xs"
                  />
                </div>
                <input
                  type="text"
                  value={newSlotDeliverable}
                  onChange={(e) => setNewSlotDeliverable(e.target.value)}
                  placeholder="Подготовка / Результат (DoD)"
                  className="w-full px-1.5 py-0.5 border rounded text-xs"
                />
                <div className="flex justify-end gap-1 pt-1">
                  <button
                    onClick={() => setAddingDayId(null)}
                    className="text-[10px] px-2 py-0.5 text-slate-500 hover:text-slate-800"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleCreateSlot(dayObj.id)}
                    className="text-[10px] px-2.5 py-0.5 bg-slate-900 text-white rounded font-bold"
                  >
                    Добавить
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingDayId(dayObj.id)}
                className="w-full py-1 text-center text-[11px] font-semibold text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1EFE8] rounded transition-colors cursor-pointer"
              >
                + Добавить строку
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center py-4 px-2 sm:px-6">
      {/* Toast Save Alert */}
      {saveMessage && (
        <div className="fixed top-16 right-6 z-50 bg-[#0F172A] text-white text-xs px-4 py-2 rounded shadow-lg flex items-center gap-2 border border-slate-700 animate-fade-in">
          <span className="text-emerald-400">✓</span>
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Mobile Page Selector (Left Page vs Right Page) */}
      <div className="flex sm:hidden w-full max-w-[880px] mb-3 bg-[#E2DDD3] p-1 rounded-lg">
        <button
          onClick={() => setActiveMobilePage('left')}
          className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded transition-colors ${
            activeMobilePage === 'left' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'
          }`}
        >
          Левая стр. (Пн – Ср)
        </button>
        <button
          onClick={() => setActiveMobilePage('right')}
          className={`flex-1 py-1.5 text-xs font-black uppercase tracking-wider rounded transition-colors ${
            activeMobilePage === 'right' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'
          }`}
        >
          Правая стр. (Чт – Вс)
        </button>
      </div>

      {/* TWO-PAGE SPREAD BOOK WRAPPER (Мюллер-Брокманн + Тафти + Refactoring UI) */}
      <div className="w-full max-w-[1520px] bg-[#FCFAF6] text-[#0F172A] rounded-md shadow-2xl border border-[#D5CEC2] flex flex-col lg:flex-row overflow-hidden book-shadow">

        {/* =======================================================================
            LEFT PAGE (ЛЕВАЯ СТРАНИЦА РАЗВОРОТА: Страница 2 в PDF)
            ======================================================================= */}
        <div
          className={`w-full lg:w-1/2 flex flex-col p-4 sm:p-7 border-b lg:border-b-0 lg:border-r border-[#CBD5E1] bg-[#FCFAF6] ${
            activeMobilePage === 'right' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Top Header of Left Page */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch">
            {/* Mezon Logo Branding */}
            <div className="flex items-center gap-2 pr-3 sm:border-r border-[#CBD5E1] shrink-0">
              <div className="flex items-center">
                <span className="text-3xl font-black text-[#86198F] tracking-tight">Me</span>
                <div className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8] -mt-3 ml-0.5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-black uppercase tracking-wider text-[#0F172A]">Mezon</div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-[#64748B]">
                  Inspiring School
                </div>
              </div>
            </div>

            {/* Block 1: ☆ ГЛАВНОЕ НА НЕДЕЛЮ */}
            <div className="flex-1 bg-[#FDFCF9] border border-[#CBD5E1] rounded p-2 flex flex-col">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#0F172A] uppercase tracking-wider mb-1">
                <span className="text-amber-500 text-sm">☆</span>
                <span>ГЛАВНОЕ НА НЕДЕЛЮ</span>
              </div>
              <textarea
                value={weekGoal}
                onChange={(e) => setWeekGoal(e.target.value)}
                onBlur={() => saveWeekFields({ weekGoal })}
                placeholder="Ключевой академический или проектный фокус недели..."
                rows={2}
                className="w-full flex-1 bg-transparent border-0 text-xs text-[#1E293B] leading-relaxed resize-none focus:outline-none placeholder:text-[#94A3B8]"
              />
            </div>

            {/* Block 2: 📅 СРОКИ / СОБЫТИЯ */}
            <div className="flex-1 bg-[#FDFCF9] border border-[#CBD5E1] rounded p-2 flex flex-col">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#0F172A] uppercase tracking-wider mb-1">
                <span>📅</span>
                <span>СРОКИ / СОБЫТИЯ</span>
              </div>
              <textarea
                value={deadlinesEvents}
                onChange={(e) => setDeadlinesEvents(e.target.value)}
                onBlur={() => saveWeekFields({ deadlinesEvents })}
                placeholder="• Дедлайн по физике&#10;• Встреча студсовета&#10;• Сдача отчета"
                rows={2}
                className="w-full flex-1 bg-transparent border-0 text-xs text-[#1E293B] leading-relaxed resize-none focus:outline-none placeholder:text-[#94A3B8]"
              />
            </div>
          </div>

          {/* Main 3 Days Table: ПОНЕДЕЛЬНИК, ВТОРНИК, СРЕДА */}
          <div className="flex-1 border border-[#1E293B] rounded flex flex-col sm:flex-row bg-white overflow-hidden shadow-sm">
            {renderDayColumn('ПОНЕДЕЛЬНИК', monday)}
            {renderDayColumn('ВТОРНИК', tuesday)}
            {renderDayColumn('СРЕДА', wednesday)}
          </div>

          {/* Bottom Notes & Ideas Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {/* ✏️ ЗАМЕТКИ */}
            <div className="bg-[#FDFCF9] border border-[#CBD5E1] rounded p-2 flex flex-col">
              <div className="flex items-center gap-1 text-xs font-black text-[#0F172A] uppercase tracking-wider mb-1">
                <span>✏️</span>
                <span>ЗАМЕТКИ</span>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => saveWeekFields({ notes })}
                placeholder="Заметки по урокам, контакты, материалы..."
                rows={3}
                className="w-full bg-transparent border-0 text-xs text-[#334155] resize-none focus:outline-none placeholder:text-[#94A3B8] leading-relaxed"
              />
            </div>

            {/* 💡 ИДЕИ */}
            <div className="bg-[#FDFCF9] border border-[#CBD5E1] rounded p-2 flex flex-col">
              <div className="flex items-center gap-1 text-xs font-black text-[#0F172A] uppercase tracking-wider mb-1">
                <span>💡</span>
                <span>ИДЕИ</span>
              </div>
              <textarea
                value={ideas}
                onChange={(e) => setIdeas(e.target.value)}
                onBlur={() => saveWeekFields({ ideas })}
                placeholder="Идеи для проектов, темы дебатов, гипотезы..."
                rows={3}
                className="w-full bg-transparent border-0 text-xs text-[#334155] resize-none focus:outline-none placeholder:text-[#94A3B8] leading-relaxed"
              />
            </div>
          </div>

          {/* Footer Guidance Bar: КАК ИСПОЛЬЗОВАТЬ ЕЖЕНЕДЕЛЬНИК */}
          <div className="mt-4 pt-2 border-t border-[#E2DDD3] text-[10px] text-[#475569]">
            <div className="font-black uppercase tracking-wider text-[#0F172A] mb-1">
              КАК ИСПОЛЬЗОВАТЬ ЕЖЕНЕДЕЛЬНИК (краткие подсказки)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 leading-snug">
              <div>
                <span className="font-bold text-[#0F172A]">1.</span> Записывай задания к урокам и делам.
              </div>
              <div>
                <span className="font-bold text-[#0F172A]">2.</span> Планируй время для SR и своих дел.
              </div>
              <div>
                <span className="font-bold text-[#0F172A]">3.</span> Отмечай выполненное и переносы.
              </div>
              <div>
                <span className="font-bold text-[#0F172A]">4.</span> Каждый день делай главное важное.
              </div>
              <div>
                <span className="font-bold text-[#0F172A]">5.</span> Подводи итоги недели и делай выводы.
              </div>
            </div>
          </div>
        </div>

        {/* =======================================================================
            CENTER BOOK GUTTER / CREASE (Центральный переплет разворота книги)
            ======================================================================= */}
        <div className="hidden lg:block w-[1px] bg-[#CBD5E1] relative shadow-inner">
          <div className="absolute inset-y-0 -left-2 -right-2 pointer-events-none book-spine-crease" />
        </div>

        {/* =======================================================================
            RIGHT PAGE (ПРАВАЯ СТРАНИЦА РАЗВОРОТА: Страница 3 в PDF)
            ======================================================================= */}
        <div
          className={`w-full lg:w-1/2 flex flex-col p-4 sm:p-7 bg-[#FCFAF6] ${
            activeMobilePage === 'left' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Top Block: ✏️ НАБРОСКИ И ЭСКИЗЫ (Dot Grid Canvas + Media Dump) */}
          <div className="bg-[#FDFCF9] border border-[#CBD5E1] rounded p-2.5 mb-4 relative dot-grid-bg flex flex-col min-h-[90px]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#0F172A] uppercase tracking-wider">
                <span>✏️</span>
                <span>НАБРОСКИ И ЭСКИЗЫ</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Photo upload input */}
                <label className="cursor-pointer text-[11px] font-bold px-2 py-0.5 bg-white border border-[#CBD5E1] hover:border-[#0F172A] rounded text-[#334155] shadow-xs flex items-center gap-1">
                  <span>📎 Фото наброска</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {/* Voice recording button */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1 cursor-pointer transition-colors ${
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-white border border-[#CBD5E1] hover:border-[#0F172A] text-[#334155]'
                  }`}
                >
                  <span>{isRecording ? `⏹️ Запись (${recordingSeconds}с)` : '🎙️ Голос'}</span>
                </button>
              </div>
            </div>

            <textarea
              value={sketchesNote}
              onChange={(e) => setSketchesNote(e.target.value)}
              onBlur={() => saveWeekFields({ sketchesNote })}
              placeholder="Формулы, схемы алгоритмов, скетчи прототипов..."
              rows={2}
              className="w-full bg-white/80 border border-slate-200/60 rounded p-1 text-xs text-[#334155] resize-none focus:outline-none placeholder:text-[#94A3B8]"
            />

            {/* Uploaded media previews */}
            {week.mediaAssets && week.mediaAssets.length > 0 && (
              <div className="flex items-center gap-2 mt-2 overflow-x-auto py-1">
                {week.mediaAssets.map((asset) => (
                  <div key={asset.id} className="shrink-0 bg-white border border-slate-300 rounded p-1 shadow-xs">
                    {asset.fileType.startsWith('image/') ? (
                      <a href={asset.fileUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={asset.fileUrl}
                          alt={asset.fileName}
                          className="w-12 h-12 object-cover rounded hover:opacity-90"
                        />
                      </a>
                    ) : (
                      <audio controls src={asset.fileUrl} className="h-8 max-w-[150px]" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Days Table: ЧЕТВЕРГ, ПЯТНИЦА, СУББОТА (SR) + ВОСКРЕСЕНЬЕ */}
          <div className="flex-1 border border-[#1E293B] rounded flex flex-col sm:flex-row bg-white overflow-hidden shadow-sm">
            {renderDayColumn('ЧЕТВЕРГ', thursday)}
            {renderDayColumn('ПЯТНИЦА', friday)}
            
            {/* 3rd Column: Split into Saturday (Day of Self-Study) and Sunday */}
            <div className="flex-1 flex flex-col border-r border-[#CBD5E1] last:border-r-0 min-w-0">
              {/* Top half: Saturday - Self Study Day (Выделена терракотовым!) */}
              <div className="flex-1 flex flex-col border-b border-[#1E293B]">
                {renderDayColumn('СУББОТА – ДЕНЬ САМОСТОЯТЕЛЬНОЙ РАБОТЫ', saturday, true, true)}
              </div>
              {/* Bottom half: Sunday */}
              <div className="flex-1 flex flex-col">
                {renderDayColumn('ВОСКРЕСЕНЬЕ', sunday, true, false)}
              </div>
            </div>
          </div>

          {/* Weekly Retrospective: ИТОГИ НЕДЕЛИ И РЕФЛЕКСИЯ */}
          <div className="bg-[#FDFCF9] border border-[#1E293B] rounded p-2.5 mt-4">
            <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-1.5 mb-2">
              <div className="font-black text-xs uppercase tracking-wider text-[#0F172A]">
                ИТОГИ НЕДЕЛИ И РЕФЛЕКСИЯ
              </div>

              {/* Student Selective Trust Selector */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-[#64748B] font-semibold">Доступ родителя:</span>
                <select
                  value={accessLevel}
                  onChange={(e) =>
                    setAccessLevel(e.target.value as 'REVOKED' | 'SUMMARY_ONLY' | 'FULL_ACCESS')
                  }
                  className="bg-white border border-[#CBD5E1] rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-800"
                >
                  <option value="FULL_ACCESS">Полный доступ</option>
                  <option value="SUMMARY_ONLY">Только сводка и цели</option>
                  <option value="REVOKED">Приватно (доступ закрыт)</option>
                </select>
              </div>
            </div>

            {/* 3 Columns PDCA Questions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Question 1: Что получилось? */}
              <div className="flex flex-col">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1 mb-1">
                  <span className="text-amber-500">☆</span>
                  <span>ЧТО ПОЛУЧИЛОСЬ?</span>
                </div>
                <textarea
                  value={retroSuccess}
                  onChange={(e) => setRetroSuccess(e.target.value)}
                  placeholder="Достижения, защищенные работы, выводы..."
                  rows={3}
                  className="w-full bg-white border border-[#CBD5E1] rounded p-1.5 text-xs text-[#1E293B] leading-relaxed resize-none focus:outline-none focus:border-slate-800"
                />
              </div>

              {/* Question 2: Что пришлось перенести? Почему? */}
              <div className="flex flex-col">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1 mb-1">
                  <span className="text-rose-500">!</span>
                  <span>ЧТО ПРИШЛОСЬ ПЕРЕНЕСТИ? Почему?</span>
                </div>
                <textarea
                  value={retroBlockers}
                  onChange={(e) => setRetroBlockers(e.target.value)}
                  placeholder="Причины задержек, где не хватило времени..."
                  rows={3}
                  className="w-full bg-white border border-[#CBD5E1] rounded p-1.5 text-xs text-[#1E293B] leading-relaxed resize-none focus:outline-none focus:border-slate-800"
                />
              </div>

              {/* Question 3: Что изменю на следующей неделе? */}
              <div className="flex flex-col">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-1 mb-1">
                  <span className="text-sky-600">➔</span>
                  <span>ЧТО ИЗМЕНЮ НА СЛЕДУЮЩЕЙ НЕДЕЛЕ?</span>
                </div>
                <textarea
                  value={retroNextPlan}
                  onChange={(e) => setRetroNextPlan(e.target.value)}
                  placeholder="Корректировка стратегии, новый фокус..."
                  rows={3}
                  className="w-full bg-white border border-[#CBD5E1] rounded p-1.5 text-xs text-[#1E293B] leading-relaxed resize-none focus:outline-none focus:border-slate-800"
                />
              </div>
            </div>

            {/* Anti-Sabotage Indicator & Save Button */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#E2DDD3]">
              <div className="text-[10px] text-[#64748B]">
                {retroSuccess.trim().length > 0 && retroSuccess.trim().length < 10 ? (
                  <span className="text-amber-700 font-bold">
                    ⚠️ Внимание: слишком краткий ответ активирует маркер «Silent Retro» у куратора
                  </span>
                ) : (
                  <span>Цикл рефлексии Дьюи / Колба (PDCA)</span>
                )}
              </div>
              <button
                onClick={handleSaveRetro}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-1 rounded cursor-pointer transition-colors"
              >
                Сохранить рефлексию
              </button>
            </div>
          </div>

          {/* Feedback & Signature Boxes (Bottom of Right Page) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {/* Box 1: КОММЕНТАРИЙ РОДИТЕЛЯ */}
            <div className="bg-[#FDFCF9] border border-[#CBD5E1] rounded p-2.5 flex flex-col justify-between">
              <div>
                <div className="font-black text-xs uppercase tracking-wider text-[#0F172A]">
                  КОММЕНТАРИЙ РОДИТЕЛЯ
                </div>
                <div className="text-[10px] italic text-[#64748B] mb-1.5">
                  Что я заметил(а)? Чем могу помочь?
                </div>
                <textarea
                  value={parentComment}
                  onChange={(e) => setParentComment(e.target.value)}
                  disabled={currentUserRole !== 'PARENT' && !!week.parentReview}
                  placeholder="Слова поддержки, наблюдения за энергией и настроением ребенка..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-[#1E293B] resize-none focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E2DDD3] text-[11px] text-[#475569]">
                <div>
                  {week.parentReview ? (
                    <span className="font-bold text-emerald-800">
                      ✓ Подписано: {formatDateDay(week.parentReview.signedAt)}
                    </span>
                  ) : (
                    <span>Подпись: _____________</span>
                  )}
                </div>
                {currentUserRole === 'PARENT' && (
                  <button
                    onClick={handleSignParentReview}
                    className="bg-[#1E293B] hover:bg-black text-white text-[11px] font-bold px-2.5 py-0.5 rounded cursor-pointer"
                  >
                    Подписать
                  </button>
                )}
              </div>
            </div>

            {/* Box 2: КОММЕНТАРИЙ КЛАССНОГО РУКОВОДИТЕЛЯ */}
            <div className="bg-[#FDFCF9] border border-[#CBD5E1] rounded p-2.5 flex flex-col justify-between">
              <div>
                <div className="font-black text-xs uppercase tracking-wider text-[#0F172A]">
                  КОММЕНТАРИЙ КЛАССНОГО РУКОВОДИТЕЛЯ
                </div>
                <div className="text-[10px] italic text-[#64748B] mb-1.5">
                  Наблюдения, рекомендации, договорённости
                </div>
                <textarea
                  value={mentorFeedback}
                  onChange={(e) => setMentorFeedback(e.target.value)}
                  disabled={currentUserRole !== 'MENTOR' && !!week.mentorReview}
                  placeholder="Педагогические рекомендации, баланс нагрузки..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-[#1E293B] resize-none focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E2DDD3] text-[11px] text-[#475569]">
                <div>
                  {week.mentorReview ? (
                    <span className="font-bold text-emerald-800">
                      ✓ Подписано: {week.mentorReview.mentor.fullName} (
                      {formatDateDay(week.mentorReview.signedAt)})
                    </span>
                  ) : (
                    <span>Подпись: _____________</span>
                  )}
                </div>
                {currentUserRole === 'MENTOR' && (
                  <button
                    onClick={handleSignMentorReview}
                    className="bg-[#86198F] hover:bg-[#701A75] text-white text-[11px] font-bold px-2.5 py-0.5 rounded cursor-pointer"
                  >
                    Подписать как куратор
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
