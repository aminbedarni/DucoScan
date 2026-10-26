# DocuScan Pro — Document Scanner Mobile Web App

A production-grade, privacy-first mobile document scanner supporting Arabic (full RTL), French, and English, with real-time automatic edge detection, perspective warping, exactly 30 document enhancement filters, multilingual OCR, bulk export (Merged PDF & ZIP archive), and complete Dark Mode & Light Mode support.

***

## User Review & Critical Decisions

> [!IMPORTANT]
> The application now supports seamless dual-theme styling: **Dark Mode (الوضع الليلي)**, **Light Mode (الوضع العادي/النهاري)**, and **System Default (تلقائي حسب نظام الجهاز)**. Please review the architectural plan below.

*   **Theme Posture**: Dual-mode support with immediate reactive toggle across the app header and Settings screen, persisting preference in IndexedDB and localStorage, while maintaining WCAG AA contrast compliance and mobile OLED battery optimization.
*   **Privacy & Local Execution**: All processing—corner detection, perspective projection, 30 document filters, OCR, and PDF/ZIP generation—runs 100% on-device in the browser client with IndexedDB persistence, guaranteeing strict document confidentiality.
*   **Multilingual Support**: Fully bidirectional (LTR for English/French, RTL with Arabic Cairo typography for Arabic) with instant switching without app reload.

***

## 1. Overview & Core Concept

*   **What It Does**: Transforms smartphone and mobile browsers into a pocket scanner matching CamScanner and Adobe Scan capabilities. Captures documents, receipts, contracts, IDs, and books via live camera or gallery upload, automatically corrects angles and perspective, applies 30 document filters, extracts text via OCR, and exports single or bulk documents into searchable PDFs or structured ZIP archives.
*   **Target Audience / Persona**: Mobile professionals, students, accountants, and bilingual / Arabic-speaking users who require fast, private, and high-fidelity document digitization without recurring subscriptions or cloud data leakage.
*   **Key Value**: Zero server dependence, instant load times, CamScanner-grade enhancement algorithms, and complete multi-document batch management.

***

## 2. User Experience & Visual Design

### Key User Flows

1.  **Home Dashboard**:
    *   Top app bar displays DocuScan Pro branding, active language selector, and quick theme toggle (Sun/Moon).
    *   Hero action card with two prominent primary actions: **Scan Document** (opens camera viewfinder) and **Import from Gallery** (triggers multi-image file picker).
    *   Quick stats overview (Total Documents, Pages Digitized, Local Storage consumed).
    *   Recent scans carousel with instant view/edit triggers.
2.  **Live Camera Capture & Edge Detection**:
    *   Full-viewport mobile camera stream with auto-exposure and torch/flashlight toggle.
    *   Real-time canvas edge-detection overlay rendering quad corner pins (`tl`, `tr`, `br`, `bl`) in cyan/emerald.
    *   Auto-capture stability detector with countdown ring when document boundaries stabilize.
    *   Multi-page scanning badge showing accumulated pages in current session before proceeding to editor.
3.  **Document Editor & Processing Studio**:
    *   High-resolution document view with interactive 4-corner perspective adjuster.
    *   Horizontal carousel for reordering, adding, or deleting pages.
    *   30-filter drawer categorized by *All*, *Black & White*, *Sharp Text*, *Color & Tone*, *Restoration*, and *Specialty*, with live real-time slider for filter intensity (0–100%).
    *   Fine-tuning panel for Brightness, Contrast, Saturation, and Sharpness.
    *   Multilingual OCR extractor for Arabic, French, and English with one-tap copy and searchable PDF embedding.
4.  **Documents Management & Bulk Export**:
    *   Grid or list layout of saved documents with search by title or recognized OCR text.
    *   Multi-select selection mode activating the floating bottom action bar.
    *   Bulk Export modal with two workflows:
        *   **Merged PDF**: Combines all selected documents and pages into a unified PDF with optional cover sheet and document index.
        *   **ZIP Archive**: Packages every document into organized folders containing high-resolution JPEG/PNG images and extracted `.txt` transcripts.
5.  **Settings & Appearance**:
    *   Visual theme selector (Dark Mode, Light Mode, System Default) with active pill indicators.
    *   Default export format (PDF, JPG, PNG) and default page sizing (A4, A5, Letter).
    *   Storage management with clear data controls and privacy assurance banner.

### Visual Identity & Theme

*   **Aesthetic Direction**: Ultra-clean, modern utilitarian mobile tool. High-density information architecture with generous 44px+ touch targets and zero visual clutter.
*   **Color Palette**:
    *   *Dark Theme*: Deep slate background (`#020617` / `bg-slate-950`), elevated card surfaces (`#0f172a` / `bg-slate-900`), borders in `#1e293b` (`border-slate-800`), accent in vivid cyan (`#06b6d4`) and emerald (`#10b981`).
    *   *Light Theme*: Crisp clean background (`#f8fafc` / `bg-slate-50`), pristine white card surfaces (`#ffffff` / `bg-white`), borders in `#e2e8f0` (`border-slate-200`), text in `#0f172a` (`text-slate-900`), with vivid cyan accents (`#0891b2`).
*   **Typography**:
    *   Latin script: Inter / SF Pro font family with clean tracking and crisp numerical weights.
    *   Arabic script: Cairo font family with native RTL ligatures, balanced baseline, and elevated legibility.
*   **Interactive Feedback**: Micro-haptics simulated via subtle scale transforms, smooth 200ms theme color transitions, and animated export progress bars.

