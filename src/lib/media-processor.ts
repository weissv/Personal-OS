/**
 * MEZON SPRINT OS - Client-side Media Pipeline
 *  - фото: даунскейл до 1920 px через Canvas → WebP 0.82 (JPEG, если браузер не кодирует WebP — Safari);
 *  - голос: MediaRecorder Opus 32 kbps mono, жёсткий лимит 120 секунд;
 *  - загрузка: регистрация артефакта → PUT файла; при сбое запись артефакта удаляется.
 */

import { apiFetch, apiUpload } from './api-client';

const MAX_SIDE = 1920;
const QUALITY = 0.82;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  // createImageBitmap учитывает EXIF-ориентацию и не держит в памяти data-URL на десятки МБ
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // HEIC и прочие форматы — пробуем через <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Формат изображения не поддерживается браузером'));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

export async function processImageForUpload(file: File): Promise<Blob> {
  const { source, width, height, release } = await loadImage(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas недоступен');
    ctx.drawImage(source, 0, 0, w, h);

    const webp = await canvasToBlob(canvas, 'image/webp', QUALITY);
    if (webp && webp.type === 'image/webp') return webp;

    // Браузер не умеет WebP (вернул PNG) — JPEG заметно легче PNG для фото
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    const jpeg = await canvasToBlob(canvas, 'image/jpeg', QUALITY);
    if (jpeg) return jpeg;
    throw new Error('Не удалось сжать изображение');
  } finally {
    release();
  }
}

export interface AudioRecordingResult {
  blob: Blob;
  durationSeconds: number;
  url: string;
}

const AUDIO_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

export class AudioCapturePipeline {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private stopping: Promise<AudioRecordingResult> | null = null;
  readonly MAX_RECORDING_SECONDS = 120;

  /**
   * @param onTick     — каждую секунду: (осталось, прошло)
   * @param onAutoStop — запись остановлена по лимиту времени
   */
  async start(
    onTick?: (secondsLeft: number, elapsedSeconds: number) => void,
    onAutoStop?: (result: AudioRecordingResult) => void
  ): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      throw Object.assign(new Error('Audio recording not supported'), { name: 'NotSupportedError' });
    }
    this.cancel();

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
    const mimeType = AUDIO_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const options: MediaRecorderOptions = { audioBitsPerSecond: 32000 };
    if (mimeType) options.mimeType = mimeType;

    this.mediaRecorder = new MediaRecorder(this.stream, options);
    this.audioChunks = [];
    this.startTime = Date.now();
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) this.audioChunks.push(event.data);
    };
    this.mediaRecorder.start(250);

    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const remaining = Math.max(0, this.MAX_RECORDING_SECONDS - elapsed);
      onTick?.(remaining, elapsed);
      if (remaining <= 0) {
        this.stop()
          .then((result) => onAutoStop?.(result))
          .catch(() => undefined);
      }
    }, 1000);
  }

  stop(): Promise<AudioRecordingResult> {
    if (this.stopping) return this.stopping;
    this.clearTimer();
    const recorder = this.mediaRecorder;
    if (!recorder) return Promise.reject(new Error('Recorder not started'));

    this.stopping = new Promise<AudioRecordingResult>((resolve, reject) => {
      recorder.onstop = () => {
        const type = (recorder.mimeType || 'audio/webm').split(';')[0];
        const blob = new Blob(this.audioChunks, { type });
        const durationSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
        this.releaseStream();
        this.mediaRecorder = null;
        this.stopping = null;
        resolve({ blob, durationSeconds, url: URL.createObjectURL(blob) });
      };
      try {
        if (recorder.state !== 'inactive') recorder.stop();
        else recorder.onstop?.call(recorder, new Event('stop'));
      } catch (err) {
        this.stopping = null;
        reject(err);
      }
    });
    return this.stopping;
  }

  /** Прервать запись без результата и освободить микрофон. */
  cancel(): void {
    this.clearTimer();
    if (this.mediaRecorder) {
      this.mediaRecorder.onstop = null;
      try {
        if (this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop();
      } catch {
        // уже остановлен
      }
    }
    this.releaseStream();
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stopping = null;
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private releaseStream() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}

interface UploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  assetId: string;
  asset: unknown;
}

/** Двухшаговая загрузка артефакта: регистрация → PUT. Бросает Error с понятным текстом. */
export async function uploadMediaWithPresignedUrl(params: { weekId: string; fileBlob: Blob; fileName: string; note?: string }) {
  const fileType = (params.fileBlob.type || 'image/webp').split(';')[0];

  const presign = await apiFetch<UploadUrlResponse>('/api/v1/media/upload-url', {
    method: 'POST',
    body: {
      weekId: params.weekId,
      fileName: params.fileName,
      fileType,
      fileSize: params.fileBlob.size,
      note: params.note,
    },
  });
  if (!presign.ok || !presign.data) throw new Error(presign.error || 'Не удалось подготовить загрузку');

  const { uploadUrl, publicUrl, asset, assetId } = presign.data;
  const upload = await apiUpload(uploadUrl, params.fileBlob, fileType);
  if (!upload.ok) {
    // Не оставляем «пустую» карточку артефакта без файла
    await apiFetch(`/api/v1/media/assets/${assetId}`, { method: 'DELETE' }).catch(() => undefined);
    throw new Error(upload.error || 'Не удалось загрузить файл');
  }

  return { success: true, publicUrl, asset };
}
