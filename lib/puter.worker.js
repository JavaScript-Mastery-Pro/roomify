const PROJECT_PREFIX = "roomify_project_";
const PUBLIC_PREFIX = "roomify_public_";
const USER_PREFIX = "roomify_user_";
const READ_URL_TTL_SECONDS = 60 * 60 * 24 * 30;

const getUserPuter = (userParam) => userParam?.puter || null;
const getMePuter = (meParam) =>
  meParam?.puter || (typeof me !== "undefined" ? me?.puter : null);

const jsonError = (status, message, extra = {}) =>
  new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });

const jsonOk = (payload) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });

const getUserId = async (userParam) => {
  const userPuter = getUserPuter(userParam);
  if (!userPuter) return null;

  try {
    const user = await userPuter.auth.getUser();
    return user?.uuid || null;
  } catch {
    return null;
  }
};

const getPublicKey = (userId, projectId) =>
  `${PUBLIC_PREFIX}${userId}_${projectId}`;

const listKvValues = async (kv, pattern) => {
  const entries = [];
  let cursor = undefined;

  while (true) {
    const page = await kv.list({ pattern, returnValues: true, cursor });
    const items = Array.isArray(page)
      ? page
      : Array.isArray(page?.items)
        ? page.items
        : [];

    items.forEach((entry) => {
      if (entry && typeof entry === "object" && "key" in entry) {
        entries.push(entry);
      }
    });

    if (!page?.cursor) break;
    cursor = page.cursor;
  }

  return entries;
};

const hydrateProject = async (puterContext, project) => {
  if (!project || !puterContext) return project;

  const updates = {};
  const tasks = [];

  if (project?.renderedPath) {
    tasks.push(
      puterContext.fs
        .getReadURL(project.renderedPath, READ_URL_TTL_SECONDS)
        .then((url) => {
          updates.renderedImage = url;
        })
        .catch(() => {}),
    );
  }

  if (project?.sourcePath) {
    tasks.push(
      puterContext.fs
        .getReadURL(project.sourcePath, READ_URL_TTL_SECONDS)
        .then((url) => {
          updates.sourceImage = url;
        })
        .catch(() => {}),
    );
  }

  if (tasks.length === 0) return project;

  await Promise.all(tasks);
  return { ...project, ...updates };
};

const hydratePublicProject = async (mePuter, project) =>
  hydrateProject(mePuter, { ...project, renderedPath: project.publicPath });

const kvGetProject = async (kv, key) => kv.get(key);

const findPublicKeyByProjectId = async (mePuter, projectId) => {
  const entries = await listKvValues(mePuter.kv, `${PUBLIC_PREFIX}*`);
  const match = entries.find((entry) => entry?.value?.id === projectId);
  return match?.key || null;
};

router.get("/api/projects/list", async ({ user, me }) => {
  try {
    const userPuter = getUserPuter(user);
    if (!userPuter) throw new Error("Missing user Puter context.");

    const mePuter = getMePuter(me);
    const userItems = (await listKvValues(userPuter.kv, `${PROJECT_PREFIX}*`))
      .map(({ value }) => value)
      .filter((project) => project && project.id);

    let publicItems = [];

    if (mePuter) {
      const entries = await listKvValues(mePuter.kv, `${PUBLIC_PREFIX}*`);
      publicItems = entries
        .map(({ value }) => value)
        .filter((project) => project && project.id)
        .map((project) => ({
          ...project,
          ownerId: project.ownerId || null,
        }));
    }

    const merged = new Map();
    userItems.filter(Boolean).forEach((project) => {
      merged.set(`user:${project.id}`, project);
    });

    publicItems.filter(Boolean).forEach((project) => {
      const key = `public:${project.ownerId || "unknown"}:${project.id}`;
      merged.set(key, { ...project, isPublic: true });
    });

    const hydrated = await Promise.all(
      Array.from(merged.values()).map((project) =>
        project?.isPublic
          ? hydratePublicProject(mePuter, project)
          : hydrateProject(userPuter, project),
      ),
    );

    if (mePuter) {
      const ownerIds = Array.from(
        new Set(
          hydrated
            .filter((item) => item?.isPublic && item?.ownerId)
            .map((item) => item.ownerId),
        ),
      );

      if (ownerIds.length > 0) {
        const ownerEntries = await Promise.all(
          ownerIds.map(async (ownerId) => {
            const record = await mePuter.kv.get(`${USER_PREFIX}${ownerId}`);
            return { ownerId, username: record?.username || null };
          }),
        );

        const ownerMap = new Map(
          ownerEntries.map((entry) => [entry.ownerId, entry.username]),
        );

        hydrated.forEach((item) => {
          if (item?.isPublic && item?.ownerId) {
            item.sharedBy = ownerMap.get(item.ownerId) || item.sharedBy || null;
          }
        });
      }
    }

    hydrated.sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0));

    return { projects: hydrated };
  } catch (error) {
    return jsonError(500, "Failed to list projects", {
      message: error?.message || "Unknown error",
    });
  }
});

