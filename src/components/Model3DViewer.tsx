import { useEffect, useRef, useState } from 'react';
import '@google/model-viewer';
import { RotateCcw, ZoomIn, ZoomOut, Upload, Box, Palette, Sun, Image, Leaf, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { VEGETATION_INDICES, getIndexCSSFilter, getIndexGradient, type VegetationIndexType, type RGB } from '@/lib/vegetation-indices';
import { hexToRgb } from '@/lib/color';

interface Model3DViewerProps {
  modelUrl: string | null;
  autoRotate?: boolean;
  height?: number;
  onFileSelect?: (file: File) => void;
  showUpload?: boolean;
  healthScore?: number | null;
  colorimetryHex?: string | null;
  heightCm?: number | null;
  cladodeCount?: number | null;
  showColorMode?: boolean;
}

type ColorMode = 'texture' | 'colorimetry' | 'exg' | 'vari' | 'gli' | 'ngrdi' | 'rgbvi';
type LightingMode = 'neutral' | 'studio' | 'natural';

function calculateScale(heightCm: number | null, cladodeCount: number | null): number {
  const baseHeight = 30;
  const baseCladodes = 3;
  let scale = 1.0;
  if (heightCm && heightCm > 0) {
    scale *= Math.min(2.0, Math.max(0.5, heightCm / baseHeight));
  }
  if (cladodeCount && cladodeCount > 0) {
    scale *= Math.min(1.5, Math.max(0.8, 1 + (cladodeCount - baseCladodes) * 0.1));
  }
  return Math.round(scale * 100) / 100;
}

const LIGHTING_CONFIGS = {
  neutral: { exposure: '1.0', shadowIntensity: '0', environmentImage: 'neutral', label: 'Neutro' },
  studio: { exposure: '0.8', shadowIntensity: '0.5', environmentImage: 'legacy', label: 'Estudio' },
  natural: { exposure: '1.2', shadowIntensity: '0.3', environmentImage: 'neutral', label: 'Natural' }
};

const VEGETATION_INDEX_KEYS: VegetationIndexType[] = ['exg', 'vari', 'gli', 'ngrdi', 'rgbvi'];

export function Model3DViewer({
  modelUrl,
  autoRotate = true,
  height = 400,
  onFileSelect,
  showUpload = false,
  healthScore,
  colorimetryHex,
  heightCm,
  cladodeCount,
  showColorMode = false
}: Model3DViewerProps) {
  const [rotate, setRotate] = useState(autoRotate);
  const [zoom, setZoom] = useState(100);
  const [localFile, setLocalFile] = useState<string | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('texture');
  const [lightingMode, setLightingMode] = useState<LightingMode>('neutral');
  const [showLighting, setShowLighting] = useState(false);
  const [showIndices, setShowIndices] = useState(false);
  const [showIndexInfo, setShowIndexInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalFile(url);
      onFileSelect?.(file);
    }
  };

  const displayUrl = localFile || modelUrl;
  const scale = calculateScale(heightCm, cladodeCount);
  const lighting = LIGHTING_CONFIGS[lightingMode];

  // Obtener RGB de colorimetría
  const colorRgb: RGB = colorimetryHex ? hexToRgb(colorimetryHex) : { r: 100, g: 150, b: 80 };

  // Calcular índice actual si es modo de índice de vegetación
  const isVegetationIndex = VEGETATION_INDEX_KEYS.includes(colorMode as VegetationIndexType);
  const currentIndex = isVegetationIndex ? VEGETATION_INDICES[colorMode as VegetationIndexType] : null;
  const indexResult = currentIndex ? currentIndex.calculate(colorRgb) : null;

  useEffect(() => {
    return () => {
      if (localFile) URL.revokeObjectURL(localFile);
    };
  }, [localFile]);

  useEffect(() => {
    const container = viewerRef.current;
    if (!container || !displayUrl) return;

    const viewer = document.createElement('model-viewer');
    viewer.setAttribute('src', displayUrl);
    viewer.setAttribute('alt', 'Modelo 3D texturizado de planta');
    viewer.setAttribute('camera-controls', '');
    viewer.setAttribute('touch-action', 'pan-y');
    viewer.setAttribute('min-camera-orbit', 'auto auto 30%');
    viewer.setAttribute('max-camera-orbit', 'auto auto 300%');
    viewer.setAttribute('field-of-view', '30deg');
    viewer.setAttribute('interpolation-decay', '100');
    viewer.setAttribute('tone-mapping', 'neutral');
    viewer.setAttribute('disable-tap', '');
    viewer.setAttribute('loading', 'eager');
    viewer.setAttribute('reveal', 'auto');
    viewer.style.width = '100%';
    viewer.style.height = '100%';
    viewer.style.backgroundColor = 'transparent';
    viewer.style.setProperty('--poster-color', 'transparent');
    container.replaceChildren(viewer);

    return () => {
      if (viewer.parentElement === container) {
        container.removeChild(viewer);
      }
    };
  }, [displayUrl]);

  useEffect(() => {
    const viewer = viewerRef.current?.querySelector('model-viewer');
    if (!viewer) return;

    if (rotate) viewer.setAttribute('auto-rotate', '');
    else viewer.removeAttribute('auto-rotate');
    viewer.setAttribute('camera-orbit', `0deg 75deg ${zoom}%`);
    viewer.setAttribute('exposure', lighting.exposure);
    viewer.setAttribute('shadow-intensity', lighting.shadowIntensity);
    viewer.setAttribute('environment-image', lighting.environmentImage);

    if (scale !== 1) viewer.setAttribute('scale', `${scale} ${scale} ${scale}`);
    else viewer.removeAttribute('scale');

    if (isVegetationIndex) {
      viewer.style.filter = getIndexCSSFilter(colorMode as VegetationIndexType);
    } else {
      viewer.style.removeProperty('filter');
    }
  }, [displayUrl, rotate, zoom, scale, lighting, colorMode, isVegetationIndex]);

  const getOverlayStyle = (): React.CSSProperties | null => {
    if (colorMode === 'texture' || !displayUrl || isVegetationIndex) return null;

    if (colorMode === 'colorimetry' && colorimetryHex) {
      return {
        position: 'absolute', inset: 0, background: `${colorimetryHex}30`,
        pointerEvents: 'none', mixBlendMode: 'overlay', borderRadius: 'inherit'
      };
    }

    return null;
  };

  const overlayStyle = getOverlayStyle();

  const renderPlaceholder = () => {
    const getPlaceholderColor = () => {
      if (colorMode === 'colorimetry' && colorimetryHex) return colorimetryHex;
      if (isVegetationIndex && indexResult) return indexResult.color;
      return '#22c55e';
    };

    const baseColor = getPlaceholderColor();

    return (
      <div data-ev-id="ev_81b922d6ec" className="absolute inset-0 flex items-center justify-center">
        <div data-ev-id="ev_3e245a5acd"
        className={`relative ${rotate ? 'animate-spin-slow' : ''}`}
        style={{ transformStyle: 'preserve-3d', transform: `rotateX(-15deg) scale(${scale})` }}>

          <div data-ev-id="ev_8f1ea76cec" className="relative" style={{ transformStyle: 'preserve-3d' }}>
            <div data-ev-id="ev_bedc974dab"
            className="absolute rounded-full shadow-lg"
            style={{
              width: '100px', height: '30px', bottom: '-50px', left: '50%',
              transform: 'translateX(-50%) rotateX(70deg)',
              background: 'linear-gradient(135deg, #92400e 0%, #78350f 50%, #451a03 100%)'
            }} />

            <div data-ev-id="ev_991a6d2788"
            className="rounded-full shadow-xl"
            style={{
              width: '80px', height: '120px',
              background: `linear-gradient(135deg, ${baseColor} 0%, ${baseColor}dd 30%, ${baseColor}bb 70%, ${baseColor}99 100%)`,
              borderRadius: '40px', transform: 'translateZ(10px)',
              boxShadow: 'inset -8px -8px 20px rgba(0,0,0,0.2), inset 8px 8px 20px rgba(255,255,255,0.1)'
            }} />

            <div data-ev-id="ev_89d6a13a8b"
            className="absolute rounded-full shadow-lg"
            style={{
              width: '50px', height: '75px',
              background: `linear-gradient(135deg, ${baseColor}ee 0%, ${baseColor}cc 100%)`,
              borderRadius: '25px', top: '-30px', left: '-35px',
              transform: 'rotateZ(-30deg) translateZ(5px)'
            }} />

            <div data-ev-id="ev_132338eed9"
            className="absolute rounded-full shadow-lg"
            style={{
              width: '55px', height: '80px',
              background: `linear-gradient(135deg, ${baseColor}ee 0%, ${baseColor}cc 100%)`,
              borderRadius: '28px', top: '-25px', right: '-40px',
              transform: 'rotateZ(25deg) translateZ(5px)'
            }} />

            <div data-ev-id="ev_4314afe01a"
            className="absolute rounded-full shadow-lg"
            style={{
              width: '40px', height: '55px',
              background: `linear-gradient(135deg, ${baseColor} 0%, ${baseColor}dd 100%)`,
              borderRadius: '20px', top: '-70px', left: '50%',
              transform: 'translateX(-50%) rotateZ(-5deg) translateZ(15px)'
            }} />

          </div>
        </div>
      </div>);

  };

  return (
    <div data-ev-id="ev_61b39c54ee"
    className="relative w-full overflow-hidden rounded-xl border border-border bg-gradient-to-b from-muted/20 to-card"
    style={{ height }}>

      {displayUrl ?
      <>
          <div data-ev-id="ev_bc94b8f290" ref={viewerRef} style={{ width: '100%', height: '100%' }} />
          {overlayStyle && <div data-ev-id="ev_bc06a5630c" style={overlayStyle} />}
        </> :

      renderPlaceholder()
      }

      {/* Etiqueta superior izquierda */}
      <div data-ev-id="ev_b6309b9181" className="absolute left-3 top-3 flex flex-col gap-1.5">
        {displayUrl ?
        <div data-ev-id="ev_df385f5532" className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary backdrop-blur-sm">
            <Image className="h-3 w-3" /> Modelo texturizado
          </div> :

        <div data-ev-id="ev_46e2768412" className="rounded-md bg-card/90 px-2 py-1 text-xs backdrop-blur-sm">
            <Box className="mr-1 inline h-3 w-3" /> Vista previa
          </div>
        }
        {scale !== 1 &&
        <div data-ev-id="ev_03d59a44b5" className="rounded-md bg-accent/20 px-2 py-1 text-xs text-accent-foreground backdrop-blur-sm">
            Escala: {scale}x
          </div>
        }
      </div>

      {/* Panel de modos de color */}
      {showColorMode && displayUrl &&
      <div data-ev-id="ev_33d5e829d0" className="absolute bottom-12 left-3 top-20 flex flex-col gap-1.5 overflow-y-auto">
          <div data-ev-id="ev_8c1e2d3bfd" className="flex flex-col gap-1 rounded-md bg-card/95 p-1.5 backdrop-blur-sm">
            <span data-ev-id="ev_33819c8bf9" className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Modo</span>
            
            {/* Modos básicos */}
            <button data-ev-id="ev_1415ea1db5"
          onClick={() => setColorMode('texture')}
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${colorMode === 'texture' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>

              <Image className="h-3 w-3" /> Textura
            </button>

            {colorimetryHex &&
          <button data-ev-id="ev_c781dda95f"
          onClick={() => setColorMode('colorimetry')}
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${colorMode === 'colorimetry' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>

                <Palette className="h-3 w-3" /> Color
              </button>
          }
            
            {/* Botón de índices de vegetación */}
            <button data-ev-id="ev_5bb3ec3a30"
          onClick={() => setShowIndices(!showIndices)}
          className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${isVegetationIndex ? 'bg-green-600 text-white' : 'hover:bg-muted'}`}>

              <Leaf className="h-3 w-3" /> Índices VI
              {showIndices ? <ChevronUp className="ml-auto h-3 w-3" /> : <ChevronDown className="ml-auto h-3 w-3" />}
            </button>
          </div>

          {/* Sub-panel de índices de vegetación */}
          {showIndices &&
        <div data-ev-id="ev_bfb8ebf56b" className="flex flex-col gap-1 rounded-md bg-card/95 p-1.5 backdrop-blur-sm">
              <div data-ev-id="ev_478cf7cc7d" className="flex items-center justify-between px-1">
                <span data-ev-id="ev_55003f25b5" className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Índices RGB</span>
                <button data-ev-id="ev_6eb5ea7f58" onClick={() => setShowIndexInfo(!showIndexInfo)} className="text-muted-foreground hover:text-foreground">
                  <Info className="h-3 w-3" />
                </button>
              </div>
              {VEGETATION_INDEX_KEYS.map((key) =>
          <button data-ev-id="ev_dfc565ba14"
          key={key}
          onClick={() => setColorMode(key)}
          className={`flex items-center justify-between rounded px-2 py-1 text-xs transition-colors ${
          colorMode === key ? 'bg-green-600 text-white' : 'hover:bg-muted'}`
          }>

                  <span data-ev-id="ev_5f6e276f9c">{VEGETATION_INDICES[key].name}</span>
                  <span data-ev-id="ev_eff95f3553" className="text-[10px] opacity-70">{VEGETATION_INDICES[key].formula}</span>
                </button>
          )}
            </div>
        }

          {/* Control de iluminación */}
          <button data-ev-id="ev_735a3cba0a"
        onClick={() => setShowLighting(!showLighting)}
        className="flex items-center gap-1.5 rounded-md bg-card/95 px-2 py-1.5 text-xs backdrop-blur-sm hover:bg-card">

            <Sun className="h-3 w-3" /> Luz: {lighting.label}
          </button>

          {showLighting &&
        <div data-ev-id="ev_2e43b6ec4f" className="flex flex-col gap-1 rounded-md bg-card/95 p-1.5 backdrop-blur-sm">
              {(['neutral', 'studio', 'natural'] as LightingMode[]).map((mode) =>
          <button data-ev-id="ev_7eceb48c9d"
          key={mode}
          onClick={() => {setLightingMode(mode);setShowLighting(false);}}
          className={`rounded px-2 py-1 text-xs transition-colors ${lightingMode === mode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>

                  {LIGHTING_CONFIGS[mode].label}
                </button>
          )}
            </div>
        }

          {/* Indicador de colorimetría */}
          {colorMode === 'colorimetry' && colorimetryHex &&
        <div data-ev-id="ev_520c469da2" className="flex items-center gap-1.5 rounded-md bg-card/95 px-2 py-1 text-xs backdrop-blur-sm">
              <div data-ev-id="ev_43589dbbdc" className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: colorimetryHex }} />
              {colorimetryHex}
            </div>
        }

          {/* Resultado del índice de vegetación */}
          {isVegetationIndex && currentIndex && indexResult &&
        <div data-ev-id="ev_67b3cc8f6f" className="rounded-md bg-card/95 p-2 backdrop-blur-sm">
              <div data-ev-id="ev_a58b0b0ff4" className="mb-1 flex items-center justify-between">
                <span data-ev-id="ev_3ba8a0f67a" className="text-xs font-medium">{currentIndex.name}</span>
                <span data-ev-id="ev_d02c94dfcd" className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
            indexResult.status === 'healthy' ? 'bg-green-100 text-green-800' :
            indexResult.status === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'}`
            }>
                  {indexResult.status === 'healthy' ? 'Sano' : indexResult.status === 'moderate' ? 'Moderado' : 'Estrés'}
                </span>
              </div>
              <div data-ev-id="ev_400ab6e03e" className="mb-1 text-lg font-bold" style={{ color: indexResult.color }}>
                {indexResult.value}
              </div>
              {/* Barra de escala */}
              <div data-ev-id="ev_7e665d7709" className="relative h-2 w-full overflow-hidden rounded-full" style={{ background: getIndexGradient() }}>
                <div data-ev-id="ev_42325e8947"
            className="absolute top-0 h-full w-1 -translate-x-1/2 border border-white bg-black"
            style={{ left: `${indexResult.normalized}%` }} />

              </div>
              <div data-ev-id="ev_cd18cf5fe6" className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                <span data-ev-id="ev_f294ce4e65">Estrés</span>
                <span data-ev-id="ev_d81251a908">Moderado</span>
                <span data-ev-id="ev_71328c5113">Sano</span>
              </div>
            </div>
        }
        </div>
      }

      {/* Panel de información del índice */}
      {showIndexInfo && isVegetationIndex && currentIndex &&
      <div data-ev-id="ev_7c026d819e" className="absolute left-1/2 top-1/2 z-10 w-72 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-4 shadow-xl">
          <button data-ev-id="ev_6dfc8a3639" onClick={() => setShowIndexInfo(false)} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
            ×
          </button>
          <h4 data-ev-id="ev_d43282e043" className="font-semibold text-primary">{currentIndex.fullName}</h4>
          <p data-ev-id="ev_84bdb48509" className="mt-1 font-mono text-sm text-muted-foreground">{currentIndex.formula}</p>
          <p data-ev-id="ev_663590cb3d" className="mt-2 text-sm">{currentIndex.description}</p>
          <p data-ev-id="ev_717324c458" className="mt-2 text-xs text-muted-foreground">Ref: {currentIndex.reference}</p>
          
          {colorimetryHex &&
        <div data-ev-id="ev_80f5219243" className="mt-3 border-t border-border pt-3">
              <p data-ev-id="ev_f916b8e951" className="text-xs text-muted-foreground">Color analizado:</p>
              <div data-ev-id="ev_8455c7bb77" className="mt-1 flex items-center gap-2">
                <div data-ev-id="ev_ca2a7e8a53" className="h-6 w-6 rounded border" style={{ backgroundColor: colorimetryHex }} />
                <span data-ev-id="ev_cd73b2a129" className="font-mono text-sm">{colorimetryHex}</span>
                <span data-ev-id="ev_eecf385228" className="text-xs text-muted-foreground">RGB({colorRgb.r}, {colorRgb.g}, {colorRgb.b})</span>
              </div>
            </div>
        }
        </div>
      }

      {/* Botón de subida */}
      {showUpload &&
      <div data-ev-id="ev_3b6faf1c36" className="absolute right-3 top-3">
          <input data-ev-id="ev_2bc4cf17bc"
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf,.obj"
        onChange={handleFileChange}
        className="hidden" />

          <button data-ev-id="ev_f5aef74b0d"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-md border border-border bg-card/90 px-2.5 py-1.5 text-xs backdrop-blur-sm transition-colors hover:bg-card">

            <Upload className="h-3.5 w-3.5" /> Subir .glb
          </button>
        </div>
      }

      {/* Controles de cámara */}
      <div data-ev-id="ev_15f59dcc47" className="absolute bottom-3 right-3 flex flex-row gap-1">
        <button data-ev-id="ev_2cdbfc5fbd"
        onClick={() => setRotate(!rotate)}
        className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${rotate ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card/80 text-muted-foreground hover:bg-card'}`}
        title={rotate ? 'Detener rotación' : 'Rotar'}>

          <RotateCcw className="h-4 w-4" />
        </button>
        <button data-ev-id="ev_5434dac045"
        onClick={() => setZoom((z) => Math.min(300, z + 25))}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground transition-colors hover:bg-card"
        title="Acercar">

          <ZoomIn className="h-4 w-4" />
        </button>
        <button data-ev-id="ev_c18b018d39"
        onClick={() => setZoom((z) => Math.max(30, z - 25))}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground transition-colors hover:bg-card"
        title="Alejar">

          <ZoomOut className="h-4 w-4" />
        </button>
      </div>

      <div data-ev-id="ev_b6ab75c8eb" className="absolute bottom-3 left-3 rounded-md bg-card/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
        .glb con texturas embebidas
      </div>
    </div>);

}