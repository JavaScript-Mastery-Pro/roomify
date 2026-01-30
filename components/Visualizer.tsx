import React, { useEffect, useRef, useState } from "react";
import { Box, Download, MoveHorizontal, RefreshCw, Share2, X, AlertTriangle } from "lucide-react";
import { Button } from "./ui/Button";
import { puter } from "@heyputer/puter.js";

interface VisualizerProps {
  onBack: () => void;
  initialImage: string | null;
  onRenderComplete?: (image: string) => void;
  onShare?: (image: string) => Promise<void> | void;
  projectName?: string;
}

const Visualizer: React.FC<VisualizerProps> = ({
  onBack,
  initialImage,
  onRenderComplete,
  onShare,
  projectName,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "saving" | "done">("idle");

  const hasInitialGenerated = useRef(false);

  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

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
    if (!currentImage || !onShare) return;
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

      const prompt = `
        TRANSFORM this 2D floor plan into a High-Fidelity 3D Top-Down Render.

        🚨 **PRIMARY DIRECTIVE: ERASE ALL TEXT** 🚨
        The input image contains labels (e.g., "Bedroom", "12'6 x 11'8", "Kitchen").
        You must COMPLETELY REMOVE these text annotations.
        - Do NOT render any letters or numbers.
        - The floor material (wood/tile) must continue seamlessly where the text used to be.
        - The final output must be clean and unannotated.

        🏗️ **GEOMETRY & STRUCTURE**:
        - **Walls**: Extrude 3D walls exactly where the black lines are. Do not move them.
        - **Doors**: Convert all door swing arcs into 3D doors in the open position.
        - **Windows**: Convert thin lines on perimeter walls into glass windows.

        🛋️ **FURNITURE & OBJECTS**:
        - **Replicate**: Convert every 2D icon into a photorealistic 3D object.
           - Bed icon -> Realistic Bed with duvet and pillows.
           - Sofa icon -> Modern sectional or sofa.
           - Dining table -> Table with chairs.
           - Kitchen -> Countertops with sink and stove.
           - Bathroom -> Porcelain toilet, sink, and tub/shower.

        🎨 **STYLE**:
        - Perspective: Orthographic Top-Down.
        - Lighting: Bright, neutral daylight, high contrast, clear visibility.
        - Atmosphere: Professional Architectural Visualization.
      `;

      const response = await puter.ai.txt2img(prompt, {
        provider: "gemini",
        model: "gemini-2.5-flash-image-preview",
        input_image: base64Data,
        input_image_mime_type: mimeType,
        ratio: { w: 1024, h: 1024 },
      });

      const newImageUrl =
        typeof response === "string"
          ? response
          : response instanceof HTMLImageElement
          ? response.src
          : null;

      if (newImageUrl) {
        setCurrentImage(newImageUrl);
        if (isInitial) {
          setSliderPosition(50);
        }
        if (onRenderComplete) {
          onRenderComplete(newImageUrl);
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
    if (initialImage && !hasInitialGenerated.current) {
      hasInitialGenerated.current = true;
      generate3DView(true);
    }
  }, [initialImage]);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [currentImage]);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      const relativeX = Math.max(0, Math.min(x - rect.left, rect.width));
      const percentage = (relativeX / rect.width) * 100;
      setSliderPosition(percentage);
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isDragging]);

  return (
    <div className="min-h-screen bg-background pt-6 pb-10 px-4 md:px-6 flex flex-col items-center font-sans relative">
      {authRequired && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center border border-zinc-200">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-primary w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-black mb-2">Sign in required</h3>
            <p className="text-zinc-600 text-sm mb-6 leading-relaxed">
              Sign in with your Puter account to generate and share visualizations.
            </p>
            <div className="flex flex-col space-y-3">
              <Button onClick={handleSignIn} fullWidth className="bg-primary hover:bg-orange-600 text-white">
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
        <div className="flex items-center space-x-2 cursor-pointer" onClick={onBack}>
          <Box className="w-6 h-6 text-black" />
          <span className="text-xl font-serif font-bold text-black tracking-tight">Roomify</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="text-zinc-500 hover:text-black hover:bg-zinc-100">
          <X className="w-5 h-5 mr-2" /> Exit Editor
        </Button>
      </nav>

      <div className="w-full max-w-6xl grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl border border-zinc-200 shadow-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 border-b border-zinc-100">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">Project</p>
              <h2 className="text-2xl font-serif font-bold text-black">
                {projectName || "Untitled Project"}
              </h2>
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
              <Button
                size="sm"
                onClick={handleShare}
                className="bg-black text-white h-9 shadow-sm hover:bg-zinc-800"
                disabled={!currentImage || isProcessing || shareStatus === "saving"}
              >
                <Share2 className="w-4 h-4 mr-2" />
                {shareStatus === "saving" ? "Sharing…" : shareStatus === "done" ? "Shared" : "Share"}
              </Button>
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
                  <img src={initialImage} alt="Original" className="w-full h-full object-contain opacity-50" />
                )}
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-white/60 backdrop-blur-sm transition-opacity duration-300">
                <div className="bg-white px-6 py-4 rounded-xl border border-zinc-200 flex flex-col items-center shadow-2xl">
                  <RefreshCw className="w-8 h-8 mb-3 animate-spin text-primary" />
                  <span className="text-sm font-bold text-black">Rendering…</span>
                  <span className="text-xs text-zinc-500 mt-1">Generating your 3D visualization</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-zinc-100">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">Comparison</p>
              <h3 className="text-lg font-serif font-bold text-black">Before vs After</h3>
            </div>
            <div className="text-xs text-zinc-400">Drag to compare</div>
          </div>

          <div
            ref={containerRef}
            className="relative h-[380px] bg-zinc-100 overflow-hidden select-none touch-none"
          >
            <div className="absolute inset-0">
              {initialImage && <img src={initialImage} alt="Before" className="w-full h-full object-contain" />}
            </div>

            {currentImage && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPosition}%` }}>
                <img
                  src={currentImage}
                  alt="After"
                  className="absolute top-0 left-0 max-w-none h-full object-contain"
                  style={{
                    width: containerDimensions.width || "100%",
                    height: containerDimensions.height || "100%",
                  }}
                />
              </div>
            )}

            <div
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              style={{ left: `${sliderPosition}%` }}
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border border-zinc-200 transform transition-transform hover:scale-110 active:scale-95">
                <MoveHorizontal size={16} className="text-black" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