router.get("/api/projects/get", async ({ request, user, me }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const scope = url.searchParams.get("scope") || "user";
  const ownerId = url.searchParams.get("ownerId");

  if (!id) return jsonError(400, "Project id required");

  if (scope === "public") {
    const mePuter = getMePuter(me);
    if (!mePuter) return jsonError(500, "Missing deployer Puter context.");

    const publicKey = ownerId
      ? getPublicKey(ownerId, id)
      : await findPublicKeyByProjectId(mePuter, id);

    if (!publicKey) return jsonError(404, "Project not found");

    const project = await kvGetProject(mePuter.kv, publicKey);
    if (!project) return jsonError(404, "Project not found");

    return { project: await hydratePublicProject(mePuter, project) };
  }

  const userPuter = getUserPuter(user);
  if (!userPuter) return jsonError(401, "Authentication required");

  const key = `${PROJECT_PREFIX}${id}`;
  const project = await kvGetProject(userPuter.kv, key);
  if (!project) return jsonError(404, "Project not found");
  return { project: await hydrateProject(userPuter, project) };
});

router.post("/api/projects/save", async ({ request, user, me }) => {
  const userPuter = getUserPuter(user);
  if (!userPuter) return jsonError(401, "Authentication required");

  const body = await request.json();
  const project = body?.project;

  const visibility = body?.visibility === "public" ? "public" : "private";
  const shareImageUrl = body?.shareImageUrl;

  if (!project?.id || !project?.sourceImage)
    return jsonError(400, "Project id and image required");

  const payload = {
    ...project,
    updatedAt: new Date().toISOString(),
  };

  if (visibility === "private") {
    const key = `${PROJECT_PREFIX}${project.id}`;

    try {
      await userPuter.kv.update(key, {
        id: payload.id,
        sourceImage: payload.sourceImage,
        sourcePath: payload.sourcePath,
        renderedImage: payload.renderedImage,
        renderedPath: payload.renderedPath,
        timestamp: payload.timestamp,
        updatedAt: payload.updatedAt,
      });
    } catch {
      await userPuter.kv.set(key, payload);
    }

    const userId = await getUserId(user);
    const mePuter = getMePuter(me);

    if (userId && mePuter) {
      const publicKey = getPublicKey(userId, project.id);
      const existing = await mePuter.kv.get(publicKey);

      if (existing?.ownerId && existing.ownerId !== userId)
        return jsonError(403, "Not allowed");

      await mePuter.kv.del(publicKey);
    }

    return { saved: true, id: project.id };
  }

  const userId = await getUserId(user);
  if (!userId) return jsonError(401, "User id required");

  const mePuter = getMePuter(me);
  if (!mePuter) return jsonError(500, "Missing deployer Puter context.");

  const publicKey = getPublicKey(userId, project.id);

  try {
    const userInfo = await userPuter.auth.getUser();
    const username = userInfo?.username || userInfo?.name || null;

    if (username) await mePuter.kv.set(`${USER_PREFIX}${userId}`, { username });
  } catch {
    // Best-effort user map write
  }

  const existing = await mePuter.kv.get(publicKey);
  if (existing?.ownerId && existing.ownerId !== userId)
    return jsonError(403, "Not allowed");

  let publicPath = null;
  let publicUrl = null;

  if (shareImageUrl) {
    try {
      const response = await fetch(shareImageUrl);
      const blob = await response.blob();

      publicPath = `roomify/public/${project.id}.png`;
      await mePuter.fs.write(publicPath, blob);

      publicUrl = await mePuter.fs.getReadURL(publicPath, READ_URL_TTL_SECONDS);
    } catch (error) {
      publicUrl = shareImageUrl;
    }
  }

  await mePuter.kv.set(publicKey, {
    ...payload,
    publicPath,
    renderedImage: publicUrl || payload.renderedImage,
    ownerId: userId,
    sharedAt: new Date().toISOString(),
  });

  const userKey = `${PROJECT_PREFIX}${project.id}`;
  await userPuter.kv.del(userKey);

  return { saved: true, id: project.id };
});

router.post("/api/projects/clear", async ({ user, me }) => {
  const userPuter = getUserPuter(user);
  if (!userPuter) return jsonError(401, "Authentication required");

  const mePuter = getMePuter(me);
  if (!mePuter) return jsonError(500, "Missing deployer Puter context.");

  await Promise.all([userPuter.kv.clear(), mePuter.kv.clear()]);
  return jsonOk({ cleared: true, clearedPublic: true });
});

router.get("/*path", async ({ params }) => {
  return jsonError(404, "Not found", {
    path: params.path,
    availableEndpoints: [
      "/api/projects/list",
      "/api/projects/get",
      "/api/projects/save",
      "/api/projects/clear",
    ],
  });
});
