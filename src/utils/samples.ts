import { QuadCorners, ScannedDocument, ScannedPage } from '../types';
import { getDefaultCorners } from './cv';

function createSampleCanvas(
  width: number,
  height: number,
  drawFn: (ctx: CanvasRenderingContext2D) => void
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    drawFn(ctx);
  }
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Creates sample contract document
 */
export function createContractSample(): ScannedDocument {
  const width = 800;
  const height = 1100;

  const dataUrl = createSampleCanvas(width, height, (ctx) => {
    // Background paper with slight desk background
    ctx.fillStyle = '#222634';
    ctx.fillRect(0, 0, width, height);

    // Tilted paper sheet simulation
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-0.02);
    ctx.translate(-width / 2 + 30, -height / 2 + 35);

    // Paper shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 12;

    // Paper background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width - 60, height - 70);
    ctx.shadowColor = 'transparent';

    // Header letterhead
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText('GLOBAL PARTNERSHIP AGREEMENT', 50, 80);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('DOCUMENT REF: #2026-GPA-8849-B  ·  OCTOBER 2026', 50, 105);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(50, 120);
    ctx.lineTo(width - 110, 120);
    ctx.stroke();

    // Body text lines
    ctx.fillStyle = '#334155';
    ctx.font = '13px system-ui, sans-serif';
    const lines = [
      '1. PURPOSE AND RECITALS',
      'This Master Services Agreement ("Agreement") is entered into by and between the undersigned',
      'parties for the provision of enterprise cloud infrastructure, software engineering, and',
      'document digitalization services subject to the terms and stipulations outlined herein.',
      '',
      '2. SCOPE OF SERVICES & COMPLIANCE',
      'The Contractor agrees to furnish all necessary computer vision systems, OCR extraction engines,',
      'and encrypted on-device storage architectures adhering to ISO/IEC 27001 data integrity standards.',
      'All confidential materials, scanning records, and generated PDF assets shall remain private to the user.',
      '',
      '3. AUDIT & QUALITY ASSURANCE',
      'Regular edge-detection latency audits shall be conducted across mobile touch devices.',
      'The thirty (30) proprietary document filters must preserve minimum 99.2% alphanumeric readability.',
      '',
      '4. TERM AND TERMINATION',
      'This Agreement shall remain in full force for a duration of thirty-six (36) months from execution.',
    ];

    let y = 160;
    for (const line of lines) {
      if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.')) {
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillStyle = '#0f172a';
      } else {
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillStyle = '#334155';
      }
      ctx.fillText(line, 50, y);
      y += 26;
    }

    // Seal and signature
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(140, 720, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#1d4ed8';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL SEAL', 140, 715);
    ctx.fillText('VERIFIED 2026', 140, 735);
    ctx.textAlign = 'left';

    // Signature line
    ctx.fillStyle = '#475569';
    ctx.fillText('Authorized Signature: Johnathan Vance, VP Tech', 240, 725);
    ctx.beginPath();
    ctx.moveTo(240, 700);
    ctx.bezierCurveTo(280, 680, 310, 720, 360, 690);
    ctx.bezierCurveTo(390, 670, 420, 710, 480, 695);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  });

  const corners: QuadCorners = {
    topLeft: { x: 35, y: 38 },
    topRight: { x: width - 35, y: 25 },
    bottomRight: { x: width - 42, y: height - 40 },
    bottomLeft: { x: 28, y: height - 32 },
  };

  const page: ScannedPage = {
    id: 'page_contract_1',
    originalImage: dataUrl,
    croppedImage: dataUrl,
    processedImage: dataUrl,
    thumbnail: dataUrl,
    corners,
    rotation: 0,
    filter: 'auto_enhance',
    filterIntensity: 100,
    adjustments: { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 },
    ocrText:
      'GLOBAL PARTNERSHIP AGREEMENT\nDOCUMENT REF: #2026-GPA-8849-B · OCTOBER 2026\n1. PURPOSE AND RECITALS\nThis Master Services Agreement is entered into for document digitalization services.\n2. SCOPE OF SERVICES & COMPLIANCE\nContractor agrees to furnish all computer vision systems and encrypted storage.\n3. AUDIT & QUALITY ASSURANCE\nThirty proprietary document filters must preserve 99.2% readability.\nAuthorized Signature: Johnathan Vance, VP Tech',
    ocrLanguage: 'en',
    width,
    height,
  };

  return {
    id: 'doc_contract_sample',
    title: 'Business Contract Agreement',
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 24,
    pages: [page],
    isFavorite: true,
    thumbnail: dataUrl,
  };
}

