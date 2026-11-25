'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ArrowRightLeft,
  XCircle,
  Camera,
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  Check,
  Maximize2,
  RotateCcw,
  CalendarX2,
} from 'lucide-react';
import { ViewHero, Notice, InlineAlert, EmptyState } from '@/components/ui';
import { processImageForUpload, AudioCapturePipeline, uploadMediaWithPresignedUrl } from '@/lib/media-processor';
import { apiFetch, mediaUrl } from '@/lib/api-client';
import { plural } from '@/lib/school-time';
import type { DaySlot, MediaAsset } from '@/lib/types';
import { MediaPreviewModal } from './MediaPreviewModal';

type Status = 'PENDING' | 'DONE' | 'MIGRATED' | 'DROPPED';
type MigrationTarget = 'tomorrow' | 'saturday';

interface Decision {
  status: Status;
  migrationTarget?: MigrationTarget;
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

const STATUS_LABEL: Record<Status, string> = {
  PENDING: 'Ждёт решения',
  DONE: 'Готово',
  MIGRATED: 'Перенесено',
  DROPPED: 'Отменено',
};
const STATUS_CHIP: Record<Status, string> = {
  PENDING: 'mz-chip--outline',
  DONE: 'mz-chip--teal',
  MIGRATED: 'mz-chip--lav',
  DROPPED: 'mz-chip--error',
};
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

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
  // Решения по слотам — локально до «Завершить день» (одна транзакция). Компонент
  // пересоздаётся при смене дня (key), поэтому состояние не «перетекает» между днями.
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() =>
    Object.fromEntries(slots.map((s) => [s.id, { status: s.status as Status }]))
  );
  const [migratingSlotId, setMigratingSlotId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{ originalSize: number; compressedSize: number; ratio: number } | null>(null);

  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120);
  const [audioPipeline] = useState(() => new AudioCapturePipeline());
  const [recordedAudio, setRecordedAudio] = useState<{ blob: Blob; url: string; duration: number } | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaNoteInput, setMediaNoteInput] = useState('');
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [selectedMediaAsset, setSelectedMediaAsset] = useState<MediaAsset | null>(null);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(() => new Set());

  // Освобождаем микрофон и blob-URL при уходе с экрана
  useEffect(() => () => audioPipeline.cancel(), [audioPipeline]);
  useEffect(() => {
    const url = recordedAudio?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [recordedAudio]);

  const original = useMemo(() => new Map(slots.map((s) => [s.id, s.status as Status])), [slots]);
  const changed = useMemo(
    () => slots.filter((s) => decisions[s.id] && decisions[s.id].status !== original.get(s.id)),
    [slots, decisions, original]
  );

  const counts = useMemo(() => {
    const c = { DONE: 0, MIGRATED: 0, DROPPED: 0, PENDING: 0 } as Record<Status, number>;
    for (const s of slots) c[decisions[s.id]?.status ?? (s.status as Status)]++;
    return c;
  }, [slots, decisions]);
  const totalSlots = slots.length;
  const pct = (n: number) => (totalSlots > 0 ? (n / totalSlots) * 100 : 0);

  const setDecision = (slotId: string, decision: Decision) => {
    setSyncSuccessMessage(null);
    setDecisions((prev) => ({ ...prev, [slotId]: decision }));
  };

  const handleSetStatus = (slotId: string, status: Status) => {
    const current = decisions[slotId]?.status;
    if (status === 'MIGRATED') {
      setMigratingSlotId(migratingSlotId === slotId ? null : slotId);
      return;
    }
    setMigratingSlotId(null);
    // Повторное нажатие на выбранный статус — отмена решения
    setDecision(slotId, { status: current === status ? 'PENDING' : status });
  };

  const handleApplyMigration = (slotId: string, destination: MigrationTarget) => {
    setDecision(slotId, { status: 'MIGRATED', migrationTarget: destination });
    setMigratingSlotId(null);
  };

  const handleResetSlot = (slotId: string) => {
    setMigratingSlotId(null);
    setDecision(slotId, { status: original.get(slotId) ?? 'PENDING' });
  };

  // Фото: сжатие в WebP через Canvas → загрузка по pre-signed URL
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMediaError('Выберите изображение (фото страницы или эскиза).');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setMediaError('Файл больше 15 МБ. Выберите фото поменьше.');
      return;
    }

    setMediaError(null);
    setIsCompressingImage(true);
    try {
      const compressed = await processImageForUpload(file);
      setCompressionStats({
        originalSize: file.size,
        compressedSize: compressed.size,
        ratio: Math.max(0, Math.round((1 - compressed.size / file.size) * 100)),
      });
      setIsCompressingImage(false);
      setIsUploadingMedia(true);
      await uploadMediaWithPresignedUrl({
        weekId,
        fileBlob: compressed,
        fileName: `sketch-${Date.now()}.webp`,
        note: mediaNoteInput.trim() || 'Фото страницы конспекта / эскиза',
      });
      setMediaNoteInput('');
      onSlotUpdated();
    } catch (err) {
      setMediaError((err as Error)?.message || 'Не удалось загрузить фотоконспект. Попробуйте снова.');
    } finally {
      setIsCompressingImage(false);
      setIsUploadingMedia(false);
    }
  };

  // Голос: Opus через MediaRecorder, лимит 120 секунд
  const handleStartAudio = async () => {
    setMediaError(null);
    setRecordedAudio(null);
    setSecondsRemaining(120);
    try {
      await audioPipeline.start(
        (remaining) => setSecondsRemaining(remaining),
        (result) => {
          // Автостоп по лимиту времени
          setIsRecordingAudio(false);
          setRecordedAudio({ blob: result.blob, url: result.url, duration: result.durationSeconds });
        }
      );
      setIsRecordingAudio(true);
    } catch (err) {
      setIsRecordingAudio(false);
      const name = (err as Error)?.name;
      setMediaError(
        name === 'NotAllowedError'
          ? 'Нет доступа к микрофону. Разрешите его в настройках браузера.'
          : name === 'NotFoundError'
            ? 'Микрофон не найден на этом устройстве.'
            : 'Запись голоса недоступна в этом браузере.'
      );
    }
  };

  const handleStopAudio = async () => {
    try {
      const result = await audioPipeline.stop();
      setRecordedAudio({ blob: result.blob, url: result.url, duration: result.durationSeconds });
    } catch {
      setMediaError('Запись прервалась. Попробуйте ещё раз.');
    } finally {
      setIsRecordingAudio(false);
    }
  };

  const handleToggleAudio = () => {
    const el = audioPlayerRef.current;
    if (!el) return;
    if (isPlayingAudio) {
      el.pause();
      setIsPlayingAudio(false);
    } else {
      el.play().then(() => setIsPlayingAudio(true)).catch(() => setIsPlayingAudio(false));
    }
  };

  const handleUploadAudio = async () => {
    if (!recordedAudio || isUploadingMedia) return;
    setIsUploadingMedia(true);
    setMediaError(null);
    try {
      const ext = recordedAudio.blob.type.includes('ogg') ? 'ogg' : recordedAudio.blob.type.includes('mp4') ? 'm4a' : 'webm';
      await uploadMediaWithPresignedUrl({
        weekId,
        fileBlob: recordedAudio.blob,
        fileName: `voicenote-${Date.now()}.${ext}`,
        note: mediaNoteInput.trim() || `Голосовая мысль (${recordedAudio.duration} сек)`,
      });
      setRecordedAudio(null);
      setMediaNoteInput('');
      onSlotUpdated();
    } catch (err) {
      setMediaError((err as Error)?.message || 'Не удалось сохранить голосовую заметку.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Все решения дня — одной транзакцией; отправляются только изменённые слоты
  const handleBatchSync = async () => {
    if (isBatchSyncing) return;
    setIsBatchSyncing(true);
    setSyncSuccessMessage(null);
    setSyncErrorMessage(null);

    const updatedSlots = changed.map((s) => ({
      id: s.id,
      status: decisions[s.id].status,
      migrationTarget: decisions[s.id].migrationTarget,
    }));

    const res = await apiFetch<{ data: { updatedSlotsCount: number; migratedCopiesCount: number } }>(
      `/api/v1/days/${dayId}/batch-debrief`,
      { method: 'POST', body: { updatedSlots, newCustomEvents: [] } }
    );
    setIsBatchSyncing(false);

    if (res.ok) {
      const moved = res.data?.data.migratedCopiesCount ?? 0;
      setSyncSuccessMessage(
        updatedSlots.length === 0
          ? 'День закрыт — изменений не было.'
          : `День закрыт: ${updatedSlots.length} ${plural(updatedSlots.length, ['решение сохранено', 'решения сохранено', 'решений сохранено'])}${
              moved ? `, ${moved} ${plural(moved, ['задача перенесена', 'задачи перенесены', 'задач перенесено'])} в план` : ''
            }.`
      );
      onDebriefCompleted();
    } else {
      setSyncErrorMessage(`${res.error} Ваши отметки остались на экране — можно повторить.`);
    }
  };

  const busyMedia = isCompressingImage || isUploadingMedia;

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
          { value: `${counts.DONE}/${totalSlots}`, label: 'выполнено сегодня' },
          { value: counts.MIGRATED, unit: 'шт.', label: 'перенесено' },
          { value: counts.DROPPED, unit: 'шт.', label: 'отменено' },
        ]}
      />

      {syncSuccessMessage && (
        <div className="mz-gap-b">
          <Notice icon={<Check size={18} />}>{syncSuccessMessage}</Notice>
        </div>
      )}
      {syncErrorMessage && (
        <div className="mz-gap-b">
          <InlineAlert tone="error" onRetry={handleBatchSync} onDismiss={() => setSyncErrorMessage(null)}>
            {syncErrorMessage}
          </InlineAlert>
        </div>
      )}

      <div className="mz-h2">
        <div>
          <h2>
            {dayTitle}
            <small>{dateStr}</small>
          </h2>
          <p>Выбери статус в каждой строке — решения сохранятся одним пакетом.</p>
        </div>
        <div className="mz-h2__aside" aria-label="Распределение статусов дня">
          <div className="mz-segbar">
            <i className="done" style={{ width: `${pct(counts.DONE)}%` }} />
            <i className="migrated" style={{ width: `${pct(counts.MIGRATED)}%` }} />
            <i className="dropped" style={{ width: `${pct(counts.DROPPED)}%` }} />
          </div>
          <div className="mz-cell-sub">
            {counts.DONE} готово · {counts.MIGRATED} перенос · {counts.DROPPED} отмена
          </div>
        </div>
      </div>

      {slots.length === 0 && (
        <EmptyState
          icon={<CalendarX2 size={36} />}
          title="На этот день нет задач"
          description="Уроки и события, активированные утром, появятся здесь для вечерней сверки."
          actionText={onNavigateToMorning ? 'Открыть утренний фокус' : undefined}
          onAction={onNavigateToMorning}
        />
      )}

      <div className="mz-slots">
        {slots.map((slot) => {
          const decision = decisions[slot.id] ?? { status: slot.status as Status };
          const st = decision.status;
          const isMigratingThis = migratingSlotId === slot.id;
          const isChanged = st !== original.get(slot.id);
          const cls = [
            'mz-slot',
            st === 'DONE' ? 'mz-slot--done' : st === 'MIGRATED' ? 'mz-slot--migrated' : st === 'DROPPED' ? 'mz-slot--dropped' : '',
            slot.isGhost && st === 'PENDING' ? 'mz-slot--ghost' : '',
          ].join(' ');

          return (
            <div key={slot.id} className={cls}>
              <div className="mz-slot__time" aria-hidden="true">
                <b>{slot.startTime || '—'}</b>
                <span>{slot.endTime || ''}</span>
              </div>

              <div className="mz-slot__main">
                <h3 className="mz-slot__title">
                  {slot.title}
                  {slot.type === 'CUSTOM_EVENT' && <span className="mz-chip mz-chip--lav">Событие</span>}
                  {slot.isGhost && <span className="mz-chip mz-chip--outline">Без интенции</span>}
                </h3>
                {slot.taskGoal && <p className="mz-slot__goal">{slot.taskGoal}</p>}
                {slot.deliverable && (
                  <p className="mz-slot__dod">
                    <b>DoD</b>
                    {slot.deliverable}
                  </p>
                )}
              </div>

              <span className={`mz-chip ${STATUS_CHIP[st]}`}>
                {STATUS_LABEL[st]}
                {st === 'MIGRATED' && isChanged && decision.migrationTarget
                  ? decision.migrationTarget === 'saturday'
                    ? ' · на субботу'
                    : ' · на завтра'
                  : ''}
              </span>

              <div className="mz-slot__actions">
                <div className="mz-seg" role="group" aria-label={`Статус: ${slot.title}`}>
                  <button
                    type="button"
                    className="mz-seg__btn mz-seg__btn--done"
                    aria-pressed={st === 'DONE'}
                    onClick={() => handleSetStatus(slot.id, 'DONE')}
                  >
                    <CheckCircle2 size={16} /> Готово
                  </button>
                  <button
                    type="button"
                    className="mz-seg__btn mz-seg__btn--migrated"
                    aria-pressed={st === 'MIGRATED' || isMigratingThis}
                    aria-expanded={isMigratingThis}
                    onClick={() => handleSetStatus(slot.id, 'MIGRATED')}
                  >
                    <ArrowRightLeft size={16} /> Перенести
                  </button>
                  <button
                    type="button"
                    className="mz-seg__btn mz-seg__btn--dropped"
                    aria-pressed={st === 'DROPPED'}
                    onClick={() => handleSetStatus(slot.id, 'DROPPED')}
                  >
                    <XCircle size={16} /> Отмена
                  </button>
                </div>
                {isChanged && (
                  <button type="button" className="mz-link mz-link--sm" onClick={() => handleResetSlot(slot.id)}>
                    <RotateCcw size={12} /> вернуть
                  </button>
                )}
              </div>

              {isMigratingThis && (
                <div className="mz-inline mz-slot__full">
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
      <section className="mz-panel mz-panel--lav mz-gap-t">
        <div className="mz-panel__title">
          <span className="mz-chip mz-chip--lav">Медиа</span>
          Буфер «Наброски и эскизы»
          <span className="mz-panel__meta">WebP · Opus 32 kbps</span>
        </div>

        <div className="mz-stack">
          {mediaError && <InlineAlert onDismiss={() => setMediaError(null)}>{mediaError}</InlineAlert>}

          <label className="mz-field">
            <span className="mz-label">
              Контекст артефакта <em>необязательно</em>
            </span>
            <input
              type="text"
              value={mediaNoteInput}
              maxLength={500}
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
              className="mz-visually-hidden"
              tabIndex={-1}
              aria-hidden="true"
            />
            <button type="button" className="mz-btn mz-btn--lav" onClick={() => fileInputRef.current?.click()} disabled={busyMedia || isRecordingAudio}>
              <Camera size={16} /> {isCompressingImage ? 'Сжимаю…' : isUploadingMedia ? 'Загружаю…' : 'Фото конспекта'}
            </button>

            {!isRecordingAudio ? (
              <button type="button" className="mz-btn mz-btn--light" onClick={handleStartAudio} disabled={busyMedia}>
                <Mic size={16} /> Голосовая мысль
              </button>
            ) : (
              <button type="button" className="mz-btn mz-btn--primary mz-recording" onClick={handleStopAudio}>
                <Square size={14} fill="currentColor" /> Стоп · <span className="mz-num">{secondsRemaining} с</span>
              </button>
            )}
          </div>

          {compressionStats && (
            <Notice tone="lav">
              Сжато: <strong>{(compressionStats.originalSize / 1024 / 1024).toFixed(1)} MB</strong> →{' '}
              <strong>{kb(compressionStats.compressedSize)}</strong> WebP (−{compressionStats.ratio}%)
            </Notice>
          )}

          {recordedAudio && (
            <div className="mz-player">
              <audio ref={audioPlayerRef} src={recordedAudio.url} onEnded={() => setIsPlayingAudio(false)} hidden />
              <div className="mz-row mz-row--nowrap">
                <button
                  type="button"
                  className="mz-btn mz-btn--sm mz-btn--peach"
                  aria-label={isPlayingAudio ? 'Пауза' : 'Прослушать запись'}
                  onClick={handleToggleAudio}
                >
                  {isPlayingAudio ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <div>
                  <b>Аудиозапись · {recordedAudio.duration} сек</b>
                  <small>{kb(recordedAudio.blob.size)} · Opus mono</small>
                </div>
              </div>
              <div className="mz-row mz-row--nowrap">
                <button type="button" className="mz-btn mz-btn--sm mz-btn--teal" onClick={handleUploadAudio} disabled={isUploadingMedia}>
                  <Upload size={16} /> {isUploadingMedia ? 'Загрузка…' : 'Сохранить'}
                </button>
                <button type="button" className="mz-link mz-link--inverse" onClick={() => setRecordedAudio(null)} disabled={isUploadingMedia}>
                  Удалить
                </button>
              </div>
            </div>
          )}

          {mediaAssets.length > 0 && (
            <div>
              <div className="mz-label">Артефакты недели · {mediaAssets.length}</div>
              <div className="mz-media">
                {mediaAssets.map((asset) => {
                  const isImage = asset.fileType.startsWith('image');
                  const hasFailed = failedImageIds.has(asset.id);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      className="mz-media__item mz-media__item--clickable"
                      onClick={() => setSelectedMediaAsset(asset)}
                      aria-label={`Открыть артефакт: ${asset.note || asset.fileName}`}
                    >
                      <div className="mz-media__thumb">
                        {isImage && !hasFailed ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaUrl(asset.fileUrl)}
                            alt=""
                            loading="lazy"
                            onError={() => setFailedImageIds((prev) => new Set(prev).add(asset.id))}
                          />
                        ) : (
                          <div className="mz-media__thumb-fallback">
                            {isImage ? <Camera size={22} /> : <Mic size={24} />}
                            <span>{isImage ? 'Фото' : 'Аудио'}</span>
                          </div>
                        )}
                        <div className="mz-media__item-overlay" aria-hidden="true">
                          <Maximize2 size={14} />
                        </div>
                      </div>
                      <div className="mz-media__meta">
                        <b>{asset.note || asset.fileName}</b>
                        <span>{kb(asset.fileSize)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {selectedMediaAsset && (
        <MediaPreviewModal
          asset={selectedMediaAsset}
          onClose={() => setSelectedMediaAsset(null)}
          onDeleted={() => {
            setSelectedMediaAsset(null);
            onSlotUpdated();
          }}
        />
      )}

      {/* Главное действие экрана */}
      <div className="mz-actions-col mz-gap-t">
        <button
          type="button"
          className="mz-btn mz-btn--primary mz-btn--lg mz-btn--block"
          onClick={handleBatchSync}
          disabled={isBatchSyncing || slots.length === 0}
        >
          {isBatchSyncing ? 'Сохраняю день…' : changed.length ? `Завершить день · ${changed.length} изм.` : 'Завершить день'}
          {!isBatchSyncing && <Check size={18} />}
        </button>

        {onNavigateToMorning && (
          <button type="button" className="mz-btn mz-btn--outline mz-btn--block mz-btn--quiet" onClick={onNavigateToMorning}>
            ← Вернуться к утреннему фокусу
          </button>
        )}
      </div>
    </div>
  );
};
