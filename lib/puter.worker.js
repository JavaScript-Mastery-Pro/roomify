const HOSTING_CONFIG_KEY = "roomify_hosting_config";
const PROJECT_PREFIX = "roomify_project_";
const PUBLIC_PREFIX = "roomify_public_";
const USER_PREFIX = "roomify_user_";

const getUserPuter = (userParam) => userParam?.puter || null;

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

const sanitizeProjectPayload = (project) => {
  if (!project || typeof project !== "object") return project;
  const { sourcePath, renderedPath, publicPath, ...rest } = project;
  return rest;
};

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
  return await kv.list({ pattern, returnValues: true});
};

const deleteKvByPattern = async (kv, pattern) => {
  if (!kv) return 0;
  let entries = await listKvValues(kv, pattern);
  if (entries.length === 0) return 0;
  await Promise.all(
    entries.map((entry) => (entry?.key ? kv.del(entry.key) : null)),
  );
  return entries.length;
};

const findPublicKeyByProjectId = async (mePuter, projectId) => {
  const entries = await listKvValues(mePuter.kv, `${PUBLIC_PREFIX}*`);
  const match = entries.find((entry) => entry?.value?.id === projectId);
  return match?.key || null;
};

router.get("/api/projects/list", async ({ user }) => {
  try {
    const userPuter = getUserPuter(user);
    if (!userPuter) throw new Error("Missing user Puter context.");

    const mePuter = me.puter;
    const userItems = (await listKvValues(userPuter.kv, `${PROJECT_PREFIX}*`))
      .map(({ value }) => value);

    let publicItems = [];

    if (mePuter) {
      publicItems = (await listKvValues(mePuter.kv, `${PUBLIC_PREFIX}*`))
        .map(({ value }) => value);
    }

    const merged = new Map();
    userItems.forEach((project) => {
      merged.set(`user:${project.id}`, project);
    });

    publicItems.forEach((project) => {
      const key = `public:${project.ownerId || "unknown"}:${project.id}`;
      merged.set(key, { ...project, isPublic: true });
    });

    const hydrated = Array.from(merged.values());

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

router.get("/api/projects/get", async ({ request, user }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const scope = url.searchParams.get("scope") || "user";
  const ownerId = url.searchParams.get("ownerId");

  if (!id) return jsonError(400, "Project id required");

  if (scope === "public") {
    const mePuter = me.puter;
    if (!mePuter) return jsonError(500, "Missing deployer Puter context.");

    const publicKey = ownerId
      ? getPublicKey(ownerId, id)
      : await findPublicKeyByProjectId(mePuter, id);

    if (!publicKey) return jsonError(404, "Project not found");

    const project = await mePuter.kv.get(publicKey);
    if (!project) return jsonError(404, "Project not found");

    return { project };
  }

  const userPuter = getUserPuter(user);
  if (!userPuter) return jsonError(401, "Authentication required");

  const key = `${PROJECT_PREFIX}${id}`;
  const project = await userPuter.kv.get(key);
  if (!project) return jsonError(404, "Project not found");
  return { project };
});

router.post("/api/projects/save", async ({ request, user }) => {
  const userPuter = getUserPuter(user);
  if (!userPuter) return jsonError(401, "Authentication required");

  const body = await request.json();
  const project = body?.project;

  const visibility = body?.visibility === "public" ? "public" : "private";
  if (!project?.id || !project?.sourceImage)
    return jsonError(400, "Project id and image required");

  const payload = {
    ...sanitizeProjectPayload(project),
    updatedAt: new Date().toISOString(),
  };

  const userId = await getUserId(user);
  if (visibility === "public" && !userId)
    return jsonError(401, "User id required");

  const mePuter = me.puter;
  const storedPayload = payload;

  if (visibility === "private") {
    const key = `${PROJECT_PREFIX}${project.id}`;
    await userPuter.kv.set(key, storedPayload);

    if (userId && mePuter) {
      // remove public project
      const publicKey = getPublicKey(userId, project.id);
      const existing = await mePuter.kv.get(publicKey);

      if (existing?.ownerId && existing.ownerId !== userId)
        return jsonError(403, "Not allowed");

      await mePuter.kv.del(publicKey);
    }

    return { saved: true, id: project.id, project: storedPayload };
  }

  if (!mePuter) return jsonError(500, "Missing deployer Puter context.");

  const publicKey = getPublicKey(userId, project.id);

  let username = null;
  try {
    const userInfo = await userPuter.auth.getUser();
    username = userInfo?.username || userInfo?.name || null;

    if (username) await mePuter.kv.set(`${USER_PREFIX}${userId}`, { username });
  } catch {
    // Best-effort user map write
  }

  const existing = await mePuter.kv.get(publicKey);
  if (existing?.ownerId && existing.ownerId !== userId)
    return jsonError(403, "Not allowed");

  const publicRecord = {
    ...storedPayload,
    ownerId: userId,
    sharedBy: username,
    sharedAt: new Date().toISOString(),
  };

  await mePuter.kv.set(publicKey, publicRecord);

  const userKey = `${PROJECT_PREFIX}${project.id}`;
  await userPuter.kv.del(userKey);

  return { saved: true, id: project.id, project: publicRecord };
});

const clearProjects = async ({ user }) => {
  const userPuter = getUserPuter(user);
  const mePuter = me.puter;
  if (!userPuter && !mePuter) return jsonError(401, "Authentication required");

  const userDeleted = userPuter?.kv
    ? await deleteKvByPattern(userPuter.kv, `${PROJECT_PREFIX}*`)
    : 0;
  const publicDeleted = mePuter?.kv
    ? await deleteKvByPattern(mePuter.kv, `${PUBLIC_PREFIX}*`)
    : 0;
  const userMapDeleted = mePuter?.kv
    ? await deleteKvByPattern(mePuter.kv, `${USER_PREFIX}*`)
    : 0;

  return jsonOk({
    cleared: userDeleted,
    clearedPublic: publicDeleted,
    clearedUsers: userMapDeleted,
  });
};

router.post("/api/projects/clear", async (ctx) => clearProjects(ctx));
router.post("/api/hosting/clear", async (ctx) => clearProjects(ctx));

router.post("/api/hosting/reset", async ({ user }) => {
  const userPuter = getUserPuter(user);
  if (!userPuter) return jsonError(401, "Authentication required");

  await userPuter.kv.del(HOSTING_CONFIG_KEY);
  return jsonOk({ reset: true });
});

router.get("/*path", async ({ params }) => {
  return jsonError(404, "Not found", {
    path: params.path,
    availableEndpoints: [
      "/api/projects/list",
      "/api/projects/get",
      "/api/projects/save",
      "/api/projects/clear",
      "/api/hosting/clear",
      "/api/hosting/reset",
    ],
  });
});
