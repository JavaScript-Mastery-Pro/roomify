import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, RefreshCw, X, SplitSquareHorizontal, 
  Layout, Palette, Box, MoveHorizontal, Undo2, Sun, Moon, Sunrise, Sunset,
  AlertTriangle
} from 'lucide-react';
import { Button } from './ui/Button';
import { WALL_MATERIALS, FLOOR_MATERIALS, FURNITURE_STYLES, LIGHTING_OPTIONS } from '../constants';
import { GoogleGenAI } from "@google/genai";

interface VisualizerProps {
  onBack: () => void;
  initialImage: string | null;
  onRenderComplete?: (image: string) => void;
}

const Visualizer: React.FC<VisualizerProps> = ({ onBack, initialImage, onRenderComplete }) => {
  const [activeTab, setActiveTab] = useState<'walls' | 'floor' | 'style' | 'lighting' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  
  // History Management for Undo functionality
  const [history, setHistory] = useState<string[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  
  // Derived state for the image currently being shown
  const currentImage = currentHistoryIndex >= 0 ? history[currentHistoryIndex] : null;

  // Slider State
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  // Design State
  const [selectedWall, setSelectedWall] = useState<string>(WALL_MATERIALS[0].id);
  const [selectedFloor, setSelectedFloor] = useState<string>(FLOOR_MATERIALS[0].id);
  const [selectedStyle, setSelectedStyle] = useState<string>(FURNITURE_STYLES[0].id);
  const [selectedLighting, setSelectedLighting] = useState<string>(LIGHTING_OPTIONS[1].id); // Default to Noon
  
  const hasInitialGenerated = useRef(false);

  // Helper to get names for prompt
  const getMaterialName = (id: string, list: any[]) => list.find(m => m.id === id)?.name || '';
  const getLightingDesc = (id: string) => LIGHTING_OPTIONS.find(l => l.id === id)?.description || '';

  // Function to download the image
  const handleExport = () => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `roomify-render-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      setCurrentHistoryIndex(prev => prev - 1);
    }
  };

  // API Key Handling
  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        console.log("Has API Key selected:", hasKey);
      }
    };
    checkKey();
  }, []);

  const handleConnectProject = async () => {
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      try {
        await (window as any).aistudio.openSelectKey();
        setApiKeyError(false);
        // Retry generation if we are in the initial state or just failed
        if (!currentImage && initialImage) {
           // Reset the ref so it tries again
           hasInitialGenerated.current = true; // It's already true if we failed, but let's ensure logic holds
           generate3DView(true);
        } else if (currentImage) {
           generate3DView(false);
        }
      } catch (e) {
        console.error("Key selection failed", e);
      }
    }
  };

  const generate3DView = async (isInitial: boolean = false) => {
    if (!initialImage) return;
    
    // Clear previous errors
    setApiKeyError(false);
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sourceImage = isInitial || !currentImage ? initialImage : currentImage;
      const base64Data = sourceImage.split(',')[1];
      const mimeType = sourceImage.split(';')[0].split(':')[1];
      const lightingDescription = getLightingDesc(selectedLighting);

      let prompt = "";
      
      if (isInitial) {
        prompt = `
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
          - Lighting: ${lightingDescription}.
          - Atmosphere: Professional Architectural Visualization.
        `;
      } else {
        const wallName = getMaterialName(selectedWall, WALL_MATERIALS);
        const floorName = getMaterialName(selectedFloor, FLOOR_MATERIALS);
        const styleName = getMaterialName(selectedStyle, FURNITURE_STYLES);

        prompt = `
          ACT as a professional architectural visualizer.
          RE-RENDER this image with the following specific design changes.

          DESIGN SPECIFICATIONS:
          1. **FLOORING**: Apply a "${floorName}" finish. Ensure the texture scale is realistic for a floor plan.
          2. **WALLS**: Update wall color/material to "${wallName}".
          3. **FURNITURE & DECOR**: Refine the furniture to match a "${styleName}" style.
          4. **LIGHTING**: Apply "${lightingDescription}".

          STRICT OUTPUT RULES:
          - **PERSPECTIVE**: Maintain the exact Top-Down Orthographic view.
          - **LAYOUT**: Do NOT move any walls, doors, or furniture. The geometry must match the input exactly.
          - **QUALITY**: Photorealistic rendering with soft shadows and ambient occlusion.
          - **CLEAN**: No text, labels, or dimensions.
        `;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            { text: prompt }
          ]
        },
        config: {
            imageConfig: {
                aspectRatio: "1:1"
            }
        }
      });

      let newImageUrl = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
           if (part.inlineData) {
             newImageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
             break;
           }
        }
      }

      if (newImageUrl) {
        const newHistory = history.slice(0, currentHistoryIndex + 1);
        newHistory.push(newImageUrl);
        setHistory(newHistory);
        setCurrentHistoryIndex(newHistory.length - 1);
        if (isInitial) setShowComparison(true);
        
        // Update App history via callback
        if (onRenderComplete) {
            onRenderComplete(newImageUrl);
        }
      } else {
        console.warn("No image returned:", response.text);
      }

    } catch (error: any) {
      console.error("Generation failed:", error);
      // Handle Permission Denied / 403
      const errString = error.toString();
      if (errString.includes("403") || errString.includes("PERMISSION_DENIED") || error.status === 403) {
          setApiKeyError(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Resize Observer for Container
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
  }, [showComparison, currentImage]);

  // Drag Event Handlers
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const relativeX = Math.max(0, Math.min(x - rect.left, rect.width));
      const percentage = (relativeX / rect.width) * 100;
      setSliderPosition(percentage);
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging]);

  useEffect(() => {
    if (initialImage && !hasInitialGenerated.current) {
      hasInitialGenerated.current = true;
      generate3DView(true);
    }
  }, [initialImage]);
  
  const handleMaterialChange = (type: 'walls' | 'floor' | 'style' | 'lighting', id: string) => {
    if (type === 'walls') setSelectedWall(id);
    if (type === 'floor') setSelectedFloor(id);
    if (type === 'style') setSelectedStyle(id);
    if (type === 'lighting') setSelectedLighting(id);
    
    setTimeout(() => {
        generate3DView(false);
    }, 100);
  };

  const getLightingIcon = (id: string) => {
    switch(id) {
        case 'morning': return <Sunrise size={18} className="text-yellow-600" />;
        case 'noon': return <Sun size={18} className="text-orange-500" />;
        case 'sunset': return <Sunset size={18} className="text-orange-600" />;
        case 'night': return <Moon size={18} className="text-blue-600" />;
        default: return <Sun size={18} />;
    }
  };

  return (
    <div className="min-h-screen bg-background pt-4 pb-4 px-4 md:px-6 flex flex-col items-center font-sans relative">
      
      {/* API Key Modal Overlay */}
      {apiKeyError && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center border border-zinc-200">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="text-primary w-6 h-6" />
                </div>
                <h3 className="text-xl font-serif font-bold text-black mb-2">Access Required</h3>
                <p className="text-zinc-600 text-sm mb-6 leading-relaxed">
                    Generating high-fidelity 3D renders requires a connected Google Cloud Project with billing enabled.
                </p>
                <div className="flex flex-col space-y-3">
                    <Button onClick={handleConnectProject} fullWidth className="bg-primary hover:bg-orange-600 text-white">
                        Connect Google Cloud Project
                    </Button>
                    <a 
                        href="https://ai.google.dev/gemini-api/docs/billing" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-400 hover:text-zinc-600 underline"
                    >
                        Learn more about billing
                    </a>
                    <button 
                        onClick={() => { setApiKeyError(false); setIsProcessing(false); }}
                        className="text-xs text-zinc-400 hover:text-black mt-2"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <nav className="w-full max-w-7xl flex items-center justify-between mb-4 px-2">
         <div className="flex items-center space-x-2 cursor-pointer" onClick={onBack}>
              <Box className="w-6 h-6 text-black" />
              <span className="text-xl font-serif font-bold text-black tracking-tight">Roomify</span>
         </div>
         <div className="flex items-center space-x-3">
             {currentHistoryIndex > 0 && (
                <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleUndo}
                    className="h-9 bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                >
                    <Undo2 className="w-4 h-4 mr-2" /> Undo
                </Button>
             )}
             <Button variant="ghost" size="sm" onClick={onBack} className="text-zinc-500 hover:text-black hover:bg-zinc-100">
                <X className="w-5 h-5 mr-2" /> Exit Editor
             </Button>
         </div>
      </nav>

      {/* Main App Window */}
      <div className="w-full max-w-7xl aspect-[16/9] md:h-[80vh] relative bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-2xl flex flex-col">
        
        {/* Editor Toolbar Overlay - simplified and light */}
        <header className="absolute top-4 left-4 right-4 flex items-center justify-between z-30 pointer-events-none">
          <div className="pointer-events-auto bg-white/90 backdrop-blur-md border border-zinc-200 rounded-lg px-3 py-1.5 flex items-center space-x-3 shadow-sm">
             <div>
               <div className="flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></span>
                  <p className="text-xs font-bold text-zinc-800 uppercase tracking-wider">{isProcessing ? 'Rendering...' : 'Ready'}</p>
               </div>
             </div>
          </div>

          <div className="pointer-events-auto flex items-center space-x-2">
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => {
                setShowComparison(!showComparison);
                if (!showComparison) setSliderPosition(50);
              }}
              className={`transition-colors h-9 shadow-sm ${showComparison ? 'bg-black text-white hover:bg-zinc-800 border-transparent' : 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50'}`}
              disabled={!currentImage}
            >
              <SplitSquareHorizontal className="w-4 h-4 mr-2" /> 
              {showComparison ? 'Exit Compare' : 'Compare'}
            </Button>

            <Button 
                size="sm" 
                onClick={handleExport}
                className="bg-primary text-white hover:bg-orange-600 h-9 border-none shadow-sm"
                disabled={!currentImage}
            >
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </header>

        {/* Main Canvas Area */}
        <main className="w-full h-full relative bg-zinc-100">
          
          <div className={`absolute inset-0 transition-opacity duration-500 ${showComparison ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
             {currentImage ? (
                <img 
                  src={currentImage} 
                  alt="AI Render" 
                  className={`w-full h-full object-contain transition-all duration-700 ${isProcessing ? 'opacity-50 blur-sm scale-105' : 'opacity-100 scale-100'}`}
                />
             ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {initialImage && <img src={initialImage} alt="Original" className="w-full h-full object-contain opacity-50" />}
                </div>
             )}
          </div>

          {/* Slider Comparison View */}
          {currentImage && initialImage && (
            <div 
              ref={containerRef}
              className={`absolute inset-0 overflow-hidden transition-opacity duration-500 select-none touch-none ${showComparison ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                <div className="absolute inset-0">
                   <img src={initialImage} alt="Before" className="w-full h-full object-contain" />
                </div>

                <div 
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                   <img 
                    src={currentImage} 
                    alt="After" 
                    className="absolute top-0 left-0 max-w-none h-full object-contain"
                    style={{ 
                      width: containerDimensions.width || '100%', 
                      height: containerDimensions.height || '100%' 
                    }}
                   />
                </div>

                <div 
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                  style={{ left: `${sliderPosition}%` }}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleMouseDown}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border border-zinc-200 transform transition-transform hover:scale-110 active:scale-95">
                    <MoveHorizontal size={16} className="text-black" />
                  </div>
                </div>
            </div>
          )}

          {/* Loading Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-white/60 backdrop-blur-sm transition-opacity duration-300">
              <div className="bg-white px-6 py-4 rounded-xl border border-zinc-200 flex flex-col items-center shadow-2xl">
                  <RefreshCw className="w-8 h-8 mb-3 animate-spin text-primary" /> 
                  <span className="text-sm font-bold text-black">Refining Details...</span>
                  <span className="text-xs text-zinc-500 mt-1">Applying materials & global illumination</span>
              </div>
            </div>
          )}

        </main>

        {/* Bottom Floating Control Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center w-full max-w-3xl pointer-events-none px-4">
          
          {/* Expanded Options Panel */}
          {activeTab && (
             <div className="mb-3 bg-white border border-zinc-200 rounded-xl p-4 w-full max-w-2xl pointer-events-auto animate-in slide-in-from-bottom-5 fade-in duration-200 shadow-xl">
                <div className="flex justify-between items-center mb-3 border-b border-zinc-100 pb-2">
                   <h3 className="text-sm font-bold text-black capitalize flex items-center">
                      Select {activeTab}
                   </h3>
                   <button onClick={() => setActiveTab(null)} className="text-zinc-400 hover:text-black transition-colors">
                      <X size={16} />
                   </button>
                </div>

                <div className="flex space-x-3 overflow-x-auto pb-2 custom-scrollbar">
                   {activeTab === 'floor' && FLOOR_MATERIALS.map((mat) => (
                      <div 
                        key={mat.id}
                        onClick={() => handleMaterialChange('floor', mat.id)}
                        className={`
                          flex-shrink-0 cursor-pointer w-24 rounded-lg overflow-hidden border-2 transition-all group
                          ${selectedFloor === mat.id ? 'border-primary ring-2 ring-primary/20' : 'border-zinc-200 hover:border-zinc-300'}
                        `}
                      >
                        <div className="h-14 w-full" style={{ backgroundColor: mat.thumbnail }} />
                        <div className="bg-zinc-50 p-1.5 text-center border-t border-zinc-100">
                           <span className="text-[10px] text-zinc-700 block truncate font-bold">{mat.name}</span>
                        </div>
                      </div>
                   ))}

                  {activeTab === 'walls' && WALL_MATERIALS.map((mat) => (
                      <button
                        key={mat.id}
                        onClick={() => handleMaterialChange('walls', mat.id)}
                        className={`
                          flex-shrink-0 w-14 h-14 rounded-full border-4 transition-transform hover:scale-105 shadow-sm
                          ${selectedWall === mat.id ? 'border-primary ring-2 ring-primary/20' : 'border-zinc-200'}
                        `}
                        style={{ backgroundColor: mat.thumbnail }}
                        title={mat.name}
                      />
                   ))}

                   {activeTab === 'style' && FURNITURE_STYLES.map((style) => (
                      <div 
                        key={style.id}
                        onClick={() => handleMaterialChange('style', style.id)}
                        className={`
                          flex-shrink-0 cursor-pointer w-32 bg-zinc-50 rounded-lg p-3 border-2 hover:border-zinc-300 transition-all
                          ${selectedStyle === style.id ? 'border-primary bg-white' : 'border-zinc-200'}
                        `}
                      >
                         <div className="w-8 h-8 rounded-md bg-zinc-200 flex items-center justify-center mb-2 mx-auto">
                            <Box size={14} className="text-zinc-500" />
                         </div>
                         <span className="text-xs font-bold text-zinc-800 block text-center">{style.name}</span>
                      </div>
                   ))}

                   {activeTab === 'lighting' && LIGHTING_OPTIONS.map((option) => (
                      <div 
                        key={option.id}
                        onClick={() => handleMaterialChange('lighting', option.id)}
                        className={`
                          flex-shrink-0 cursor-pointer w-28 bg-zinc-50 rounded-lg p-2 border-2 hover:border-zinc-300 transition-all
                          ${selectedLighting === option.id ? 'border-primary bg-white' : 'border-zinc-200'}
                        `}
                      >
                         <div 
                            className="w-full h-10 rounded-md mb-2 flex items-center justify-center border border-black/5"
                            style={{ backgroundColor: option.thumbnail + '20' }}
                         >
                            {getLightingIcon(option.id)}
                         </div>
                         <span className="text-xs font-bold text-zinc-800 block text-center truncate">{option.name}</span>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {/* Main Dock */}
          <div className="bg-white border border-zinc-200 rounded-xl px-2 py-1.5 flex items-center space-x-1 pointer-events-auto shadow-2xl shadow-zinc-200/50">
             <DockButton 
               icon={<Layout size={20} />} 
               label="Floor" 
               active={activeTab === 'floor'} 
               onClick={() => setActiveTab(activeTab === 'floor' ? null : 'floor')} 
             />
             <div className="w-px h-6 bg-zinc-200 mx-1"></div>
             <DockButton 
               icon={<Palette size={20} />} 
               label="Walls" 
               active={activeTab === 'walls'} 
               onClick={() => setActiveTab(activeTab === 'walls' ? null : 'walls')} 
             />
             <div className="w-px h-6 bg-zinc-200 mx-1"></div>
             <DockButton 
               icon={<Box size={20} />} 
               label="Decor" 
               active={activeTab === 'style'} 
               onClick={() => setActiveTab(activeTab === 'style' ? null : 'style')} 
             />
             <div className="w-px h-6 bg-zinc-200 mx-1"></div>
             <DockButton 
               icon={<Sun size={20} />} 
               label="Light" 
               active={activeTab === 'lighting'} 
               onClick={() => setActiveTab(activeTab === 'lighting' ? null : 'lighting')} 
             />
          </div>
        </div>

      </div>
    </div>
  );
};

const DockButton = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`
      flex flex-col items-center justify-center w-16 h-14 rounded-lg transition-all duration-200 group relative
      ${active ? 'bg-zinc-100 text-black shadow-inner' : 'text-zinc-400 hover:text-black hover:bg-zinc-50'}
    `}
  >
    <div className={`mb-1 transition-transform duration-200 group-hover:-translate-y-0.5 ${active ? 'text-primary scale-110' : ''}`}>
      {icon}
    </div>
    <span className="text-[10px] font-bold tracking-wide">{label}</span>
  </button>
)

export default Visualizer;