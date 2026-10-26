import React, { useEffect, useRef, useState } from 'react';
import { Check, Maximize2, Sparkles, X } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { Point, QuadCorners } from '../types';
import { detectDocumentCorners, getDefaultCorners, perspectiveWarp } from '../utils/cv';

interface CropAdjusterProps {
  imageSrc: string;
  initialCorners?: QuadCorners;
  onApplyCrop: (croppedDataUrl: string, appliedCorners: QuadCorners) => void;
  onCancel: () => void;
}

export const CropAdjuster: React.FC<CropAdjusterProps> = ({
  imageSrc,
  initialCorners,
  onApplyCrop,
  onCancel,
}) => {
  const { t, isRtl } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement>(null);

  const [imgSize, setImgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [displayedSize, setDisplayedSize] = useState<{ width: number; height: number; scaleX: number; scaleY: number }>({
    width: 0,
    height: 0,
    scaleX: 1,
    scaleY: 1,
  });

  const [corners, setCorners] = useState<QuadCorners>(() => {
    return initialCorners || {
      topLeft: { x: 40, y: 40 },
      topRight: { x: 360, y: 40 },
      bottomRight: { x: 360, y: 480 },
      bottomLeft: { x: 40, y: 480 },
    };
  });

  const [draggingKey, setDraggingKey] = useState<keyof QuadCorners | null>(null);
  const [loupePoint, setLoupePoint] = useState<Point | null>(null);

  // When image loads, compute scale and set corners
  const handleImageLoad = () => {
    if (!imgRef.current) return;
    const naturalW = imgRef.current.naturalWidth;
    const naturalH = imgRef.current.naturalHeight;
    setImgSize({ width: naturalW, height: naturalH });

    updateDisplayDimensions(naturalW, naturalH);

    if (!initialCorners) {
      // Auto-detect or default
      const detected = detectDocumentCorners(imgRef.current, naturalW, naturalH);
      setCorners(detected.corners);
    }
  };

  const updateDisplayDimensions = (naturalW: number, naturalH: number) => {
    if (!containerRef.current || naturalW === 0) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    const aspect = naturalW / naturalH;
    let renderW = containerW;
    let renderH = containerW / aspect;

    if (renderH > containerH) {
      renderH = containerH;
      renderW = containerH * aspect;
    }

    setDisplayedSize({
      width: renderW,
      height: renderH,
      scaleX: renderW / naturalW,
      scaleY: renderH / naturalH,
    });
  };

  useEffect(() => {
    const onResize = () => {
      if (imgSize.width > 0) {
        updateDisplayDimensions(imgSize.width, imgSize.height);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [imgSize]);

  // Convert image coords to screen coords
  const toScreen = (pt: Point): Point => ({
    x: pt.x * displayedSize.scaleX,
    y: pt.y * displayedSize.scaleY,
  });

  // Convert screen coords to image coords
  const toImage = (screenX: number, screenY: number): Point => {
    const x = Math.max(0, Math.min(imgSize.width, screenX / (displayedSize.scaleX || 1)));
    const y = Math.max(0, Math.min(imgSize.height, screenY / (displayedSize.scaleY || 1)));
    return { x, y };
  };

  // Magnifying Loupe rendering
  useEffect(() => {
    if (!loupePoint || !loupeCanvasRef.current || !imgRef.current) return;
    const canvas = loupeCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const zoom = 2.4;
    const loupeRadius = canvas.width / 2;
    const sampleW = canvas.width / zoom;
    const sampleH = canvas.height / zoom;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.arc(loupeRadius, loupeRadius, loupeRadius, 0, Math.PI * 2);
    ctx.clip();

    // Draw zoomed area from image
    ctx.drawImage(
      imgRef.current,
      loupePoint.x - sampleW / 2,
      loupePoint.y - sampleH / 2,
      sampleW,
      sampleH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Crosshairs
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(loupeRadius, 0);
    ctx.lineTo(loupeRadius, canvas.height);
    ctx.moveTo(0, loupeRadius);
    ctx.lineTo(canvas.width, loupeRadius);
    ctx.stroke();

    ctx.restore();
  }, [loupePoint]);

  // Handle pointer / touch dragging
  const handlePointerDown = (key: keyof QuadCorners, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDraggingKey(key);
    setLoupePoint(corners[key]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingKey || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = (rect.width - displayedSize.width) / 2;
    const offsetY = (rect.height - displayedSize.height) / 2;

    const clientX = e.clientX - rect.left - offsetX;
    const clientY = e.clientY - rect.top - offsetY;

    const imgCoord = toImage(clientX, clientY);
    setCorners((prev) => ({
      ...prev,
      [draggingKey]: imgCoord,
    }));
    setLoupePoint(imgCoord);
  };

  const handlePointerUp = () => {
    setDraggingKey(null);
    setLoupePoint(null);
  };

  const handleAutoDetect = () => {
    if (!imgRef.current) return;
    const detected = detectDocumentCorners(imgRef.current, imgSize.width, imgSize.height);
    setCorners(detected.corners);
  };

  const handleResetFull = () => {
    setCorners({
      topLeft: { x: 0, y: 0 },
      topRight: { x: imgSize.width, y: 0 },
      bottomRight: { x: imgSize.width, y: imgSize.height },
      bottomLeft: { x: 0, y: imgSize.height },
    });
  };

  const handleApply = () => {
    if (!imgRef.current) return;
    const croppedCanvas = perspectiveWarp(imgRef.current, corners);
    const croppedUrl = croppedCanvas.toDataURL('image/jpeg', 0.95);
    onApplyCrop(croppedUrl, corners);
  };

  const tl = toScreen(corners.topLeft);
  const tr = toScreen(corners.topRight);
  const br = toScreen(corners.bottomRight);
  const bl = toScreen(corners.bottomLeft);

  const polygonPoints = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <button
          onClick={onCancel}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          aria-label={t('cancel')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-sm font-semibold tracking-tight text-white">{t('adjustCorners')}</h2>
          <p className="text-[11px] text-slate-400">{t('dragCornerTip')}</p>
        </div>

        <button
          onClick={handleApply}
          className="min-h-[44px] px-3 flex items-center gap-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md transition"
        >
          <Check className="w-4 h-4" />
          <span>{t('apply')}</span>
        </button>
      </div>

      {/* Main interactive canvas area */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative flex-1 flex items-center justify-center p-3 overflow-hidden bg-slate-950 touch-none"
      >
        <div
          className="relative select-none"
          style={{
            width: displayedSize.width || 'auto',
            height: displayedSize.height || 'auto',
          }}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Scan crop preview"
            onLoad={handleImageLoad}
            className="block max-h-full max-w-full pointer-events-none rounded shadow-2xl"
          />

          {displayedSize.width > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ overflow: 'visible' }}
            >
              {/* Mask outside the document quad */}
              <defs>
                <mask id="cropMask">
                  <rect width="100%" height="100%" fill="white" />
                  <polygon points={polygonPoints} fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.55)" mask="url(#cropMask)" />

              {/* Quadrilateral filled preview */}
              <polygon
                points={polygonPoints}
                fill="rgba(56, 189, 248, 0.12)"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* Grid lines inside polygon */}
              <line
                x1={(tl.x * 2 + bl.x) / 3}
                y1={(tl.y * 2 + bl.y) / 3}
                x2={(tr.x * 2 + br.x) / 3}
                y2={(tr.y * 2 + br.y) / 3}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="4 4"
              />
              <line
                x1={(tl.x + bl.x * 2) / 3}
                y1={(tl.y + bl.y * 2) / 3}
                x2={(tr.x + br.x * 2) / 3}
                y2={(tr.y + br.y * 2) / 3}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="4 4"
              />
              <line
                x1={(tl.x * 2 + tr.x) / 3}
                y1={(tl.y * 2 + tr.y) / 3}
                x2={(bl.x * 2 + br.x) / 3}
                y2={(bl.y * 2 + br.y) / 3}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="4 4"
              />
              <line
                x1={(tl.x + tr.x * 2) / 3}
                y1={(tl.y + tr.y * 2) / 3}
                x2={(bl.x + br.x * 2) / 3}
                y2={(bl.y + br.y * 2) / 3}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeDasharray="4 4"
              />
            </svg>
          )}

          {/* Draggable Corner Touch Pins (Min 44x44px hitbox) */}
          {displayedSize.width > 0 && (
            <>
              {(
                [
                  { key: 'topLeft', pt: tl, label: 'TL' },
                  { key: 'topRight', pt: tr, label: 'TR' },
                  { key: 'bottomRight', pt: br, label: 'BR' },
                  { key: 'bottomLeft', pt: bl, label: 'BL' },
                ] as const
              ).map(({ key, pt }) => (
                <div
                  key={key}
                  onPointerDown={(e) => handlePointerDown(key, e)}
                  style={{
                    left: `${pt.x}px`,
                    top: `${pt.y}px`,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 min-w-[48px] min-h-[48px] flex items-center justify-center cursor-grab active:cursor-grabbing z-30"
                >
                  <div
                    className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform ${
                      draggingKey === key
                        ? 'bg-cyan-400 scale-125 ring-4 ring-cyan-500/50'
                        : 'bg-cyan-500 hover:scale-110'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Real-time Magnifying Loupe Window when dragging */}
          {loupePoint && (
            <div className="absolute top-2 left-2 z-40 rounded-full border-2 border-cyan-400 shadow-2xl bg-black overflow-hidden ring-4 ring-black/40 pointer-events-none">
              <canvas ref={loupeCanvasRef} width={110} height={110} className="block" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom control strip */}
      <div className="flex items-center justify-around px-4 py-3 bg-slate-900 border-t border-slate-800 pb-safe">
        <button
          onClick={handleAutoDetect}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition min-h-[44px]"
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{t('autoDetectEdges')}</span>
        </button>

        <button
          onClick={handleResetFull}
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition min-h-[44px]"
        >
          <Maximize2 className="w-4 h-4 text-slate-400" />
          <span>{t('fullImage')}</span>
        </button>
      </div>
    </div>
  );
};
