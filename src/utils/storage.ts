import { AppSettings, ScannedDocument } from '../types';

const DB_NAME = 'DocuScanPro_DB';
const DB_VERSION = 1;
const STORE_DOCS = 'documents';
const STORE_SETTINGS = 'settings';

const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  theme: 'dark',
  defaultExportFormat: 'pdf',
  defaultPageSize: 'a4',
  defaultOrientation: 'portrait',
  defaultImageQuality: 'high',
  autoCaptureEnabled: true,
  autoCaptureSensitivity: 'medium',
  hapticFeedback: true,
  soundEffects: true,
  embedOcrInPdf: true,
  ocrLanguage: 'en',
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        const store = db.createObjectStore(STORE_DOCS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('isFavorite', 'isFavorite', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllDocuments(): Promise<ScannedDocument[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, 'readonly');
      const store = tx.objectStore(STORE_DOCS);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as ScannedDocument[]) || [];
        // Sort newest first by default
        results.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get all documents from IndexedDB', err);
    return [];
  }
}

export async function getDocumentById(id: string): Promise<ScannedDocument | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOCS, 'readonly');
      const store = tx.objectStore(STORE_DOCS);
      const request = store.get(id);

      request.onsuccess = () => resolve((request.result as ScannedDocument) || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get document by id', err);
    return null;
  }
}

export async function saveDocument(doc: ScannedDocument): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCS, 'readwrite');
    const store = tx.objectStore(STORE_DOCS);
    const updatedDoc: ScannedDocument = {
      ...doc,
      updatedAt: Date.now(),
    };
    const request = store.put(updatedDoc);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCS, 'readwrite');
    const store = tx.objectStore(STORE_DOCS);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const doc = await getDocumentById(id);
  if (!doc) return false;
  doc.isFavorite = !doc.isFavorite;
  await saveDocument(doc);
  return !!doc.isFavorite;
}

export async function clearAllDocuments(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCS, 'readwrite');
    const store = tx.objectStore(STORE_DOCS);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const request = store.get('app_settings');
      request.onsuccess = () => {
        if (request.result && request.result.value) {
          resolve({ ...DEFAULT_SETTINGS, ...request.result.value });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      request.onerror = () => resolve(DEFAULT_SETTINGS);
    });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveAppSettings(settings: Partial<AppSettings>): Promise<void> {
  try {
    const current = await getAppSettings();
    const updated = { ...current, ...settings };
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const request = store.put({ key: 'app_settings', value: updated });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export async function getStorageEstimate(): Promise<{ usedBytes: number; quotaBytes: number; formatted: string }> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const mb = (used / (1024 * 1024)).toFixed(2);
      return {
        usedBytes: used,
        quotaBytes: quota,
        formatted: `${mb} MB`,
      };
    }
  } catch {
    // fallback
  }
  return { usedBytes: 0, quotaBytes: 0, formatted: '0 MB' };
}
