import { useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import {
  Move, Square, Circle, Ruler, Crosshair, SlidersHorizontal, Eye, Table2, Download, Info, Target } from
'lucide-react';
import type { ImageAnalysis } from '@/lib/cielab';

type ImageJTool = 'select' | 'rect' | 'ellipse' | 'line' | 'point' | 'threshold';

interface ROI {
  id: string;
  type: 'rect' | 'ellipse' | 'line' | 'point';
  x: number;
  y: number;
  width?: number;
  height?: number;
  x2?: number;
  y2?: number;
}

interface ROIMeasurement {
  id: string;
  roiId: string;
  roiType: string;
  area: number;
  perimeter: number;
  meanL: number;
  meanA: number;
  meanB: number;
  stdL: number;
  stdA: number;
  stdB: number;
  minL: number;
  maxL: number;
  greenness: number;
  status: string;
  timestamp: Date;
}

interface ThresholdSettings {
  lMin: number;
  lMax: number;
  aMin: number;
  aMax: number;
  bMin: number;
  bMax: number;
}

interface ImageJAnalysisProps {
  capturedImage: string | null;
  channelImages: Record<string, string>;
  analysis: ImageAnalysis | null;
  onGoToCielab: () => void;
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'healthy':return 'Saludable';
    case 'warning':return 'Moderado';
    case 'stress':return 'Estrés';
    case 'critical':return 'Crítico';
    default:return status;
  }
}

