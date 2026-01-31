const PROJECT_PREFIX = "roomify_project_";
const PUBLIC_PREFIX = "roomify_public_";

const getUserPuter = (userParam) => {
  if (userParam && userParam.puter) return userParam.puter;
  return null;
};

const getMePuter = (meParam) => {
  if (meParam && meParam.puter) return meParam.puter;
  if (typeof me !== "undefined" && me && me.puter) return me.puter;
  return null;
};

const listKeysWithPrefix = async (kv, prefix) => {
  const keys = [];
  let cursor = undefined;
  const limit = 100;

  while (true) {
    const page = await kv.list({ limit, cursor });

    if (Array.isArray(page)) {
      keys.push(
        ...page.filter(
          (key) => typeof key === "string" && key.startsWith(prefix),
        ),
      );
      break;
    }

    const items = Array.isArray(page?.items) ? page.items : [];

    keys.push(
      ...items.filter(
        (key) => typeof key === "string" && key.startsWith(prefix),
      ),
    );

    if (!page?.cursor) break;
    cursor = page.cursor;
  }

  return keys;
};

const attachIdFromKey = (project, key, prefix) => {
  if (!project || project.id) return project;
  if (typeof key !== "string" || !key.startsWith(prefix)) return project;
  const derivedId = key.slice(prefix.length);
  return derivedId ? { ...project, id: derivedId } : project;
};

const hydrateProject = async (puterContext, project, pathKey) => {
  if (!project || !puterContext) return project;
  const resolvedPath = project?.[pathKey];
  if (!resolvedPath) return project;
  try {
    const url = await puterContext.fs.getReadURL(
      resolvedPath,
      60 * 60 * 24 * 30,
    );
    return { ...project, renderedImage: url };
  } catch {
    return project;
  }
};

const listProjects = async (userParam) => {
  const userPuter = getUserPuter(userParam);

  if (!userPuter) throw new Error("Missing user Puter context.");

  const keys = await listKeysWithPrefix(userPuter.kv, PROJECT_PREFIX);
  if (!keys || keys.length === 0) return [];

  const items = await Promise.all(
    keys.map(async (key) => {
      const project = await userPuter.kv.get(key);
      return attachIdFromKey(project, key, PROJECT_PREFIX);
    }),
  );

  const projects = items.filter(Boolean);
  const hydrated = await Promise.all(
    projects.map((project) => hydrateProject(userPuter, project, "renderedPath")),
  );

  hydrated.sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0));

  return hydrated;
};

const listPublicProjects = async (meParam) => {
  const mePuter = getMePuter(meParam);
  if (!mePuter) throw new Error("Missing deployer Puter context.");

  const keys = await listKeysWithPrefix(mePuter.kv, PUBLIC_PREFIX);
  if (!keys || keys.length === 0) return [];

  const items = await Promise.all(
    keys.map(async (key) => {
      const project = await mePuter.kv.get(key);
      return attachIdFromKey(project, key, PUBLIC_PREFIX);
    }),
  );

  const projects = items.filter(Boolean);
  const hydrated = await Promise.all(
    projects.map((project) => hydrateProject(mePuter, project, "publicPath")),
  );
  hydrated.sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0));
  return hydrated;
};

router.get("/api/projects/list", async ({ user }) => {
  try {
    const projects = await listProjects(user);
    return { projects };
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to list projects",
        message: error?.message || "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

router.get("/api/projects/public", async ({ me }) => {
  try {
    const projects = await listPublicProjects(me);
    return { projects };
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to list public projects",
        message: error?.message || "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

router.get("/api/projects/get", async ({ request, user, me }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const scope = url.searchParams.get("scope") || "user";

  if (!id) {
    return new Response(JSON.stringify({ error: "Project id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (scope === "public") {
    const mePuter = getMePuter(me);
    if (!mePuter) {
      return new Response(
        JSON.stringify({ error: "Missing deployer Puter context." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
    const publicKey = `${PUBLIC_PREFIX}${id}`;
    const project = attachIdFromKey(
      await mePuter.kv.get(publicKey),
      publicKey,
      PUBLIC_PREFIX,
    );
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const hydrated = await hydrateProject(mePuter, project, "publicPath");
    return { project: hydrated };
  }

  const userPuter = getUserPuter(user);
  if (!userPuter) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const key = `${PROJECT_PREFIX}${id}`;
  const project = attachIdFromKey(
    await userPuter.kv.get(key),
    key,
    PROJECT_PREFIX,
  );
  if (!project) {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const hydrated = await hydrateProject(userPuter, project, "renderedPath");
  return { project: hydrated };
});

router.post("/api/projects/save", async ({ request, user, me }) => {
  const userPuter = getUserPuter(user);
  if (!userPuter) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json();
  const project = body?.project;

  const share = body?.share === true;
  const shareImageUrl = body?.shareImageUrl;

  if (!project?.id || !project?.sourceImage) {
    return new Response(
      JSON.stringify({ error: "Project id and image required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const payload = {
    ...project,
    updatedAt: new Date().toISOString(),
  };

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

  if (share) {
    const mePuter = getMePuter(me);
    if (!mePuter) {
      return new Response(
        JSON.stringify({ error: "Missing deployer Puter context." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const publicKey = `${PUBLIC_PREFIX}${project.id}`;

    let publicPath = null;
    let publicUrl = null;

    if (shareImageUrl) {
      try {
        const response = await fetch(shareImageUrl);
        const blob = await response.blob();
        publicPath = `roomify/public/${project.id}.png`;
        await mePuter.fs.write(publicPath, blob);
        publicUrl = await mePuter.fs.getReadURL(publicPath, 60 * 60 * 24 * 30);
      } catch (error) {
        publicUrl = shareImageUrl;
      }
    }

    await mePuter.kv.set(publicKey, {
      ...payload,
      publicPath,
      renderedImage: publicUrl || payload.renderedImage,
      sharedAt: new Date().toISOString(),
    });
  }

  return { saved: true, id: project.id };
});

router.get("/*path", async ({ params }) => {
  return new Response(
    JSON.stringify({
      error: "Not found",
      path: params.path,
      availableEndpoints: [
        "/api/projects/list",
        "/api/projects/public",
        "/api/projects/get",
        "/api/projects/save",
      ],
    }),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    },
  );
});
