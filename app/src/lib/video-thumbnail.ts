/**
 * Browser-side video thumbnail frame extraction
 * Uses native browser APIs (<video> + <canvas>), zero server-side dependencies
 */

export type VideoFrameResult = {
  blob: Blob;
  width: number;
  height: number;
  duration: number;
};

/**
 * Extract a frame at the specified time point from a video file as a cover image
 * @param file    Video File object
 * @param seekSeconds Time point to capture (seconds), default 1s
 * @param timeoutMs   Timeout threshold, default 10s
 */
export async function extractVideoFrame(
  file: File,
  seekSeconds: number = 1,
  timeoutMs: number = 10000
): Promise<VideoFrameResult> {
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');

  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Video thumbnail extraction timed out'));
    }, timeoutMs);

    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };

    const onLoadedMetadata = () => {
      video.currentTime = Math.min(seekSeconds, video.duration || 1);
    };

    const onSeeked = () => {
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          return reject(new Error('Canvas context unavailable'));
        }
        ctx.drawImage(video, 0, 0);

        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) return reject(new Error('Canvas toBlob failed'));
            resolve({
              blob,
              width: video.videoWidth,
              height: video.videoHeight,
              duration: video.duration || 0,
            });
          },
          'image/jpeg',
          0.85
        );
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error('Frame extraction failed'));
      }
    };

    const onError = () => {
      cleanup();
      reject(new Error('Video failed to load'));
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    video.src = objectUrl;
  });
}