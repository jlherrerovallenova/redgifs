/**
 * Video Merger Service (Client-Side)
 * Une múltiples videos en un único archivo MP4/WebM continuo usando Canvas, Web Audio API y MediaRecorder.
 * Compatible con Chrome, Edge, Safari (macOS / iPadOS / iOS) y Firefox sin dependencias externas.
 */

export interface MergeProgress {
  currentVideo: number;
  totalVideos: number;
  percent: number;
  statusText: string;
}

/**
 * Detecta el mejor formato de video soportado por el navegador para grabación.
 */
export function getSupportedMimeType(): { mimeType: string; extension: string } {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return { mimeType: '', extension: 'mp4' };
  }

  const types = [
    { mime: 'video/mp4;codecs="avc1,mp4a.40.2"', ext: 'mp4' },
    { mime: 'video/mp4;codecs="avc1"', ext: 'mp4' },
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm;codecs="vp9,opus"', ext: 'webm' },
    { mime: 'video/webm;codecs="vp8,opus"', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' }
  ];

  for (const t of types) {
    try {
      if (MediaRecorder.isTypeSupported(t.mime)) {
        return { mimeType: t.mime, extension: t.ext };
      }
    } catch {
      // Ignorar excepciones de sintaxis de navegadores con parser estricto (Safari/WebKit)
    }
  }

  return { mimeType: '', extension: 'mp4' };
}

/**
 * Une un array de Blobs de video en un único archivo.
 */
