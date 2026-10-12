import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const testsRoot = fileURLToPath(new URL("../", import.meta.url));
const containerName = `org-saas-e2e-${randomUUID()}`;
const baseURL = "http://127.0.0.1:4317";
let activeChild: ReturnType<typeof spawn> | undefined;
let interrupted = false;
let containerStarted = false;
let cleaningUp = false;

async function run(
  command: string,
  args: string[],
  options: { capture?: boolean; cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<string> {
  if (interrupted && !cleaningUp) throw new Error("Browser tests were interrupted.");
  const child = spawn(command, args, {
    cwd: options.cwd ?? repositoryRoot,
    env: options.env ?? process.env,
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  activeChild = child;
  let output = "";
  let errorOutput = "";
  child.stdout?.on("data", (data: Buffer) => {
    output += data.toString();
  });
  child.stderr?.on("data", (data: Buffer) => {
    errorOutput += data.toString();
  });
  await new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (activeChild === child) activeChild = undefined;
      if (code === 0) resolve();
      else reject(new Error(`${command} failed (${signal ?? code}): ${errorOutput.trim()}`));
    });
  });
  return output.trim();
}

function interrupt() {
  interrupted = true;
  if (!cleaningUp) activeChild?.kill("SIGTERM");
}

process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);

try {
  await run("docker", ["info", "--format", "{{.ServerVersion}}"], { capture: true });
  console.log("Starting a disposable PostgreSQL database for browser tests…");
  await run("docker", [
    "run",
    "--detach",
    "--rm",
    "--name",
    containerName,
    "--publish",
    "127.0.0.1::5432",
    "--tmpfs",
    "/var/lib/postgresql/data",
    "--env",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "--env",
    "POSTGRES_DB=org_saas_e2e",
    "postgres:17-alpine",
  ]);
  containerStarted = true;

  let ready = false;
  for (let attempt = 0; attempt < 60 && !interrupted; attempt++) {
    try {
      await run("docker", ["exec", containerName, "pg_isready", "-U", "postgres"], {
        capture: true,
      });
      ready = true;
      break;
    } catch {
      await setTimeout(500);
    }
  }
  if (!ready || interrupted) throw new Error("The test database did not become ready.");

  const portBinding = await run("docker", ["port", containerName, "5432/tcp"], {
    capture: true,
  });
  const port = /^127\.0\.0\.1:(\d+)$/.exec(portBinding)?.[1];
  if (!port) throw new Error("The test database must be bound only to loopback.");

  const env = {
    ...process.env,
    DATABASE_URL: `postgres://postgres@127.0.0.1:${port}/org_saas_e2e`,
    DATABASE_ENV_FILE: "/dev/null",
    DOTENV_CONFIG_PATH: "/dev/null",
    BETTER_AUTH_SECRET: randomUUID() + randomUUID(),
    BETTER_AUTH_URL: baseURL,
    CORS_ORIGIN: baseURL,
    LOG_LEVEL: "warn",
    NODE_ENV: "production",
    ORG_SAAS_E2E: "1",
  };

  await run("vp", ["run", "--filter", "@org-saas/db", "db:push"], { env });
  await run("vp", ["run", "--filter", "web", "build"], { env });
  const playwrightCli = fileURLToPath(import.meta.resolve("@playwright/test/cli"));
  await run(
    process.execPath,
    [playwrightCli, "test", "--config", "playwright.config.ts", ...process.argv.slice(2)],
    {
      cwd: testsRoot,
      env,
    },
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = interrupted ? 130 : 1;
} finally {
  cleaningUp = true;
  if (containerStarted) {
    await run("docker", ["rm", "--force", containerName], { capture: true }).catch(() => {
      console.error(`Could not remove ${containerName}; check Docker before the next run.`);
    });
  }
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", interrupt);
}
