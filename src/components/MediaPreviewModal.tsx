'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  ExternalLink,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

export interface MediaAsset {
  id: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize: number;
  note: string | null;
  createdAt: string;
}

interface MediaPreviewModalProps {
  asset: MediaAsset;
  onClose: () => void;
  onDeleted?: (deletedId: string) => void;
  canDelete?: boolean;
}

/**
 * Normalizes media URL by stripping obsolete host prefixes and attaching auth token
 */
export function getSafeMediaUrl(rawUrl: string, download = false): string {
  if (!rawUrl) return '';
  // Strip hardcoded localhost:3000 or absolute prefixes for local relative serving
  let clean = rawUrl.replace(/^https?:\/\/[^\/]+/, '');
  if (!clean.startsWith('/')) clean = `/${clean}`;

  let token: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      token = localStorage.getItem('mezon_auth_token');
    } catch {}
  }

  const queryParams = new URLSearchParams();
  if (token) queryParams.set('token', token);
  if (download) queryParams.set('download', 'true');

  const qs = queryParams.toString();
  return qs ? `${clean}?${qs}` : clean;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  asset,
  onClose,
  onDeleted,
  canDelete = true,
}) => {
  const isImage = asset.fileType.includes('image');
  const isAudio = asset.fileType.includes('audio');

  // Zoom state for images
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageError, setImageError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const safeUrl = getSafeMediaUrl(asset.fileUrl);
  const downloadUrl = getSafeMediaUrl(asset.fileUrl, true);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Audio progress tracker
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [isAudio]);

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleToggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          token = localStorage.getItem('mezon_auth_token');
        } catch {}
      }

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/media/assets/${asset.id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        if (onDeleted) onDeleted(asset.id);
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error || 'Не удалось удалить артефакт');
      }
    } catch {
      setDeleteError('Сетевая ошибка при удалении артефакта');
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDate = new Date(asset.createdAt).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="mz-lightbox" role="dialog" aria-modal="true" aria-label="Просмотр артефакта">
      <div className="mz-lightbox__backdrop" onClick={onClose} aria-hidden="true" />

      <div className="mz-lightbox__dialog mz-fade-in">
        {/* Accent strip */}
        <div className="mz-lightbox__accent" aria-hidden="true" />

        {/* Modal Header */}
        <div className="mz-lightbox__head">
          <div className="mz-lightbox__head-left">
            <span className={`mz-chip ${isImage ? 'mz-chip--teal' : 'mz-chip--lav'}`}>
              {isImage ? 'Фото конспекта' : 'Аудио мысль'}
            </span>
            <span className="mz-lightbox__name">{asset.note || asset.fileName}</span>
          </div>

          <div className="mz-lightbox__head-actions">
            {isImage && !imageError && (
              <div className="mz-lightbox__zoom-group" role="group" aria-label="Масштаб изображения">
                <button
                  type="button"
                  className="mz-lightbox__tool-btn"
                  onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                  title="Увеличить"
                  aria-label="Увеличить"
                >
                  <ZoomIn size={16} />
                </button>
                <span className="mz-lightbox__zoom-val">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  className="mz-lightbox__tool-btn"
                  onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                  title="Уменьшить"
                  aria-label="Уменьшить"
                >
                  <ZoomOut size={16} />
                </button>
                {zoomLevel !== 1 && (
                  <button
                    type="button"
                    className="mz-lightbox__tool-btn"
                    onClick={() => setZoomLevel(1)}
                    title="Сбросить масштаб"
                    aria-label="Сбросить масштаб"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              className="mz-lightbox__close-btn"
              onClick={onClose}
              title="Закрыть (Esc)"
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Viewer Body */}
        <div className="mz-lightbox__body">
          {isImage ? (
            <div className="mz-lightbox__image-wrap">
              {imageError ? (
                <div className="mz-lightbox__image-fallback">
                  <AlertTriangle size={36} color="var(--error)" />
                  <h4>Изображение недоступно на сервере</h4>
                  <p>
                    Файл не найден по пути хранилища. Возможно, произошёл сбой сети при первоначальной загрузке.
                  </p>
                </div>
              ) : (
                <div
                  className="mz-lightbox__image-canvas"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={safeUrl}
                    alt={asset.note || asset.fileName}
                    className="mz-lightbox__img"
                    onError={() => setImageError(true)}
                  />
                </div>
              )}
            </div>
          ) : isAudio ? (
            <div className="mz-lightbox__audio-wrap">
              <audio ref={audioRef} src={safeUrl} preload="metadata" />
              <div className="mz-lightbox__audio-box">
                <div className="mz-lightbox__audio-header">
                  <div className="mz-chip mz-chip--lav">Opus 32 kbps mono</div>
                  <b>{formatTime(currentTime)} / {formatTime(duration)}</b>
                </div>

                <div className="mz-lightbox__audio-timeline">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    className="mz-lightbox__audio-seek"
                    aria-label="Таймлайн аудио"
                  />
                </div>

                <div className="mz-lightbox__audio-controls">
                  <button
                    type="button"
                    className="mz-btn mz-btn--primary mz-btn--sm"
                    onClick={handleTogglePlay}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    <span>{isPlaying ? 'Пауза' : 'Слушать'}</span>
                  </button>

                  <button
                    type="button"
                    className="mz-link"
                    onClick={handleToggleMute}
                    aria-label={isMuted ? 'Включить звук' : 'Без звука'}
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mz-lightbox__generic-wrap">
              <FileText size={48} color="var(--lav-d)" />
              <p>{asset.fileName}</p>
            </div>
          )}
        </div>

        {/* Delete Confirmation Alert */}
        {confirmDelete && (
          <div className="mz-lightbox__delete-alert mz-fade-in">
            <AlertTriangle size={18} color="var(--error)" />
            <span>Удалить этот артефакт из дневника недели? Действие необратимо.</span>
            <div className="mz-row" style={{ gap: 8 }}>
              <button
                type="button"
                className="mz-btn mz-btn--sm mz-btn--error"
                disabled={isDeleting}
                onClick={handleDelete}
              >
                {isDeleting ? <Loader2 size={14} className="mz-spinner" /> : <Trash2 size={14} />}
                <span>{isDeleting ? 'Удаляю…' : 'Да, удалить'}</span>
              </button>
              <button
                type="button"
                className="mz-link"
                disabled={isDeleting}
                onClick={() => setConfirmDelete(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {deleteError && (
          <div className="mz-alert mz-alert--error" style={{ margin: '8px 16px' }}>
            <span>{deleteError}</span>
          </div>
        )}

        {/* Modal Footer Toolbar */}
        <div className="mz-lightbox__foot">
          <div className="mz-lightbox__meta">
            <span className="mz-lightbox__date">{formattedDate}</span>
            <span className="mz-lightbox__dot">·</span>
            <span className="mz-num">{(asset.fileSize / 1024).toFixed(0)} KB</span>
            <span className="mz-lightbox__dot">·</span>
            <span>{asset.fileType}</span>
          </div>

          <div className="mz-lightbox__actions">
            <a
              href={safeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mz-btn mz-btn--sm mz-btn--light"
              title="Открыть в отдельной вкладке"
            >
              <ExternalLink size={14} />
              <span>В новой вкладке</span>
            </a>

            <a
              href={downloadUrl}
              download={asset.fileName}
              className="mz-btn mz-btn--sm mz-btn--teal"
              title="Скачать файл на устройство"
            >
              <Download size={14} />
              <span>Скачать</span>
            </a>

            {canDelete && !confirmDelete && (
              <button
                type="button"
                className="mz-btn mz-btn--sm mz-btn--outline"
                onClick={() => setConfirmDelete(true)}
                title="Удалить артефакт"
                style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
              >
                <Trash2 size={14} />
                <span>Удалить</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