/**
 * Creates sample Arabic document
 */
export function createArabicSample(): ScannedDocument {
  const width = 800;
  const height = 1100;

  const dataUrl = createSampleCanvas(width, height, (ctx) => {
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(35, 35);

    // Paper
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#fffdfa';
    ctx.fillRect(0, 0, width - 70, height - 70);
    ctx.shadowColor = 'transparent';

    // Decorative Islamic/Arabic border
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, width - 106, height - 106);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, width - 118, height - 118);

    // Arabic text (RTL simulated rendering)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 26px "Cairo", system-ui, sans-serif';
    ctx.fillText('المملكة العربية السعودية', (width - 70) / 2, 80);

    ctx.fillStyle = '#047857';
    ctx.font = 'bold 20px "Cairo", system-ui, sans-serif';
    ctx.fillText('شهادة توثيق واعتماد رسمي', (width - 70) / 2, 125);

    ctx.fillStyle = '#b45309';
    ctx.font = '14px "Cairo", system-ui, sans-serif';
    ctx.fillText('الرقم المرجعي: ۲٠٢٦-DOCS-٨٤٩٢  |  التاريخ: ٢٥ أكتوبر ٢٠٢٦', (width - 70) / 2, 160);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#1f2937';
    ctx.font = '15px "Cairo", system-ui, sans-serif';

    const rightX = width - 120;
    const arabicLines = [
      'تشهد الهيئة العامة للتوثيق والتحول الرقمي بأن الوثيقة المقدمة',
      'قد خضعت للفحص والمسح الضوئي الرقمي فائق الدقة وفق المعايير العالمية.',
      '',
      '• صحة البيانات والبيانات الواردة مطابقة بنسبة ١٠٠٪.',
      '• تم التحقق من سلامة الأختام والتوقيعات والباركود التشفيري.',
      '• يحق لحامل هذه الشهادة استخدامها لدى كافة الجهات والمؤسسات الحكومية والخاصة.',
      '',
      'حررت هذه الشهادة بناءً على الطلب وتم حفظ نسختها الرقمية المؤرشفة.',
    ];

    let y = 230;
    for (const line of arabicLines) {
      ctx.fillText(line, rightX, y);
      y += 34;
    }

    // Official Stamp
    ctx.save();
    ctx.translate(180, 680);
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 12px "Cairo", system-ui, sans-serif';
    ctx.fillText('معتمد رسمياً', 0, -10);
    ctx.fillText('OFFICIALLY APPROVED', 0, 8);
    ctx.fillText('٢٠٢٦ م', 0, 24);
    ctx.restore();

    ctx.restore();
  });

  const page: ScannedPage = {
    id: 'page_ar_1',
    originalImage: dataUrl,
    croppedImage: dataUrl,
    processedImage: dataUrl,
    thumbnail: dataUrl,
    corners: getDefaultCorners(width, height, 0.05),
    rotation: 0,
    filter: 'paper_whitening',
    filterIntensity: 100,
    adjustments: { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 },
    ocrText:
      'المملكة العربية السعودية\nشهادة توثيق واعتماد رسمي\nالرقم المرجعي: ۲٠٢٦-DOCS-٨٤٩٢ | التاريخ: ٢٥ أكتوبر ٢٠٢٦\nتشهد الهيئة العامة للتوثيق والتحول الرقمي بأن الوثيقة المقدمة قد خضعت للمسح الرقمي.\nصحة البيانات والبيانات الواردة مطابقة بنسبة ١٠٠٪.',
    ocrLanguage: 'ar',
    width,
    height,
  };

  return {
    id: 'doc_arabic_sample',
    title: 'شهادة اعتماد رسمية (Arabic Certificate)',
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 12,
    pages: [page],
    isFavorite: true,
    thumbnail: dataUrl,
  };
}

