import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { ExportFormat, ImageQuality, PageOrientation, PageSize, ScannedDocument, ScannedPage } from '../types';

export interface ExportOptions {
  fileName: string;
  format: ExportFormat;
  pageSize: PageSize;
  orientation: PageOrientation;
  quality: ImageQuality;
  embedOcr: boolean;
  pages: ScannedPage[];
}

export interface BulkPdfOptions {
  fileName: string;
  pageSize: PageSize;
  orientation: PageOrientation;
  quality: ImageQuality;
  embedOcr: boolean;
  includeCoverPage?: boolean;
}

export interface BulkZipOptions {
  fileName: string;
  format: 'jpg' | 'png';
  quality: ImageQuality;
  includeOcrText: boolean;
  onProgress?: (percent: number, status: string) => void;
}

const PAGE_DIMENSIONS_MM: Record<Exclude<PageSize, 'original'>, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  letter: { width: 215.9, height: 279.4 },
};

function getQualityCompression(quality: ImageQuality): number {
  switch (quality) {
    case 'low':
      return 0.6;
    case 'medium':
      return 0.8;
    case 'high':
    default:
      return 0.95;
  }
}

/**
 * Exports document pages as a high-resolution PDF or Image
 */
export async function exportDocumentFiles(options: ExportOptions): Promise<Blob> {
  const { fileName, format, pageSize, orientation, quality, embedOcr, pages } = options;

  if (pages.length === 0) {
    throw new Error('No pages to export');
  }

  if (format === 'pdf') {
    return generatePdfBlob(pages, pageSize, orientation, quality, embedOcr);
  } else {
    // Single or first page image export
    const primaryPage = pages[0];
    return convertImageToBlob(primaryPage.processedImage, format, quality);
  }
}

/**
 * Converts a base64 data URL to an image blob with target format and quality
 */
async function convertImageToBlob(
  dataUrl: string,
  format: 'jpg' | 'png',
  quality: ImageQuality
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);

      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const q = format === 'png' ? 1.0 : getQualityCompression(quality);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create image blob'));
        },
        mimeType,
        q
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for export'));
    img.src = dataUrl;
  });
}

/**
 * Generates a single combined PDF from multiple pages
 */
async function generatePdfBlob(
  pages: ScannedPage[],
  pageSize: PageSize,
  orientation: PageOrientation,
  quality: ImageQuality,
  embedOcr: boolean
): Promise<Blob> {
  let doc: jsPDF | null = null;

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const img = await loadImage(page.processedImage);
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;

    // Determine orientation for this page
    let pageOrient: 'p' | 'l' = 'p';
    if (orientation === 'landscape') {
      pageOrient = 'l';
    } else if (orientation === 'portrait') {
      pageOrient = 'p';
    } else {
      // Auto: match aspect ratio
      pageOrient = imgWidth > imgHeight ? 'l' : 'p';
    }

    let pdfWidthMm = 210;
    let pdfHeightMm = 297;

    if (pageSize === 'original') {
      pdfWidthMm = (imgWidth / 150) * 25.4;
      pdfHeightMm = (imgHeight / 150) * 25.4;
    } else {
      const standardDim = PAGE_DIMENSIONS_MM[pageSize];
      if (pageOrient === 'l') {
        pdfWidthMm = Math.max(standardDim.width, standardDim.height);
        pdfHeightMm = Math.min(standardDim.width, standardDim.height);
      } else {
        pdfWidthMm = Math.min(standardDim.width, standardDim.height);
        pdfHeightMm = Math.max(standardDim.width, standardDim.height);
      }
    }

    if (i === 0) {
      doc = new jsPDF({
        orientation: pageOrient,
        unit: 'mm',
        format: pageSize === 'original' ? [pdfWidthMm, pdfHeightMm] : [pdfWidthMm, pdfHeightMm],
        compress: true,
      });
    } else if (doc) {
      doc.addPage([pdfWidthMm, pdfHeightMm], pageOrient);
    }

    if (!doc) continue;

    // Scale image maintaining aspect ratio within printable area
    const imgAspect = imgWidth / imgHeight;
    const pageAspect = pdfWidthMm / pdfHeightMm;

    let renderW = pdfWidthMm;
    let renderH = pdfHeightMm;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspect > pageAspect) {
      renderW = pdfWidthMm;
      renderH = pdfWidthMm / imgAspect;
      offsetY = (pdfHeightMm - renderH) / 2;
    } else {
      renderH = pdfHeightMm;
      renderW = pdfHeightMm * imgAspect;
      offsetX = (pdfWidthMm - renderW) / 2;
    }

    // Add image
    const imageFormat = page.processedImage.startsWith('data:image/png') ? 'PNG' : 'JPEG';
    doc.addImage(page.processedImage, imageFormat, offsetX, offsetY, renderW, renderH, undefined, 'FAST');

    // Embed searchable OCR text layer if available and enabled
    if (embedOcr && page.ocrText && page.ocrText.trim().length > 0) {
      try {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(3);

        const lines = page.ocrText.split('\n').filter((l) => l.trim().length > 0);
        const lineSpacing = Math.min(renderH / Math.max(lines.length, 1), 6);

        lines.forEach((line, idx) => {
          const textY = offsetY + 5 + idx * lineSpacing;
          if (textY < pdfHeightMm - 5) {
            doc?.text(line.substring(0, 100), offsetX + 4, textY, { maxWidth: renderW - 8 });
          }
        });
      } catch (err) {
        console.warn('Could not embed OCR text into PDF', err);
      }
    }
  }

  if (!doc) {
    throw new Error('Failed to generate PDF document');
  }

  return doc.output('blob');
}

