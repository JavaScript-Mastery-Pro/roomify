import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useOutletContext, useParams } from "react-router";
import Visualizer from "../../components/Visualizer";

export default function VisualizerRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    designHistory,
    publicProjects,
    uploadedImage,
    selectedInitialRender,
    setUploadedImage,
    setSelectedInitialRender,
    setCurrentSessionId,
    fetchProjectById,
    handleRenderComplete,
    handleShareCurrent,
  } = useOutletContext<AppContext>();
  const [resolvedItem, setResolvedItem] = useState<DesignHistoryItem | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const queryScope = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get("source") === "public" ? "public" : "user";
  }, [location.search]);

  useEffect(() => {
    if (id) setCurrentSessionId(id);
  }, [id, setCurrentSessionId]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const state = (location.state || {}) as VisualizerLocationState;

    if (state.initialImage) {
      const item: DesignHistoryItem = {
        id,
        sourceImage: state.initialImage,
        renderedImage: state.initialRender || undefined,
        timestamp: Date.now(),
      };
      setResolvedItem(item);
      setUploadedImage(state.initialImage);
      setSelectedInitialRender(state.initialRender || null);
      return;
    }

    const localSource = queryScope === "public" ? publicProjects : designHistory;
    const localItem = localSource.find((entry) => entry.id === id);
    if (localItem) {
      setResolvedItem(localItem);
      setUploadedImage(localItem.sourceImage);
      setSelectedInitialRender(localItem.renderedImage || null);
      return;
    }

    const resolve = async () => {
      setIsResolving(true);
      const fetched = await fetchProjectById(id, queryScope);
      if (cancelled) return;
      if (fetched) {
        setResolvedItem(fetched);
        setUploadedImage(fetched.sourceImage || null);
        setSelectedInitialRender(fetched.renderedImage || null);
      }
      setIsResolving(false);
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, [
    id,
    location.state,
    queryScope,
    designHistory,
    publicProjects,
    fetchProjectById,
    setUploadedImage,
    setSelectedInitialRender,
  ]);

  if (!id) return <Navigate to="/" replace />;

  const effectiveInitialImage = resolvedItem?.sourceImage || uploadedImage;
  const effectiveInitialRender = selectedInitialRender ?? resolvedItem?.renderedImage ?? null;

  if (!effectiveInitialImage && isResolving) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-zinc-500">
        Loading project…
      </div>
    );
  }

  return (
    <Visualizer
      onBack={() => navigate("/")}
      initialImage={effectiveInitialImage}
      onRenderComplete={handleRenderComplete}
      onShare={handleShareCurrent}
      projectName={id ? `Project ${id.slice(-4)}` : "Untitled Project"}
      projectId={id}
      initialRender={effectiveInitialRender}
    />
  );
}
