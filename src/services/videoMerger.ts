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

  // 1. Obtener dimensiones óptimas de los videos
  let targetWidth = 720;
  let targetHeight = 1280; // Default vertical / standard

  const tempVideo = document.createElement('video');
  tempVideo.preload = 'metadata';
  tempVideo.muted = true;
  tempVideo.playsInline = true;

  const firstUrl = URL.createObjectURL(blobs[0]);
  await new Promise<void>((resolve) => {
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.videoWidth && tempVideo.videoHeight) {
        targetWidth = tempVideo.videoWidth;
        targetHeight = tempVideo.videoHeight;
      }
      resolve();
    };
    tempVideo.onerror = () => resolve();
    tempVideo.src = firstUrl;
  });
  URL.revokeObjectURL(firstUrl);

  // Asegurar dimensiones pares
  targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
  targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;

  // 2. Preparar Canvas y AudioContext
  const canvas = previewCanvas || document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('No se pudo inicializar el contexto 2D del Canvas');

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  let audioCtx: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;

  try {
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      audioDest = audioCtx.createMediaStreamDestination();
    }
  } catch (e) {
    console.warn('AudioContext no disponible, se grabará sin audio:', e);
  }

  // 3. Capturar stream del canvas y combinar con audio
  const fps = 30;
  let canvasStream: MediaStream;
  try {
    canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream(fps) : (canvas as any).mozCaptureStream(fps);
  } catch {
    canvasStream = (canvas as any).captureStream ? (canvas as any).captureStream() : (canvas as any).mozCaptureStream();
  }

  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

  if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
    tracks.push(...audioDest.stream.getAudioTracks());
  }

  const combinedStream = new MediaStream(tracks);

  // 4. Inicializar MediaRecorder de forma segura para Safari / Chrome / Firefox
  const recordedChunks: Blob[] = [];
  let recorder: MediaRecorder;
  const recorderOptions: MediaRecorderOptions = {};
  if (mimeType) {
    recorderOptions.mimeType = mimeType;
  }

  try {
    recorder = new MediaRecorder(combinedStream, recorderOptions);
  } catch {
    // Si falla con opciones en Safari, inicializar con el contenedor predeterminado del sistema
    recorder = new MediaRecorder(combinedStream);
  }

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  recorder.start(250); // Recolectar trozos cada 250ms

  // 5. Reproducir y dibujar cada video secuencialmente
  const playVideo = document.createElement('video');
  playVideo.playsInline = true;
  playVideo.muted = false; // El audio va al AudioContext // El audio va al AudioContext

  let audioSourceNode: MediaElementAudioSourceNode | null = null;
  if (audioCtx && audioDest) {
    try {
      audioSourceNode = audioCtx.createMediaElementSource(playVideo);
      audioSourceNode.connect(audioDest);
      // No conectar a audioCtx.destination para no aturdir al usuario durante la mezcla
    } catch (e) {
      console.warn('Error al conectar audio de video:', e);
    }
  }

/**
 * Reproduce y dibuja un blob de video en el canvas para la grabación.
 */
async function playVideoChunk(
  blob: Blob,
  playVideo: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  targetWidth: number,
  targetHeight: number
): Promise<void> {
  const url = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve) => {
      let animFrameId: number;

      const drawLoop = () => {
        if (!playVideo.paused && !playVideo.ended) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          const vw = playVideo.videoWidth || targetWidth;
          const vh = playVideo.videoHeight || targetHeight;
          const hRatio = targetWidth / vw;
          const vRatio = targetHeight / vh;
          const ratio = Math.min(hRatio, vRatio);
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

          animFrameId = requestAnimationFrame(drawLoop);
        }
      };

      playVideo.onloadeddata = async () => {
        try {
          await playVideo.play();
          drawLoop();
        } catch {
          playVideo.muted = true;
          try {
            await playVideo.play();
            drawLoop();
          } catch {
            resolve();
          }
        }
      };

      playVideo.onended = () => {
        cancelAnimationFrame(animFrameId);
        resolve();
      };

      playVideo.onerror = () => {
        cancelAnimationFrame(animFrameId);
        resolve();
      };

      playVideo.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

  const playSequentially = async (index: number): Promise<void> => {
    if (index >= blobs.length) return;
    await playVideoChunk(blobs[index], playVideo, ctx, targetWidth, targetHeight);
    return playSequentially(index + 1);
  };

  await playSequentially(0);

  // 6. Finalizar grabación
  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
    // Dar medio segundo final para asegurar el último cuadro
    setTimeout(() => {
      try {
        recorder.stop();
      } catch {
        resolve();
      }
    }, 400);
  });

  if (audioCtx) {
    try {
      await audioCtx.close();
    } catch {}
  }

  if (onProgress) {
    onProgress({
      currentVideo: blobs.length,
      totalVideos: blobs.length,
      percent: 100,
      statusText: '¡Compilación completada!'
    });
  }

  const finalBlob = new Blob(recordedChunks, { type: mimeType });
  return { blob: finalBlob, extension };
}
