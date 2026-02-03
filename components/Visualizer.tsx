import { useEffect, useRef, useState } from "react";
import { Box, Download, RefreshCw, Share2, X } from "lucide-react";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";
import { useOutletContext } from "react-router";

import { Button } from "./ui/Button";
import AuthRequiredModal from "./AuthRequiredModal";

import { generate3DView } from "@/lib/ai.action";
import {
  SHARE_STATUS_RESET_DELAY_MS,
  UNAUTHORIZED_STATUSES,
} from "@/lib/constants";

const Visualizer = ({
  onBack,
  initialImage,
  onRenderComplete,
  onShare,
  onUnshare,
  projectName,
  projectId,
  initialRender,
  isPublic = false,
  sharedBy = null,
  canUnshare = false,
}: VisualizerProps) => {
  const { isSignedIn, signIn } = useOutletContext<AuthContext>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(
    initialRender || null,
  );
  const [shareStatus, setShareStatus] = useState<ShareStatus>("idle");
  const [shareAction, setShareAction] = useState<ShareAction | null>(null);

  const hasInitialGenerated = useRef(false);

  const handleExport = () => {
    if (!currentImage) return;

    const link = document.createElement("a");
    link.href = currentImage;
    link.download = `roomify-render-${Date.now()}.png`;

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
  };

  const handleShareToggle = async () => {
    if (!currentImage || isProcessing) return;
    if (!isSignedIn) {
      setAuthRequired(true);
      return;
    }

    const nextAction: ShareAction = isPublic ? "unshare" : "share";
    if (nextAction === "share" && !onShare) return;
    if (nextAction === "unshare" && (!onUnshare || !canUnshare)) return;

    setShareAction(nextAction);
    setShareStatus("saving");

    try {
      if (nextAction === "share") {
        await onShare(currentImage);
      } else {
        await onUnshare(currentImage);
      }

      setShareStatus("done");
      setTimeout(() => {
        setShareStatus("idle");
        setShareAction(null);
      }, SHARE_STATUS_RESET_DELAY_MS);
    } catch (error) {
      console.error(`${nextAction} failed:`, error);
      setShareStatus("idle");
      setShareAction(null);
    }
  };

  const runGeneration = async () => {
    if (!initialImage) return;

    setAuthRequired(false);

    try {
      if (!isSignedIn) {
        setAuthRequired(true);
        return;
      }

      setIsProcessing(true);

      const result = await generate3DView({
        sourceImage: initialImage,
        projectId,
      });

      if (result.renderedImage) {
        setCurrentImage(result.renderedImage);
        if (onRenderComplete) {
          onRenderComplete({
            renderedImage: result.renderedImage,
            renderedPath: result.renderedPath,
          });
        }
      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      if (UNAUTHORIZED_STATUSES.includes(error?.status)) {
        setAuthRequired(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isReadOnlyShared = isPublic && !canUnshare;

  const getShareLabel = () => {
    if (isReadOnlyShared) return "Shared";

    switch (shareStatus) {
      case "saving":
        return shareAction === "unshare" ? "Unsharing…" : "Sharing…";
      case "done":
        return shareAction === "unshare" ? "Unshared" : "Shared";
      case "idle":
      default:
        return isPublic ? "Unshare" : "Share";
    }
  };

  useEffect(() => {
    if (!initialImage || hasInitialGenerated.current) return;
    if (initialRender) {
      setCurrentImage(initialRender);
      hasInitialGenerated.current = true;
      return;
    }

    hasInitialGenerated.current = true;
    runGeneration();
  }, [initialImage, initialRender]);

  return (
    <div className="visualizer">
      <AuthRequiredModal
        isOpen={authRequired}
        onConfirm={async () => {
          try {
            const signedIn = await signIn();
            if (!signedIn) return;

            setAuthRequired(false);
            if (!currentImage && initialImage) {
              hasInitialGenerated.current = true;
              runGeneration();
            }
          } catch (error) {
            console.error("Puter sign-in failed:", error);
          }
        }}
        onCancel={() => {
          setAuthRequired(false);
          setIsProcessing(false);
        }}
        description="Sign in with your Puter account to generate and share visualizations."
      />

      <nav className="topbar">
        <div className="brand" onClick={onBack}>
          <Box className="logo" />
          <span className="name">Roomify</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="exit">
          <X className="icon" /> Exit Editor
        </Button>
      </nav>

      <div className="content">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-meta">
              <p>Project</p>
              <h2>{projectName || "Untitled Project"}</h2>
              <p className="note">
                {isPublic
                  ? `Shared by ${sharedBy || "Unknown"}`
                  : "Created by You"}
              </p>
            </div>
            <div className="panel-actions">
              <Button
                size="sm"
                onClick={handleExport}
                className="export"
                disabled={!currentImage}
              >
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
              <Button
                size="sm"
                onClick={handleShareToggle}
                className="share"
                disabled={
                  !currentImage ||
                  isProcessing ||
                  shareStatus === "saving" ||
                  (isPublic ? !onUnshare || !canUnshare : !onShare)
                }
              >
                <Share2 className="w-4 h-4 mr-2" />
                {getShareLabel()}
              </Button>
            </div>
          </div>

          <div className={`render-area ${isProcessing ? "is-processing" : ""}`}>
            {currentImage ? (
              <img src={currentImage} alt="AI Render" className="render-img" />
            ) : (
              <div className="render-placeholder">
                {initialImage && (
                  <img
                    src={initialImage}
                    alt="Original"
                    className="render-fallback"
                  />
                )}
              </div>
            )}

            {isProcessing && (
              <div className="render-overlay">
                <div className="rendering-card">
                  <RefreshCw className="spinner" />
                  <span className="title">Rendering…</span>
                  <span className="subtitle">
                    Generating your 3D visualization
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="panel compare">
          <div className="panel-header">
            <div className="panel-meta">
              <p>Comparison</p>
              <h3>Before vs After</h3>
            </div>
            <div className="hint">Drag to compare</div>
          </div>

          <div className="compare-stage">
            {initialImage && currentImage ? (
              <ReactCompareSlider
                defaultValue={50}
                style={{ width: "100%", height: "auto" }}
                itemOne={
                  <ReactCompareSliderImage
                    src={initialImage}
                    alt="Before"
                    className="compare-img"
                  />
                }
                itemTwo={
                  <ReactCompareSliderImage
                    src={currentImage}
                    alt="After"
                    className="compare-img"
                  />
                }
              />
            ) : (
              <div className="compare-fallback">
                {initialImage && (
                  <img
                    src={initialImage}
                    alt="Before"
                    className="compare-img"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
