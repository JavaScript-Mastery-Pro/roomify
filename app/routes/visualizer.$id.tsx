import React, { useEffect, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router";

import {
  getProjectById,
  saveProject,
  shareProject,
  unshareProject,
} from "@/lib/puter.action";

import Visualizer from "@/components/Visualizer";

export default function VisualizerRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [resolvedItem, setResolvedItem] = useState<DesignHistoryItem | null>(
    null,
  );
  const [isResolving, setIsResolving] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedInitialRender, setSelectedInitialRender] = useState<
    string | null
  >(null);
  const {
    userId: currentUserId,
    isSignedIn,
    signIn,
  } = useOutletContext<AuthContext>();

  const search = new URLSearchParams(location.search);
  const queryScope = search.get("source") === "user" ? "user" : "public";
  const queryOwnerId = search.get("ownerId");
  const isPublicProject = queryScope === "public";

  const fetchProjectById = async (
    projectId: string,
    scope: "user" | "public",
    ownerId?: string | null,
  ) => {
    if (scope === "user" && !isSignedIn) {
      const signedIn = await signIn();
      if (!signedIn) return null;
    }

    return await getProjectById({ id: projectId, scope, ownerId });
  };

  const handleRenderComplete = async (payload: {
    renderedImage: string;
    renderedPath?: string;
  }) => {
    if (!id) return;
    const sourceImage = resolvedItem?.sourceImage || uploadedImage || "";
    const updatedItem = {
      id,
      name: resolvedItem?.name || `Residence ${id}`,
      sourceImage,
      renderedImage: payload.renderedImage,
      renderedPath: payload.renderedPath,
      timestamp: Date.now(),
      ownerId: resolvedItem?.ownerId || null,
      isPublic: resolvedItem?.isPublic || false,
    };
    setResolvedItem(updatedItem);
    const saved = await saveProject(
      updatedItem,
      updatedItem.isPublic ? "public" : "private",
    );
    if (saved) {
      setResolvedItem(saved);
      if (saved.sourceImage) setUploadedImage(saved.sourceImage);
      if (saved.renderedImage) setSelectedInitialRender(saved.renderedImage);
    }
  };

  const handleShareCurrent = async (
    image: string,
    opts?: { visibility?: "private" | "public" },
  ) => {
    if (!id) return;
    const visibility = opts?.visibility || "public";
    const updatedItem = {
      id,
      name: resolvedItem?.name || `Residence ${id}`,
      sourceImage: uploadedImage || "",
      renderedImage: image,
      renderedPath: resolvedItem?.renderedPath,
      timestamp: Date.now(),
      ownerId:
        visibility === "public"
          ? resolvedItem?.ownerId || currentUserId || null
          : resolvedItem?.ownerId || null,
      isPublic: visibility === "public",
    };
    setResolvedItem(updatedItem);
    if (visibility === "public") {
      const saved = await shareProject(updatedItem);
      if (saved) {
        setResolvedItem(saved);
        if (saved.sourceImage) setUploadedImage(saved.sourceImage);
        if (saved.renderedImage) setSelectedInitialRender(saved.renderedImage);
      }
    } else {
      const saved = await unshareProject(updatedItem);
      if (saved) {
        setResolvedItem(saved);
        if (saved.sourceImage) setUploadedImage(saved.sourceImage);
        if (saved.renderedImage) setSelectedInitialRender(saved.renderedImage);
      }
    }
  };

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
        sharedBy: state.sharedBy || null,
      };
      setResolvedItem(item);
      setUploadedImage(state.initialImage);
      setSelectedInitialRender(state.initialRender || null);
      if (state.initialRender) return;
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
  }, [id, location.state, queryScope, queryOwnerId, isPublicProject]);

  if (!id) return <Navigate to="/" replace />;

  const effectiveInitialImage = resolvedItem?.sourceImage || uploadedImage;
  const effectiveInitialRender =
    selectedInitialRender ?? resolvedItem?.renderedImage ?? null;

  if (!effectiveInitialImage && isResolving) {
    return (
      <div className="visualizer-route loading">
        Loading project…
      </div>
    );
  }

  const resolvedName =
    resolvedItem?.name || (id ? `Residence ${id}` : "Untitled Project");
  const resolvedIsPublic = resolvedItem?.isPublic ?? isPublicProject;
  const canUnshare =
    resolvedIsPublic &&
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
      isPublic={resolvedIsPublic}
      sharedBy={resolvedItem?.sharedBy || null}
      canUnshare={canUnshare}
    />
  );
}
