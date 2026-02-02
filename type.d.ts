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
    name?: string | null;
    sourceImage: string;
    sourcePath?: string | null;
    renderedImage?: string | null;
    renderedPath?: string | null;
    publicPath?: string | null;
    timestamp: number;
    ownerId?: string | null;
    sharedBy?: string | null;
    sharedAt?: string | null;
    isPublic?: boolean;
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
    isLoadingHistory: boolean;
    uploadedImage: string | null;
    currentSessionId: string | null;
    selectedInitialRender: string | null;
    currentUserId: string | null;
    setDesignHistory: React.Dispatch<React.SetStateAction<DesignHistoryItem[]>>;
    setUploadedImage: React.Dispatch<React.SetStateAction<string | null>>;
    setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>;
    setSelectedInitialRender: React.Dispatch<React.SetStateAction<string | null>>;
    fetchProjectById: (
      id: string,
      scope: "user" | "public",
      ownerId?: string | null,
    ) => Promise<DesignHistoryItem | null>;
    saveProject: (
      item: DesignHistoryItem,
      visibility?: "private" | "public",
    ) => Promise<void>;
    handleRenderComplete: (payload: RenderCompletePayload) => void;
    handleShareCurrent: (
      image: string,
      opts?: { visibility?: "private" | "public" },
    ) => Promise<void>;
    handleSignIn: () => Promise<void>;
    fetchHistory: () => Promise<void>;
  };

  type VisualizerLocationState = {
    initialImage?: string;
    initialRender?: string | null;
    ownerId?: string | null;
    name?: string | null;
  };

  interface VisualizerProps {
    onBack: () => void;
    initialImage: string | null;
    onRenderComplete?: (payload: RenderCompletePayload) => void;
    onShare?: (image: string) => Promise<void> | void;
    onUnshare?: (image: string) => Promise<void> | void;
    projectName?: string;
    projectId?: string;
    initialRender?: string | null;
    isPublic?: boolean;
    sharedBy?: string | null;
    canUnshare?: boolean;
  }

  interface LandingProps {
    onStart: (file: string) => void;
    history: DesignHistoryItem[];
    onSelectHistory: (id: string) => void;
    onSignIn: () => Promise<void>;
    isLoadingHistory: boolean;
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
