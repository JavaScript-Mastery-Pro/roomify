import React from "react";
import { useNavigate, useOutletContext } from "react-router";
import Landing from "../../components/Landing";
import { puter } from "@heyputer/puter.js";

export default function IndexRoute() {
  const navigate = useNavigate();
  const {
    designHistory,
    isLoadingHistory,
    setDesignHistory,
    setUploadedImage,
    setCurrentSessionId,
    setSelectedInitialRender,
    saveProject,
    handleSignIn,
  } = useOutletContext<AppContext>();

  const handleUploadComplete = async (base64Image: string) => {
    const signedIn = await puter.auth.isSignedIn();
    if (!signedIn) {
      await puter.auth.signIn();
      const nowSignedIn = await puter.auth.isSignedIn();
      if (!nowSignedIn) return;
    }
    const newId = Date.now().toString();
    const name = `Residence ${newId}`;
    const newItem = {
      id: newId,
      name,
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
      state: { initialImage: base64Image, initialRender: null, name },
    });
  };

  const handleSelectHistory = (id: string) => {
    const item = designHistory.find((entry) => entry.id === id);
    if (!item) return;
    setUploadedImage(item.sourceImage);
    setCurrentSessionId(item.id);
    setSelectedInitialRender(item.renderedImage || null);
    const ownerParam = item.ownerId ? `&ownerId=${encodeURIComponent(item.ownerId)}` : "";
    const query = item.isPublic ? `?source=public${ownerParam}` : "";
    navigate(`/visualizer/${item.id}${query}`, {
      state: {
        initialImage: item.sourceImage,
        initialRender: item.renderedImage || null,
        ownerId: item.ownerId || null,
        name: item.name || null,
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
    />
  );
}
