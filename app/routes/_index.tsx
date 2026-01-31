import React from "react";
import { useNavigate, useOutletContext } from "react-router";
import Landing from "../../components/Landing";
import type { AppContext } from "../root";

export default function IndexRoute() {
  const navigate = useNavigate();
  const {
    designHistory,
    publicProjects,
    isLoadingHistory,
    isLoadingPublic,
    setDesignHistory,
    setUploadedImage,
    setCurrentSessionId,
    setSelectedInitialRender,
    saveProject,
    handleSignIn,
  } = useOutletContext<AppContext>();

  const handleUploadComplete = (base64Image: string) => {
    const newId = Date.now().toString();
    const newItem = {
      id: newId,
      sourceImage: base64Image,
      renderedImage: undefined,
      timestamp: Date.now(),
    };

    setDesignHistory((prev) => [newItem, ...prev]);
    saveProject(newItem);
    setUploadedImage(base64Image);
    setCurrentSessionId(newId);
    setSelectedInitialRender(null);
    navigate(`/visualizer/${newId}`, {
      state: { initialImage: base64Image, initialRender: null },
    });
  };

  const handleSelectHistory = (id: string) => {
    const item = designHistory.find((entry) => entry.id === id);
    if (!item) return;
    setUploadedImage(item.sourceImage);
    setCurrentSessionId(item.id);
    setSelectedInitialRender(item.renderedImage || null);
    navigate(`/visualizer/${item.id}`, {
      state: {
        initialImage: item.sourceImage,
        initialRender: item.renderedImage || null,
      },
    });
  };

  const handleSelectPublic = (item: (typeof publicProjects)[number]) => {
    const newId = Date.now().toString();
    setUploadedImage(item.sourceImage);
    setCurrentSessionId(newId);
    setSelectedInitialRender(item.renderedImage || null);
    navigate(`/visualizer/${newId}?source=public`, {
      state: {
        initialImage: item.sourceImage,
        initialRender: item.renderedImage || null,
      },
    });
  };

  return (
    <Landing
      onStart={handleUploadComplete}
      history={designHistory}
      isLoadingHistory={isLoadingHistory}
      onSignIn={handleSignIn}
      onSelectHistory={handleSelectHistory}
      onSelectPublic={handleSelectPublic}
      publicProjects={publicProjects}
      isLoadingPublic={isLoadingPublic}
    />
  );
}
