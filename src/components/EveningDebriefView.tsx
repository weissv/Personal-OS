'use client';

import React, { useState, useRef } from 'react';
import { CheckCircle2, ArrowRightLeft, XCircle, Camera, Mic, Square, Play, Pause, Upload, Check } from 'lucide-react';
import { ViewHero, Notice } from '@/components/ui';
import { processImageForUpload, AudioCapturePipeline, uploadMediaWithPresignedUrl } from '@/lib/media-processor';

interface DaySlot {
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

interface MediaAsset {
  id: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize: number;
  note: string | null;
  createdAt: string;
}

interface EveningDebriefViewProps {
  dayId: string;
  weekId: string;
  dayTitle: string;
  dateStr: string;
  slots: DaySlot[];
  mediaAssets: MediaAsset[];
  onDebriefCompleted: () => void;
  onSlotUpdated: () => void;
  onNavigateToMorning?: () => void;
}

export const EveningDebriefView: React.FC<EveningDebriefViewProps> = ({
  dayId,
  weekId,
  dayTitle,
  dateStr,
  slots,
  mediaAssets,
  onDebriefCompleted,
  onSlotUpdated,
  onNavigateToMorning,
}) => {
  const [slotStatusMap, setSlotStatusMap] = useState<
    Record<string, { status: string; deliverable?: string; taskGoal?: string; migrationTarget?: string }>
  >(() => {
    const map: Record<string, { status: string; deliverable?: string; taskGoal?: string }> = {};
    slots.forEach((s) => {
      map[s.id] = {
        status: s.status,
        deliverable: s.deliverable || '',
        taskGoal: s.taskGoal || '',
      };
    });
    return map;
  });

  // Inline migration target selector state (Cooper: In-Place control, no modal)
  const [migratingSlotId, setMigratingSlotId] = useState<string | null>(null);

  // Media capture state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    ratio: number;
  } | null>(null);