***

## 3. Key Product Decisions & Trade-Offs

*   **Client-Side IndexedDB Storage over Remote Database**:
    *   *Chosen Approach*: IndexedDB stores high-resolution image blobs, thumbnails, OCR text, and document metadata locally.
    *   *Why*: Fulfills strict user privacy requirements; zero latency, 100% offline functionality, and no backend infrastructure costs.
*   **HTML5 Canvas Computer Vision over Heavy WebAssembly C++ Builds**:
    *   *Chosen Approach*: Pure JavaScript/HTML5 Canvas edge detection, Sobel gradients, homography matrix perspective warping, and pixel convolution filters.
    *   *Why*: Instant app boot under 1 second without downloading large 30MB OpenCV WebAssembly binaries, fully compatible with mobile Safari and Android Chrome.
*   **Native jsPDF & JSZip In-Memory Export Pipelines**:
    *   *Chosen Approach*: Client-side dynamic PDF rendering with invisible OCR text layer rendering for searchable text, paired with streaming JSZip compression.
    *   *Why*: Instant download without cloud round-trips or server-side memory limits.
*   **Class-Based Tailwind v4 Theme Switching**:
    *   *Chosen Approach*: React `ThemeProvider` syncing `.dark` and `.light` classes on `document.documentElement` and updating `<meta name="theme-color">` dynamically.
    *   *Why*: Provides instantaneous theme changes with no flash of unstyled content, full Tailwind `@custom-variant dark` support, and persistence across user sessions.

***

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                              App.tsx                                   │
│    ┌─────────────────────────┐         ┌───────────────────────────┐   │
│    │      ThemeProvider      │         │     LanguageProvider      │   │
│    └────────────┬────────────┘         └─────────────┬─────────────┘   │
└─────────────────┼────────────────────────────────────┼─────────────────┘
                  ▼                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                             View Router                                │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────────┐  │
│  │    HomeView    │  │   CameraView   │  │      DocumentEditor      │  │
│  │ (Stats, Recent)│  │ (CV Edges, Cam)│  │ (30 Filters, Adjust, OCR)│  │
│  └───────┬────────┘  └───────┬────────┘  └─────────────┬────────────┘  │
│          │                   │                         │               │
│  ┌───────┴────────┐          │           ┌─────────────┴────────────┐  │
│  │ DocumentsView  │          │           │  ExportModal / BulkExport│  │
│  │ (Filter, Multi)│          │           │  (PDF / JPEG / ZIP)      │  │
│  └───────┬────────┘          │           └─────────────┬────────────┘  │
└──────────┼───────────────────┼─────────────────────────┼───────────────┘
           ▼                   ▼                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           Client Engine Core                           │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────────┐  │
│  │  CV Engine     │  │ 30 Filters Lib │  │ Tesseract OCR Engine     │  │
│  │ (Corner Detect,│  │ (Sobel, Otsu,  │  │ (ara, fra, eng,          │  │
│  │  Perspective)  │  │  Sharpen, Tone)│  │  Searchable PDF text)    │  │
│  └───────┬────────┘  └───────┬────────┘  └─────────────┬────────────┘  │
└──────────┼───────────────────┼─────────────────────────┼───────────────┘
           ▼                   ▼                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Persistence & Export Services                       │
│  ┌─────────────────────────────┐         ┌──────────────────────────┐  │
│  │ IndexedDB Storage Service   │         │ PDF & JSZip Generator    │  │
│  │ (DocuScanDB: docs, settings)│         │ (Merged PDF, ZIP Export) │  │
│  └─────────────────────────────┘         └──────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

```typescript
type ThemeMode = 'dark' | 'light' | 'system';
type Language = 'ar' | 'fr' | 'en';
type ExportFormat = 'pdf' | 'jpg' | 'png';

interface ScannedPage {
  id: string;
  originalImage: string;    // Base64 original photo
  processedImage: string;   // Filtered & warped canvas output
  thumbnail: string;        // Fast display thumbnail
  corners: QuadCorners;     // { tl, tr, br, bl }
  rotation: number;         // 0, 90, 180, 270
  filter: FilterId;         // 1 of 30 filters
  filterIntensity: number;  // 0 - 100
  adjustments: Adjustments; // Brightness, Contrast, Saturation, Sharpness
  ocrText?: string;
  ocrLanguage?: Language;
}

interface ScannedDocument {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pages: ScannedPage[];
  thumbnail: string;
  tags?: string[];
  isFavorite?: boolean;
}
```

### Interactive Component & State Mapping

*   **`Navigation`**: Switches active view (`home`, `camera`, `documents`, `settings`) and renders quick-access language and theme toggles.
*   **`CameraView`**: Hooks into `navigator.mediaDevices.getUserMedia`, renders video to offscreen canvas, runs edge detection every 150ms, calculates quadrilaterals, and triggers multi-page capture queue.
*   **`DocumentEditor`**: Maintains undo/redo stack (`history[]`), allows drag-to-adjust corner pins on `CropAdjuster`, renders preview thumbnails for all 30 filters, and computes live adjustments via 2D Canvas context.
*   **`DocumentsView`**: Supports search filtering, sorting (by date, name, page count), single or multi-item selection mode, batch deletion, and batch export invocation.
*   **`BulkExportModal`**: Synthesizes multiple selected documents into merged multi-page PDF with table of contents and cover page, or creates structured zip file with image files and OCR transcripts.
