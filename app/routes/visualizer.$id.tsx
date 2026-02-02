import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate, useOutletContext, useParams } from "react-router";
import Visualizer from "../../components/Visualizer";

export default function VisualizerRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    designHistory,
    uploadedImage,
    selectedInitialRender,
    setUploadedImage,
    setSelectedInitialRender,
    setCurrentSessionId,
    fetchProjectById,
    handleRenderComplete,
    handleShareCurrent,
    currentUserId,
  } = useOutletContext<AppContext>();
  const [resolvedItem, setResolvedItem] = useState<DesignHistoryItem | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const queryScope = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get("source") === "public" ? "public" : "user";
  }, [location.search]);
  const queryOwnerId = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get("ownerId");
  }, [location.search]);
  const isPublicProject = queryScope === "public";

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
        name: state.name || null,
        sourceImage: state.initialImage,
        renderedImage: state.initialRender || undefined,
        timestamp: Date.now(),
        ownerId: state.ownerId || queryOwnerId || null,
        isPublic: isPublicProject,
      };
      setResolvedItem(item);
      setUploadedImage(state.initialImage);
      setSelectedInitialRender(state.initialRender || null);
      return;
    }

    const localSource =
      queryScope === "public"
        ? designHistory.filter((entry) => entry.isPublic)
        : designHistory;
    const localItem = localSource.find((entry) => entry.id === id);
    if (localItem) {
      setResolvedItem(localItem);
      setUploadedImage(localItem.sourceImage);
      setSelectedInitialRender(localItem.renderedImage || null);
      return;
    }

    const resolve = async () => {
      setIsResolving(true);
      const fetched = await fetchProjectById(id, queryScope, queryOwnerId);
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
    queryOwnerId,
    designHistory,
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

  const resolvedName =
    resolvedItem?.name || (id ? `Residence ${id}` : "Untitled Project");
  const canUnshare =
    isPublicProject &&
    !!currentUserId &&
    resolvedItem?.ownerId === currentUserId;
  return (
    <Visualizer
      onBack={() => navigate("/")}
      initialImage={effectiveInitialImage}
      onRenderComplete={handleRenderComplete}
      onShare={(image) => handleShareCurrent(image, { visibility: "public" })}
      onUnshare={(image) =>
        handleShareCurrent(image, { visibility: "private" })
      }
      projectName={resolvedName}
      projectId={id}
      initialRender={effectiveInitialRender}
      isPublic={isPublicProject}
      sharedBy={resolvedItem?.sharedBy || null}
      canUnshare={canUnshare}
    />
  );
}
