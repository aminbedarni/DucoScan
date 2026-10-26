/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { CameraScanner } from './components/CameraScanner';
import { DocumentEditor } from './components/DocumentEditor';
import { DocumentsView } from './components/DocumentsView';
import { HomeView } from './components/HomeView';
import { Navigation, NavTab } from './components/Navigation';
import { SettingsView } from './components/SettingsView';
import { LanguageProvider, useI18n } from './i18n/context';
import { ThemeProvider } from './theme/context';
import { ScannedDocument, ScannedPage } from './types';
import { createArabicSample, createContractSample, createReceiptSample } from './utils/samples';
import { getAllDocuments, saveDocument } from './utils/storage';

const MainApp: React.FC = () => {
  const { t } = useI18n();

  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [activeEditingDoc, setActiveEditingDoc] = useState<ScannedDocument | null>(null);

  // Full-screen camera modal state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isAppendingToDoc, setIsAppendingToDoc] = useState<boolean>(false);

  // Load all documents on mount and seed initial sample documents if empty
  const refreshDocuments = async () => {
    try {
      let docs = await getAllDocuments();
      if (docs.length === 0) {
        // Seed initial high-quality sample documents
        const contract = createContractSample();
        const arabic = createArabicSample();
        const receipt = createReceiptSample();

        await saveDocument(contract);
        await saveDocument(arabic);
        await saveDocument(receipt);
        docs = await getAllDocuments();
      }
      setDocuments(docs);
    } catch (e) {
      console.error('Failed to load documents', e);
    }
  };

  useEffect(() => {
    refreshDocuments();
  }, []);

  const handleStartScan = () => {
    setIsAppendingToDoc(false);
    setIsCameraActive(true);
  };

  const handleOpenScannerForMorePages = () => {
    setIsAppendingToDoc(true);
    setIsCameraActive(true);
  };

  const handleFinishScan = async (scannedPages: ScannedPage[]) => {
    setIsCameraActive(false);

    if (scannedPages.length === 0) return;

    if (isAppendingToDoc && activeEditingDoc) {
      // Append pages to currently editing document
      const updatedDoc: ScannedDocument = {
        ...activeEditingDoc,
        pages: [...activeEditingDoc.pages, ...scannedPages],
        updatedAt: Date.now(),
      };
      await saveDocument(updatedDoc);
      setActiveEditingDoc(updatedDoc);
      await refreshDocuments();
    } else {
      // Create new document
      const newDoc: ScannedDocument = {
        id: `doc_${Date.now()}`,
        title: `Document ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        pages: scannedPages,
        thumbnail: scannedPages[0].processedImage,
      };
      await saveDocument(newDoc);
      await refreshDocuments();
      setActiveEditingDoc(newDoc);
    }
  };

  const handleOpenDocument = (doc: ScannedDocument) => {
    setActiveEditingDoc(doc);
  };

  const handleBackFromEditor = async () => {
    setActiveEditingDoc(null);
    await refreshDocuments();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-900 dark:selection:text-cyan-200 transition-colors duration-200">
      {/* Top Header Navigation (Desktop) & Bottom Bar (Mobile) */}
      {!isCameraActive && !activeEditingDoc && (
        <Navigation
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'scan') {
              handleStartScan();
            } else {
              setCurrentTab(tab);
            }
          }}
          documentCount={documents.length}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeEditingDoc ? (
          <DocumentEditor
            initialDocument={activeEditingDoc}
            onBack={handleBackFromEditor}
            onOpenScannerForMorePages={handleOpenScannerForMorePages}
          />
        ) : currentTab === 'home' ? (
          <HomeView
            recentDocuments={documents}
            onStartScan={handleStartScan}
            onOpenDocument={handleOpenDocument}
            onViewAllDocuments={() => setCurrentTab('documents')}
            onRefreshData={refreshDocuments}
          />
        ) : currentTab === 'documents' ? (
          <DocumentsView
            documents={documents}
            onOpenDocument={handleOpenDocument}
            onRefresh={refreshDocuments}
            onStartScan={handleStartScan}
          />
        ) : (
          <SettingsView onRefreshData={refreshDocuments} />
        )}
      </main>

      {/* Camera Full-Screen Scanner Modal */}
      {isCameraActive && (
        <CameraScanner
          onFinishScan={handleFinishScan}
          onCancel={() => setIsCameraActive(false)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <MainApp />
      </LanguageProvider>
    </ThemeProvider>
  );
}
