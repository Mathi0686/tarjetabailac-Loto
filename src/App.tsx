import React, { useState, useRef } from 'react';
import {
  FileDown,
  Camera,
  ZoomIn,
  ZoomOut,
  Trash2,
  Eye,
  Edit3,
  Loader2,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import {
  BAILAC_LOGO_BASE64,
  HAZARD_STRIPES_PNG_BASE64,
  LotoCardData,
  INITIAL_CARD_DATA,
  DORSO_PROCEDIMIENTO_POINTS
} from './constants';

export default function App() {
  const [data, setData] = useState<LotoCardData>(INITIAL_CARD_DATA);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [zoomScale, setZoomScale] = useState<number>(1.25);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string>('');
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFrontRef = useRef<HTMLDivElement>(null);
  const cardBackRef = useRef<HTMLDivElement>(null);

  // Field change handler
  const handleFieldChange = (field: keyof LotoCardData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // Photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setData((prev) => ({
        ...prev,
        fotoUrl: result,
        fotoZoom: 1,
        fotoOffsetY: 0,
        fotoOffsetX: 0,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (mode === 'preview') return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setData((prev) => ({
          ...prev,
          fotoUrl: result,
          fotoZoom: 1,
          fotoOffsetY: 0,
          fotoOffsetX: 0,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdjustZoom = (delta: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setData((prev) => ({
      ...prev,
      fotoZoom: Math.max(0.7, Math.min(3.5, Number((prev.fotoZoom + delta).toFixed(2)))),
    }));
  };

  const handleAdjustOffset = (deltaY: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setData((prev) => ({
      ...prev,
      fotoOffsetY: Math.max(-80, Math.min(80, prev.fotoOffsetY + deltaY)),
    }));
  };

  const handleRemovePhoto = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setData((prev) => ({
      ...prev,
      fotoUrl: null,
      fotoZoom: 1,
      fotoOffsetY: 0,
      fotoOffsetX: 0,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearData = () => {
    if (window.confirm('¿Desea restablecer los campos de la tarjeta? (La empresa mantendrá BAILAC ARGENTINA SRL)')) {
      setData(INITIAL_CARD_DATA);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Apply exact 13mm x 13mm 45-degree chamfered corners and crisp 6-sided border on Canvas
  const applyChamferAndBorder = (sourceCanvas: HTMLCanvasElement): HTMLCanvasElement => {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const chamferPx = w * (13 / 75);

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    if (!ctx) return sourceCanvas;

    // Clean white background outside chamfered corners
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const traceChamferPolygon = (inset = 0) => {
      const c = chamferPx;
      ctx.beginPath();
      ctx.moveTo(c + inset * 0.4, inset);
      ctx.lineTo(w - c - inset * 0.4, inset);
      ctx.lineTo(w - inset, c + inset * 0.4);
      ctx.lineTo(w - inset, h - inset);
      ctx.lineTo(inset, h - inset);
      ctx.lineTo(inset, c + inset * 0.4);
      ctx.closePath();
    };

    // Clip and draw card content cleanly
    ctx.save();
    traceChamferPolygon(0);
    ctx.clip();
    ctx.drawImage(sourceCanvas, 0, 0);
    ctx.restore();

    // Draw crisp cutting perimeter line around all 6 edges (including both angled top corners)
    const lineW = Math.max(1.5, w * 0.003);
    ctx.save();
    traceChamferPolygon(lineW / 2);
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = lineW;
    ctx.lineJoin = 'miter';
    ctx.stroke();
    ctx.restore();

    return out;
  };

  // CAPTURE CARDS AT 300 DPI EQUIVALENT (Lossless PNG)
  const captureCardCanvases = async () => {
    if (!cardFrontRef.current || !cardBackRef.current) {
      throw new Error('No se encontraron los elementos de la tarjeta para exportar.');
    }

    const prepareCloneForCapture = (clonedDoc: Document) => {
      // Remove CSS clip-path in clone so html2canvas captures the full unclipped rectangle cleanly
      clonedDoc.querySelectorAll('.loto-card').forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.clipPath = 'none';
        (htmlEl.style as unknown as Record<string, string>).webkitClipPath = 'none';
        htmlEl.style.boxShadow = 'none';
        htmlEl.style.border = 'none';
      });
      // Hide screen SVG border because applyChamferAndBorder draws the exact crisp outline
      clonedDoc.querySelectorAll('[data-chamfer-border="true"]').forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });
    };

    const rawFront = await html2canvas(cardFrontRef.current, {
      scale: 3.0,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: prepareCloneForCapture,
    });

    const rawBack = await html2canvas(cardBackRef.current, {
      scale: 3.0,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: prepareCloneForCapture,
    });

    return {
      canvasFront: applyChamferAndBorder(rawFront),
      canvasBack: applyChamferAndBorder(rawBack),
    };
  };

  // 1. GENERATE CARD IN EXACT A4 PDF (75mm x 160mm exact physical size, centered, fold line)
  const handleGenerateCard = async () => {
    setIsExporting(true);
    setExportMessage('Generando Tarjeta en hoja A4 a escala 100% (75×160 mm)...');
    const prevMode = mode;
    const prevScale = zoomScale;

    // Temporarily switch to preview mode & 1.0 scale to capture pristine render
    setMode('preview');
    setZoomScale(1.0);

    // Allow DOM to settle
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const { canvasFront, canvasBack } = await captureCardCanvases();

      const imgFront = canvasFront.toDataURL('image/png');
      const imgBack = canvasBack.toDataURL('image/png');

      // Create single A4 PDF (210mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Header on A4 page
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(20, 20, 20);
      pdf.text('ESTÁNDAR DE SEGURIDAD LOTO — VICUÑA', 105, 18, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 100, 100);
      pdf.text('BAILAC ARGENTINA S.R.L.  |  CONTROL DE LIBERACIÓN DE ENERGÍA', 105, 24, { align: 'center' });
      pdf.text('Tamaño real 1:1 (75 mm de ancho × 160 mm de alto por cara)  —  Imprimir al 100% sin ajuste', 105, 29, { align: 'center' });

      // Subtle top divider line
      pdf.setDrawColor(210, 215, 220);
      pdf.setLineWidth(0.4);
      pdf.line(20, 33, 190, 33);

      // Cards Placement (Symmetrically centered on A4: center is 105mm)
      // Front: x = 24mm to 99mm (width 75mm, height 160mm)
      // Back:  x = 111mm to 186mm (width 75mm, height 160mm)
      // Gap: 12mm (from 99mm to 111mm, centered at 105mm)
      const cardY = 44;
      const cardW = 75;
      const cardH = 160;
      const frontX = 24;
      const backX = 111;
      const centerX = 105;

      // Add Card Images (Lossless PNG for crystal clarity)
      pdf.addImage(imgFront, 'PNG', frontX, cardY, cardW, cardH);
      pdf.addImage(imgBack, 'PNG', backX, cardY, cardW, cardH);

      // Central Dashed Fold Line
      pdf.setDrawColor(160, 170, 180);
      pdf.setLineDashPattern([2, 2], 0);
      pdf.setLineWidth(0.35);
      pdf.line(centerX, cardY - 5, centerX, cardY + cardH + 5);

      // Label on fold line
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(6.5);
      pdf.setTextColor(130, 140, 150);
      pdf.text('LÍNEA DE PLEGADO', centerX, cardY - 6.5, { align: 'center' });

      // Labels below each card
      pdf.setFontSize(7.5);
      pdf.setTextColor(80, 80, 80);
      pdf.text('FRENTE (75 × 160 mm)', frontX + cardW / 2, cardY + cardH + 7, { align: 'center' });
      pdf.text('DORSO (75 × 160 mm)', backX + cardW / 2, cardY + cardH + 7, { align: 'center' });

      // Reset dashed line to solid
      pdf.setLineDashPattern([], 0);
      pdf.setDrawColor(210, 215, 220);
      pdf.setLineWidth(0.4);
      pdf.line(20, 222, 190, 222);

      // Instructions box at the bottom
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(40, 40, 40);
      pdf.text('INSTRUCCIONES DE MONTAJE Y PLASTIFICADO:', 24, 230);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(80, 80, 80);
      pdf.text('1. Imprimir este documento en hoja A4 en escala 100% (sin ajuste o "tamaño real").', 24, 236);
      pdf.text('2. Recortar cuidadosamente siguiendo el contorno exterior de cada cara.', 24, 241);
      pdf.text('3. Plegar por la línea punteada central para unir y alinear Frente y Dorso perfectamente.', 24, 246);
      pdf.text('4. Perforar el ojalillo superior de 8 mm y plastificar con film plástico térmico de 150 micrones.', 24, 251);

      // Branding at the bottom right
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(217, 28, 28);
      pdf.text('BAILAC ARGENTINA S.R.L.', 186, 251, { align: 'right' });

      // Save PDF
      const safeName = (data.trabajador.trim() || 'LOTO').replace(/\s+/g, '_');
      pdf.save(`Tarjeta_Bloqueo_LOTO_${safeName}_A4.pdf`);

      setDownloadSuccessToast('¡Tarjeta descargada en PDF A4 a tamaño real (75×160 mm)!');
      setTimeout(() => setDownloadSuccessToast(null), 8000);
    } catch (err: any) {
      console.error('Card export error:', err);
      alert('Ocurrió un inconveniente al generar la tarjeta: ' + err.message);
    } finally {
      setMode(prevMode);
      setZoomScale(prevScale);
      setIsExporting(false);
      setExportMessage('');
    }
  };

  // 2. DOWNLOAD AS COMBINED HIGH-RES PNG IMAGE (Side by side 75x160mm)
  const handleDownloadImagePng = async () => {
    setIsExporting(true);
    setExportMessage('Generando imagen de alta resolución (PNG)...');
    const prevMode = mode;
    const prevScale = zoomScale;

    setMode('preview');
    setZoomScale(1.0);
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const { canvasFront, canvasBack } = await captureCardCanvases();

      // Stitch side-by-side into single high-resolution canvas with 50px gap and fold guide
      const gap = 40;
      const combined = document.createElement('canvas');
      combined.width = canvasFront.width + canvasBack.width + gap;
      combined.height = Math.max(canvasFront.height, canvasBack.height);

      const ctx = combined.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, combined.width, combined.height);

        // Draw Front
        ctx.drawImage(canvasFront, 0, 0);

        // Draw Fold Line
        const foldX = canvasFront.width + gap / 2;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(foldX, 20);
        ctx.lineTo(foldX, combined.height - 20);
        ctx.stroke();

        // Draw Back
        ctx.drawImage(canvasBack, canvasFront.width + gap, 0);
      }

      const imgData = combined.toDataURL('image/png');
      const safeName = (data.trabajador.trim() || 'LOTO').replace(/\s+/g, '_');
      const a = document.createElement('a');
      a.href = imgData;
      a.download = `Tarjeta_Bloqueo_LOTO_${safeName}_75x160mm.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloadSuccessToast('¡Imagen PNG de alta resolución descargada exitosamente!');
      setTimeout(() => setDownloadSuccessToast(null), 6000);
    } catch (err: any) {
      console.error('PNG export error:', err);
      alert('Error al generar la imagen: ' + err.message);
    } finally {
      setMode(prevMode);
      setZoomScale(prevScale);
      setIsExporting(false);
      setExportMessage('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 selection:bg-red-500 selection:text-white">
      {/* ============================================================ */}
      {/* TOP TOOLBAR (SIMPLIFIED) */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white shadow-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 no-print">
        {/* Left Section: Bailac Logo & Branding */}
        <div className="flex items-center gap-3">
          {/* Official Bailac Logo in the top panel */}
          <div className="bg-white px-2 py-1 rounded shadow-xs flex items-center justify-center">
            <img
              src="/bailac_logo.png"
              alt="Bailac Argentina S.R.L."
              className="h-6 sm:h-7 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = BAILAC_LOGO_BASE64;
              }}
            />
          </div>

          <div>
            <h1 className="font-black text-sm tracking-tight text-white flex items-center gap-1.5 leading-none">
              TARJETA LOTO
              <span className="text-[10px] font-bold text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800/50">
                75×160mm
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-none">
              Bailac Argentina S.R.L.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-800/90 p-1 rounded-lg border border-slate-700/80 ml-2">
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                mode === 'edit'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Modo Edición
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                mode === 'preview'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Vista Previa
            </button>
          </div>
        </div>

        {/* Center: Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClearData}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-red-950/40 text-red-300 hover:bg-red-900/60 border border-red-800/40 transition-colors"
            title="Limpiar datos de la tarjeta"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar Datos</span>
          </button>
        </div>

        {/* Right Section: SINGLE DEDICATED ACTION BUTTON: GENERAR TARJETA */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateCard}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-extrabold bg-[#d91c1c] hover:bg-[#b91c1c] text-white shadow-lg shadow-red-950/40 transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            title="Generar y descargar tarjeta LOTO a escala 100% (75×160 mm)"
          >
            <FileDown className="w-4 h-4" />
            <span>Generar Tarjeta</span>
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* SECONDARY CONTROL BAR: Zoom & Helpful UX Hints */}
      {/* ============================================================ */}
      <div className="bg-slate-200/90 backdrop-blur-xs border-b border-slate-300 px-4 py-1.5 flex items-center justify-between text-xs text-slate-700 no-print flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {mode === 'edit' ? (
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <strong>Modo Edición:</strong> Completa los datos sobre los renglones o haz clic en el recuadro para subir tu foto.
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-slate-700 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
              <strong>Vista Previa limpia:</strong> Ambas caras listas para plastificar (75 mm × 160 mm).
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isExporting && (
            <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              <span>{exportMessage}</span>
            </div>
          )}

          {/* Screen Zoom Scale Controls */}
          <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-full border border-slate-300 shadow-xs">
            <span className="text-slate-500 font-medium">Escala:</span>
            <button
              type="button"
              onClick={() => setZoomScale((prev) => Math.max(0.7, Number((prev - 0.1).toFixed(1))))}
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
              title="Alejar"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold text-slate-800 w-10 text-center">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomScale((prev) => Math.min(2.0, Number((prev + 0.1).toFixed(1))))}
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
              title="Acercar"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1.0)}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-700"
            >
              100% Real
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1.25)}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded font-bold text-slate-700"
            >
              125% Cómodo
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MAIN WORKSPACE CANVAS (ALWAYS SHOWS BOTH FACES SIDE-BY-SIDE) */}
      {/* ============================================================ */}
      <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center justify-start">
        <div
          className="cards-print-layout flex flex-wrap items-start justify-center gap-8 md:gap-14 my-4 transition-transform duration-200 origin-top"
          style={{
            transform: `scale(${zoomScale})`,
            transformOrigin: 'top center',
          }}
        >
          {/* ============================================================ */}
          {/* FRENTE (7,5 cm x 16 cm) */}
          {/* ============================================================ */}
          <div className="flex flex-col items-center gap-2">
            <div className="no-print">
              <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider shadow-xs">
                Frente (7,5 cm × 16 cm)
              </span>
            </div>

            {/* CARD FRONT ELEMENT */}
            <div
              ref={cardFrontRef}
              className="loto-card loto-card-print relative select-text card-chamfer shadow-2xl transition-all hazard-stripes-bg overflow-hidden"
              style={{
                width: '75mm',
                height: '160mm',
                minWidth: '75mm',
                minHeight: '160mm',
                maxWidth: '75mm',
                maxHeight: '160mm',
                backgroundColor: '#ffffff',
                backgroundImage: `url(${HAZARD_STRIPES_PNG_BASE64})`,
                backgroundRepeat: 'repeat',
                backgroundSize: '44px 44px',
              }}
            >
              {/* Crisp 6-sided chamfered outline on screen */}
              <svg
                data-chamfer-border="true"
                viewBox="0 0 75 160"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none z-40"
              >
                <polygon
                  points="13,0.2 62,0.2 74.8,13 74.8,159.8 0.2,159.8 0.2,13"
                  fill="none"
                  stroke="rgba(15, 23, 42, 0.45)"
                  strokeWidth="0.4"
                />
              </svg>
              {/* Reinforced Eyelet Ojalillo (Yellow Ring, White Inner) */}
              <div className="absolute top-[4.5mm] left-1/2 -translate-x-1/2 w-[8.8mm] h-[8.8mm] rounded-full border-[2.2px] border-[#eab308] bg-white flex items-center justify-center shadow-xs z-30 pointer-events-none">
                <div className="w-[5.2mm] h-[5.2mm] rounded-full bg-white border border-slate-300 shadow-inner" />
              </div>

              {/* PELIGRO badge (Black box with red oval and white bold text) */}
              <div className="absolute top-[14mm] left-1/2 -translate-x-1/2 w-[53mm] h-[17.5mm] bg-black rounded-[1.5px] flex items-center justify-center p-[2.2mm] shadow-md z-20">
                <div className="w-full h-full bg-[#d91c1c] rounded-[50%_/_50%] border-[1.6px] border-white flex items-center justify-center">
                  <span className="text-white font-hazard text-[21pt] font-black tracking-wider leading-none select-none">
                    PELIGRO
                  </span>
                </div>
              </div>

              {/* EQUIPO BLOQUEADO POR (Directly on stripes) */}
              <div className="absolute top-[33.5mm] left-0 right-0 text-center z-10 px-2">
                <h2 className="font-black text-[10.5pt] leading-[1.08] text-black uppercase tracking-tight">
                  EQUIPO<br />BLOQUEADO POR
                </h2>
              </div>

              {/* Middle Row: Tagline + Photo Box */}
              <div className="absolute top-[44.5mm] left-[4mm] right-[4mm] flex items-center justify-between h-[28.5mm] z-10">
                {/* Tagline aligned to match height of photo box */}
                <div className="w-[36mm] h-[28mm] flex flex-col justify-between py-[0.5mm]">
                  <span className="font-black text-[11.2pt] leading-none text-black uppercase tracking-tight">MI VIDA</span>
                  <span className="font-black text-[11.2pt] leading-none text-black uppercase tracking-tight">DEPENDE</span>
                  <span className="font-black text-[11.2pt] leading-none text-black uppercase tracking-tight">DE ESTA</span>
                  <span className="font-black text-[11.2pt] leading-none text-black uppercase tracking-tight">TARJETA</span>
                </div>

                {/* Interactive Photo Box */}
                <div
                  className={`photo-box-wrap relative w-[25mm] h-[28mm] border-[1.8px] border-black bg-white overflow-hidden flex flex-col items-center justify-center transition-colors group ${
                    mode === 'edit' ? 'cursor-pointer hover:border-[#d91c1c]' : ''
                  }`}
                  onClick={() => {
                    if (mode === 'edit') fileInputRef.current?.click();
                  }}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  title={mode === 'edit' ? 'Haz clic para cargar o arrastra una foto aquí' : ''}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />

                  {data.fotoUrl ? (
                    <>
                      <img
                        src={data.fotoUrl}
                        alt="Trabajador autorizado"
                        className="w-full h-full object-cover select-none pointer-events-none transition-transform"
                        style={{
                          transform: `scale(${data.fotoZoom}) translateY(${data.fotoOffsetY}px) translateX(${data.fotoOffsetX}px)`,
                        }}
                      />

                      {/* Edit Controls Overlay */}
                      {mode === 'edit' && (
                        <div
                          className="absolute inset-x-0 bottom-0 bg-slate-900/90 backdrop-blur-xs py-1 px-1 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleAdjustZoom(0.15, e)}
                            className="w-4 h-4 bg-white/20 hover:bg-[#d91c1c] text-white rounded text-[10px] flex items-center justify-center"
                            title="Acercar zoom"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleAdjustZoom(-0.15, e)}
                            className="w-4 h-4 bg-white/20 hover:bg-[#d91c1c] text-white rounded text-[10px] flex items-center justify-center"
                            title="Alejar zoom"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleAdjustOffset(-8, e)}
                            className="w-4 h-4 bg-white/20 hover:bg-[#d91c1c] text-white rounded text-[9px] flex items-center justify-center"
                            title="Mover arriba"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleAdjustOffset(8, e)}
                            className="w-4 h-4 bg-white/20 hover:bg-[#d91c1c] text-white rounded text-[9px] flex items-center justify-center"
                            title="Mover abajo"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRemovePhoto(e)}
                            className="w-4 h-4 bg-red-600/80 hover:bg-red-700 text-white rounded text-[9px] flex items-center justify-center"
                            title="Quitar foto"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-1 text-center text-slate-500 select-none">
                      {mode === 'edit' ? (
                        <>
                          <Camera className="w-5 h-5 stroke-[1.6] text-slate-400 mb-0.5 group-hover:text-[#d91c1c] transition-colors" />
                          <span className="text-[6pt] font-black uppercase text-slate-600 leading-tight">
                            Clic para<br />subir foto
                          </span>
                        </>
                      ) : (
                        <div className="w-full h-full bg-white flex items-center justify-center">
                          <span className="text-[6pt] font-bold text-slate-300 uppercase">FOTO</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* White Inset Form Panel */}
              <div
                className="absolute top-[75.5mm] left-[3.5mm] right-[3.5mm] bottom-[3.5mm] bg-white px-[2.8mm] py-[2.2mm] flex flex-col justify-between z-10 overflow-hidden"
              >
                {/* Ultra-subtle corporate security watermark (employee data area) */}
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 bottom-[10mm] overflow-hidden pointer-events-none select-none z-0 flex items-center justify-center"
                >
                  {/* Soft diagonal micro-text security grid */}
                  <div
                    className="flex flex-col items-center justify-center gap-[5.8mm]"
                    style={{
                      transform: 'rotate(-24deg)',
                      width: '140%',
                    }}
                  >
                    {[0, 1, 2, 3, 4, 5, 6].map((row) => (
                      <div
                        key={row}
                        className="whitespace-nowrap uppercase font-extrabold tracking-[0.22em]"
                        style={{
                          fontSize: '4.5pt',
                          color: 'rgba(15, 23, 42, 0.048)',
                          marginLeft: row % 2 === 0 ? '-8mm' : '8mm',
                        }}
                      >
                        BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L.
                      </div>
                    ))}
                  </div>

                  {/* Subtle centered ghost emblem */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ transform: 'rotate(-24deg)' }}
                  >
                    <span
                      className="font-black uppercase tracking-[0.18em] leading-none"
                      style={{
                        fontSize: '19pt',
                        color: 'rgba(15, 23, 42, 0.036)',
                      }}
                    >
                      BAILAC
                    </span>
                    <span
                      className="font-extrabold uppercase tracking-[0.28em] mt-[0.8mm]"
                      style={{
                        fontSize: '5.2pt',
                        color: 'rgba(15, 23, 42, 0.042)',
                      }}
                    >
                      ARGENTINA S.R.L.
                    </span>
                  </div>
                </div>

                {/* Field 1: TRABAJADOR AUTORIZADO */}
                <div className="relative z-10 flex flex-col">
                  <span className="text-[7pt] font-black text-black uppercase tracking-wide leading-none mb-[0.8mm]">
                    TRABAJADOR AUTORIZADO:
                  </span>
                  <div className="relative w-full border-b-[1.5px] border-black pb-[1px]">
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={data.trabajador}
                        onChange={(e) => handleFieldChange('trabajador', e.target.value)}
                        placeholder="NOMBRE Y APELLIDO COMPLETO"
                        className="w-full border-none outline-none bg-transparent text-[8.5pt] font-bold text-black uppercase h-[16px] leading-[16px] px-0.5 hover:bg-red-500/5 focus:bg-red-500/10 focus:outline-dashed focus:outline-1 focus:outline-red-500/60 rounded-xs transition-colors placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal placeholder:text-[7.5pt]"
                      />
                    ) : (
                      <div className="text-[8.5pt] font-bold text-black uppercase h-[16px] leading-[16px] px-0.5 truncate">
                        {data.trabajador || '\u00A0'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Field 2: DNI / RUT (Inline on same line) */}
                <div className="relative z-10 flex items-end gap-1.5 border-b-[1.5px] border-black pb-[1px]">
                  <span className="text-[7pt] font-black text-black uppercase tracking-wide leading-none whitespace-nowrap mb-[1px]">
                    DNI / RUT:
                  </span>
                  {mode === 'edit' ? (
                    <input
                      type="text"
                      value={data.dniRut}
                      onChange={(e) => handleFieldChange('dniRut', e.target.value)}
                      placeholder="NÚMERO DE DOCUMENTO"
                      className="flex-1 border-none outline-none bg-transparent text-[8.5pt] font-bold text-black uppercase h-[16px] leading-[16px] px-0.5 hover:bg-red-500/5 focus:bg-red-500/10 focus:outline-dashed focus:outline-1 focus:outline-red-500/60 rounded-xs transition-colors placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal placeholder:text-[7.5pt]"
                    />
                  ) : (
                    <div className="flex-1 text-[8.5pt] font-bold text-black uppercase h-[16px] leading-[16px] px-0.5 truncate">
                      {data.dniRut || '\u00A0'}
                    </div>
                  )}
                </div>

                {/* Field 3: SUPERVISOR */}
                <div className="relative z-10 flex flex-col">
                  <span className="text-[7pt] font-black text-black uppercase tracking-wide leading-none mb-[0.8mm]">
                    SUPERVISOR:
                  </span>
                  <div className="relative w-full border-b-[1.5px] border-black pb-[1px]">
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={data.supervisor}
                        onChange={(e) => handleFieldChange('supervisor', e.target.value)}
                        placeholder="SUPERVISOR A CARGO"
                        className="w-full border-none outline-none bg-transparent text-[8.5pt] font-bold text-black uppercase h-[16px] leading-[16px] px-0.5 hover:bg-red-500/5 focus:bg-red-500/10 focus:outline-dashed focus:outline-1 focus:outline-red-500/60 rounded-xs transition-colors placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal placeholder:text-[7.5pt]"
                      />
                    ) : (
                      <div className="text-[8.5pt] font-bold text-black uppercase h-[16px] leading-[16px] px-0.5 truncate">
                        {data.supervisor || '\u00A0'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Field 4: EMPRESA */}
                <div className="relative z-10 flex flex-col">
                  <span className="text-[7pt] font-black text-black uppercase tracking-wide leading-none mb-[0.8mm]">
                    EMPRESA:
                  </span>
                  <div className="relative w-full border-b-[1.5px] border-black pb-[1px]">
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={data.empresa}
                        onChange={(e) => handleFieldChange('empresa', e.target.value)}
                        placeholder="EMPRESA"
                        className="w-full border-none outline-none bg-transparent text-[8.5pt] font-bold text-black uppercase h-[16px] leading-[16px] px-0.5 hover:bg-red-500/5 focus:bg-red-500/10 focus:outline-dashed focus:outline-1 focus:outline-red-500/60 rounded-xs transition-colors placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal placeholder:text-[7.5pt]"
                      />
                    ) : (
                      <div className="text-[8.5pt] font-bold text-black uppercase h-[16px] leading-[16px] px-0.5 truncate">
                        {data.empresa || '\u00A0'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Field 5: TELÉFONO Y/O CANAL DE RADIO */}
                <div className="relative z-10 flex flex-col">
                  <span className="text-[7pt] font-black text-black uppercase tracking-wide leading-none mb-[0.8mm]">
                    TELÉFONO Y/O CANAL DE RADIO:
                  </span>
                  <div className="relative w-full border-b-[1.5px] border-black pb-[1px]">
                    {mode === 'edit' ? (
                      <input
                        type="text"
                        value={data.telefonoRadio}
                        onChange={(e) => handleFieldChange('telefonoRadio', e.target.value)}
                        placeholder="CANAL VHF / CELULAR"
                        className="w-full border-none outline-none bg-transparent text-[8.5pt] font-bold text-black uppercase h-[16px] leading-[16px] px-0.5 hover:bg-red-500/5 focus:bg-red-500/10 focus:outline-dashed focus:outline-1 focus:outline-red-500/60 rounded-xs transition-colors placeholder:text-slate-400 placeholder:normal-case placeholder:font-normal placeholder:text-[7.5pt]"
                      />
                    ) : (
                      <div className="text-[8.5pt] font-bold text-black uppercase h-[16px] leading-[16px] px-0.5 truncate">
                        {data.telefonoRadio || '\u00A0'}
                      </div>
                    )}
                  </div>
                </div>

                {/* BAILAC LOGO: FIXED AND CENTERED AT THE BOTTOM */}
                <div className="relative z-10 flex justify-center items-center pt-1.5 pb-0.5 pointer-events-none select-none">
                  <img
                    src="/bailac_logo.png"
                    alt="Bailac Argentina S.R.L."
                    className="h-[6.5mm] max-h-[7mm] w-auto object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = BAILAC_LOGO_BASE64;
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* DORSO (7,5 cm x 16 cm) */}
          {/* ============================================================ */}
          <div className="flex flex-col items-center gap-2">
            <div className="no-print">
              <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider shadow-xs">
                Dorso (7,5 cm × 16 cm)
              </span>
            </div>

            {/* CARD BACK ELEMENT */}
            <div
              ref={cardBackRef}
              className="loto-card loto-card-print relative select-text card-chamfer shadow-2xl transition-all hazard-stripes-bg overflow-hidden"
              style={{
                width: '75mm',
                height: '160mm',
                minWidth: '75mm',
                minHeight: '160mm',
                maxWidth: '75mm',
                maxHeight: '160mm',
                backgroundColor: '#ffffff',
                backgroundImage: `url(${HAZARD_STRIPES_PNG_BASE64})`,
                backgroundRepeat: 'repeat',
                backgroundSize: '44px 44px',
              }}
            >
              {/* Crisp 6-sided chamfered outline on screen */}
              <svg
                data-chamfer-border="true"
                viewBox="0 0 75 160"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none z-40"
              >
                <polygon
                  points="13,0.2 62,0.2 74.8,13 74.8,159.8 0.2,159.8 0.2,13"
                  fill="none"
                  stroke="rgba(15, 23, 42, 0.45)"
                  strokeWidth="0.4"
                />
              </svg>
              {/* Reinforced Eyelet Ojalillo (Yellow Ring, White Inner) */}
              <div className="absolute top-[4.5mm] left-1/2 -translate-x-1/2 w-[8.8mm] h-[8.8mm] rounded-full border-[2.2px] border-[#eab308] bg-white flex items-center justify-center shadow-xs z-30 pointer-events-none">
                <div className="w-[5.2mm] h-[5.2mm] rounded-full bg-white border border-slate-300 shadow-inner" />
              </div>

              {/* PELIGRO badge (Black box with red oval and white bold text) */}
              <div className="absolute top-[14mm] left-1/2 -translate-x-1/2 w-[53mm] h-[17.5mm] bg-black rounded-[1.5px] flex items-center justify-center p-[2.2mm] shadow-md z-20">
                <div className="w-full h-full bg-[#d91c1c] rounded-[50%_/_50%] border-[1.6px] border-white flex items-center justify-center">
                  <span className="text-white font-hazard text-[21pt] font-black tracking-wider leading-none select-none">
                    PELIGRO
                  </span>
                </div>
              </div>

              {/* EQUIPO BLOQUEADO POR (Directly on stripes) */}
              <div className="absolute top-[33.5mm] left-0 right-0 text-center z-10 px-2">
                <h2 className="font-black text-[10.5pt] leading-[1.08] text-black uppercase tracking-tight">
                  EQUIPO<br />BLOQUEADO POR
                </h2>
              </div>

              {/* White Inset Panel for PROCEDIMIENTO */}
              <div
                className="absolute top-[45.5mm] left-[3.5mm] right-[3.5mm] bottom-[3.5mm] bg-white px-[2.8mm] pt-[3mm] pb-[2mm] flex flex-col justify-between z-10"
              >
                {/* Top of panel: PROCEDIMIENTO + 6 Points */}
                <div>
                  <h3 className="text-[8.5pt] font-black text-black uppercase tracking-wide mb-[2.5mm] text-left">
                    PROCEDIMIENTO
                  </h3>

                  <div className="flex flex-col gap-[2.1mm]">
                    {DORSO_PROCEDIMIENTO_POINTS.map((paragraph, idx) => (
                      <p
                        key={idx}
                        className="text-[6.6pt] font-bold text-black uppercase leading-[1.26] text-justify tracking-[-0.01em]"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Bottom Highlighted Block with Red Corner Brackets */}
                <div className="relative px-[3mm] pt-[2.5mm] pb-[2mm] text-center my-[0.5mm]">
                  {/* Red L-shaped corner tick marks (bottom left and bottom right) */}
                  <div className="absolute bottom-0 left-0 w-[6mm] h-[6mm] border-b-[2.8px] border-l-[2.8px] border-[#d91c1c] pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-[6mm] h-[6mm] border-b-[2.8px] border-r-[2.8px] border-[#d91c1c] pointer-events-none" />

                  <div className="text-[8.2pt] font-black text-black uppercase leading-[1.22] mb-[1.2mm] tracking-tight">
                    ESTA ETIQUETA Y BLOQUEO<br />SOLO DEBEN SER RETIRADOS<br />POR LA PERSONA IDENTIFICADA
                  </div>
                  <div className="text-[12.5pt] font-black text-[#d91c1c] uppercase tracking-wide leading-none">
                    EN EL REVERSO
                  </div>
                </div>

                {/* BAILAC LOGO: FIXED AND CENTERED AT THE BOTTOM */}
                <div className="flex justify-center items-center pt-1.5 pb-0.5 pointer-events-none select-none">
                  <img
                    src="/bailac_logo.png"
                    alt="Bailac Argentina S.R.L."
                    className="h-[6.5mm] max-h-[7mm] w-auto object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = BAILAC_LOGO_BASE64;
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification when card is generated with option to also download PNG */}
      {downloadSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 no-print">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-white">{downloadSuccessToast}</p>
            <p className="text-slate-400 mt-0.5">
              Escala 100% exacta (75×160 mm por cara) lista para imprimir y plastificar.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadImagePng}
            disabled={isExporting}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition-colors cursor-pointer"
            title="Descargar también copia en imagen PNG de alta resolución"
          >
            <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>Descargar PNG</span>
          </button>
          <button
            type="button"
            onClick={() => setDownloadSuccessToast(null)}
            className="text-slate-400 hover:text-white text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