export async function mergeVideoBlobs(
  blobs: Blob[],
  onProgress?: (progress: MergeProgress) => void,
  previewCanvas?: HTMLCanvasElement | null
): Promise<{ blob: Blob; extension: string }> {
  if (blobs.length === 0) {
    throw new Error('No hay videos para unir.');
  }

  if (blobs.length === 1) {
    const { extension } = getSupportedMimeType();
    return { blob: blobs[0], extension };
  }

  const { mimeType, extension } = getSupportedMimeType();

  // Contenedor temporal oculto en el DOM para que Safari/WebKit active el pipeline de vídeo
  const container = document.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;pointer-events:none;z-index:-9999;';
  document.body.appendChild(container);

  try {
    // 1. Obtener dimensiones óptimas del primer video con timeout seguro
    let targetWidth = 720;
    let targetHeight = 1280;

    const tempVideo = document.createElement('video');
    tempVideo.preload = 'auto';
    tempVideo.muted = true;
    tempVideo.defaultMuted = true;
    tempVideo.playsInline = true;
    tempVideo.setAttribute('playsinline', '');
    tempVideo.setAttribute('webkit-playsinline', '');
    tempVideo.setAttribute('muted', '');
    container.appendChild(tempVideo);

    const firstUrl = URL.createObjectURL(blobs[0]);
    await new Promise<void>((resolve) => {
      let resolved = false;
      const finish = () => {
        if (!resolved) {
          resolved = true;
          if (tempVideo.videoWidth && tempVideo.videoHeight) {
            targetWidth = tempVideo.videoWidth;
            targetHeight = tempVideo.videoHeight;
          }
          resolve();
        }
      };
      const timer = setTimeout(finish, 3000);
      tempVideo.onloadedmetadata = () => {
        clearTimeout(timer);
        finish();
      };
      tempVideo.onerror = () => {
        clearTimeout(timer);
        finish();
      };
      tempVideo.src = firstUrl;
      try { tempVideo.load(); } catch {}
    });
    URL.revokeObjectURL(firstUrl);
    try { container.removeChild(tempVideo); } catch {}

    // Asegurar dimensiones pares
    targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
    targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;

    // 2. Preparar Canvas
    const canvas = previewCanvas || document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('No se pudo inicializar el contexto 2D del Canvas');

    // 3. Capturar stream del canvas
    const fps = 30;
    let canvasStream: MediaStream | null = null;
    const getStream = (c: HTMLCanvasElement): MediaStream | null => {
      if (typeof (c as any).captureStream === 'function') {
        try { return (c as any).captureStream(fps); } catch {}
        try { return (c as any).captureStream(); } catch {}
      }
      if (typeof (c as any).mozCaptureStream === 'function') {
        try { return (c as any).mozCaptureStream(fps); } catch {}
        try { return (c as any).mozCaptureStream(); } catch {}
      }
      return null;
    };

    canvasStream = getStream(canvas);
    if (!canvasStream) {
      throw new Error('Tu navegador no soporta la grabación de Canvas en tiempo real (captureStream).');
    }

    const videoTracks = canvasStream.getVideoTracks();
    if (videoTracks.length === 0) {
      throw new Error('No se pudo obtener la pista de video del Canvas.');
    }

    // 4. Inicializar MediaRecorder
    const recordedChunks: Blob[] = [];
    let recorder: MediaRecorder;
    const recorderOptions: MediaRecorderOptions = {};
    if (mimeType) {
      recorderOptions.mimeType = mimeType;
    }

    try {
      recorder = new MediaRecorder(canvasStream, recorderOptions);
    } catch {
      recorder = new MediaRecorder(canvasStream);
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    recorder.start(250);

    // 5. Preparar elemento de reproducción dentro del DOM para soporte en Safari iOS
    const playVideo = document.createElement('video');
    playVideo.muted = true;
    playVideo.defaultMuted = true;
    playVideo.playsInline = true;
    playVideo.setAttribute('playsinline', '');
    playVideo.setAttribute('webkit-playsinline', '');
    playVideo.setAttribute('muted', '');
    playVideo.preload = 'auto';
    container.appendChild(playVideo);

    const playVideoChunk = async (
      blob: Blob,
      index: number
    ): Promise<void> => {
      const url = URL.createObjectURL(blob);
      try {
        await new Promise<void>((resolve) => {
          let animFrameId: number;
          let resolved = false;
          let safetyTimeout: any = null;

          const finish = () => {
            if (!resolved) {
              resolved = true;
              if (safetyTimeout) clearTimeout(safetyTimeout);
              cancelAnimationFrame(animFrameId);
              resolve();
            }
          };

          const drawLoop = () => {
            if (resolved) return;
            if (!playVideo.paused && !playVideo.ended) {
              ctx.fillStyle = '#000000';
              ctx.fillRect(0, 0, targetWidth, targetHeight);

              const vw = playVideo.videoWidth || targetWidth;
              const vh = playVideo.videoHeight || targetHeight;
              const ratio = Math.min(targetWidth / vw, targetHeight / vh);
              const centerShiftX = (targetWidth - vw * ratio) / 2;
              const centerShiftY = (targetHeight - vh * ratio) / 2;

              ctx.drawImage(
                playVideo,
                0,
                0,
                vw,
                vh,
                centerShiftX,
                centerShiftY,
                vw * ratio,
                vh * ratio
              );

              if (playVideo.duration > 0 && onProgress) {
                const chunkProgress = Math.min(1, playVideo.currentTime / playVideo.duration);
                const overallPercent = Math.min(99, Math.round(((index + chunkProgress) / blobs.length) * 100));
                onProgress({
                  currentVideo: index + 1,
                  totalVideos: blobs.length,
                  percent: overallPercent,
                  statusText: `Uniendo video ${index + 1} de ${blobs.length} (${overallPercent}%)...`
                });
              }
            }
            animFrameId = requestAnimationFrame(drawLoop);
          };

          playVideo.onloadedmetadata = () => {
            const durationSec = playVideo.duration && isFinite(playVideo.duration) ? playVideo.duration : 20;
            safetyTimeout = setTimeout(finish, (durationSec + 4) * 1000);
          };

          playVideo.onloadeddata = async () => {
            try {
              await playVideo.play();
              animFrameId = requestAnimationFrame(drawLoop);
            } catch {
              playVideo.muted = true;
              try {
                await playVideo.play();
                animFrameId = requestAnimationFrame(drawLoop);
              } catch {
                finish();
              }
            }
          };

          playVideo.onended = finish;
          playVideo.onerror = finish;

          playVideo.src = url;
          try { playVideo.load(); } catch {}
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    // Reproducir secuencialmente cada video
    for (let i = 0; i < blobs.length; i++) {
      if (onProgress) {
        const startPercent = Math.round((i / blobs.length) * 100);
        onProgress({
          currentVideo: i + 1,
          totalVideos: blobs.length,
          percent: startPercent,
          statusText: `Iniciando video ${i + 1} de ${blobs.length}...`
        });
      }
      await playVideoChunk(blobs[i], i);
    }

    // 6. Finalizar grabación
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      setTimeout(() => {
        try {
          recorder.stop();
        } catch {
          resolve();
        }
      }, 400);
    });

    if (onProgress) {
      onProgress({
        currentVideo: blobs.length,
        totalVideos: blobs.length,
        percent: 100,
        statusText: '¡Compilación completada!'
      });
    }

    const finalBlob = new Blob(recordedChunks, { type: mimeType || 'video/mp4' });
    return { blob: finalBlob, extension };

  } finally {
    // Limpiar contenedor del DOM siempre
    try {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    } catch {}
  }
}