export function ImageJAnalysis({ capturedImage, channelImages, analysis, onGoToCielab }: ImageJAnalysisProps) {
  const roiCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<ImageJTool>('select');
  const [rois, setRois] = useState<ROI[]>([]);
  const [measurements, setMeasurements] = useState<ROIMeasurement[]>([]);
  const [showMeasurements, setShowMeasurements] = useState(true);
  const [showThresholdOverlay, setShowThresholdOverlay] = useState(false);
  const [threshold, setThreshold] = useState<ThresholdSettings>({ lMin: 0, lMax: 100, aMin: -128, aMax: 0, bMin: -128, bMax: 30 });
  const [scale, setScale] = useState<{pxPerCm: number;defined: boolean;}>({ pxPerCm: 1, defined: false });
  const [activeChannel, setActiveChannel] = useState<'original' | 'l' | 'a' | 'b' | 'health'>('original');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{x: number;y: number;} | null>(null);
  const [thresholdOverlay, setThresholdOverlay] = useState<string | null>(null);

  // Canvas event handlers
  const getCanvasCoords = (e: ReactMouseEvent<HTMLCanvasElement>): {x: number;y: number;} => {
    const canvas = roiCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasMouseDown = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'select') return;
    const coords = getCanvasCoords(e);
    setIsDrawing(true);
    setDrawStart(coords);

    if (activeTool === 'point') {
      const newRoi: ROI = { id: crypto.randomUUID(), type: 'point', x: coords.x, y: coords.y };
      setRois((prev) => [...prev, newRoi]);
      measureROI(newRoi);
      setIsDrawing(false);
      setDrawStart(null);
    }
  };

  const handleCanvasMouseMove = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart || activeTool === 'select' || activeTool === 'point') return;
    const coords = getCanvasCoords(e);
    drawPreview(coords);
  };

  const handleCanvasMouseUp = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart || activeTool === 'select' || activeTool === 'point') return;
    const coords = getCanvasCoords(e);

    const newRoi: ROI = {
      id: crypto.randomUUID(),
      type: activeTool as 'rect' | 'ellipse' | 'line',
      x: Math.min(drawStart.x, coords.x),
      y: Math.min(drawStart.y, coords.y),
      width: Math.abs(coords.x - drawStart.x),
      height: Math.abs(coords.y - drawStart.y),
      x2: coords.x,
      y2: coords.y
    };

    if ((newRoi.width || 0) > 5 || (newRoi.height || 0) > 5 || activeTool === 'line') {
      setRois((prev) => [...prev, newRoi]);
      measureROI(newRoi);
    }

    setIsDrawing(false);
    setDrawStart(null);
    redrawROIs();
  };

  const drawPreview = (currentPos: {x: number;y: number;}) => {
    const canvas = roiCanvasRef.current;
    if (!canvas || !drawStart) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAllROIs(ctx);

    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    if (activeTool === 'rect') {
      ctx.strokeRect(drawStart.x, drawStart.y, currentPos.x - drawStart.x, currentPos.y - drawStart.y);
    } else if (activeTool === 'ellipse') {
      const cx = (drawStart.x + currentPos.x) / 2;
      const cy = (drawStart.y + currentPos.y) / 2;
      const rx = Math.abs(currentPos.x - drawStart.x) / 2;
      const ry = Math.abs(currentPos.y - drawStart.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (activeTool === 'line') {
      ctx.beginPath();
      ctx.moveTo(drawStart.x, drawStart.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  };

  const drawAllROIs = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    rois.forEach((roi, index) => {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';

      if (roi.type === 'rect' && roi.width && roi.height) {
        ctx.strokeRect(roi.x, roi.y, roi.width, roi.height);
        ctx.fillRect(roi.x, roi.y, roi.width, roi.height);
      } else if (roi.type === 'ellipse' && roi.width && roi.height) {
        const cx = roi.x + roi.width / 2;
        const cy = roi.y + roi.height / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, roi.width / 2, roi.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (roi.type === 'line' && roi.x2 !== undefined && roi.y2 !== undefined) {
        ctx.beginPath();
        ctx.moveTo(roi.x, roi.y);
        ctx.lineTo(roi.x2, roi.y2);
        ctx.stroke();
      } else if (roi.type === 'point') {
        ctx.beginPath();
        ctx.arc(roi.x, roi.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = '#ffff00';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${index + 1}`, roi.x + 5, roi.y - 5);
    });
  };

  const redrawROIs = () => {
    const canvas = roiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAllROIs(ctx);
  };

  const measureROI = (roi: ROI) => {
    if (!capturedImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const pixels: {r: number;g: number;b: number;}[] = [];
      let area = 0;
      let perimeter = 0;

      if (roi.type === 'rect' && roi.width && roi.height) {
        const x = Math.max(0, Math.floor(roi.x));
        const y = Math.max(0, Math.floor(roi.y));
        const w = Math.min(roi.width, canvas.width - x);
        const h = Math.min(roi.height, canvas.height - y);
        const imageData = ctx.getImageData(x, y, w, h);
        for (let i = 0; i < imageData.data.length; i += 4) {
          pixels.push({ r: imageData.data[i], g: imageData.data[i + 1], b: imageData.data[i + 2] });
        }
        area = w * h;
        perimeter = 2 * (w + h);
      } else if (roi.type === 'ellipse' && roi.width && roi.height) {
        const cx = roi.x + roi.width / 2;
        const cy = roi.y + roi.height / 2;
        const rx = roi.width / 2;
        const ry = roi.height / 2;
        const x1 = Math.max(0, Math.floor(roi.x));
        const y1 = Math.max(0, Math.floor(roi.y));
        const x2 = Math.min(canvas.width, Math.ceil(roi.x + roi.width));
        const y2 = Math.min(canvas.height, Math.ceil(roi.y + roi.height));
        const imageData = ctx.getImageData(x1, y1, x2 - x1, y2 - y1);
        for (let py = y1; py < y2; py++) {
          for (let px = x1; px < x2; px++) {
            const dx = (px - cx) / rx;
            const dy = (py - cy) / ry;
            if (dx * dx + dy * dy <= 1) {
              const idx = ((py - y1) * (x2 - x1) + (px - x1)) * 4;
              pixels.push({ r: imageData.data[idx], g: imageData.data[idx + 1], b: imageData.data[idx + 2] });
            }
          }
        }
        area = Math.PI * rx * ry;
        perimeter = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);
      } else if (roi.type === 'line' && roi.x2 !== undefined && roi.y2 !== undefined) {
        const dx = roi.x2 - roi.x;
        const dy = roi.y2 - roi.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(length);
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const px = Math.floor(roi.x + dx * t);
          const py = Math.floor(roi.y + dy * t);
          if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
            const imageData = ctx.getImageData(px, py, 1, 1);
            pixels.push({ r: imageData.data[0], g: imageData.data[1], b: imageData.data[2] });
          }
        }
        area = steps;
        perimeter = length;
      } else if (roi.type === 'point') {
        const px = Math.floor(roi.x);
        const py = Math.floor(roi.y);
        if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
          const imageData = ctx.getImageData(px, py, 1, 1);
          pixels.push({ r: imageData.data[0], g: imageData.data[1], b: imageData.data[2] });
        }
        area = 1;
        perimeter = 0;
      }

      if (pixels.length === 0) return;

      // Convert to LAB and calculate stats
      const labValues = pixels.map((p) => rgbToLab(p.r, p.g, p.b));
      const lVals = labValues.map((l) => l.l);
      const aVals = labValues.map((l) => l.a);
      const bVals = labValues.map((l) => l.b);

      const calcStats = (arr: number[]) => {
        const n = arr.length;
        let sum = 0,min = Infinity,max = -Infinity;
        for (const v of arr) {sum += v;if (v < min) min = v;if (v > max) max = v;}
        const mean = sum / n;
        let sqDiff = 0;
        for (const v of arr) sqDiff += (v - mean) ** 2;
        const std = Math.sqrt(sqDiff / n);
        return { mean, std, min, max };
      };

      const lStats = calcStats(lVals);
      const aStats = calcStats(aVals);
      const bStats = calcStats(bVals);

      const greenPixels = labValues.filter((l) => l.a < 0).length;
      const greenness = greenPixels / labValues.length * 100;

      let status = 'Saludable';
      if (aStats.mean > 0 || lStats.mean < 30) status = 'Crítico';else
      if (aStats.mean > -5 || bStats.mean > 30) status = 'Estrés';else
      if (aStats.mean > -10 || bStats.mean > 20) status = 'Moderado';

      const areaConverted = scale.defined ? area / (scale.pxPerCm * scale.pxPerCm) : area;
      const perimConverted = scale.defined ? perimeter / scale.pxPerCm : perimeter;

      const measurement: ROIMeasurement = {
        id: crypto.randomUUID(),
        roiId: roi.id,
        roiType: roi.type,
        area: Math.round(areaConverted),
        perimeter: perimConverted,
        meanL: lStats.mean,
        meanA: aStats.mean,
        meanB: bStats.mean,
        stdL: lStats.std,
        stdA: aStats.std,
        stdB: bStats.std,
        minL: lStats.min,
        maxL: lStats.max,
        greenness,
        status,
        timestamp: new Date()
      };

      setMeasurements((prev) => [...prev, measurement]);
    };
    img.src = capturedImage;
  };

  const clearAllROIs = () => {
    setRois([]);
    setMeasurements([]);
    const canvas = roiCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const exportMeasurementsCSV = () => {
    if (measurements.length === 0) return;
    const headers = ['#', 'Tipo', 'Área', 'Perímetro', 'L* Mean', 'L* Std', 'a* Mean', 'a* Std', 'b* Mean', 'b* Std', 'Verdor %', 'Estado'];
    const rows = measurements.map((m, i) => [
    i + 1, m.roiType, m.area, m.perimeter.toFixed(2), m.meanL.toFixed(2), m.stdL.toFixed(2),
    m.meanA.toFixed(2), m.stdA.toFixed(2), m.meanB.toFixed(2), m.stdB.toFixed(2), m.greenness.toFixed(1), m.status]
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imagej_mediciones_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // RGB to LAB conversion
  const rgbToLab = (r: number, g: number, b: number) => {
    let rn = r / 255,gn = g / 255,bn = b / 255;
    rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
    gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
    bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;
    let x = (rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375) / 0.95047;
    let y = rn * 0.2126729 + gn * 0.7151522 + bn * 0.0721750;
    let z = (rn * 0.0193339 + gn * 0.1191920 + bn * 0.9503041) / 1.08883;
    x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
    y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
    z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;
    return { l: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
  };

  // Apply threshold and generate overlay
  const applyThreshold = () => {
    if (!capturedImage) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < imageData.data.length; i += 4) {
        const lab = rgbToLab(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);
        const inRange = lab.l >= threshold.lMin && lab.l <= threshold.lMax &&
        lab.a >= threshold.aMin && lab.a <= threshold.aMax &&
        lab.b >= threshold.bMin && lab.b <= threshold.bMax;
        if (inRange) {
          imageData.data[i] = 255;
          imageData.data[i + 1] = 0;
          imageData.data[i + 2] = 0;
          imageData.data[i + 3] = 128;
        } else {
          imageData.data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setThresholdOverlay(canvas.toDataURL());
    };
    img.src = capturedImage;
  };

  // Effect to apply threshold when settings change and overlay is enabled
  if (showThresholdOverlay && capturedImage && activeTool === 'threshold') {
    applyThreshold();
  }

  if (!capturedImage) {
    return (
      <div data-ev-id="ev_b135815860" className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
        <Target className="h-12 w-12 text-muted-foreground" />
        <div data-ev-id="ev_95e0b89668">
          <p data-ev-id="ev_6a39089db2" className="font-medium">Sin imagen capturada</p>
          <p data-ev-id="ev_91dfaec0e5" className="text-sm text-muted-foreground">Ve a la pestaña CIELAB y captura una imagen primero</p>
        </div>
        <button data-ev-id="ev_c2d5942c91" onClick={onGoToCielab} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Ir a CIELAB
        </button>
      </div>);

  }

  return (
    <div data-ev-id="ev_0752d6586a" className="flex flex-col gap-6">
      {/* Barra de herramientas ImageJ */}
      <div data-ev-id="ev_2f1064b482" className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div data-ev-id="ev_4b85a92ce3" className="flex items-center gap-1 border-r border-border pr-3">
          <span data-ev-id="ev_5c92896866" className="text-xs font-medium text-muted-foreground mr-2">Herramientas:</span>
          <button data-ev-id="ev_3fc19d2265" onClick={() => setActiveTool('select')} className={`rounded-lg p-2 ${activeTool === 'select' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} title="Seleccionar">
            <Move className="h-4 w-4" />
          </button>
          <button data-ev-id="ev_f77aa2c346" onClick={() => setActiveTool('rect')} className={`rounded-lg p-2 ${activeTool === 'rect' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} title="ROI Rectangular">
            <Square className="h-4 w-4" />
          </button>
          <button data-ev-id="ev_7eb1236319" onClick={() => setActiveTool('ellipse')} className={`rounded-lg p-2 ${activeTool === 'ellipse' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} title="ROI Elíptica">
            <Circle className="h-4 w-4" />
          </button>
          <button data-ev-id="ev_2d86f6a903" onClick={() => setActiveTool('line')} className={`rounded-lg p-2 ${activeTool === 'line' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} title="Línea/Perfil">
            <Ruler className="h-4 w-4" />
          </button>
          <button data-ev-id="ev_2523175cdd" onClick={() => setActiveTool('point')} className={`rounded-lg p-2 ${activeTool === 'point' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} title="Punto">
            <Crosshair className="h-4 w-4" />
          </button>
        </div>
        <div data-ev-id="ev_1f5de0c423" className="flex items-center gap-1 border-r border-border pr-3">
          <button data-ev-id="ev_e2e07f1aa7" onClick={() => setActiveTool('threshold')} className={`rounded-lg p-2 ${activeTool === 'threshold' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} title="Umbralización">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button data-ev-id="ev_1ee915f34b" onClick={() => {setShowThresholdOverlay(!showThresholdOverlay);if (!showThresholdOverlay) applyThreshold();}} className={`rounded-lg p-2 ${showThresholdOverlay ? 'bg-red-500 text-white' : 'hover:bg-muted'}`} title="Mostrar umbral">
            <Eye className="h-4 w-4" />
          </button>
        </div>
        <div data-ev-id="ev_881612b9c6" className="flex items-center gap-1 border-r border-border pr-3">
          <button data-ev-id="ev_d2cf7678ef" onClick={() => setShowMeasurements(!showMeasurements)} className={`rounded-lg p-2 ${showMeasurements ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} title="Tabla de mediciones">
            <Table2 className="h-4 w-4" />
          </button>
        </div>
        <div data-ev-id="ev_8a62f835a9" className="flex items-center gap-2 ml-auto">
          {rois.length > 0 && <button data-ev-id="ev_823161cdb4" onClick={clearAllROIs} className="rounded-lg px-3 py-1.5 text-xs bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">Limpiar ROIs ({rois.length})</button>}
          {!scale.defined && <button data-ev-id="ev_00ad8533e4" onClick={() => {const input = prompt('Ingresa la escala (píxeles por cm):');if (input) {const val = parseFloat(input);if (!isNaN(val) && val > 0) setScale({ pxPerCm: val, defined: true });}}} className="rounded-lg px-3 py-1.5 text-xs bg-muted hover:bg-muted/80">Definir escala</button>}
          {scale.defined && <span data-ev-id="ev_a9357fbd94" className="text-xs text-muted-foreground">Escala: {scale.pxPerCm} px/cm</span>}
        </div>
      </div>

      <div data-ev-id="ev_a82ad379d7" className="grid gap-6 lg:grid-cols-2">
        {/* Canvas interactivo */}
        <div data-ev-id="ev_40c0045fe9" className="rounded-xl border border-border bg-card p-4">
          <h3 data-ev-id="ev_1587cde2c9" className="mb-3 flex items-center gap-2 text-sm font-medium"><Target className="h-4 w-4" /> Imagen de Análisis</h3>
          <div data-ev-id="ev_7e95c0a456" className="mb-3 flex flex-wrap gap-2">
            {(['original', 'l', 'a', 'b', 'health'] as const).map((ch) =>
            <button data-ev-id="ev_0af754e433" key={ch} onClick={() => setActiveChannel(ch)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${activeChannel === ch ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
                {ch === 'original' ? 'Original' : ch === 'l' ? 'L*' : ch === 'a' ? 'a*' : ch === 'b' ? 'b*' : 'Salud'}
              </button>
            )}
          </div>
          <div data-ev-id="ev_f52a3bbe12" ref={imageContainerRef} className="relative">
            {channelImages[activeChannel] &&
            <>
                <img data-ev-id="ev_e5d4d32b3d" src={channelImages[activeChannel]} alt={activeChannel} className="w-full rounded-lg" onLoad={(e) => {const img = e.currentTarget;const canvas = roiCanvasRef.current;if (canvas) {canvas.width = img.naturalWidth;canvas.height = img.naturalHeight;redrawROIs();}}} />
                <canvas data-ev-id="ev_5bb72bd4fe" ref={roiCanvasRef} className="absolute inset-0 h-full w-full rounded-lg" style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }} onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={() => {if (isDrawing) {setIsDrawing(false);setDrawStart(null);}}} />
                {showThresholdOverlay && thresholdOverlay && <img data-ev-id="ev_bfcd428f4f" src={thresholdOverlay} alt="Umbral" className="pointer-events-none absolute inset-0 h-full w-full rounded-lg" />}
              </>
            }
          </div>
          {activeTool !== 'select' &&
          <p data-ev-id="ev_99a9dbc2e0" className="mt-2 text-xs text-muted-foreground">
              {activeTool === 'rect' && 'Dibuja un rectángulo sobre la imagen para medir'}
              {activeTool === 'ellipse' && 'Dibuja una elipse sobre la imagen para medir'}
              {activeTool === 'line' && 'Dibuja una línea para medir perfil o longitud'}
              {activeTool === 'point' && 'Haz clic para medir un punto específico'}
              {activeTool === 'threshold' && 'Ajusta los umbrales LAB en el panel derecho'}
            </p>
          }
        </div>

        {/* Panel derecho: Umbralización o info */}
        <div data-ev-id="ev_780886b53b" className="flex flex-col gap-4">
          {activeTool === 'threshold' &&
          <div data-ev-id="ev_328c58fac7" className="rounded-xl border border-border bg-card p-4">
              <h3 data-ev-id="ev_c5511052e6" className="mb-4 flex items-center gap-2 text-sm font-medium"><SlidersHorizontal className="h-4 w-4" /> Umbralización LAB</h3>
              <div data-ev-id="ev_b1dcae939c" className="flex flex-col gap-4">
                <div data-ev-id="ev_943c489637">
                  <label data-ev-id="ev_901dec858f" className="flex items-center justify-between text-xs"><span data-ev-id="ev_74ff783764">L* (Luminosidad)</span><span data-ev-id="ev_fb1632fe95" className="text-muted-foreground">{threshold.lMin} - {threshold.lMax}</span></label>
                  <div data-ev-id="ev_068a41ffd4" className="mt-1 flex gap-2">
                    <input data-ev-id="ev_25f2482684" type="range" min="0" max="100" value={threshold.lMin} onChange={(e) => setThreshold((t) => ({ ...t, lMin: Number(e.target.value) }))} className="flex-1" />
                    <input data-ev-id="ev_07234d00d7" type="range" min="0" max="100" value={threshold.lMax} onChange={(e) => setThreshold((t) => ({ ...t, lMax: Number(e.target.value) }))} className="flex-1" />
                  </div>
                </div>
                <div data-ev-id="ev_62ac8b92e8">
                  <label data-ev-id="ev_db22197a43" className="flex items-center justify-between text-xs"><span data-ev-id="ev_3d2f738e08">a* (Verde-Rojo)</span><span data-ev-id="ev_2c86595dbd" className="text-muted-foreground">{threshold.aMin} - {threshold.aMax}</span></label>
                  <div data-ev-id="ev_ef2bc38969" className="mt-1 flex gap-2">
                    <input data-ev-id="ev_a35078ae13" type="range" min="-128" max="127" value={threshold.aMin} onChange={(e) => setThreshold((t) => ({ ...t, aMin: Number(e.target.value) }))} className="flex-1" />
                    <input data-ev-id="ev_e217e6a8f8" type="range" min="-128" max="127" value={threshold.aMax} onChange={(e) => setThreshold((t) => ({ ...t, aMax: Number(e.target.value) }))} className="flex-1" />
                  </div>
                </div>
                <div data-ev-id="ev_b6ab4e7c2d">
                  <label data-ev-id="ev_a5ab56dbd8" className="flex items-center justify-between text-xs"><span data-ev-id="ev_32cf4f0d21">b* (Azul-Amarillo)</span><span data-ev-id="ev_d0477dab63" className="text-muted-foreground">{threshold.bMin} - {threshold.bMax}</span></label>
                  <div data-ev-id="ev_fb5f450cf9" className="mt-1 flex gap-2">
                    <input data-ev-id="ev_d9b53c9633" type="range" min="-128" max="127" value={threshold.bMin} onChange={(e) => setThreshold((t) => ({ ...t, bMin: Number(e.target.value) }))} className="flex-1" />
                    <input data-ev-id="ev_dab7922647" type="range" min="-128" max="127" value={threshold.bMax} onChange={(e) => setThreshold((t) => ({ ...t, bMax: Number(e.target.value) }))} className="flex-1" />
                  </div>
                </div>
                <div data-ev-id="ev_f8c39c2705" className="flex gap-2 text-xs">
                  <button data-ev-id="ev_6a7af29e51" onClick={() => {setThreshold({ lMin: 0, lMax: 100, aMin: -128, aMax: 0, bMin: -128, bMax: 30 });applyThreshold();}} className="flex-1 rounded-lg bg-green-100 py-2 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400">Verde</button>
                  <button data-ev-id="ev_a0f1631d53" onClick={() => {setThreshold({ lMin: 0, lMax: 100, aMin: 0, aMax: 127, bMin: 15, bMax: 127 });applyThreshold();}} className="flex-1 rounded-lg bg-yellow-100 py-2 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400">Clorótico</button>
                  <button data-ev-id="ev_269a1746c6" onClick={() => {setThreshold({ lMin: 0, lMax: 25, aMin: -128, aMax: 127, bMin: -128, bMax: 127 });applyThreshold();}} className="flex-1 rounded-lg bg-gray-100 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-900/30 dark:text-gray-400">Necrótico</button>
                </div>
              </div>
            </div>
          }

          {analysis &&
          <div data-ev-id="ev_87dd9f8657" className="rounded-xl border border-border bg-card p-4">
              <h3 data-ev-id="ev_92f0ede285" className="mb-3 text-sm font-medium">Resumen de Análisis</h3>
              <div data-ev-id="ev_6190377276" className="grid grid-cols-2 gap-3 text-xs">
                <div data-ev-id="ev_c377964b7e" className="rounded-lg bg-muted p-2 text-center">
                  <div data-ev-id="ev_52f05ef078" className="text-muted-foreground">Estado</div>
                  <div data-ev-id="ev_89af8ff4e6" className="font-medium">{getStatusLabel(analysis.overallStatus)}</div>
                </div>
                <div data-ev-id="ev_19efd34f7e" className="rounded-lg bg-muted p-2 text-center">
                  <div data-ev-id="ev_42509779e2" className="text-muted-foreground">Área verde</div>
                  <div data-ev-id="ev_d659be29d5" className="font-medium text-green-600">{analysis.healthMetrics.greenArea.toFixed(1)}%</div>
                </div>
                <div data-ev-id="ev_17ae8f8a92" className="rounded-lg bg-muted p-2 text-center">
                  <div data-ev-id="ev_c530f88e33" className="text-muted-foreground">a* media</div>
                  <div data-ev-id="ev_112a2e495a" className={`font-medium ${analysis.labStats.a.mean < 0 ? 'text-green-600' : 'text-red-500'}`}>{analysis.labStats.a.mean.toFixed(1)}</div>
                </div>
                <div data-ev-id="ev_6271e08aa9" className="rounded-lg bg-muted p-2 text-center">
                  <div data-ev-id="ev_5825819f8a" className="text-muted-foreground">b* media</div>
                  <div data-ev-id="ev_8da5e6631b" className={`font-medium ${analysis.labStats.b.mean > 20 ? 'text-yellow-600' : ''}`}>{analysis.labStats.b.mean.toFixed(1)}</div>
                </div>
              </div>
            </div>
          }

          <div data-ev-id="ev_973bf6f2ec" className="rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
            <h4 data-ev-id="ev_9106fe1d3b" className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-300"><Info className="h-4 w-4" /> Cómo usar</h4>
            <ul data-ev-id="ev_f5482325f2" className="mt-2 text-xs text-blue-700 dark:text-blue-400 list-disc list-inside flex flex-col gap-1">
              <li data-ev-id="ev_90fbca37ae">Selecciona una herramienta de ROI</li>
              <li data-ev-id="ev_e4169a8508">Dibuja sobre la imagen para medir</li>
              <li data-ev-id="ev_d3b585970e">Las mediciones aparecen en la tabla</li>
              <li data-ev-id="ev_f56c8210a0">Usa umbralización para segmentar colores</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tabla de mediciones */}
      {showMeasurements && measurements.length > 0 &&
      <div data-ev-id="ev_646e089551" className="rounded-xl border border-border bg-card p-4">
          <div data-ev-id="ev_709d035805" className="mb-3 flex items-center justify-between">
            <h3 data-ev-id="ev_7e24823f5f" className="flex items-center gap-2 text-sm font-medium"><Table2 className="h-4 w-4" /> Tabla de Resultados ({measurements.length})</h3>
            <button data-ev-id="ev_3d9744cabd" onClick={exportMeasurementsCSV} className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs hover:bg-muted/80"><Download className="h-3 w-3" /> CSV</button>
          </div>
          <div data-ev-id="ev_88817843bd" className="overflow-x-auto">
            <table data-ev-id="ev_3dd4194712" className="w-full text-xs">
              <thead data-ev-id="ev_22f707698d">
                <tr data-ev-id="ev_d1f5cedf5d" className="border-b border-border">
                  <th data-ev-id="ev_6c77a8be0c" className="py-2 text-left font-medium">#</th>
                  <th data-ev-id="ev_b39d0c26ef" className="py-2 text-left font-medium">Tipo</th>
                  <th data-ev-id="ev_0a85aa9689" className="py-2 text-right font-medium">Área{scale.defined ? ' (cm²)' : ' (px)'}</th>
                  <th data-ev-id="ev_cd9ded9ded" className="py-2 text-right font-medium">Perím.</th>
                  <th data-ev-id="ev_7423425652" className="py-2 text-right font-medium">L*</th>
                  <th data-ev-id="ev_7018bf147b" className="py-2 text-right font-medium">a*</th>
                  <th data-ev-id="ev_ee9da5a6b4" className="py-2 text-right font-medium">b*</th>
                  <th data-ev-id="ev_7b38216ec4" className="py-2 text-right font-medium">Verdor</th>
                  <th data-ev-id="ev_7a93a69026" className="py-2 text-left font-medium">Estado</th>
                </tr>
              </thead>
              <tbody data-ev-id="ev_74bd209f41">
                {measurements.map((m, i) =>
              <tr data-ev-id="ev_c5a933a2a4" key={m.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td data-ev-id="ev_a17ed5c9a0" className="py-2">{i + 1}</td>
                    <td data-ev-id="ev_e28ccbe589" className="py-2 capitalize">{m.roiType}</td>
                    <td data-ev-id="ev_b420663380" className="py-2 text-right font-mono">{m.area.toLocaleString()}</td>
                    <td data-ev-id="ev_6b8cca0cf5" className="py-2 text-right font-mono">{m.perimeter.toFixed(1)}</td>
                    <td data-ev-id="ev_ad3d95e27c" className="py-2 text-right">{m.meanL.toFixed(1)} ±{m.stdL.toFixed(1)}</td>
                    <td data-ev-id="ev_c2baea5e26" className={`py-2 text-right ${m.meanA < 0 ? 'text-green-600' : 'text-red-500'}`}>{m.meanA.toFixed(1)}</td>
                    <td data-ev-id="ev_1d701932ac" className={`py-2 text-right ${m.meanB > 20 ? 'text-yellow-600' : ''}`}>{m.meanB.toFixed(1)}</td>
                    <td data-ev-id="ev_7547d8f69b" className="py-2 text-right">{m.greenness.toFixed(0)}%</td>
                    <td data-ev-id="ev_ad6a08095f" className="py-2">
                      <span data-ev-id="ev_b3bdca3b59" className={`rounded-full px-2 py-0.5 text-[10px] ${m.status === 'Saludable' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : m.status === 'Moderado' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : m.status === 'Estrés' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{m.status}</span>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>);

}