/**
 * Creates sample thermal receipt document
 */
export function createReceiptSample(): ScannedDocument {
  const width = 600;
  const height = 950;

  const dataUrl = createSampleCanvas(width, height, (ctx) => {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(60, 40);

    // Receipt paper
    ctx.fillStyle = '#fafafa';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 18;
    ctx.fillRect(0, 0, width - 120, height - 80);
    ctx.shadowColor = 'transparent';

    ctx.textAlign = 'center';
    ctx.fillStyle = '#09090b';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('METRO FRESH MARKET', (width - 120) / 2, 50);

    ctx.font = '12px monospace';
    ctx.fillText('STORE #418 - CHAMPS ÉLYSÉES, PARIS', (width - 120) / 2, 75);
    ctx.fillText('DATE: 2026-10-25  14:32:19', (width - 120) / 2, 95);

    ctx.strokeStyle = '#a1a1aa';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, 115);
    ctx.lineTo(width - 140, 115);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = 'left';
    ctx.font = '13px monospace';
    const items = [
      ['ORGANIC ESPRESSO BEANS', '€14.50'],
      ['ALMOND MILK 1L', '€3.20'],
      ['ARTISAN SOURDOUGH LOAF', '€4.80'],
      ['EXTRA VIRGIN OLIVE OIL', '€11.90'],
      ['FRENCH BRIE CHEESE 250G', '€6.75'],
      ['MINERAL WATER 6x1L', '€5.40'],
    ];

    let y = 150;
    for (const [name, price] of items) {
      ctx.fillText(name, 25, y);
      ctx.textAlign = 'right';
      ctx.fillText(price, width - 145, y);
      ctx.textAlign = 'left';
      y += 32;
    }

    ctx.strokeStyle = '#09090b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(20, y + 10);
    ctx.lineTo(width - 140, y + 10);
    ctx.stroke();

    y += 45;
    ctx.font = 'bold 15px monospace';
    ctx.fillText('SUBTOTAL:', 25, y);
    ctx.textAlign = 'right';
    ctx.fillText('€46.55', width - 145, y);

    y += 26;
    ctx.font = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TAX (TVA 10%):', 25, y);
    ctx.textAlign = 'right';
    ctx.fillText('€4.65', width - 145, y);

    y += 30;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL DUE:', 25, y);
    ctx.textAlign = 'right';
    ctx.fillText('€51.20', width - 145, y);

    // Barcode at bottom
    ctx.textAlign = 'center';
    y += 60;
    for (let b = 0; b < 40; b++) {
      ctx.fillStyle = b % 3 === 0 || b % 5 === 0 ? '#09090b' : '#fafafa';
      const bW = b % 2 === 0 ? 4 : 8;
      ctx.fillRect(80 + b * 7, y, bW, 45);
    }
    ctx.fillStyle = '#52525b';
    ctx.font = '11px monospace';
    ctx.fillText('* 9 8 4 2 0 1 7 5 3 6 8 4 *', (width - 120) / 2, y + 65);

    ctx.restore();
  });

  const page: ScannedPage = {
    id: 'page_receipt_1',
    originalImage: dataUrl,
    croppedImage: dataUrl,
    processedImage: dataUrl,
    thumbnail: dataUrl,
    corners: getDefaultCorners(width, height, 0.08),
    rotation: 0,
    filter: 'receipt_mode',
    filterIntensity: 100,
    adjustments: { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 },
    ocrText:
      'METRO FRESH MARKET\nSTORE #418 - PARIS\nDATE: 2026-10-25\nORGANIC ESPRESSO BEANS €14.50\nALMOND MILK 1L €3.20\nARTISAN SOURDOUGH LOAF €4.80\nEXTRA VIRGIN OLIVE OIL €11.90\nTOTAL DUE: €51.20',
    ocrLanguage: 'fr',
    width,
    height,
  };

  return {
    id: 'doc_receipt_sample',
    title: 'Metro Market Receipt (Paris)',
    createdAt: Date.now() - 3600000 * 48,
    updatedAt: Date.now() - 3600000 * 48,
    pages: [page],
    isFavorite: false,
    thumbnail: dataUrl,
  };
}
