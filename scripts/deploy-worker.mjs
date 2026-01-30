import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "@heyputer/puter.js/src/init.cjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const workerName = process.env.PUTER_WORKER_NAME || "roomify-api";

const parseEnvFile = (content) => {
  const out = {};
  content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .forEach((line) => {
      const idx = line.indexOf("=");
      if (idx === -1) return;
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    });
  return out;
};

const readTokenFromEnvFiles = async () => {
  const candidates = [
    path.join(projectRoot, ".env.local"),
    path.join(projectRoot, ".env"),
  ];
  for (const filePath of candidates) {
    try {
      const content = await fs.readFile(filePath, "utf8");
      const env = parseEnvFile(content);
      const token = env.PUTER_AUTH_TOKEN || env.PUTER_API_KEY;
      if (token) return token;
    } catch {
      // ignore missing files
    }
  }
  return null;
};

let token = process.env.PUTER_AUTH_TOKEN || process.env.PUTER_API_KEY;
if (!token) {
  token = await readTokenFromEnvFiles();
}

if (!token) {
  console.error("Missing PUTER_AUTH_TOKEN (or PUTER_API_KEY) in env or .env/.env.local.");
  process.exit(1);
}

const puter = init(token);

const localWorkerPath = path.join(projectRoot, "puter-worker.js");
const remoteWorkerPath = "puter-worker.js";

const deploy = async () => {
  const workerCode = await fs.readFile(localWorkerPath, "utf8");
  await puter.fs.write(remoteWorkerPath, workerCode);
  const deployment = await puter.workers.create(workerName, remoteWorkerPath);
  console.log(`Worker deployed: ${deployment.url}`);
};

deploy().catch((error) => {
  console.error("Worker deploy failed:", error?.message || error);
  process.exit(1);
});
