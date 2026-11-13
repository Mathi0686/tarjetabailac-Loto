import { BAILAC_LOGO_BASE64, HAZARD_STRIPES_PNG_BASE64, LotoCardData } from './constants';

export function generateStandaloneHtml(data: LotoCardData = {
  trabajador: '',
  dniRut: '',
  supervisor: '',
  empresa: 'BAILAC ARGENTINA SRL',
  telefonoRadio: '',
  fotoUrl: null,
  fotoZoom: 1,
  fotoOffsetY: 0,
  fotoOffsetX: 0,
  logoPosition: 'both',
  logoScale: 1,
  logoOpacity: 1
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generador de Tarjetas de Bloqueo LOTO - Bailac Argentina</title>
  <meta name="description" content="Generador interactivo de tarjetas de bloqueo y etiquetado (LOTO) a escala real 1:1 (75mm x 160mm) para Bailac Argentina S.R.L.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <!-- CDN dependencies for PDF and PNG export (with oklch and modern CSS color support) -->
  <script src="https://cdn.jsdelivr.net/npm/html2canvas-pro@2.6.4/dist/html2canvas-pro.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <style>
    :root {
      --safety-red: #d91c1c;
      --card-w: 75mm;
      --card-h: 160mm;
      --chamfer: 13mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    body {
      background: #f1f5f9;
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      padding-top: 76px;
    }

    /* Top Floating Toolbar */
    .top-toolbar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 70px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.25rem;
      color: white;
      gap: 1rem;
    }

    .toolbar-left, .toolbar-center, .toolbar-right {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .brand-logo-box {
      background: #ffffff;
      padding: 4px 8px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .brand-logo-img {
      height: 26px;
      width: auto;
      object-fit: contain;
    }

    .brand-title {
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .tab-pills {
      display: flex;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 3px;
    }

    .tab-pill {
      border: none;
      background: transparent;
      color: #94a3b8;
      font-weight: 600;
      font-size: 0.825rem;
      padding: 0.4rem 0.85rem;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s ease;
    }

    .tab-pill.active {
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.45rem 0.8rem;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .btn-primary {
      background: #d91c1c;
      color: white;
    }
    .btn-primary:hover {
      background: #b91c1c;
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.12);
      color: white;
      border-color: rgba(255, 255, 255, 0.18);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .btn-blue {
      background: #2563eb;
      color: white;
    }
    .btn-blue:hover {
      background: #1d4ed8;
    }

    .btn-dark {
      background: #1e293b;
      color: #cbd5e1;
      border-color: #334155;
    }
    .btn-dark:hover {
      background: #334155;
      color: white;
    }

    .btn-danger {
      background: rgba(239, 68, 68, 0.15);
      color: #fca5a5;
      border-color: rgba(239, 68, 68, 0.3);
    }
    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.25);
    }

    /* Workspace canvas */
    .workspace-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem 1rem 3rem 1rem;
    }

    .cards-container {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: flex-start;
      gap: 2.5rem;
      margin-top: 1rem;
      transition: transform 0.2s ease;
      transform-origin: top center;
    }

    .card-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
    }

    .card-label-badge {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #64748b;
      background: #e2e8f0;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
    }

    /* EXACT CARD 75mm x 160mm WITH FULL-CARD HAZARD STRIPES */
    .loto-card {
      width: var(--card-w);
      height: var(--card-h);
      min-width: var(--card-w);
      min-height: var(--card-h);
      max-width: var(--card-w);
      max-height: var(--card-h);
      background-color: #ffffff;
      background-image: url('${HAZARD_STRIPES_PNG_BASE64}');
      background-repeat: repeat;
      background-size: 44px 44px;
      position: relative;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      clip-path: polygon(
        17.3333% 0%,
        82.6667% 0%,
        100% 8.125%,
        100% 100%,
        0% 100%,
        0% 8.125%
      );
      user-select: text;
    }

    /* Reinforced Eyelet Ojalillo (Yellow Ring, White Center) */
    .grommet {
      position: absolute;
      top: 4.5mm;
      left: 50%;
      transform: translateX(-50%);
      width: 8.8mm;
      height: 8.8mm;
      border-radius: 50%;
      border: 2.2px solid #eab308;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 30;
      pointer-events: none;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }

    .grommet-hole {
      width: 5.2mm;
      height: 5.2mm;
      border-radius: 50%;
      background: #ffffff;
      border: 1px solid #cbd5e1;
    }

    /* PELIGRO badge */
    .danger-badge-box {
      position: absolute;
      top: 14mm;
      left: 50%;
      transform: translateX(-50%);
      width: 53mm;
      height: 17.5mm;
      background: #000000;
      border-radius: 1.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.2mm;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      z-index: 20;
    }

    .danger-oval {
      width: 100%;
      height: 100%;
      background: var(--safety-red);
      border-radius: 50% / 50%;
      border: 1.6px solid #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .danger-text {
      color: #ffffff;
      font-family: 'Barlow Condensed', 'Arial Black', Impact, sans-serif;
      font-size: 21pt;
      font-weight: 900;
      letter-spacing: 0.08em;
      line-height: 1;
      text-transform: uppercase;
      padding-top: 1px;
    }

    /* EQUIPO BLOQUEADO POR (Printed directly over stripes) */
    .plate-locked-by {
      position: absolute;
      top: 33.5mm;
      left: 0;
      right: 0;
      text-align: center;
      z-index: 10;
      padding: 0 5mm;
    }

    .plate-locked-by h2 {
      font-weight: 900;
      font-size: 10.5pt;
      line-height: 1.08;
      color: #000000;
      letter-spacing: 0.01em;
      text-transform: uppercase;
    }

    /* FRONT: Middle Section (Tagline + Photo) */
    .front-middle-row {
      position: absolute;
      top: 44.5mm;
      left: 4mm;
      right: 4mm;
      height: 28.5mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 10;
    }

    .front-tagline {
      width: 36mm;
      height: 28mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 0.5mm 0;
    }

    .front-tagline span {
      font-weight: 900;
      font-size: 11.2pt;
      line-height: 1;
      color: #000000;
      letter-spacing: -0.01em;
      text-transform: uppercase;
    }

    /* Photo Box */
    .photo-box-wrap {
      width: 25mm;
      height: 28mm;
      border: 1.8px solid #000000;
      background: #ffffff;
      position: relative;
      overflow: hidden;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      transition: border-color 0.15s ease;
    }

    .photo-box-wrap:hover {
      border-color: var(--safety-red);
    }

    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.1s ease;
    }

    .photo-empty-hint {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      color: #64748b;
      padding: 4px;
      user-select: none;
    }

    .photo-empty-hint svg {
      width: 20px;
      height: 20px;
      stroke: #64748b;
    }

    .photo-empty-hint span {
      font-size: 6pt;
      font-weight: 900;
      text-transform: uppercase;
      line-height: 1.1;
      color: #475569;
    }

    .photo-overlay-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(4px);
      padding: 3px;
      display: flex;
      justify-content: center;
      gap: 3px;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: 10;
    }

    .photo-box-wrap:hover .photo-overlay-controls {
      opacity: 1;
    }

    .photo-ctrl-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      border-radius: 3px;
      width: 17px;
      height: 17px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 10px;
    }
    .photo-ctrl-btn:hover {
      background: var(--safety-red);
    }

    /* FRONT: White Inset Form Panel */
    .front-fields-panel {
      position: absolute;
      top: 75.5mm;
      left: 3.5mm;
      right: 3.5mm;
      bottom: 3.5mm;
      background: #ffffff;
      padding: 2.2mm 2.8mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      z-index: 10;
      overflow: hidden;
    }

    .watermark-layer {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 10mm;
      overflow: hidden;
      pointer-events: none;
      user-select: none;
      z-index: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .watermark-rows {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5.8mm;
      transform: rotate(-24deg);
      width: 140%;
    }

    .watermark-row {
      white-space: nowrap;
      text-transform: uppercase;
      font-weight: 800;
      letter-spacing: 0.22em;
      font-size: 4.5pt;
      color: rgba(15, 23, 42, 0.048);
    }

    .watermark-center-seal {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transform: rotate(-24deg);
    }

    .field-block, .field-inline-row, .card-logo-container {
      position: relative;
      z-index: 10;
    }

    .field-block {
      display: flex;
      flex-direction: column;
    }

    .field-label {
      font-size: 7pt;
      font-weight: 900;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      margin-bottom: 0.7mm;
      line-height: 1;
    }

    .field-input-row {
      position: relative;
      width: 100%;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 1px;
    }

    .field-inline-row {
      display: flex;
      align-items: flex-end;
      gap: 5px;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 1px;
    }

    .field-inline-label {
      font-size: 7pt;
      font-weight: 900;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      white-space: nowrap;
      line-height: 1;
      margin-bottom: 1px;
    }

    .card-input {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      font-size: 8.5pt;
      font-weight: 700;
      color: #000000;
      text-transform: uppercase;
      padding: 0 2px;
      height: 16px;
      line-height: 16px;
      letter-spacing: 0.01em;
    }

    /* Edit Mode Visual Hints */
    body.mode-edit .card-input:hover,
    body.mode-edit .card-input:focus {
      background: rgba(217, 28, 28, 0.06);
      outline: 1px dashed rgba(217, 28, 28, 0.6);
      border-radius: 2px;
    }

    body.mode-edit .card-input::placeholder {
      color: #94a3b8;
      font-weight: 500;
      text-transform: none;
      font-size: 7.5pt;
    }

    /* Preview Mode: Hide all editing aids */
    body.mode-preview .photo-empty-hint {
      display: none;
    }
    body.mode-preview .photo-overlay-controls {
      display: none !important;
    }
    body.mode-preview .card-input::placeholder {
      color: transparent;
    }
    body.mode-preview .card-input {
      pointer-events: none;
    }
    body.mode-preview .photo-box-wrap {
      cursor: default;
    }

    /* Bailac Logo centered at bottom */
    .card-logo-container {
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: none;
      padding-top: 2px;
      padding-bottom: 1px;
    }

    .card-logo-img {
      max-height: 6.8mm;
      width: auto;
      object-fit: contain;
    }

    /* DORSO: White Inset Panel for PROCEDIMIENTO */
    .dorso-panel {
      position: absolute;
      top: 45.5mm;
      left: 3.5mm;
      right: 3.5mm;
      bottom: 3.5mm;
      background: #ffffff;
      padding: 3mm 2.8mm 2.2mm 2.8mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      z-index: 10;
    }

    .dorso-title {
      font-size: 8.5pt;
      font-weight: 900;
      color: #000000;
      text-align: left;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      margin-bottom: 2.5mm;
    }

    .dorso-list {
      display: flex;
      flex-direction: column;
      gap: 2.1mm;
    }

    .dorso-item {
      font-size: 6.6pt;
      font-weight: 700;
      line-height: 1.26;
      color: #000000;
      text-transform: uppercase;
      text-align: justify;
      hyphens: auto;
      letter-spacing: -0.01em;
    }

    .dorso-bottom-block {
      position: relative;
      padding: 2.5mm 3mm 2mm 3mm;
      text-align: center;
      margin-top: 1mm;
    }

    .dorso-warning-text {
      font-size: 8.2pt;
      font-weight: 900;
      color: #000000;
      line-height: 1.22;
      text-transform: uppercase;
      margin-bottom: 1.2mm;
      letter-spacing: -0.01em;
    }

    .dorso-reverso-text {
      font-size: 12.5pt;
      font-weight: 900;
      color: var(--safety-red);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      line-height: 1;
    }

    /* Red Corner Marks around EN EL REVERSO */
    .corner-mark {
      position: absolute;
      width: 6mm;
      height: 6mm;
      border-color: var(--safety-red);
      border-style: solid;
      border-width: 0;
      pointer-events: none;
    }

    .corner-bottom-left {
      bottom: 0;
      left: 0;
      border-bottom-width: 2.8px;
      border-left-width: 2.8px;
    }

    .corner-bottom-right {
      bottom: 0;
      right: 0;
      border-bottom-width: 2.8px;
      border-right-width: 2.8px;
    }

    /* Scale helper for preview */
    .scale-controls-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: white;
      padding: 0.4rem 0.8rem;
      border-radius: 9999px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
      margin-bottom: 1.5rem;
      font-size: 0.8rem;
      color: #475569;
    }

    /* Print Setup */
    @media print {
      @page {
        size: A4 portrait;
        margin: 10mm 15mm;
      }

      *, *:before, *:after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .top-toolbar, .scale-controls-bar, .card-label-badge {
        display: none !important;
      }

      .workspace-area {
        padding: 0 !important;
      }

      .cards-container {
        transform: none !important;
        gap: 12mm !important;
        margin: 5mm auto !important;
      }

      .loto-card {
        box-shadow: none !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body class="mode-edit">

  <!-- TOP TOOLBAR -->
  <header class="top-toolbar">
    <div class="toolbar-left">
      <!-- Bailac Logo in the panel -->
      <div class="brand-logo-box">
        <img src="${BAILAC_LOGO_BASE64}" class="brand-logo-img" alt="Bailac Argentina">
      </div>
      <div class="brand-title">
        LOTO GENERATOR 75×160mm
      </div>
      
      <div class="tab-pills">
        <button type="button" class="tab-pill active" id="btnModeEdit" onclick="setMode('edit')">
          ✏️ Modo Edición
        </button>
        <button type="button" class="tab-pill" id="btnModePreview" onclick="setMode('preview')">
          👁️ Vista Previa
        </button>
      </div>
    </div>

    <div class="toolbar-center">
      <button type="button" class="btn btn-danger" onclick="clearData()" title="Limpiar datos ingresados">
        🗑️ Limpiar Datos
      </button>
    </div>

    <div class="toolbar-right">
      <button type="button" class="btn btn-primary" style="font-weight: 800; font-size: 0.85rem; padding: 0.5rem 1rem;" onclick="exportCard()" title="Generar y descargar tarjeta LOTO a escala 100% (75×160 mm)">
        📄 Generar Tarjeta
      </button>
    </div>
  </header>

  <!-- WORKSPACE -->
  <main class="workspace-area">
    <!-- Zoom / Scale Bar -->
    <div class="scale-controls-bar">
      <span>Escala en pantalla:</span>
      <input type="range" id="zoomSlider" min="0.8" max="1.8" step="0.05" value="1.25" oninput="setZoom(this.value)" style="cursor: pointer; width: 100px;">
      <span id="zoomValue" style="font-weight: 700; width: 42px;">125%</span>
      <button type="button" onclick="setZoom(1.0)" class="btn btn-dark" style="padding: 2px 8px; font-size: 0.75rem;">100%</button>
      <button type="button" onclick="setZoom(1.25)" class="btn btn-dark" style="padding: 2px 8px; font-size: 0.75rem;">125%</button>
    </div>

    <div class="cards-container" id="cardsContainer" style="transform: scale(1.25);">

      <!-- FRENTE (7.5 cm x 16 cm) -->
      <div class="card-wrap">
        <span class="card-label-badge">Frente — 7,5 cm x 16 cm</span>
        <div class="loto-card" id="cardFront">
          <svg data-chamfer-border="true" viewBox="0 0 75 160" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:40;">
            <polygon points="13,0.2 62,0.2 74.8,13 74.8,159.8 0.2,159.8 0.2,13" fill="none" stroke="rgba(15,23,42,0.45)" stroke-width="0.4" />
          </svg>
          <!-- Reinforced Eyelet Ojalillo (Yellow Ring, White Inner) -->
          <div class="grommet"><div class="grommet-hole"></div></div>

          <!-- PELIGRO badge -->
          <div class="danger-badge-box">
            <div class="danger-oval">
              <span class="danger-text">PELIGRO</span>
            </div>
          </div>

          <!-- EQUIPO BLOQUEADO POR (Directly on stripes) -->
          <div class="plate-locked-by">
            <h2>EQUIPO<br>BLOQUEADO POR</h2>
          </div>

          <!-- Middle Row: Tagline + Photo Box -->
          <div class="front-middle-row">
            <div class="front-tagline">
              <span>MI VIDA</span>
              <span>DEPENDE</span>
              <span>DE ESTA</span>
              <span>TARJETA</span>
            </div>

            <!-- Interactive Photo Box -->
            <div class="photo-box-wrap" id="photoBox" onclick="triggerPhotoUpload()">
              <input type="file" id="fileInput" accept="image/*" style="display: none;" onchange="handleFileSelect(event)">
              <div class="photo-empty-hint" id="photoEmptyHint">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                <span>Clic para subir foto</span>
              </div>
              <img id="workerPhoto" class="photo-img" style="display: none;" alt="Foto trabajador">

              <!-- Floating controls in Edit Mode -->
              <div class="photo-overlay-controls" onclick="event.stopPropagation()">
                <button type="button" class="photo-ctrl-btn" onclick="adjustPhotoZoom(0.1)" title="Acercar">+</button>
                <button type="button" class="photo-ctrl-btn" onclick="adjustPhotoZoom(-0.1)" title="Alejar">-</button>
                <button type="button" class="photo-ctrl-btn" onclick="adjustPhotoOffset(-8)" title="Subir">▲</button>
                <button type="button" class="photo-ctrl-btn" onclick="adjustPhotoOffset(8)" title="Bajar">▼</button>
                <button type="button" class="photo-ctrl-btn" onclick="removePhoto()" title="Eliminar foto">✕</button>
              </div>
            </div>
          </div>

          <!-- White Inset Form Panel -->
          <div class="front-fields-panel">
            <!-- Ultra-subtle corporate security watermark -->
            <div class="watermark-layer" aria-hidden="true">
              <div class="watermark-rows">
                <div class="watermark-row" style="margin-left: -8mm;">BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L.</div>
                <div class="watermark-row" style="margin-left: 8mm;">BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L.</div>
                <div class="watermark-row" style="margin-left: -8mm;">BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L.</div>
                <div class="watermark-row" style="margin-left: 8mm;">BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L.</div>
                <div class="watermark-row" style="margin-left: -8mm;">BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L.</div>
                <div class="watermark-row" style="margin-left: 8mm;">BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L.</div>
                <div class="watermark-row" style="margin-left: -8mm;">BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L. &nbsp;•&nbsp; BAILAC ARGENTINA S.R.L.</div>
              </div>
              <div class="watermark-center-seal">
                <span style="font-weight:900;text-transform:uppercase;letter-spacing:0.18em;line-height:1;font-size:19pt;color:rgba(15,23,42,0.036);">BAILAC</span>
                <span style="font-weight:800;text-transform:uppercase;letter-spacing:0.28em;margin-top:0.8mm;font-size:5.2pt;color:rgba(15,23,42,0.042);">ARGENTINA S.R.L.</span>
              </div>
            </div>
            <!-- Field 1: TRABAJADOR AUTORIZADO -->
            <div class="field-block">
              <span class="field-label">TRABAJADOR AUTORIZADO:</span>
              <div class="field-input-row">
                <input type="text" id="inputTrabajador" class="card-input" placeholder="Nombre y Apellido completo" value="${data.trabajador}">
              </div>
            </div>

            <!-- Field 2: DNI / RUT (Inline on same line) -->
            <div class="field-inline-row">
              <span class="field-inline-label">DNI / RUT:</span>
              <input type="text" id="inputDni" class="card-input" placeholder="Número de documento" value="${data.dniRut}">
            </div>

            <!-- Field 3: SUPERVISOR -->
            <div class="field-block">
              <span class="field-label">SUPERVISOR:</span>
              <div class="field-input-row">
                <input type="text" id="inputSupervisor" class="card-input" placeholder="Nombre del supervisor a cargo" value="${data.supervisor}">
              </div>
            </div>

            <!-- Field 4: EMPRESA -->
            <div class="field-block">
              <span class="field-label">EMPRESA:</span>
              <div class="field-input-row">
                <input type="text" id="inputEmpresa" class="card-input" placeholder="Nombre de empresa" value="${data.empresa}">
              </div>
            </div>

            <!-- Field 5: TELÉFONO Y/O CANAL DE RADIO -->
            <div class="field-block">
              <span class="field-label">TELÉFONO Y/O CANAL DE RADIO:</span>
              <div class="field-input-row">
                <input type="text" id="inputTelefono" class="card-input" placeholder="Canal VHF / Celular de contacto" value="${data.telefonoRadio}">
              </div>
            </div>

            <!-- Bailac Logo (Fixed & Centered at Bottom) -->
            <div class="card-logo-container">
              <img src="${BAILAC_LOGO_BASE64}" class="card-logo-img" alt="Bailac Argentina">
            </div>
          </div>
        </div>
      </div>

      <!-- DORSO (7.5 cm x 16 cm) -->
      <div class="card-wrap">
        <span class="card-label-badge">Dorso — 7,5 cm x 16 cm</span>
        <div class="loto-card" id="cardBack">
          <svg data-chamfer-border="true" viewBox="0 0 75 160" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:40;">
            <polygon points="13,0.2 62,0.2 74.8,13 74.8,159.8 0.2,159.8 0.2,13" fill="none" stroke="rgba(15,23,42,0.45)" stroke-width="0.4" />
          </svg>
          <!-- Reinforced Eyelet Ojalillo (Yellow Ring, White Inner) -->
          <div class="grommet"><div class="grommet-hole"></div></div>

          <!-- PELIGRO badge -->
          <div class="danger-badge-box">
            <div class="danger-oval">
              <span class="danger-text">PELIGRO</span>
            </div>
          </div>

          <!-- EQUIPO BLOQUEADO POR (Directly on stripes) -->
          <div class="plate-locked-by">
            <h2>EQUIPO<br>BLOQUEADO POR</h2>
          </div>

          <!-- White Inset Panel for PROCEDIMIENTO -->
          <div class="dorso-panel">
            <div>
              <h3 class="dorso-title">PROCEDIMIENTO</h3>

              <div class="dorso-list">
                <p class="dorso-item">SE DEBE BLOQUEAR TODOS AQUELLOS SISTEMAS QUE UTILICEN ENERGÍA MECÁNICA, ELÉCTRICA, HIDRÁULICA, NEUMÁTICA, GRAVITACIONAL, GASES Y FLUIDOS BAJO PRESIÓN, FUENTES RADIOACTIVAS, PREVIO A INICIAR EL TRABAJO.</p>
                <p class="dorso-item">EL SISTEMA DE BLOQUEO CONSISTE EN: CANDADO PERSONAL Y TARJETAS.</p>
                <p class="dorso-item">SE DEBE AISLAR LA FUENTE PRINCIPAL DE ENERGÍA.</p>
                <p class="dorso-item">CADA TRABAJADOR QUE INTERVENGA DEBE USAR CANDADO PERSONAL CON LLAVE ÚNICA.</p>
                <p class="dorso-item">PARA SISTEMAS ELÉCTRICOS, EL ELECTRICISTA CALIFICADO ES RESPONSABLE POR LA CORRECTA IDENTIFICACIÓN Y AISLAMIENTO DE LA ENERGÍA ELÉCTRICA.</p>
                <p class="dorso-item">TODO SISTEMA BLOQUEADO DEBE SER PROBADO PARA VERIFICAR QUE SE HA LOGRADO EL ESTADO DE CERO ENERGÍA.</p>
              </div>
            </div>

            <!-- Bottom Warning & Corner Brackets -->
            <div class="dorso-bottom-block">
              <div class="corner-mark corner-bottom-left"></div>
              <div class="corner-mark corner-bottom-right"></div>
              <div class="dorso-warning-text">
                ESTA ETIQUETA Y BLOQUEO<br>SOLO DEBEN SER RETIRADOS<br>POR LA PERSONA IDENTIFICADA
              </div>
              <div class="dorso-reverso-text">
                EN EL REVERSO
              </div>
            </div>

            <!-- Bailac Logo (Fixed & Centered at Bottom) -->
            <div class="card-logo-container">
              <img src="${BAILAC_LOGO_BASE64}" class="card-logo-img" alt="Bailac Argentina">
            </div>
          </div>
        </div>
      </div>

    </div>
  </main>

  <script>
    let photoDataUrl = null;
    let photoZoom = 1;
    let photoOffsetY = 0;

    function setMode(mode) {
      if (mode === 'preview') {
        document.body.classList.remove('mode-edit');
        document.body.classList.add('mode-preview');
        document.getElementById('btnModePreview').classList.add('active');
        document.getElementById('btnModeEdit').classList.remove('active');
      } else {
        document.body.classList.remove('mode-preview');
        document.body.classList.add('mode-edit');
        document.getElementById('btnModeEdit').classList.add('active');
        document.getElementById('btnModePreview').classList.remove('active');
      }
    }

    function setZoom(val) {
      document.getElementById('cardsContainer').style.transform = 'scale(' + val + ')';
      document.getElementById('zoomValue').innerText = Math.round(val * 100) + '%';
      document.getElementById('zoomSlider').value = val;
    }

    function triggerPhotoUpload() {
      document.getElementById('fileInput').click();
    }

    function handleFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        photoDataUrl = evt.target.result;
        const img = document.getElementById('workerPhoto');
        img.src = photoDataUrl;
        img.style.display = 'block';
        document.getElementById('photoEmptyHint').style.display = 'none';
        photoZoom = 1;
        photoOffsetY = 0;
        updatePhotoTransform();
      };
      reader.readAsDataURL(file);
    }

    function adjustPhotoZoom(delta) {
      photoZoom = Math.max(0.7, Math.min(3, photoZoom + delta));
      updatePhotoTransform();
    }

    function adjustPhotoOffset(delta) {
      photoOffsetY = Math.max(-60, Math.min(60, photoOffsetY + delta));
      updatePhotoTransform();
    }

    function updatePhotoTransform() {
      const img = document.getElementById('workerPhoto');
      img.style.transform = 'scale(' + photoZoom + ') translateY(' + photoOffsetY + 'px)';
    }

    function removePhoto() {
      photoDataUrl = null;
      const img = document.getElementById('workerPhoto');
      img.src = '';
      img.style.display = 'none';
      document.getElementById('photoEmptyHint').style.display = 'flex';
    }

    function clearData() {
      if (confirm('¿Desea restablecer los campos de la tarjeta?')) {
        document.getElementById('inputTrabajador').value = '';
        document.getElementById('inputDni').value = '';
        document.getElementById('inputSupervisor').value = '';
        document.getElementById('inputEmpresa').value = 'BAILAC ARGENTINA SRL';
        document.getElementById('inputTelefono').value = '';
        removePhoto();
      }
    }

    function applyChamferAndBorder(sourceCanvas) {
      const w = sourceCanvas.width;
      const h = sourceCanvas.height;
      const chamferPx = w * (13 / 75);

      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const ctx = out.getContext('2d');
      if (!ctx) return sourceCanvas;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      function traceChamferPolygon(inset) {
        const c = chamferPx;
        ctx.beginPath();
        ctx.moveTo(c + inset * 0.4, inset);
        ctx.lineTo(w - c - inset * 0.4, inset);
        ctx.lineTo(w - inset, c + inset * 0.4);
        ctx.lineTo(w - inset, h - inset);
        ctx.lineTo(inset, h - inset);
        ctx.lineTo(inset, c + inset * 0.4);
        ctx.closePath();
      }

      ctx.save();
      traceChamferPolygon(0);
      ctx.clip();
      ctx.drawImage(sourceCanvas, 0, 0);
      ctx.restore();

      const lineW = Math.max(1.5, w * 0.003);
      ctx.save();
      traceChamferPolygon(lineW / 2);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
      ctx.lineWidth = lineW;
      ctx.lineJoin = 'miter';
      ctx.stroke();
      ctx.restore();

      return out;
    }

    // GENERATE SINGLE A4 PAGE PDF WITH 75x160mm CARDS (Crisp 1:1 scale)
    async function exportCard() {
      setMode('preview');
      const container = document.getElementById('cardsContainer');
      const prevScale = container.style.transform;
      container.style.transform = 'none';

      await new Promise(r => setTimeout(r, 250));

      try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        function prepareCloneForCapture(clonedDoc) {
          clonedDoc.querySelectorAll('.loto-card').forEach(function(el) {
            el.style.clipPath = 'none';
            el.style.webkitClipPath = 'none';
            el.style.boxShadow = 'none';
            el.style.border = 'none';
          });
          clonedDoc.querySelectorAll('[data-chamfer-border="true"]').forEach(function(el) {
            el.style.display = 'none';
          });
        }

        const rawFront = await html2canvas(document.getElementById('cardFront'), {
          scale: 3.0,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: prepareCloneForCapture
        });
        const rawBack = await html2canvas(document.getElementById('cardBack'), {
          scale: 3.0,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: prepareCloneForCapture
        });

        const canvasFront = applyChamferAndBorder(rawFront);
        const canvasBack = applyChamferAndBorder(rawBack);

        const imgFront = canvasFront.toDataURL('image/png');
        const imgBack = canvasBack.toDataURL('image/png');

        // Header
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(20, 20, 20);
        pdf.text('ESTÁNDAR DE SEGURIDAD LOTO — VICUÑA', 105, 18, { align: 'center' });

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(100, 100, 100);
        pdf.text('BAILAC ARGENTINA S.R.L.  |  CONTROL DE LIBERACIÓN DE ENERGÍA', 105, 24, { align: 'center' });
        pdf.text('Tamaño real 1:1 (75 mm de ancho × 160 mm de alto por cara)  —  Imprimir al 100% sin ajuste', 105, 29, { align: 'center' });

        pdf.setDrawColor(210, 215, 220);
        pdf.setLineWidth(0.4);
        pdf.line(20, 33, 190, 33);

        const cardY = 44;
        const cardW = 75;
        const cardH = 160;
        const frontX = 24;
        const backX = 111;
        const centerX = 105;

        pdf.addImage(imgFront, 'PNG', frontX, cardY, cardW, cardH);
        pdf.addImage(imgBack, 'PNG', backX, cardY, cardW, cardH);

        // Central Dashed Fold Line
        pdf.setDrawColor(160, 170, 180);
        pdf.setLineDashPattern([2, 2], 0);
        pdf.setLineWidth(0.35);
        pdf.line(centerX, cardY - 5, centerX, cardY + cardH + 5);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        pdf.setTextColor(130, 140, 150);
        pdf.text('LÍNEA DE PLEGADO', centerX, cardY - 6.5, { align: 'center' });

        pdf.setFontSize(7.5);
        pdf.setTextColor(80, 80, 80);
        pdf.text('FRENTE (75 × 160 mm)', frontX + cardW / 2, cardY + cardH + 7, { align: 'center' });
        pdf.text('DORSO (75 × 160 mm)', backX + cardW / 2, cardY + cardH + 7, { align: 'center' });

        // Divider
        pdf.setLineDashPattern([], 0);
        pdf.setDrawColor(210, 215, 220);
        pdf.setLineWidth(0.4);
        pdf.line(20, 222, 190, 222);

        // Instructions
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

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(217, 28, 28);
        pdf.text('BAILAC ARGENTINA S.R.L.', 186, 251, { align: 'right' });

        const nombre = (document.getElementById('inputTrabajador').value.trim() || 'LOTO').replace(/\\s+/g, '_');
        pdf.save('Tarjeta_Bloqueo_LOTO_' + nombre + '_A4.pdf');
      } catch (err) {
        alert('Error al generar PDF: ' + err.message);
      } finally {
        container.style.transform = prevScale;
      }
    }
  </script>
</body>
</html>`;
}