/**
 * Bulk exports multiple ScannedDocuments merged into a single comprehensive PDF file
 */
export async function exportBulkMergedPdf(
  documents: ScannedDocument[],
  options: BulkPdfOptions
): Promise<Blob> {
  if (documents.length === 0) {
    throw new Error('No documents selected for bulk export');
  }

  const { pageSize, orientation, quality, embedOcr, includeCoverPage } = options;

  let doc: jsPDF | null = null;
  const standardDim = pageSize === 'original' ? PAGE_DIMENSIONS_MM.a4 : PAGE_DIMENSIONS_MM[pageSize];

  const defaultW = orientation === 'landscape' ? Math.max(standardDim.width, standardDim.height) : Math.min(standardDim.width, standardDim.height);
  const defaultH = orientation === 'landscape' ? Math.min(standardDim.width, standardDim.height) : Math.max(standardDim.width, standardDim.height);

  doc = new jsPDF({
    orientation: orientation === 'landscape' ? 'l' : 'p',
    unit: 'mm',
    format: [defaultW, defaultH],
    compress: true,
  });

  // 1. Optional Cover / Index Page
  if (includeCoverPage) {
    doc.setFillColor(15, 23, 42); // slate-900 background
    doc.rect(0, 0, defaultW, defaultH, 'F');

    doc.setTextColor(56, 189, 248); // cyan-400
    doc.setFontSize(22);
    doc.text('DocuScan Pro — Merged Document Archive', 20, 35);

    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleString()}  ·  Total Documents: ${documents.length}`, 20, 45);

    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.5);
    doc.line(20, 52, defaultW - 20, 52);

    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Index of Documents:', 20, 65);

    let currentY = 76;
    let runningPageNum = 2; // Cover page is 1

    documents.forEach((d, idx) => {
      if (currentY > defaultH - 30) return; // avoid overflow on cover page
      doc?.setFontSize(11);
      doc?.setTextColor(226, 232, 240); // slate-200
      doc?.text(`${idx + 1}.  ${d.title}`, 24, currentY);

      doc?.setTextColor(148, 163, 184);
      doc?.setFontSize(9);
      doc?.text(`${d.pages.length} page(s)  ·  Starts on page ${runningPageNum}`, defaultW - 75, currentY);

      runningPageNum += d.pages.length;
      currentY += 10;
    });

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Created with DocuScan Pro — 100% on-device private scanning', 20, defaultH - 15);
  }

  // 2. Append all pages across documents
  let isFirstDocPage = !includeCoverPage;

  for (let dIdx = 0; dIdx < documents.length; dIdx++) {
    const documentObj = documents[dIdx];

    for (let pIdx = 0; pIdx < documentObj.pages.length; pIdx++) {
      const page = documentObj.pages[pIdx];
      const img = await loadImage(page.processedImage);
      const imgWidth = img.naturalWidth || img.width;
      const imgHeight = img.naturalHeight || img.height;

      let pageOrient: 'p' | 'l' = 'p';
      if (orientation === 'landscape') pageOrient = 'l';
      else if (orientation === 'portrait') pageOrient = 'p';
      else pageOrient = imgWidth > imgHeight ? 'l' : 'p';

      let pdfWidthMm = 210;
      let pdfHeightMm = 297;

      if (pageSize === 'original') {
        pdfWidthMm = (imgWidth / 150) * 25.4;
        pdfHeightMm = (imgHeight / 150) * 25.4;
      } else {
        const std = PAGE_DIMENSIONS_MM[pageSize];
        if (pageOrient === 'l') {
          pdfWidthMm = Math.max(std.width, std.height);
          pdfHeightMm = Math.min(std.width, std.height);
        } else {
          pdfWidthMm = Math.min(std.width, std.height);
          pdfHeightMm = Math.max(std.width, std.height);
        }
      }

      if (isFirstDocPage) {
        // Adjust size of initial page if orientation/size differs
        isFirstDocPage = false;
      } else {
        doc.addPage([pdfWidthMm, pdfHeightMm], pageOrient);
      }

      const imgAspect = imgWidth / imgHeight;
      const pageAspect = pdfWidthMm / pdfHeightMm;

      let renderW = pdfWidthMm;
      let renderH = pdfHeightMm;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > pageAspect) {
        renderW = pdfWidthMm;
        renderH = pdfWidthMm / imgAspect;
        offsetY = (pdfHeightMm - renderH) / 2;
      } else {
        renderH = pdfHeightMm;
        renderW = pdfHeightMm * imgAspect;
        offsetX = (pdfWidthMm - renderW) / 2;
      }

      const imageFormat = page.processedImage.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(page.processedImage, imageFormat, offsetX, offsetY, renderW, renderH, undefined, 'FAST');

      // Searchable OCR Text Layer
      if (embedOcr && page.ocrText && page.ocrText.trim().length > 0) {
        try {
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(3);

          const lines = page.ocrText.split('\n').filter((l) => l.trim().length > 0);
          const lineSpacing = Math.min(renderH / Math.max(lines.length, 1), 6);

          lines.forEach((line, idx) => {
            const textY = offsetY + 5 + idx * lineSpacing;
            if (textY < pdfHeightMm - 5) {
              doc?.text(line.substring(0, 100), offsetX + 4, textY, { maxWidth: renderW - 8 });
            }
          });
        } catch (err) {
          console.warn('Could not embed OCR text into bulk PDF', err);
        }
      }
    }
  }

  return doc.output('blob');
}

/**
 * Bulk exports multiple ScannedDocuments as a structured ZIP archive of images & metadata
 */
export async function exportBulkZipArchive(
  documents: ScannedDocument[],
  options: BulkZipOptions
): Promise<Blob> {
  if (documents.length === 0) {
    throw new Error('No documents selected for ZIP export');
  }

  const { format, quality, includeOcrText, onProgress } = options;
  const zip = new JSZip();

  let manifestText = `=======================================================\n`;
  manifestText += `DocuScan Pro — Bulk Export Archive\n`;
  manifestText += `Export Date: ${new Date().toISOString()}\n`;
  manifestText += `Total Documents: ${documents.length}\n`;
  manifestText += `Image Format: ${format.toUpperCase()} (${quality} quality)\n`;
  manifestText += `=======================================================\n\n`;

  const totalPages = documents.reduce((acc, d) => acc + d.pages.length, 0);
  let processedPages = 0;

  for (let dIdx = 0; dIdx < documents.length; dIdx++) {
    const doc = documents[dIdx];
    // Create clean folder name without invalid filesystem characters
    const cleanDocTitle = (doc.title || `Document_${dIdx + 1}`)
      .replace(/[/\\?%*:|"<>]/g, '_')
      .trim()
      .substring(0, 45);

    const folderName = `${String(dIdx + 1).padStart(2, '0')}_${cleanDocTitle}`;
    const docFolder = zip.folder(folderName);

    manifestText += `[Document ${dIdx + 1}]: ${doc.title}\n`;
    manifestText += `  Folder: ${folderName}\n`;
    manifestText += `  Pages: ${doc.pages.length}\n`;
    manifestText += `  Created: ${new Date(doc.createdAt).toLocaleDateString()}\n`;

    let docOcrCombined = `Document: ${doc.title}\n`;
    docOcrCombined += `Pages: ${doc.pages.length}\n`;
    docOcrCombined += `-------------------------------------------------------\n\n`;

    for (let pIdx = 0; pIdx < doc.pages.length; pIdx++) {
      const page = doc.pages[pIdx];
      const pageNumStr = String(pIdx + 1).padStart(2, '0');
      const filename = `page_${pageNumStr}.${format === 'png' ? 'png' : 'jpg'}`;

      const blob = await convertImageToBlob(page.processedImage, format, quality);
      docFolder?.file(filename, blob);

      if (page.ocrText) {
        docOcrCombined += `--- PAGE ${pIdx + 1} OCR TEXT ---\n${page.ocrText}\n\n`;
      }

      processedPages++;
      const percent = Math.round((processedPages / Math.max(totalPages, 1)) * 80);
      onProgress?.(percent, `Packaging page ${processedPages} of ${totalPages}...`);
    }

    if (includeOcrText && docOcrCombined.trim().length > 0) {
      docFolder?.file('transcription_ocr.txt', docOcrCombined);
    }

    manifestText += `\n`;
  }

  // Add manifest.txt at root
  zip.file('README_manifest.txt', manifestText);

  onProgress?.(85, 'Compressing archive...');

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      const progress = 85 + Math.round((metadata.percent / 100) * 15);
      onProgress?.(Math.min(progress, 99), `Compressing ZIP (${Math.round(metadata.percent)}%)...`);
    }
  );

  onProgress?.(100, 'ZIP archive ready!');
  return zipBlob;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Triggers a download of a Blob to the user's filesystem
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Uses Web Share API to share the file, or falls back to download
 */
export async function shareOrDownloadFile(blob: Blob, filename: string, title: string): Promise<boolean> {
  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: `Exported files: ${title}`,
        });
        return true;
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.warn('Share API failed, falling back to download', e);
      } else {
        return false;
      }
    }
  }

  // Fallback to direct download
  downloadBlob(blob, filename);
  return true;
}
