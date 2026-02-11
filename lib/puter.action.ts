import { puter } from "@heyputer/puter.js";
import { PUTER_WORKER_URL } from "./constants";
import {
  HOSTING_CONFIG_KEY,
  createHostingSlug,
  fetchBlobFromUrl,
  imageUrlToPngBlob,
  getHostedUrl,
  getImageExtension,
  isHostedUrl,
} from "./utils";

type HostingConfig = { subdomain: string; };
type HostedAsset = { url: string };

const ensureHosting = async (): Promise<HostingConfig | null> => {
  try {
    const existing = (await puter.kv.get(
      HOSTING_CONFIG_KEY,
    )) as HostingConfig | null;
    if (existing?.subdomain) {
      return {
        subdomain: existing.subdomain,
      };
    }
  } catch {
    // Ignore KV errors and fall back to creating hosting
  }

  const subdomain = createHostingSlug();

  try {
    const created = await puter.hosting.create(subdomain, ".");

    const record = {
      subdomain: created.subdomain,
    };
    try {
      await puter.kv.set(HOSTING_CONFIG_KEY, record);
    } catch {
      // Ignore KV errors
    }
    return record;
  } catch (error) {
    console.warn("Hosting create failed:", error);
    return null;
  }
};

const storeHostedImage = async ({
  hosting,
  url,
  projectId,
  label,
}: {
  hosting: HostingConfig | null;
  url: string;
  projectId: string;
  label: "source" | "rendered";
}): Promise<HostedAsset | null> => {
  if (!hosting || !url) return null;
  if (isHostedUrl(url)) return { url };

  try {
    const resolved =
      label === "rendered"
        ? await imageUrlToPngBlob(url).then((blob) =>
            blob ? { blob, contentType: "image/png" } : null,
          )
        : await fetchBlobFromUrl(url);
    if (!resolved) return null;

    const contentType = resolved.contentType || resolved.blob.type || "";
    const ext = getImageExtension(contentType, url);
    const dir = `projects/${projectId}`;
    const filePath = `${dir}/${label}.${ext}`;

    const uploadFile = new File([resolved.blob], `${label}.${ext}`, {
      type: contentType || "application/octet-stream",
    });
    await puter.fs.write(filePath, uploadFile, {createMissingParents: true});

    const hostedUrl = getHostedUrl(
      { subdomain: hosting.subdomain },
      filePath,
    );
    return hostedUrl ? { url: hostedUrl } : null;
  } catch (error) {
    console.warn("Failed to store hosted image:", error);
    return null;
  }
};

export const signIn = async () => await puter.auth.signIn();

export const signOut = () => puter.auth.signOut();

export const getCurrentUser = async () => {
  try {
    return await puter.auth.getUser();
  } catch {
    return null;
  }
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

    const data = (await response.json()) as {
      project?: DesignHistoryItem | null;
    };
    return data?.project ?? null;
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

    const data = (await response.json()) as {
      projects?: DesignHistoryItem[] | null;
    };
    return Array.isArray(data?.projects) ? data.projects : [];
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return [];
  }
};

export const saveProject = async (
  item: DesignHistoryItem,
  visibility: "private" | "public" = "private",
): Promise<DesignHistoryItem | null> => {
  if (!PUTER_WORKER_URL) {
    console.warn("Missing VITE_PUTER_WORKER_URL; skipping history save.");
    return null;
  }

  const projectId = item.id;

  const hosting = await ensureHosting();

  const hostedSource = projectId
    ? await storeHostedImage({
        hosting,
        url: item.sourceImage,
        projectId,
        label: "source",
      })
    : null;

  const hostedRender =
    projectId && item.renderedImage
      ? await storeHostedImage({
          hosting,
          url: item.renderedImage,
          projectId,
          label: "rendered",
        })
      : null;

  const resolvedSource =
    hostedSource?.url ||
    (isHostedUrl(item.sourceImage) ? item.sourceImage : "");
  if (!resolvedSource) {
    console.warn("Failed to host source image; skipping save.");
    return null;
  }

  const resolvedRender = hostedRender?.url
    ? hostedRender.url
    : item.renderedImage && isHostedUrl(item.renderedImage)
      ? item.renderedImage
      : undefined;

  const {
    sourcePath: _sourcePath,
    renderedPath: _renderedPath,
    publicPath: _publicPath,
    ...rest
  } = item;
  const payload = {
    ...rest,
    sourceImage: resolvedSource,
    renderedImage: resolvedRender,
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
        }),
      },
    );

    if (!response.ok)
      console.error("Failed to save project:", await response.text());
    if (!response.ok) return null;

    const data = (await response.json().catch(() => null)) as {
      project?: DesignHistoryItem | null;
    } | null;
    return data?.project ?? null;
  } catch (error) {
    console.error("Failed to save project:", error);
    return null;
  }
};

export const shareProject = async (item: DesignHistoryItem) =>
  saveProject(item, "public");

export const unshareProject = async (item: DesignHistoryItem) =>
  saveProject(item, "private");