  // Audio recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120);
  const [audioPipeline] = useState(() => new AudioCapturePipeline());
  const [recordedAudioPreview, setRecordedAudioPreview] = useState<{
    blob: Blob;
    url: string;
    duration: number;
  } | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaNoteInput, setMediaNoteInput] = useState('');
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Counts
  const totalSlots = slots.length;
  const doneCount = Object.values(slotStatusMap).filter((s) => s.status === 'DONE').length;
  const migratedCount = Object.values(slotStatusMap).filter((s) => s.status === 'MIGRATED').length;
  const droppedCount = Object.values(slotStatusMap).filter((s) => s.status === 'DROPPED').length;

  const handleSetStatus = (slotId: string, status: string) => {
    if (status === 'MIGRATED') {
      setMigratingSlotId(migratingSlotId === slotId ? null : slotId);
      return;
    }
    setMigratingSlotId(null);
    setSlotStatusMap((prev) => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        status,
      },
    }));
  };

  const handleApplyMigration = (slotId: string, destination: 'tomorrow' | 'saturday') => {
    const destLabel = destination === 'saturday' ? 'субботу' : 'завтра';
    setSlotStatusMap((prev) => ({
      ...prev,
      [slotId]: {
        ...prev[slotId],
        status: 'MIGRATED',
        migrationTarget: destination,
        deliverable: prev[slotId]?.deliverable
          ? `${prev[slotId]?.deliverable} (Перенесено на ${destLabel})`
          : `Перенесено на ${destLabel}`,
      },
    }));
    setMigratingSlotId(null);
  };

  // Canvas WebP compression (Section 6.1 spec)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingImage(true);
    try {
      const originalSize = file.size;
      const compressedBlob = await processImageForUpload(file);
      const compressedSize = compressedBlob.size;
      const ratio = Math.round((1 - compressedSize / originalSize) * 100);

      setCompressionStats({
        originalSize,
        compressedSize,
        ratio,
      });

      setIsUploadingMedia(true);
      await uploadMediaWithPresignedUrl({
        weekId,
        fileBlob: compressedBlob,
        fileName: `sketch-${Date.now()}.webp`,
        note: mediaNoteInput || 'Фото страницы конспекта / эскиза',
      });

      onSlotUpdated();
      setMediaNoteInput('');
    } catch (err) {
      console.error('Photo upload error:', err);
    } finally {
      setIsCompressingImage(false);
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Opus Audio recording (Section 6.2 spec)
  const handleStartAudio = async () => {
    try {
      setRecordedAudioPreview(null);
      setIsRecordingAudio(true);
      setSecondsRemaining(120);

      await audioPipeline.start((remaining) => {
        setSecondsRemaining(remaining);
      });
    } catch (err) {
      console.error('Audio capture error:', err);
      setIsRecordingAudio(false);
    }
  };

  const handleStopAudio = async () => {
    try {
      const result = await audioPipeline.stop();
      setIsRecordingAudio(false);
      setRecordedAudioPreview({
        blob: result.blob,
        url: result.url,
        duration: result.durationSeconds,
      });
    } catch (err) {
      console.error('Audio stop error:', err);
      setIsRecordingAudio(false);
    }
  };

  const handleUploadAudio = async () => {
    if (!recordedAudioPreview) return;
    setIsUploadingMedia(true);
    try {
      await uploadMediaWithPresignedUrl({
        weekId,
        fileBlob: recordedAudioPreview.blob,
        fileName: `voicenote-${Date.now()}.webm`,
        note: mediaNoteInput || `Голосовая мысль (${recordedAudioPreview.duration} сек)`,
      });
      setRecordedAudioPreview(null);
      setMediaNoteInput('');
      onSlotUpdated();
    } catch (err) {
      console.error('Voice note upload error:', err);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Single Transaction API sync
  const handleBatchSync = async () => {
    setIsBatchSyncing(true);
    setSyncSuccessMessage(null);
    try {
      const updatedSlots = Object.entries(slotStatusMap).map(([id, val]) => ({
        id,
        status: val.status,
        deliverable: val.deliverable,
        taskGoal: val.taskGoal,
      }));

      const res = await fetch(`/api/v1/days/${dayId}/batch-debrief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updatedSlots,
          newCustomEvents: [],
        }),
      });

      if (res.ok) {
        setSyncSuccessMessage('Вечерний дебрифинг успешно сохранен в единой транзакции (Single Transaction API)');
        onDebriefCompleted();
        setTimeout(() => setSyncSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error('Batch sync error:', err);
    } finally {
      setIsBatchSyncing(false);
    }
  };

  const statusLabel = (st: string) => (st === 'DONE' ? 'Готово' : st === 'MIGRATED' ? 'Перенесено' : st === 'DROPPED' ? 'Отменено' : 'Ждёт решения');
  const pct = (n: number) => (totalSlots > 0 ? (n / totalSlots) * 100 : 0);

  return (
    <div>
      <ViewHero
        tag="16:45 – 21:00 · Вечерний дебрифинг"
        title={
          <>
            Закрой день: <span className="mz-hl">что готово</span>, что переносим
          </>
        }
        text={
          <>
            <strong>5–7 минут.</strong> Телефон снова у тебя — сверь результат с Definition of Done, отметь статус каждого
            урока и сбрось конспекты в медиа-буфер.
          </>
        }
        mascot="adm"
        stats={[
          { value: `${doneCount}/${totalSlots}`, label: 'выполнено сегодня' },
          { value: migratedCount, unit: 'шт.', label: 'перенесено' },
          { value: droppedCount, unit: 'шт.', label: 'отменено' },
        ]}
      />

      {syncSuccessMessage && (
        <div style={{ marginBottom: 'var(--s5)' }}>
          <Notice icon={<Check size={18} />}>{syncSuccessMessage}</Notice>
        </div>
      )}

      <div className="mz-h2">
        <div>
          <h2>
            {dayTitle}
            <small>{dateStr}</small>
          </h2>
          <p>Выбери статус в каждой строке — решение сохранится одним пакетом.</p>
        </div>
        <div style={{ minWidth: 220, flex: '0 1 280px' }} aria-label="Распределение статусов дня">
          <div className="mz-segbar">
            <i className="done" style={{ width: `${pct(doneCount)}%` }} />
            <i className="migrated" style={{ width: `${pct(migratedCount)}%` }} />
            <i className="dropped" style={{ width: `${pct(droppedCount)}%` }} />
          </div>
          <div className="mz-cell-sub">
            {doneCount} готово · {migratedCount} перенос · {droppedCount} отмена
          </div>
        </div>
      </div>

      {/* Статус = цвет кромки + подпись; решение принимается прямо в строке */}
      <div className="mz-slots">
        {slots.map((slot) => {
          const state = slotStatusMap[slot.id] || { status: slot.status };
          const isDone = state.status === 'DONE';
          const isMigrated = state.status === 'MIGRATED';
          const isDropped = state.status === 'DROPPED';
          const isMigratingThis = migratingSlotId === slot.id;
          const cls = ['mz-slot', isDone ? 'mz-slot--done' : isMigrated ? 'mz-slot--migrated' : isDropped ? 'mz-slot--dropped' : ''].join(' ');

          return (
            <div key={slot.id} className={cls}>
              <div className="mz-slot__time">
                <b>{slot.startTime || '00:00'}</b>
                <span>{slot.endTime || '00:00'}</span>
              </div>

              <div style={{ minWidth: 0 }}>
                <h3 className="mz-slot__title">
                  {slot.title}
                  {slot.type === 'CUSTOM_EVENT' && <span className="mz-chip mz-chip--lav">Событие</span>}
                </h3>
                {slot.taskGoal && <p className="mz-slot__goal">{slot.taskGoal}</p>}
                {slot.deliverable && (
                  <p className="mz-slot__dod">
                    <b>DoD</b>
                    {slot.deliverable}
                  </p>
                )}
              </div>

              <span
                className={`mz-chip ${isDone ? 'mz-chip--teal' : isMigrated ? 'mz-chip--lav' : isDropped ? 'mz-chip--error' : 'mz-chip--outline'}`}
              >
                {statusLabel(state.status)}
              </span>

              <div className="mz-slot__actions">
                <div className="mz-seg" role="group" aria-label={`Статус: ${slot.title}`}>
                  <button
                    type="button"
                    className="mz-seg__btn mz-seg__btn--done"
                    aria-pressed={isDone}
                    onClick={() => handleSetStatus(slot.id, 'DONE')}
                  >
                    <CheckCircle2 size={16} /> Готово
                  </button>
                  <button
                    type="button"
                    className="mz-seg__btn mz-seg__btn--migrated"
                    aria-pressed={isMigrated || isMigratingThis}
                    onClick={() => handleSetStatus(slot.id, 'MIGRATED')}
                  >
                    <ArrowRightLeft size={16} /> Перенести
                  </button>
                  <button
                    type="button"
                    className="mz-seg__btn mz-seg__btn--dropped"
                    aria-pressed={isDropped}
                    onClick={() => handleSetStatus(slot.id, isDropped ? 'PENDING' : 'DROPPED')}
                  >
                    <XCircle size={16} /> Отмена
                  </button>
                </div>
              </div>

              {isMigratingThis && (
                <div className="mz-inline" style={{ gridColumn: '1 / -1' }}>
                  <strong>Куда перенести?</strong>
                  <div className="mz-row">
                    <button type="button" className="mz-btn mz-btn--sm mz-btn--light" onClick={() => handleApplyMigration(slot.id, 'tomorrow')}>
                      На завтра
                    </button>
                    <button type="button" className="mz-btn mz-btn--sm mz-btn--primary" onClick={() => handleApplyMigration(slot.id, 'saturday')}>
                      На субботний проект
                    </button>
                    <button type="button" className="mz-link" onClick={() => setMigratingSlotId(null)}>
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Медиа-буфер: фото и голос */}
      <section className="mz-panel mz-panel--lav" style={{ marginTop: 'var(--s6)' }}>
        <div className="mz-panel__title">
          <span className="mz-chip mz-chip--lav">Медиа</span>
          Буфер «Наброски и эскизы»
          <span style={{ marginLeft: 'auto', fontWeight: 500, letterSpacing: 0, textTransform: 'none', fontSize: 12, color: 'var(--text-soft)' }}>
            Canvas WebP · Opus 32k
          </span>
        </div>

        <div className="mz-stack">
          <label className="mz-field">
            <span className="mz-label">
              Контекст артефакта <em>необязательно</em>
            </span>
            <input
              type="text"
              value={mediaNoteInput}
              onChange={(e) => setMediaNoteInput(e.target.value)}
              placeholder="Схема цепи на уроке физики, страница 42"
              className="mz-input"
            />
          </label>

          <div className="mz-row">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="mz-btn mz-btn--lav"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressingImage || isUploadingMedia}
            >
              <Camera size={16} /> {isCompressingImage ? 'Сжимаю…' : 'Фото конспекта'}
            </button>

            {!isRecordingAudio ? (
              <button type="button" className="mz-btn mz-btn--light" onClick={handleStartAudio} disabled={isUploadingMedia}>
                <Mic size={16} /> Голосовая мысль
              </button>
            ) : (
              <button type="button" className="mz-btn mz-btn--primary" onClick={handleStopAudio}>
                <Square size={14} fill="currentColor" /> Стоп · <span className="tabular-nums">{secondsRemaining} с</span>
              </button>
            )}
          </div>

          {compressionStats && (
            <Notice tone="lav">
              Сжато: <strong>{(compressionStats.originalSize / 1024 / 1024).toFixed(1)} MB</strong> →{' '}
              <strong>{(compressionStats.compressedSize / 1024).toFixed(0)} KB</strong> WebP (−{compressionStats.ratio}%)
            </Notice>
          )}

          {recordedAudioPreview && (
            <div className="mz-player">
              <audio ref={audioPlayerRef} src={recordedAudioPreview.url} onEnded={() => setIsPlayingAudio(false)} style={{ display: 'none' }} />
              <div className="mz-row" style={{ flexWrap: 'nowrap' }}>
                <button
                  type="button"
                  className="mz-btn mz-btn--sm mz-btn--peach"
                  aria-label={isPlayingAudio ? 'Пауза' : 'Воспроизвести'}
                  onClick={() => {
                    if (audioPlayerRef.current) {
                      if (isPlayingAudio) {
                        audioPlayerRef.current.pause();
                        setIsPlayingAudio(false);
                      } else {
                        audioPlayerRef.current.play();
                        setIsPlayingAudio(true);
                      }
                    }
                  }}
                >
                  {isPlayingAudio ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <div>
                  <b>Аудиозапись · {recordedAudioPreview.duration} сек</b>
                  <small>Opus 32 kbps mono</small>
                </div>
              </div>
              <div className="mz-row" style={{ flexWrap: 'nowrap' }}>
                <button type="button" className="mz-btn mz-btn--sm mz-btn--teal" onClick={handleUploadAudio} disabled={isUploadingMedia}>
                  <Upload size={16} /> {isUploadingMedia ? 'Загрузка…' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  className="mz-link"
                  style={{ color: '#fff' }}
                  onClick={() => setRecordedAudioPreview(null)}
                >
                  Удалить
                </button>
              </div>
            </div>
          )}

          {mediaAssets.length > 0 && (
            <div>
              <div className="mz-label">Артефакты недели · {mediaAssets.length}</div>
              <div className="mz-media">
                {mediaAssets.map((asset) => (
                  <div key={asset.id} className="mz-media__item">
                    <div className="mz-media__thumb">
                      {asset.fileType.includes('image') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.fileUrl} alt={asset.fileName} />
                      ) : (
                        <Mic size={26} />
                      )}
                    </div>
                    <div className="mz-media__meta">
                      <b>{asset.note || asset.fileName}</b>
                      <span>{(asset.fileSize / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Главное действие экрана */}
      <div style={{ marginTop: 'var(--s6)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" className="mz-btn mz-btn--primary mz-btn--lg mz-btn--block" onClick={handleBatchSync} disabled={isBatchSyncing}>
          {isBatchSyncing ? 'Сохраняю день…' : 'Завершить день'}
          {!isBatchSyncing && <Check size={18} />}
        </button>

        {onNavigateToMorning && (
          <button
            type="button"
            className="mz-btn mz-btn--outline mz-btn--block"
            onClick={onNavigateToMorning}
            style={{ fontSize: 13, color: '#555555' }}
          >
            ← Перейти к утреннему фокусу (до 13:00)
          </button>
        )}
      </div>
    </div>
  );
};
