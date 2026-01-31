import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { puter } from "@heyputer/puter.js";
import { PUTER_WORKER_URL } from "../constants";
import "../index.css";

export default function Root() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedInitialRender, setSelectedInitialRender] = useState<string | null>(null);

  const [designHistory, setDesignHistory] = useState<DesignHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [publicProjects, setPublicProjects] = useState<DesignHistoryItem[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(false);

  const ensureSignedIn = useCallback(async (prompt: boolean) => {
    try {
      const signedIn = await puter.auth.isSignedIn();
      if (signedIn) return true;
      if (!prompt) return false;
      await puter.auth.signIn();
      return await puter.auth.isSignedIn();
    } catch (error) {
      console.error("Puter auth check failed:", error);
      return false;
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    if (!PUTER_WORKER_URL) {
      console.warn("Missing VITE_PUTER_WORKER_URL; skipping history fetch.");
      return;
    }
    const canFetch = await ensureSignedIn(false);
    if (!canFetch) return;
    try {
      setIsLoadingHistory(true);
      const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/list`, {
        method: "GET",
      });
      if (!response.ok) {
        console.error("Failed to fetch history:", await response.text());
        return;
      }
      const data = await response.json();
      const items = Array.isArray(data?.projects) ? data.projects : [];
      setDesignHistory(items);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [ensureSignedIn]);

  const fetchPublicProjects = useCallback(async () => {
    if (!PUTER_WORKER_URL) {
      console.warn("Missing VITE_PUTER_WORKER_URL; skipping public projects fetch.");
      return;
    }
    const canFetch = await ensureSignedIn(false);
    if (!canFetch) return;
    try {
      setIsLoadingPublic(true);
      const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/public`, {
        method: "GET",
      });
      if (!response.ok) {
        console.error("Failed to fetch public projects:", await response.text());
        return;
      }
      const data = await response.json();
      const items = Array.isArray(data?.projects) ? data.projects : [];
      setPublicProjects(items);
    } catch (error) {
      console.error("Failed to fetch public projects:", error);
    } finally {
      setIsLoadingPublic(false);
    }
  }, [ensureSignedIn]);

  const fetchProjectById = useCallback(
    async (id: string, scope: "user" | "public") => {
      if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; skipping project fetch.");
        return null;
      }
      if (scope === "user") {
        const canFetch = await ensureSignedIn(false);
        if (!canFetch) return null;
      }
      try {
        const response = await puter.workers.exec(
          `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}&scope=${scope}`,
          { method: "GET" },
        );
        if (!response.ok) {
          console.error("Failed to fetch project:", await response.text());
          return null;
        }
        const data = await response.json();
        return data?.project || null;
      } catch (error) {
        console.error("Failed to fetch project:", error);
        return null;
      }
    },
    [ensureSignedIn],
  );

  const saveProject = useCallback(
    async (item: DesignHistoryItem, share: boolean = false) => {
      if (!PUTER_WORKER_URL) {
        console.warn("Missing VITE_PUTER_WORKER_URL; skipping history save.");
        return;
      }
      const canSave = await ensureSignedIn(true);
      if (!canSave) return;
      let sourceImage = item.sourceImage;
      let sourcePath = item.sourcePath;
      if (sourceImage?.startsWith("data:") && item.id) {
        try {
          await puter.fs.mkdir("roomify/sources", { recursive: true });
          const sourceBlob = await (await fetch(sourceImage)).blob();
          sourcePath = sourcePath || `roomify/sources/${item.id}.png`;
          await puter.fs.write(sourcePath, sourceBlob);
          sourceImage = await puter.fs.getReadURL(
            sourcePath,
            60 * 60 * 24 * 30,
          );
        } catch (error) {
          console.warn("Failed to store source image in Puter FS:", error);
        }
      }
      const payload = {
        ...item,
        sourceImage,
        sourcePath,
      };
      try {
        const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project: payload,
            share,
            shareImageUrl: payload.renderedImage,
          }),
        });
        if (!response.ok) {
          console.error("Failed to save project:", await response.text());
        }
      } catch (error) {
        console.error("Failed to save project:", error);
      }
    },
    [ensureSignedIn],
  );

  useEffect(() => {
    fetchHistory();
    fetchPublicProjects();
  }, [fetchHistory, fetchPublicProjects]);

  const handleRenderComplete = useCallback(
    (payload: { renderedImage: string; renderedPath?: string }) => {
      if (currentSessionId) {
        const updatedItem = {
          id: currentSessionId,
          sourceImage: uploadedImage || "",
          renderedImage: payload.renderedImage,
          renderedPath: payload.renderedPath,
          timestamp: Date.now(),
        };
        setDesignHistory((prev) =>
          prev.map((item) => (item.id === currentSessionId ? updatedItem : item)),
        );
        saveProject(updatedItem);
      }
    },
    [currentSessionId, uploadedImage, saveProject],
  );

  const handleShareCurrent = useCallback(
    async (image: string) => {
      const id = currentSessionId || Date.now().toString();
      const updatedItem = {
        id,
        sourceImage: uploadedImage || "",
        renderedImage: image,
        renderedPath: designHistory.find((item) => item.id === id)?.renderedPath,
        timestamp: Date.now(),
      };

      if (!currentSessionId) {
        setCurrentSessionId(id);
      }

      setDesignHistory((prev) => {
        const exists = prev.some((item) => item.id === id);
        return exists
          ? prev.map((item) => (item.id === id ? updatedItem : item))
          : [updatedItem, ...prev];
      });

      await saveProject(updatedItem, true);
      await fetchPublicProjects();
    },
    [currentSessionId, designHistory, fetchPublicProjects, saveProject, uploadedImage],
  );

  const handleSignIn = useCallback(async () => {
    await puter.auth.signIn();
    await fetchHistory();
    await fetchPublicProjects();
  }, [fetchHistory, fetchPublicProjects]);

  const contextValue = useMemo(
    () => ({
      designHistory,
      publicProjects,
      isLoadingHistory,
      isLoadingPublic,
      uploadedImage,
      currentSessionId,
      selectedInitialRender,
      setDesignHistory,
      setPublicProjects,
      setUploadedImage,
      setCurrentSessionId,
      setSelectedInitialRender,
      fetchProjectById,
      saveProject,
      handleRenderComplete,
      handleShareCurrent,
      handleSignIn,
      fetchHistory,
      fetchPublicProjects,
    }),
    [
      designHistory,
      publicProjects,
      isLoadingHistory,
      isLoadingPublic,
      uploadedImage,
      currentSessionId,
      selectedInitialRender,
      fetchProjectById,
      saveProject,
      handleRenderComplete,
      handleShareCurrent,
      handleSignIn,
      fetchHistory,
      fetchPublicProjects,
    ],
  );

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Roomify | AI Architectural Visualization</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <Meta />
        <Links />
      </head>
      <body suppressHydrationWarning>
        <div className="min-h-screen bg-background text-foreground">
          <div className="relative z-10">
            <Outlet context={contextValue} />
          </div>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
