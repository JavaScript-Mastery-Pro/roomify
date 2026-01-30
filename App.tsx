import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import Visualizer from './components/Visualizer';
import { ViewState } from './types';

export interface DesignHistoryItem {
  id: string;
  image: string;
  timestamp: number;
}

const STORAGE_KEY = 'roomify_design_history_v1';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Initialize history from LocalStorage
  const [designHistory, setDesignHistory] = useState<DesignHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load history", e);
      return [];
    }
  });

  // Persist history changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designHistory));
  }, [designHistory]);

  const navigateTo = (view: ViewState) => {
    setCurrentView(view);
  };

  const handleUploadComplete = (base64Image: string) => {
    const newId = Date.now().toString();
    const newItem: DesignHistoryItem = {
      id: newId,
      image: base64Image,
      timestamp: Date.now()
    };
    
    setDesignHistory(prev => [newItem, ...prev]);
    setUploadedImage(base64Image);
    setCurrentSessionId(newId);
    navigateTo('visualizer');
  };

  const handleRenderComplete = (renderedImage: string) => {
    if (currentSessionId) {
      setDesignHistory(prev => prev.map(item => 
        item.id === currentSessionId 
          ? { ...item, image: renderedImage, timestamp: Date.now() } 
          : item
      ));
    }
  };

  const handleSelectHistoryItem = (item: DesignHistoryItem) => {
    setUploadedImage(item.image);
    setCurrentSessionId(item.id);
    navigateTo('visualizer');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative z-10">
        {currentView === 'landing' && (
          <Landing 
            onStart={handleUploadComplete} 
            history={designHistory}
            onSelectHistory={(id) => {
              const item = designHistory.find(i => i.id === id);
              if (item) handleSelectHistoryItem(item);
            }}
          />
        )}
        
        {currentView === 'visualizer' && (
          <Visualizer 
            onBack={() => navigateTo('landing')} 
            initialImage={uploadedImage}
            onRenderComplete={handleRenderComplete}
          />
        )}
      </div>
    </div>
  );
}

export default App;