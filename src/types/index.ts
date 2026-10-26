export type Language = 'en' | 'fr' | 'ar';

export type Point = {
  x: number;
  y: number;
};

export type QuadCorners = {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
};

export type FilterId =
  | 'original'
  | 'auto_enhance'
  | 'ai_document_enhance'
  | 'black_and_white'
  | 'high_contrast_bw'
  | 'classic_grayscale'
  | 'soft_grayscale'
  | 'pure_white_bg'
  | 'clean_text'
  | 'sharp_text'
  | 'ultra_sharp'
  | 'strong_contrast'
  | 'soft_contrast'
  | 'bright_document'
  | 'dark_doc_correction'
  | 'shadow_removal'
  | 'background_removal'
  | 'paper_whitening'
  | 'faded_text_recovery'
  | 'old_doc_restoration'
  | 'blue_document'
  | 'green_document'
  | 'warm_paper'
  | 'cool_paper'
  | 'natural_colors'
  | 'receipt_mode'
  | 'book_scan_mode'
  | 'id_card_mode'
  | 'newspaper_mode'
  | 'blueprint_mode';

export interface FilterDefinition {
  id: FilterId;
  nameKey: string;
  category: 'color' | 'bw' | 'text' | 'restoration' | 'specialty';
  descriptionKey: string;
}

export interface Adjustments {
  brightness: number; // -100 to 100 (0 default)
  contrast: number; // -100 to 100 (0 default)
  saturation: number; // -100 to 100 (0 default)
  sharpness: number; // 0 to 100 (0 default)
}

export interface ScannedPage {
  id: string;
  originalImage: string; // Base64 data URL of the raw capture
  croppedImage: string; // Base64 data URL after perspective crop
  processedImage: string; // Base64 data URL after filter & adjustments applied
  thumbnail: string; // Small thumbnail
  corners: QuadCorners; // Applied corners
  rotation: number; // 0, 90, 180, 270
  filter: FilterId;
  filterIntensity: number; // 0 to 100
  adjustments: Adjustments;
  ocrText?: string;
  ocrLanguage?: Language;
  width: number;
  height: number;
}

export interface ScannedDocument {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pages: ScannedPage[];
  folder?: string;
  isFavorite?: boolean;
  tags?: string[];
  thumbnail: string;
}

export type PageSize = 'a4' | 'a5' | 'letter' | 'original';
export type PageOrientation = 'portrait' | 'landscape' | 'auto';
export type ExportFormat = 'pdf' | 'jpg' | 'png';
export type ImageQuality = 'high' | 'medium' | 'low';
export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppSettings {
  language: Language;
  theme: ThemeMode;
  defaultExportFormat: ExportFormat;
  defaultPageSize: PageSize;
  defaultOrientation: PageOrientation;
  defaultImageQuality: ImageQuality;
  autoCaptureEnabled: boolean;
  autoCaptureSensitivity: 'low' | 'medium' | 'high';
  hapticFeedback: boolean;
  soundEffects: boolean;
  embedOcrInPdf: boolean;
  ocrLanguage: Language;
}

