import { puter } from "@heyputer/puter.js";
import { PUTER_WORKER_URL } from "./constants";
import {
  HOSTING_CONFIG_KEY,
  HOSTING_ROOT_DIR,
  createHostingSlug,
  fetchBlobFromUrl,
  imageUrlToPngBlob,
  getHostedUrl,
  getImageExtension,
  isHostedUrl,
} from "./utils";

type HostingConfig = { subdomain: string; root_dir: string };
type HostedAsset = { url: string };

const resolveRootDir = (dir: string) => {
  if (!dir) return dir;
  if (dir.startsWith("/") || dir.startsWith("~")) return dir;
  if (puter?.appID) return `~/AppData/${puter.appID}/${dir}`;
  return `~/${dir}`;
};

const ensureHosting = async (): Promise<HostingConfig | null> => {
  if (!puter?.hosting?.create) return null;

  try {
    const existing = await puter.kv.get(HOSTING_CONFIG_KEY);
    if (existing?.subdomain && existing?.root_dir) {
      return {
        subdomain: existing.subdomain,
        root_dir: resolveRootDir(existing.root_dir),
      };
    }
  } catch {
    // Ignore KV errors and fall back to creating hosting
  }

  const subdomain = createHostingSlug();
  const root_dir = resolveRootDir(HOSTING_ROOT_DIR);

  try {
    await puter.fs.mkdir(root_dir, { recursive: true });
  } catch {
    // Best-effort directory creation
  }

  try {
    const created = await puter.hosting.create(subdomain, root_dir);
    const createdSubdomain =
      created?.subdomain && typeof created.subdomain === "string"
        ? created.subdomain
        : subdomain;
    let createdRootDir =
      created?.root_dir && typeof created.root_dir === "string"
        ? created.root_dir
        : root_dir;

    if (!createdRootDir && createdSubdomain) {
      try {
        const fetched = await puter.hosting.get(createdSubdomain);
        if (fetched?.root_dir && typeof fetched.root_dir === "string") {
          createdRootDir = fetched.root_dir;
        }
      } catch {
        // Ignore fetch errors
      }
    }

    const record = {
      subdomain: createdSubdomain,
      root_dir: resolveRootDir(createdRootDir),
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

const ensureDir = async (dir: string) => {
  if (!dir) return;
  try {
    await puter.fs.mkdir(dir, { recursive: true });
    return;
  } catch {
    // Best-effort directory creation
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
    const baseDir = resolveRootDir(hosting.root_dir);
    const dir = `${baseDir}/projects/${projectId}`;
    const filePath = `${dir}/${label}.${ext}`;

    await ensureDir(dir);
    const uploadFile = new File([resolved.blob], `${label}.${ext}`, {
      type: contentType || "application/octet-stream",
    });
    await puter.fs.write(filePath, uploadFile);

    const hostedUrl = getHostedUrl(
      { subdomain: hosting.subdomain, root_dir: baseDir },
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
    return await puter.auth.whoami();
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
    hostedSource?.url || (isHostedUrl(item.sourceImage) ? item.sourceImage : "");
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
