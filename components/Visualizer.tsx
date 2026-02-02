import React, { useEffect, useRef, useState } from "react";
import { Box, Download, RefreshCw, Share2, X, AlertTriangle } from "lucide-react";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";
import { Button } from "./ui/Button";
import { puter } from "@heyputer/puter.js";
import { ROOMIFY_RENDER_PROMPT } from "../constants";

const Visualizer: React.FC<VisualizerProps> = ({
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
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(
    initialRender || null,
  );
  const [shareStatus, setShareStatus] = useState<"idle" | "saving" | "done">(
    "idle",
  );
  const [unshareStatus, setUnshareStatus] = useState<
    "idle" | "saving" | "done"
  >("idle");

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

  const handleSignIn = async () => {
    try {
      await puter.auth.signIn();
      setAuthRequired(false);
      if (!currentImage && initialImage) {
        hasInitialGenerated.current = true;
        generate3DView(true);
      }
    } catch (error) {
      console.error("Puter sign-in failed:", error);
    }
  };

  const handleShare = async () => {
    if (!currentImage || !onShare || isPublic) return;
    setShareStatus("saving");
    try {
      await onShare(currentImage);
      setShareStatus("done");
      window.setTimeout(() => setShareStatus("idle"), 1500);
    } catch (error) {
      console.error("Share failed:", error);
      setShareStatus("idle");
    }
  };

  const handleUnshare = async () => {
    if (!currentImage || !onUnshare || !isPublic) return;
    setUnshareStatus("saving");
    try {
      await onUnshare(currentImage);
      setUnshareStatus("done");
      window.setTimeout(() => setUnshareStatus("idle"), 1500);
    } catch (error) {
      console.error("Unshare failed:", error);
      setUnshareStatus("idle");
    }
  };
  const generate3DView = async (isInitial: boolean = false) => {
    if (!initialImage) return;

    setAuthRequired(false);

    try {
      const signedIn = await puter.auth.isSignedIn();
      if (!signedIn) {
        setAuthRequired(true);
        return;
      }

      setIsProcessing(true);

      const sourceImage = initialImage;
      const base64Data = sourceImage.split(",")[1];
      const mimeType = sourceImage.split(";")[0].split(":")[1];

      const response = await puter.ai.txt2img(ROOMIFY_RENDER_PROMPT, {
        provider: "gemini",
        model: "gemini-2.5-flash-image-preview",
        input_image: base64Data,
        input_image_mime_type: mimeType,
        ratio: { w: 1024, h: 1024 },
      });

      const rawImageUrl =
        typeof response === "string"
          ? response
          : response instanceof HTMLImageElement
            ? response.src
            : null;

      let newImageUrl = rawImageUrl;
      let storedPath: string | undefined;

      if (rawImageUrl) {
        try {
          const blob = await (await fetch(rawImageUrl)).blob();
          try {
            await puter.fs.mkdir("roomify/renders", { recursive: true });
          } catch (error) {
            console.warn("Failed to ensure render directory:", error);
          }
          const fileName = projectId
            ? `roomify/renders/${projectId}.png`
            : `roomify/renders/${Date.now()}.png`;
          await puter.fs.write(fileName, blob);
          storedPath = fileName;
          newImageUrl = await puter.fs.getReadURL(fileName);
        } catch (error) {
          console.error("Failed to store image in Puter FS:", error);
          newImageUrl = rawImageUrl;
        }
      }

      if (newImageUrl) {
        setCurrentImage(newImageUrl);
        if (onRenderComplete) {
          onRenderComplete({
            renderedImage: newImageUrl,
            renderedPath: storedPath,
          });
        }
      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      if (error?.status === 401 || error?.status === 403) {
        setAuthRequired(true);
      }
    } finally {
      setIsProcessing(false);
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
    generate3DView(true);
  }, [initialImage, initialRender]);

  return (
    <div className="min-h-screen bg-background pt-6 pb-10 px-4 md:px-6 flex flex-col items-center font-sans relative">
      {authRequired && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center border border-zinc-200">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-primary w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-black mb-2">
              Sign in required
            </h3>
            <p className="text-zinc-600 text-sm mb-6 leading-relaxed">
              Sign in with your Puter account to generate and share
              visualizations.
            </p>
            <div className="flex flex-col space-y-3">
              <Button
                onClick={handleSignIn}
                fullWidth
                className="bg-primary hover:bg-orange-600 text-white"
              >
                Sign in with Puter
              </Button>
              <button
                onClick={() => {
                  setAuthRequired(false);
                  setIsProcessing(false);
                }}
                className="text-xs text-zinc-400 hover:text-black mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="w-full max-w-6xl flex items-center justify-between mb-6 px-2">
        <div
          className="flex items-center space-x-2 cursor-pointer"
          onClick={onBack}
        >
          <Box className="w-6 h-6 text-black" />
          <span className="text-xl font-serif font-bold text-black tracking-tight">
            Roomify
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-zinc-500 hover:text-black hover:bg-zinc-100"
        >
          <X className="w-5 h-5 mr-2" /> Exit Editor
        </Button>
      </nav>

      <div className="w-full max-w-6xl grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 border-b border-zinc-100">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                Project
              </p>
              <h2 className="text-2xl font-serif font-bold text-black">
                {projectName || "Untitled Project"}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                {isPublic
                  ? `Shared by ${sharedBy || "Unknown"}`
                  : "Created by You"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="sm"
                onClick={handleExport}
                className="bg-primary text-white hover:bg-orange-600 h-9 border-none shadow-sm"
                disabled={!currentImage}
              >
                <Download className="w-4 h-4 mr-2" /> Export
              </Button>
              {isPublic ? (
                <Button
                  size="sm"
                  onClick={handleUnshare}
                  className="bg-black text-white h-9 shadow-sm hover:bg-zinc-800"
                  disabled={
                    !currentImage ||
                    isProcessing ||
                    unshareStatus === "saving" ||
                    !onUnshare ||
                    !canUnshare
                  }
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {!canUnshare
                    ? "Shared"
                    : unshareStatus === "saving"
                      ? "Unsharing…"
                      : unshareStatus === "done"
                        ? "Unshared"
                        : "Unshare"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleShare}
                  className="bg-black text-white h-9 shadow-sm hover:bg-zinc-800"
                  disabled={
                    !currentImage ||
                    isProcessing ||
                    shareStatus === "saving" ||
                    !onShare
                  }
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  {shareStatus === "saving"
                    ? "Sharing…"
                    : shareStatus === "done"
                      ? "Shared"
                      : "Share"}
                </Button>
              )}
            </div>
          </div>

          <div className="relative bg-zinc-100 min-h-[420px]">
            {currentImage ? (
              <img
                src={currentImage}
                alt="AI Render"
                className={`w-full h-full object-contain transition-all duration-700 ${isProcessing ? "opacity-50 blur-sm scale-105" : "opacity-100 scale-100"}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {initialImage && (
                  <img
                    src={initialImage}
                    alt="Original"
                    className="w-full h-full object-contain opacity-50"
                  />
                )}
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-white/60 backdrop-blur-sm transition-opacity duration-300">
                <div className="bg-white px-6 py-4 rounded-xl border border-zinc-200 flex flex-col items-center shadow-2xl">
                  <RefreshCw className="w-8 h-8 mb-3 animate-spin text-primary" />
                  <span className="text-sm font-bold text-black">
                    Rendering…
                  </span>
                  <span className="text-xs text-zinc-500 mt-1">
                    Generating your 3D visualization
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-zinc-100">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                Comparison
              </p>
              <h3 className="text-lg font-serif font-bold text-black">
                Before vs After
              </h3>
            </div>
            <div className="text-xs text-zinc-400">Drag to compare</div>
          </div>

          <div className="relative bg-zinc-100 overflow-hidden">
            {initialImage && currentImage ? (
              <ReactCompareSlider
                defaultPosition={50}
                style={{ width: "100%", height: "auto" }}
                itemOne={
                  <ReactCompareSliderImage
                    src={initialImage}
                    alt="Before"
                    className="w-full h-auto object-contain"
                  />
                }
                itemTwo={
                  <ReactCompareSliderImage
                    src={currentImage}
                    alt="After"
                    className="w-full h-auto object-contain"
                  />
                }
              />
            ) : (
              <div className="flex items-center justify-center">
                {initialImage && (
                  <img
                    src={initialImage}
                    alt="Before"
                    className="w-full h-auto object-contain"
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
