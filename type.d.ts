import type React from "react";

declare global {
  interface Material {
    id: string;
    name: string;
    thumbnail: string;
    type: "color" | "texture";
    category: "floor" | "wall" | "furniture";
  }

  interface DesignHistoryItem {
    id: string;
    sourceImage: string;
    sourcePath?: string | null;
    renderedImage?: string | null;
    renderedPath?: string | null;
    timestamp: number;
  }

  interface DesignConfig {
    floor: string;
    walls: string;
    style: string;
  }

  enum AppStatus {
    IDLE = "IDLE",
    UPLOADING = "UPLOADING",
    PROCESSING = "PROCESSING",
    READY = "READY",
  }

  type RenderCompletePayload = {
    renderedImage: string;
    renderedPath?: string;
  };

  type AppContext = {
    designHistory: DesignHistoryItem[];
    publicProjects: DesignHistoryItem[];
    isLoadingHistory: boolean;
    isLoadingPublic: boolean;
    uploadedImage: string | null;
    currentSessionId: string | null;
    selectedInitialRender: string | null;
    setDesignHistory: React.Dispatch<React.SetStateAction<DesignHistoryItem[]>>;
    setPublicProjects: React.Dispatch<React.SetStateAction<DesignHistoryItem[]>>;
    setUploadedImage: React.Dispatch<React.SetStateAction<string | null>>;
    setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>;
    setSelectedInitialRender: React.Dispatch<React.SetStateAction<string | null>>;
    fetchProjectById: (
      id: string,
      scope: "user" | "public",
    ) => Promise<DesignHistoryItem | null>;
    saveProject: (item: DesignHistoryItem, share?: boolean) => Promise<void>;
    handleRenderComplete: (payload: RenderCompletePayload) => void;
    handleShareCurrent: (image: string) => Promise<void>;
    handleSignIn: () => Promise<void>;
    fetchHistory: () => Promise<void>;
    fetchPublicProjects: () => Promise<void>;
  };

  type VisualizerLocationState = {
    initialImage?: string;
    initialRender?: string | null;
  };

  interface VisualizerProps {
    onBack: () => void;
    initialImage: string | null;
    onRenderComplete?: (payload: RenderCompletePayload) => void;
    onShare?: (image: string) => Promise<void> | void;
    projectName?: string;
    projectId?: string;
    initialRender?: string | null;
  }

  interface LandingProps {
    onStart: (file: string) => void;
    history: DesignHistoryItem[];
    onSelectHistory: (id: string) => void;
    onSelectPublic: (item: DesignHistoryItem) => void;
    onSignIn: () => Promise<void>;
    isLoadingHistory: boolean;
    publicProjects: DesignHistoryItem[];
    isLoadingPublic: boolean;
  }

  interface UploadProps {
    onComplete: (base64File: string) => void;
    className?: string;
  }

  interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "ghost" | "outline";
    size?: "sm" | "md" | "lg";
    fullWidth?: boolean;
  }

  interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    action?: React.ReactNode;
  }
}

export {};
