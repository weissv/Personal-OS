# ADR-003: Client-Side Media Compression Pipeline

## Status
Accepted

## Context
Students take photos of their analog notebooks, textbook exercises, and whiteboard diagrams, and record voice notes explaining their blockers. Transmitting raw mobile photos (often 5–12 MB each) and uncompressed audio exhausts cellular data plans and creates storage bottlenecks.

## Decision
We enforce mandatory client-side preprocessing before any byte is uploaded to the server or Cloudflare R2 / S3:
1. **Images:** Processed via HTML5 Canvas API downscaling to a maximum bounding box of $1920 \times 1920$ px and converted to WebP format at $0.82$ compression quality. This reduces file size by 90%–93% with zero perceived loss of notebook legibility.
2. **Audio:** Captured via `MediaRecorder` API encoded in Opus mono at 32 kbps (`audio/webm;codecs=opus`) with a strict client-enforced cap of 120 seconds.
3. **Storage Abstraction:** Uploads use Pre-signed URLs for direct PUT upload to Cloudflare R2 / S3 when configured, with a transparent local filesystem fallback for development.

## Consequences
- 90%+ reduction in network bandwidth and server storage consumption.
- Eliminates server-side image processing bottlenecks.
