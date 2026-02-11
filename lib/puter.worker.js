const HOSTING_CONFIG_KEY = "roomify_hosting_config";
const PROJECT_PREFIX = "roomify_project_";
const PUBLIC_PREFIX = "roomify_public_";

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

const getUserId = async (userPuter) => {
  try {
    const user = await userPuter.auth.getUser();
    return user?.uuid || null;
  } catch {
    return null;
  }
};

const getPublicKey = (userId, projectId) => `${PUBLIC_PREFIX}${userId}_${projectId}`;

const deleteKvByPattern = async (kv, pattern) => {
  if (!kv) return 0;
  let entries = await kv.list(pattern);
  if (entries.length === 0) return 0;
  await Promise.all(
    entries.map((key) => kv.del(key)),
  );
  return entries.length;
};

const findPublicKeyByProjectId = async (mePuter, projectId) => {
  const entries = await mePuter.kv.list(`${PUBLIC_PREFIX}*`, true);
  const match = entries.find((entry) => entry?.value?.id === projectId);
  return match?.key || null;
};

router.get("/api/projects/list", async ({ user }) => {
  try {
    const mePuter = me.puter;
    const userPuter = user.puter;

    if (!userPuter) throw new Error("Missing user Puter context.");

    const userItems = (await userPuter.kv.list(`${PROJECT_PREFIX}*`, true))
      .map(({ value }) => value);
    const publicItems = (await mePuter.kv.list(`${PUBLIC_PREFIX}*`, true))
      .map(({ value }) => ({ ...value, isPublic: true}));

    const merged = [...userItems, ...publicItems];
    merged.sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0));

    return { projects: merged };
  } catch (error) {
    return jsonError(500, "Failed to list projects", {
      message: error?.message || "Unknown error",
    });
  }
});

router.get("/api/projects/get", async ({ request, user }) => {
  try {
    const mePuter = me.puter;
    const userPuter = user.puter;

    if (!userPuter) return jsonError(401, "Authentication required");

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const scope = url.searchParams.get("scope") || "user";
    const ownerId = url.searchParams.get("ownerId");

    if (!id) return jsonError(400, "Project id required");

    if (scope === "private") {
      // PRIVATE PROJECT
      const key = `${PROJECT_PREFIX}${id}`;
      const project = await userPuter.kv.get(key);
      if (!project) return jsonError(404, "Project not found");

      return { project };
    } else {
      // PUBLIC PROJECT
      const publicKey = ownerId
        ? getPublicKey(ownerId, id)
        : await findPublicKeyByProjectId(mePuter, id);
      if (!publicKey) return jsonError(404, "Project not found");

      const project = await mePuter.kv.get(publicKey);
      if (!project) return jsonError(404, "Project not found");

      return { project };
    }
  } catch (error) {
    return jsonError(500, "Failed to get project", {
      message: error?.message || "Unknown error",
    });
  }
});

router.post("/api/projects/save", async ({ request, user }) => {
  try {
    const mePuter = me.puter;
    const userPuter = user.puter;

    if (!userPuter) return jsonError(401, "Authentication required");

    const body = await request.json();
    const project = body?.project;

    const scope = body?.visibility === "public" ? "public" : "private";
    if (!project?.id || !project?.sourceImage)
      return jsonError(400, "Project id and image required");

    const payload = {
      ...sanitizeProjectPayload(project),
      updatedAt: new Date().toISOString(),
    };

    const userId = await getUserId(userPuter);
    if (!userId) return jsonError(401, "User id required");

    if (scope === "private") {
      // PRIVATE PROJECT
      const key = `${PROJECT_PREFIX}${project.id}`;
      await userPuter.kv.set(key, payload);

      // remove existing public project
      const publicKey = getPublicKey(userId, project.id);
      await mePuter.kv.del(publicKey);

      return { saved: true, id: project.id, project: payload };
    } else {
      // PUBLIC PROJECT
      const publicKey = getPublicKey(userId, project.id);

      const userInfo = await userPuter.auth.getUser();
      let username = userInfo?.username || userInfo?.name || null;

      const publicRecord = {
        ...payload,
        ownerId: userId,
        sharedBy: username,
        sharedAt: new Date().toISOString(),
      };
      await mePuter.kv.set(publicKey, publicRecord);

      // remove existing private project
      const userKey = `${PROJECT_PREFIX}${project.id}`;
      await userPuter.kv.del(userKey);

      return { saved: true, id: project.id, project: publicRecord };
    }
  } catch (error) {
    return jsonError(500, "Failed to save project", {
      message: error?.message || "Unknown error",
    });
  }
});

router.post("/api/projects/clear", async ({ user }) => {
  const userPuter = user.puter;
  const mePuter = me.puter;
  
  if (!userPuter) return jsonError(401, "Authentication required");

  const userDeleted = userPuter?.kv
    ? await deleteKvByPattern(userPuter.kv, `${PROJECT_PREFIX}*`)
    : 0;
  const publicDeleted = mePuter?.kv
    ? await deleteKvByPattern(mePuter.kv, `${PUBLIC_PREFIX}*`)
    : 0;

  return jsonOk({
    cleared: userDeleted,
    clearedPublic: publicDeleted,
  });
});

router.post("/api/hosting/clear", async ({ user }) => {
  const userPuter = user.puter;
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
    ],
  });
});
