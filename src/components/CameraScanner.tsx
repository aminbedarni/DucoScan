import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, FlipHorizontal, Image as ImageIcon, Sparkles, X, Zap, ZapOff } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { Point, QuadCorners, ScannedPage } from '../types';
import { calculateBlurScore, detectDocumentCorners, distance, getDefaultCorners, perspectiveWarp } from '../utils/cv';

interface CameraScannerProps {
  onFinishScan: (scannedPages: ScannedPage[]) => void;
  onCancel: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onFinishScan, onCancel }) => {
  const { t } = useI18n();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);

  const [autoCapture, setAutoCapture] = useState<boolean>(true);
  const [scannedPages, setScannedPages] = useState<ScannedPage[]>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Live detection state
  const [detectedCorners, setDetectedCorners] = useState<QuadCorners | null>(null);
  const [isSteady, setIsSteady] = useState<boolean>(false);
  const [stabilityCounter, setStabilityCounter] = useState<number>(0);
  const [isBlurry, setIsBlurry] = useState<boolean>(false);

  const prevCornersRef = useRef<QuadCorners | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Start Camera
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function initCamera() {
      try {
        setCameraError(null);
        if (activeStream) {
          activeStream.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
        }

        // Check if torch/flashlight is supported on the track
        const track = mediaStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined;
        setHasTorch(!!capabilities?.torch);
      } catch (err) {
        console.warn('Camera access denied or unavailable', err);
        setCameraError(t('cameraAccessRequired'));
      }
    }

    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [facingMode]);

  // Torch toggle
  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const nextTorch = !torchOn;
      await (track as unknown as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  // Switch front/back camera
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Real-time Computer Vision processing loop
  useEffect(() => {
    let running = true;

    const processFrame = () => {
      if (!running) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && !isCapturing) {
        const vW = video.videoWidth;
        const vH = video.videoHeight;

        if (vW > 0 && vH > 0) {
          // Detect corners
          const { corners, confidence } = detectDocumentCorners(video, vW, vH);
          setDetectedCorners(corners);

          // Test stability by checking distance moved by corners
          if (prevCornersRef.current) {
            const p = prevCornersRef.current;
            const delta =
              distance(p.topLeft, corners.topLeft) +
              distance(p.topRight, corners.topRight) +
              distance(p.bottomRight, corners.bottomRight) +
              distance(p.bottomLeft, corners.bottomLeft);

            // If jitter is very low, increment stability
            if (delta < 25 && confidence > 0.5) {
              setStabilityCounter((c) => {
                const next = c + 1;
                if (next > 18) {
                  // ~0.6 seconds steady
                  setIsSteady(true);
                  if (autoCapture && next === 22) {
                    captureCurrentFrame(corners);
                  }
                }
                return next;
              });
            } else {
              setStabilityCounter(0);
              setIsSteady(false);
            }
          }
          prevCornersRef.current = corners;
        }
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [autoCapture, isCapturing]);

  // Capture frame
  const captureCurrentFrame = (overrideCorners?: QuadCorners) => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || isCapturing) return;

    setIsCapturing(true);

    // Haptic vibration feedback
    if (navigator.vibrate) {
      try {
        navigator.vibrate(60);
      } catch {
        // ignore
      }
    }

    const vW = video.videoWidth || 1280;
    const vH = video.videoHeight || 720;

    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = vW;
    fullCanvas.height = vH;
    const ctx = fullCanvas.getContext('2d');
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    ctx.drawImage(video, 0, 0, vW, vH);

    // Check blur
    const blurScore = calculateBlurScore(ctx, vW, vH);
    if (blurScore < 20) {
      setIsBlurry(true);
      setTimeout(() => setIsBlurry(false), 3000);
    }

    const rawDataUrl = fullCanvas.toDataURL('image/jpeg', 0.95);
    const corners = overrideCorners || detectedCorners || getDefaultCorners(vW, vH);

    // Apply auto-perspective warp for initial processed view
    const croppedCanvas = perspectiveWarp(fullCanvas, corners);
    const croppedUrl = croppedCanvas.toDataURL('image/jpeg', 0.95);

    // Create thumbnail
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 120;
    thumbCanvas.height = Math.round((120 * croppedCanvas.height) / croppedCanvas.width);
    const tCtx = thumbCanvas.getContext('2d');
    tCtx?.drawImage(croppedCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);

    const newPage: ScannedPage = {
      id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      originalImage: rawDataUrl,
      croppedImage: croppedUrl,
      processedImage: croppedUrl,
      thumbnail: thumbUrl,
      corners,
      rotation: 0,
      filter: 'auto_enhance',
      filterIntensity: 100,
      adjustments: { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 },
      width: croppedCanvas.width,
      height: croppedCanvas.height,
    };

    setScannedPages((prev) => [...prev, newPage]);

    setTimeout(() => {
      setIsCapturing(false);
      setStabilityCounter(0);
      setIsSteady(false);
    }, 400);
  };

  // Handle image import from device photo gallery
  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const corners = getDefaultCorners(img.width, img.height, 0.04);
          const croppedCanvas = perspectiveWarp(img, corners);
          const croppedUrl = croppedCanvas.toDataURL('image/jpeg', 0.95);

          const newPage: ScannedPage = {
            id: `page_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            originalImage: dataUrl,
            croppedImage: croppedUrl,
            processedImage: croppedUrl,
            thumbnail: croppedUrl,
            corners,
            rotation: 0,
            filter: 'auto_enhance',
            filterIntensity: 100,
            adjustments: { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 },
            width: croppedCanvas.width,
            height: croppedCanvas.height,
          };
          setScannedPages((prev) => [...prev, newPage]);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFinish = () => {
    if (scannedPages.length > 0) {
      onFinishScan(scannedPages);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none">
      {/* Hidden file input for gallery import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleGalleryUpload}
        className="hidden"
      />

      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-safe">
        <button
          onClick={onCancel}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition"
          aria-label={t('cancel')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Center mode pills */}
        <div className="flex items-center gap-1 p-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
          <button
            onClick={() => setAutoCapture(true)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              autoCapture ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-300'
            }`}
          >
            <Sparkles className="w-3 h-3 inline mr-1" />
            {t('autoCapture')}
          </button>
          <button
            onClick={() => setAutoCapture(false)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              !autoCapture ? 'bg-white text-slate-950 font-semibold' : 'text-slate-300'
            }`}
          >
            {t('manualCapture')}
          </button>
        </div>

        {/* Action icons right */}
        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full backdrop-blur-md transition ${
                torchOn ? 'bg-amber-400 text-slate-950' : 'bg-black/40 text-white hover:bg-black/60'
              }`}
              aria-label="Flashlight"
            >
              {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={switchCamera}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition"
            aria-label={t('switchCamera')}
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera Video Viewport */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        {cameraError ? (
          <div className="p-6 text-center max-w-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-white">{cameraError}</h3>
            <p className="text-xs text-slate-400">{t('cameraAccessDesc')}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition"
            >
              <ImageIcon className="w-4 h-4" />
              <span>{t('importFromGallery')}</span>
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Glowing Laser Scan Line Animation */}
            <div className="absolute inset-x-8 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-laser pointer-events-none z-10" />

            {/* Real-time Document Detection Quad Overlay */}
            {detectedCorners && videoRef.current && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                {(() => {
                  const v = videoRef.current;
                  const vW = v?.videoWidth || 1;
                  const vH = v?.videoHeight || 1;
                  const cW = v?.clientWidth || window.innerWidth;
                  const cH = v?.clientHeight || window.innerHeight;

                  // Map coordinates accounting for object-cover scale
                  const scale = Math.max(cW / vW, cH / vH);
                  const offX = (cW - vW * scale) / 2;
                  const offY = (cH - vH * scale) / 2;

                  const mapPt = (p: Point) => ({
                    x: p.x * scale + offX,
                    y: p.y * scale + offY,
                  });

                  const tl = mapPt(detectedCorners.topLeft);
                  const tr = mapPt(detectedCorners.topRight);
                  const br = mapPt(detectedCorners.bottomRight);
                  const bl = mapPt(detectedCorners.bottomLeft);

                  const quadStr = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;

                  return (
                    <>
                      <polygon
                        points={quadStr}
                        fill={isSteady ? 'rgba(34, 211, 238, 0.22)' : 'rgba(56, 189, 248, 0.08)'}
                        stroke={isSteady ? '#22d3ee' : '#38bdf8'}
                        strokeWidth={isSteady ? '3.5' : '2'}
                        strokeLinejoin="round"
                        className="transition-all duration-150"
                      />
                      {/* Corner reticles */}
                      {[tl, tr, br, bl].map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt.x}
                          cy={pt.y}
                          r={isSteady ? 6 : 5}
                          fill="#ffffff"
                          stroke="#06b6d4"
                          strokeWidth="2.5"
                        />
                      ))}
                    </>
                  );
                })()}
              </svg>
            )}

            {/* Instruction tooltip badge */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-xs font-medium text-slate-200 border border-white/10 shadow-lg pointer-events-none text-center">
              {isCapturing
                ? t('capturing')
                : isSteady
                ? t('pageDetected')
                : t('pageHoldSteady')}
            </div>

            {/* Blur warning indicator */}
            {isBlurry && (
              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl bg-amber-500/90 text-slate-950 text-xs font-semibold shadow-lg text-center max-w-xs animate-bounce">
                {t('blurDetected')}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Shutter & Controls Dock */}
      <div className="relative z-30 flex items-center justify-between px-6 py-4 bg-gradient-to-t from-black via-black/80 to-transparent pb-safe">
        {/* Gallery Import Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="min-h-[48px] min-w-[48px] flex flex-col items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 text-white transition"
          aria-label={t('gallery')}
        >
          <ImageIcon className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">{t('gallery')}</span>
        </button>

        {/* Big Shutter Button */}
        <button
          onClick={() => captureCurrentFrame()}
          disabled={isCapturing}
          className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform shadow-2xl focus:outline-none"
          aria-label={t('captureSingle')}
        >
          <div
            className={`w-16 h-16 rounded-full transition-all duration-200 ${
              isCapturing ? 'bg-cyan-300 scale-90' : isSteady ? 'bg-cyan-400' : 'bg-white'
            }`}
          />
        </button>

        {/* Scanned Pages Stack / Finish Button */}
        {scannedPages.length > 0 ? (
          <button
            onClick={handleFinish}
            className="relative min-h-[48px] min-w-[48px] flex flex-col items-center justify-center rounded-2xl bg-cyan-500 text-slate-950 font-semibold transition active:scale-95 px-3"
          >
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 stroke-[3]" />
              <span className="text-xs font-bold">{scannedPages.length}</span>
            </div>
            <span className="text-[10px] font-bold">{t('finishScan')}</span>
          </button>
        ) : (
          <div className="w-12 h-12" />
        )}
      </div>
    </div>
  );
};
