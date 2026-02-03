import { useEffect, useState } from "react";
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

const createDesignHistoryItem = (
  id: string,
  base: Partial<DesignHistoryItem>,
  overrides: Partial<DesignHistoryItem> = {}
): DesignHistoryItem => ({
  id,
  name: base.name || `Residence ${id}`,
  sourceImage: base.sourceImage || "",
  renderedImage: base.renderedImage,
  renderedPath: base.renderedPath,
  timestamp: Date.now(),
  ownerId: base.ownerId || null,
  isPublic: base.isPublic || false,
  ...overrides,
});

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
    const updatedItem = createDesignHistoryItem(id, {
      name: resolvedItem?.name,
      sourceImage: uploadedImage || "",
      ownerId: resolvedItem?.ownerId,
      isPublic: resolvedItem?.isPublic,
    }, {
      renderedImage: payload.renderedImage,
      renderedPath: payload.renderedPath,
    });
    setResolvedItem(updatedItem);
    await saveProject(updatedItem, updatedItem.isPublic ? "public" : "private");
  };

  const handleShareCurrent = async (
    image: string,
    opts?: { visibility?: "private" | "public" },
  ) => {
    if (!id) return;
    const visibility = opts?.visibility || "public";
    const ownerId = visibility === "public"
      ? resolvedItem?.ownerId || currentUserId || null
      : resolvedItem?.ownerId || null;

    const updatedItem = createDesignHistoryItem(id, {
      name: resolvedItem?.name,
      sourceImage: uploadedImage || "",
      renderedPath: resolvedItem?.renderedPath,
    }, {
      renderedImage: image,
      ownerId,
      isPublic: visibility === "public",
    });
    setResolvedItem(updatedItem);
    if (visibility === "public") {
      await shareProject(updatedItem);
    } else {
      await unshareProject(updatedItem);
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const state = (location.state || {}) as VisualizerLocationState;

    if (state.initialImage) {
      const item = createDesignHistoryItem(id, {
        sourceImage: state.initialImage,
      }, {
        name: state.name || null,
        renderedImage: state.initialRender || undefined,
        ownerId: state.ownerId || queryOwnerId || null,
        isPublic: isPublicProject,
      });
      setResolvedItem(item);
      setUploadedImage(state.initialImage);
      setSelectedInitialRender(state.initialRender || null);
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
