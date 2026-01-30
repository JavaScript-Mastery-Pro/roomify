const PROJECT_PREFIX = "roomify_project_";

const getUserPuter = (userParam) => {
  if (userParam && userParam.puter) return userParam.puter;
  return null;
};

const listProjects = async (userParam) => {
  const userPuter = getUserPuter(userParam);
  if (!userPuter) {
    throw new Error("Missing user Puter context.");
  }
  const keys = await userPuter.kv.list(`${PROJECT_PREFIX}*`);
  if (!keys || keys.length === 0) return [];
  const items = await Promise.all(keys.map((key) => userPuter.kv.get(key)));
  const projects = items.filter(Boolean);
  projects.sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0));
  return projects;
};

router.get("/api/projects/list", async ({ user }) => {
  try {
    const projects = await listProjects(user);
    return { projects };
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to list projects", message: error?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

router.post("/api/projects/save", async ({ request, user }) => {
  const userPuter = getUserPuter(user);
  if (!userPuter) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await request.json();
  const project = body?.project;
  if (!project?.id || !project?.image) {
    return new Response(JSON.stringify({ error: "Project id and image required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = {
    ...project,
    updatedAt: new Date().toISOString(),
  };

  const key = `${PROJECT_PREFIX}${project.id}`;
  try {
    await userPuter.kv.update(key, {
      image: payload.image,
      timestamp: payload.timestamp,
      updatedAt: payload.updatedAt,
    });
  } catch {
    await userPuter.kv.set(key, payload);
  }
  return { saved: true, id: project.id };
});

router.get("/*path", async ({ params }) => {
  return new Response(
    JSON.stringify({
      error: "Not found",
      path: params.path,
      availableEndpoints: ["/api/projects/list", "/api/projects/save"],
    }),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }
  );
});
