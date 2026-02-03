import { puter } from "@heyputer/puter.js";
import { PUTER_WORKER_URL, STORAGE_PATHS } from "./constants";

export const signIn = async () => await puter.auth.signIn();

export const signOut = () => puter.auth.signOut();

export const getCurrentUser = async () => {
  const signedIn = puter.auth.isSignedIn();
  if (!signedIn) return null;

  return await puter.auth.whoami();
};

export const getProjectById = async ({
  id,
  scope = "public",
  ownerId,
}: {
  id: string;
  scope?: "user" | "public";
  ownerId?: string | null;
}) => {
  if (!PUTER_WORKER_URL) {
    console.warn("Missing VITE_PUTER_WORKER_URL; skipping project fetch.");
    return null;
  }

  const ownerParam = ownerId ? `&ownerId=${encodeURIComponent(ownerId)}` : "";

  try {
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/get?id=${encodeURIComponent(id)}&scope=${scope}${ownerParam}`,
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
};

export const getProjects = async () => {
  if (!PUTER_WORKER_URL) {
    console.warn("Missing VITE_PUTER_WORKER_URL; skipping history fetch.");
    return [];
  }

  try {
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/list`,
      {
        method: "GET",
      },
    );

    if (!response.ok) {
      console.error("Failed to fetch history:", await response.text());
      return [];
    }

    const data = await response.json();
    return Array.isArray(data?.projects) ? data.projects : [];
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return [];
  }
};

export const saveProject = async (
  item: DesignHistoryItem,
  visibility: "private" | "public" = "private",
) => {
  if (!PUTER_WORKER_URL) {
    console.warn("Missing VITE_PUTER_WORKER_URL; skipping history save.");
    return;
  }

  let sourceImage = item.sourceImage;
  let sourcePath = item.sourcePath;

  if (sourceImage?.startsWith("data:") && item.id) {
    try {
      await puter.fs.mkdir(STORAGE_PATHS.SOURCES, { recursive: true });

      const sourceBlob = await (await fetch(sourceImage)).blob();
      sourcePath = sourcePath || `${STORAGE_PATHS.SOURCES}/${item.id}.png`;

      await puter.fs.write(sourcePath, sourceBlob);
      sourceImage = await puter.fs.getReadURL(sourcePath);
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
    const response = await puter.workers.exec(
      `${PUTER_WORKER_URL}/api/projects/save`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: payload,
          visibility,
          shareImageUrl: payload.renderedImage,
        }),
      },
    );

    if (!response.ok)
      console.error("Failed to save project:", await response.text());
  } catch (error) {
    console.error("Failed to save project:", error);
  }
};

export const shareProject = async (item: DesignHistoryItem) =>
  saveProject(item, "public");

export const unshareProject = async (item: DesignHistoryItem) =>
  saveProject(item, "private");
