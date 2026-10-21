/**
 * MEZON SPRINT OS - Client-side Media Compression Pipeline
 * Implements Canvas API downscaling to WebP and MediaRecorder Opus audio encoding.
 */

export async function processImageForUpload(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1920;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Image compression failed'));
        },
        'image/webp',
        0.82
      );
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface AudioRecordingResult {
  blob: Blob;
  durationSeconds: number;
  url: string;
}

export class AudioCapturePipeline {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;
  private timerInterval: NodeJS.Timeout | null = null;
  private onTickCallback?: (secondsLeft: number, elapsedSeconds: number) => void;
  private readonly MAX_RECORDING_SECONDS = 120;

  async start(onTick?: (secondsLeft: number, elapsedSeconds: number) => void): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Audio recording not supported in this browser');
    }

    this.onTickCallback = onTick;
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Choose supported MIME type with fallback
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else {
        mimeType = '';
      }
    }

    const options: MediaRecorderOptions = {
      audioBitsPerSecond: 32000, // 32 kbps mono as per spec
    };
    if (mimeType) {
      options.mimeType = mimeType;
    }

    this.mediaRecorder = new MediaRecorder(this.stream, options);
    this.audioChunks = [];
    this.startTime = Date.now();

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(250); // collect in 250ms chunks

    // Start 120s countdown
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const remaining = Math.max(0, this.MAX_RECORDING_SECONDS - elapsed);
      if (this.onTickCallback) {
        this.onTickCallback(remaining, elapsed);
      }
      if (remaining <= 0) {
        this.stop();
      }
    }, 1000);
  }

  stop(): Promise<AudioRecordingResult> {
    return new Promise((resolve, reject) => {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }

      if (!this.mediaRecorder) {
        return reject(new Error('Recorder not started'));
      }

      this.mediaRecorder.onstop = () => {
        const mime = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mime });
        const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);
        const url = URL.createObjectURL(audioBlob);

        // Stop all audio tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        resolve({
          blob: audioBlob,
          durationSeconds,
          url,
        });
      };

      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  cancel(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

/**
 * Uploads media asset with pre-signed URL workflow
 */
export async function uploadMediaWithPresignedUrl(params: {
  weekId: string;
  fileBlob: Blob;
  fileName: string;
  note?: string;
}) {
  const fileType = params.fileBlob.type || 'image/webp';
  const fileSize = params.fileBlob.size;

  // 1. Request presigned URL from backend
  const presignRes = await fetch('/api/v1/media/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      weekId: params.weekId,
      fileName: params.fileName,
      fileType,
      fileSize,
      note: params.note,
    }),
  });

  if (!presignRes.ok) {
    throw new Error('Failed to obtain presigned upload URL');
  }

  const presignData = await presignRes.json();
  const { uploadUrl, publicUrl, asset } = presignData;

  // 2. Direct PUT to S3 / R2 / local endpoint
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': fileType,
    },
    body: params.fileBlob,
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed with status: ${uploadRes.status}`);
  }

  return {
    success: true,
    publicUrl,
    asset,
  };
}
