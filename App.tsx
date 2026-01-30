import React, { useState, useEffect } from "react";
import Landing from "./components/Landing";
import Visualizer from "./components/Visualizer";
import { ViewState } from "./types";
import { puter } from "@heyputer/puter.js";
import { PUTER_WORKER_URL } from "./constants";

export interface DesignHistoryItem {
  id: string;
  image: string;
  timestamp: number;
}

function App() {
  const [currentView, setCurrentView] = useState<ViewState>("landing");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [designHistory, setDesignHistory] = useState<DesignHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [publicProjects, setPublicProjects] = useState<DesignHistoryItem[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);

  const ensureSignedIn = async (prompt: boolean) => {
    try {
      const signedIn = await puter.auth.isSignedIn();
      if (signedIn) return true;
      if (!prompt) return false;
      await puter.auth.signIn();
      return await puter.auth.isSignedIn();
    } catch (error) {
      console.error("Puter auth check failed:", error);
      return false;
    }
  };

  const fetchHistory = async () => {
    if (!PUTER_WORKER_URL) {
      console.warn("Missing VITE_PUTER_WORKER_URL; skipping history fetch.");
      return;
    }
    const canFetch = await ensureSignedIn(false);
    if (!canFetch) return;
    try {
      setIsLoadingHistory(true);
      const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/list`, {
        method: "GET",
      });
      if (!response.ok) {
        console.error("Failed to fetch history:", await response.text());
        return;
      }
      const data = await response.json();
      const items = Array.isArray(data?.projects) ? data.projects : [];
      setDesignHistory(items);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchPublicProjects = async () => {
    if (!PUTER_WORKER_URL) {
      console.warn("Missing VITE_PUTER_WORKER_URL; skipping public projects fetch.");
      return;
    }
    const canFetch = await ensureSignedIn(false);
    if (!canFetch) return;
    try {
      setIsLoadingPublic(true);
      const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/public`, {
        method: "GET",
      });
      if (!response.ok) {
        console.error("Failed to fetch public projects:", await response.text());
        return;
      }
      const data = await response.json();
      const items = Array.isArray(data?.projects) ? data.projects : [];
      setPublicProjects(items);
    } catch (error) {
      console.error("Failed to fetch public projects:", error);
    } finally {
      setIsLoadingPublic(false);
    }
  };

  const saveProject = async (item: DesignHistoryItem, share: boolean = false) => {
    if (!PUTER_WORKER_URL) {
      console.warn("Missing VITE_PUTER_WORKER_URL; skipping history save.");
      return;
    }
    const canSave = await ensureSignedIn(true);
    if (!canSave) return;
    try {
      const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: item, share }),
      });
      if (!response.ok) {
        console.error("Failed to save project:", await response.text());
      }
    } catch (error) {
      console.error("Failed to save project:", error);
    }
  };

  const navigateTo = (view: ViewState) => {
    setCurrentView(view);
  };

  useEffect(() => {
    fetchHistory();
    fetchPublicProjects();
  }, []);

  const handleUploadComplete = (base64Image: string) => {
    const newId = Date.now().toString();
    const newItem: DesignHistoryItem = {
      id: newId,
      image: base64Image,
      timestamp: Date.now(),
    };

    setDesignHistory((prev) => [newItem, ...prev]);
    saveProject(newItem);
    setUploadedImage(base64Image);
    setCurrentSessionId(newId);
    navigateTo("visualizer");
  };

  const handleRenderComplete = (renderedImage: string) => {
    if (currentSessionId) {
      const updatedItem = {
        id: currentSessionId,
        image: renderedImage,
        timestamp: Date.now(),
      };
      setDesignHistory((prev) =>
        prev.map((item) => (item.id === currentSessionId ? updatedItem : item)),
      );
      saveProject(updatedItem);
    }
  };

  const handleShareCurrent = async (image: string) => {
    const id = currentSessionId || Date.now().toString();
    const updatedItem = {
      id,
      image,
      timestamp: Date.now(),
    };

    if (!currentSessionId) {
      setCurrentSessionId(id);
    }

    setDesignHistory((prev) => {
      const exists = prev.some((item) => item.id === id);
      return exists
        ? prev.map((item) => (item.id === id ? updatedItem : item))
        : [updatedItem, ...prev];
    });

    await saveProject(updatedItem, true);
    await fetchPublicProjects();
  };

  const handleSelectHistoryItem = (item: DesignHistoryItem) => {
    setUploadedImage(item.image);
    setCurrentSessionId(item.id);
    navigateTo("visualizer");
  };

  const handleSelectPublicItem = (item: DesignHistoryItem) => {
    const newId = Date.now().toString();
    setUploadedImage(item.image);
    setCurrentSessionId(newId);
    navigateTo("visualizer");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative z-10">
        {currentView === "landing" && (
          <Landing
            onStart={handleUploadComplete}
            history={designHistory}
            isLoadingHistory={isLoadingHistory}
            onSignIn={async () => {
              await puter.auth.signIn();
              await fetchHistory();
              await fetchPublicProjects();
            }}
            onSelectHistory={(id) => {
              const item = designHistory.find((i) => i.id === id);
              if (item) handleSelectHistoryItem(item);
            }}
            onSelectPublic={handleSelectPublicItem}
            publicProjects={publicProjects}
            isLoadingPublic={isLoadingPublic}
          />
        )}

        {currentView === "visualizer" && (
          <Visualizer
            onBack={() => navigateTo("landing")}
            initialImage={uploadedImage}
            onRenderComplete={handleRenderComplete}
            onShare={handleShareCurrent}
            projectName={currentSessionId ? `Project ${currentSessionId.slice(-4)}` : "Untitled Project"}
          />
        )}
      </div>
    </div>
  );
}

export default App;
