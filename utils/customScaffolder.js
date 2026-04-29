import path from "path";
import fs from "fs-extra";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";
import { buildViteCommand, getInstallCommand } from "./shared.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CUSTOM_TEMPLATES = path.join(__dirname, "..", "templates", "custom");

// ─── Frontend Scaffolding ────────────────────────────────────────────────────

/**
 * Maps custom frontend values to Vite template names.
 */
const VITE_TEMPLATE_MAP = {
  "react-router": "react",
  tanstack: "react",
  svelte: "svelte",
  solid: "solid",
  astro: null, // uses own CLI
};

/**
 * Creates the frontend (client) portion of the project.
 *
 * @param {string} projectPath - Root project directory.
 * @param {object} config - Full custom config.
 */
function scaffoldFrontend(projectPath, config) {
  const { frontend, language, packageManager } = config;

  if (frontend === "nextjs") {
    // Next.js is a full-stack framework — scaffolded at root level
    logger.info("⚡ Creating Next.js frontend...");
    const nextCmd = (() => {
      switch (packageManager) {
        case "pnpm":  return "pnpm dlx create-next-app@latest";
        case "yarn":  return "yarn dlx create-next-app@latest";
        case "bun":   return "bunx create-next-app@latest";
        default:      return "npx -y create-next-app@latest";
      }
    })();
    const tsFlag = language === "typescript" ? "--typescript" : "--js";
    execSync(
      `${nextCmd} client ${tsFlag} --eslint --tailwind --src-dir --app --no-turbo --import-alias="@/*" --yes`,
      { cwd: projectPath, stdio: "inherit", shell: true }
    );
    return;
  }

  if (frontend === "nuxt") {
    logger.info("⚡ Creating Nuxt frontend...");
    execSync(`npx -y nuxi@latest init client --no-install --no-git`, {
      cwd: projectPath,
      stdio: "inherit",
      shell: true,
    });
    return;
  }

  if (frontend === "astro") {
    logger.info("⚡ Creating Astro frontend...");
    const tsFlag = language === "typescript" ? "--typescript strict" : "--typescript relaxed";
    execSync(`npm create astro@latest client -- --template basics ${tsFlag} --no-install --no-git --yes`, {
      cwd: projectPath,
      stdio: "inherit",
      shell: true,
    });
    return;
  }

  // Vite-based frontends (react-router, tanstack, svelte, solid)
  const baseTemplate = VITE_TEMPLATE_MAP[frontend] || "react";
  const template =
    language === "typescript" ? `${baseTemplate}-ts` : baseTemplate;
  const cmd = buildViteCommand(config, template, "client");

  logger.info(`⚡ Creating ${frontend} frontend via Vite...`);
  execSync(cmd, { cwd: projectPath, stdio: "inherit", shell: true });
}

// ─── Backend Scaffolding ─────────────────────────────────────────────────────

/**
 * Copies the backend template for the selected framework + language.
 *
 * @param {string} projectPath - Root project directory.
 * @param {object} config - Full custom config.
 */
function scaffoldBackend(projectPath, config) {
  const { backend, language } = config;

  if (backend === "none") {
    logger.info("ℹ️  No backend selected — skipping server setup.");
    return;
  }

  if (backend === "convex") {
    // Convex uses a convex/ directory instead of server/
    const convexTemplate = path.join(CUSTOM_TEMPLATES, "server", "convex", language);
    const convexDest = path.join(projectPath, "convex");
    if (fs.existsSync(convexTemplate)) {
      logger.info("📂 Copying Convex function templates...");
      fs.copySync(convexTemplate, convexDest);
    } else {
      logger.warn(`⚠️  No Convex template found for ${language}. Creating empty convex/ directory.`);
      fs.mkdirSync(convexDest, { recursive: true });
    }
    return;
  }

  const backendTemplate = path.join(CUSTOM_TEMPLATES, "server", backend, language);
  const serverDest = path.join(projectPath, "server");

  if (fs.existsSync(backendTemplate)) {
    logger.info(`📂 Copying ${backend} server template (${language})...`);
    fs.copySync(backendTemplate, serverDest);
  } else {
    logger.warn(`⚠️  No template found for ${backend}/${language}. Creating empty server/ directory.`);
    fs.mkdirSync(serverDest, { recursive: true });
    execSync("npm init -y", { cwd: serverDest, stdio: "ignore", shell: true });
  }
}

// ─── Database Layer ──────────────────────────────────────────────────────────

/**
 * Copies database connection helpers into the server directory.
 *
 * @param {string} projectPath - Root project directory.
 * @param {object} config - Full custom config.
 */
function scaffoldDatabase(projectPath, config) {
  const { database, backend } = config;

  if (!database || database.type === "none" || backend === "none") return;

  const dbTemplate = path.join(CUSTOM_TEMPLATES, "database", database.type);
  const serverDir = backend === "convex"
    ? path.join(projectPath, "convex")
    : path.join(projectPath, "server");

  if (!fs.existsSync(dbTemplate)) {
    logger.warn(`⚠️  No database template for "${database.type}".`);
    return;
  }

  logger.info(`🗄️  Adding ${database.type} database connection...`);
  const destDir = path.join(serverDir, "db");
  fs.copySync(dbTemplate, destDir);

  // Append DB env vars to .env.example if it exists
  const envPath = path.join(serverDir, ".env.example");
  const dbEnvPath = path.join(dbTemplate, ".env.example");
  if (fs.existsSync(dbEnvPath) && fs.existsSync(envPath)) {
    const dbEnv = fs.readFileSync(dbEnvPath, "utf-8");
    fs.appendFileSync(envPath, `\n${dbEnv}`, "utf-8");
  }
}

// ─── ORM Layer ───────────────────────────────────────────────────────────────

/**
 * Copies ORM configuration into the server directory.
 *
 * @param {string} projectPath - Root project directory.
 * @param {object} config - Full custom config.
 */
function scaffoldORM(projectPath, config) {
  const { orm, database, backend } = config;

  if (!orm || orm === "none" || !database || database.type === "none" || backend === "none") return;

  // Guard: Drizzle doesn't support MongoDB
  if (orm === "drizzle" && database.type === "mongodb") {
    logger.warn("⚠️  Drizzle does not support MongoDB. Skipping ORM setup.");
    return;
  }

  const ormTemplate = path.join(CUSTOM_TEMPLATES, "orm", orm, database.type);
  const serverDir = path.join(projectPath, "server");

  if (!fs.existsSync(ormTemplate)) {
    logger.warn(`⚠️  No ORM template for ${orm}/${database.type}.`);
    return;
  }

  logger.info(`🔗 Adding ${orm} ORM configuration for ${database.type}...`);
  fs.copySync(ormTemplate, serverDir, { overwrite: false });
}

// ─── Auth Layer ──────────────────────────────────────────────────────────────

/**
 * Copies auth provider templates.
 *
 * @param {string} projectPath - Root project directory.
 * @param {object} config - Full custom config.
 */
function scaffoldAuth(projectPath, config) {
  const { auth, language, backend } = config;

  if (!auth || auth === "none") return;

  const authTemplate = path.join(CUSTOM_TEMPLATES, "auth", auth, language);
  const serverDir = backend === "none"
    ? path.join(projectPath, "client") // for frontend-only with Clerk
    : path.join(projectPath, "server");

  if (!fs.existsSync(authTemplate)) {
    logger.warn(`⚠️  No auth template for ${auth}/${language}.`);
    return;
  }

  logger.info(`🔐 Adding ${auth} auth configuration...`);
  fs.copySync(authTemplate, serverDir, { overwrite: false });
}

// ─── API Layer ───────────────────────────────────────────────────────────────

/**
 * Copies API layer templates (tRPC, oRPC).
 *
 * @param {string} projectPath - Root project directory.
 * @param {object} config - Full custom config.
 */
function scaffoldAPI(projectPath, config) {
  const { api, language, backend } = config;

  if (!api || api === "none" || backend === "none") return;

  const apiTemplate = path.join(CUSTOM_TEMPLATES, "api", api, language);
  const serverDir = path.join(projectPath, "server");

  if (!fs.existsSync(apiTemplate)) {
    logger.warn(`⚠️  No API template for ${api}/${language}.`);
    return;
  }

  logger.info(`🔌 Adding ${api} API layer...`);
  fs.copySync(apiTemplate, serverDir, { overwrite: false });
}

// ─── Addons ──────────────────────────────────────────────────────────────────

/**
 * Copies addon configuration files into the project root.
 *
 * @param {string} projectPath - Root project directory.
 * @param {object} config - Full custom config.
 */
function scaffoldAddons(projectPath, config) {
  const { addons } = config;

  if (!addons || addons.length === 0) return;

  for (const addon of addons) {
    const addonTemplate = path.join(CUSTOM_TEMPLATES, "addons", addon);

    if (!fs.existsSync(addonTemplate)) {
      logger.warn(`⚠️  No addon template for "${addon}".`);
      continue;
    }

    logger.info(`🧩 Adding ${addon} addon...`);
    fs.copySync(addonTemplate, projectPath, { overwrite: false });
  }
}

// ─── Docker ──────────────────────────────────────────────────────────────────

/**
 * Copies Docker templates and adapts them.
 *
 * @param {string} projectPath - Root project directory.
 * @param {object} config - Full custom config.
 */
function scaffoldDocker(projectPath, config) {
  const dockerTemplate = path.join(CUSTOM_TEMPLATES, "docker");

  if (!fs.existsSync(dockerTemplate)) return;

  const { backend } = config;

  // Copy docker-compose.yml to project root
  const composeSrc = path.join(dockerTemplate, "docker-compose.yml");
  if (fs.existsSync(composeSrc)) {
    fs.copySync(composeSrc, path.join(projectPath, "docker-compose.yml"));
  }

  // Copy server Dockerfile
  if (backend !== "none" && backend !== "convex") {
    const serverDockerfile = path.join(dockerTemplate, "Dockerfile.server");
    if (fs.existsSync(serverDockerfile)) {
      fs.copySync(serverDockerfile, path.join(projectPath, "server", "Dockerfile"));
    }

    const dockerignore = path.join(dockerTemplate, ".dockerignore");
    if (fs.existsSync(dockerignore)) {
      fs.copySync(dockerignore, path.join(projectPath, "server", ".dockerignore"));
    }
  }

  // Copy client Dockerfile
  const clientDockerfile = path.join(dockerTemplate, "Dockerfile.client");
  const clientDir = path.join(projectPath, "client");
  if (fs.existsSync(clientDockerfile) && fs.existsSync(clientDir)) {
    fs.copySync(clientDockerfile, path.join(clientDir, "Dockerfile"));
  }

  logger.info("🐳 Added Docker configuration...");
}

// ─── Dependency List Builder ─────────────────────────────────────────────────

/**
 * Builds the list of server dependencies to install based on config.
 *
 * @param {object} config - Full custom config.
 * @returns {{ deps: string[], devDeps: string[] }}
 */
function buildDependencyList(config) {
  const { backend, database, orm, api, auth } = config;
  const deps = [];
  const devDeps = [];

  // Backend framework
  switch (backend) {
    case "express":
      deps.push("express", "cors", "helmet", "dotenv", "morgan");
      devDeps.push("nodemon");
      break;
    case "fastify":
      deps.push("fastify", "@fastify/cors", "@fastify/helmet", "dotenv");
      devDeps.push("nodemon");
      break;
    case "hono":
      deps.push("hono", "dotenv");
      devDeps.push("nodemon");
      break;
    // convex handled separately
  }

  // Database driver
  if (database && database.type !== "none") {
    switch (database.type) {
      case "mongodb":
        if (orm !== "prisma") deps.push("mongoose");
        break;
      case "postgres":
        if (!orm || orm === "none") deps.push("pg");
        break;
      case "mysql":
        if (!orm || orm === "none") deps.push("mysql2");
        break;
      case "sqlite":
        if (!orm || orm === "none") deps.push("better-sqlite3");
        break;
    }
  }

  // ORM
  switch (orm) {
    case "prisma":
      deps.push("@prisma/client");
      devDeps.push("prisma");
      break;
    case "drizzle":
      deps.push("drizzle-orm");
      devDeps.push("drizzle-kit");
      // DB-specific drizzle driver
      if (database) {
        switch (database.type) {
          case "postgres": deps.push("postgres"); break;
          case "mysql": deps.push("mysql2"); break;
          case "sqlite": deps.push("better-sqlite3"); break;
        }
      }
      break;
  }

  // API layer
  switch (api) {
    case "trpc":
      deps.push("@trpc/server");
      break;
    case "orpc":
      deps.push("@orpc/server");
      break;
  }

  // Auth
  switch (auth) {
    case "clerk":
      deps.push("@clerk/backend");
      break;
    case "better-auth":
      deps.push("better-auth");
      break;
  }

  return { deps, devDeps };
}

// ─── Main Entry ──────────────────────────────────────────────────────────────

/**
 * Orchestrates the full custom stack scaffolding process.
 *
 * @param {string} projectPath - Absolute path to the project directory.
 * @param {string} projectName - Project name.
 * @param {object} config - Full custom-stack config from prompts.
 * @param {boolean} installDeps - Whether to install dependencies.
 */
export async function scaffoldCustomStack(projectPath, projectName, config, installDeps) {
  // 1. Frontend
  scaffoldFrontend(projectPath, config);

  // 2. Backend
  scaffoldBackend(projectPath, config);

  // 3. Database
  scaffoldDatabase(projectPath, config);

  // 4. ORM
  scaffoldORM(projectPath, config);

  // 5. Auth
  scaffoldAuth(projectPath, config);

  // 6. API
  scaffoldAPI(projectPath, config);

  // 7. Addons
  scaffoldAddons(projectPath, config);

  // 8. Docker
  scaffoldDocker(projectPath, config);

  // 9. Install dependencies
  if (installDeps && config.backend !== "none" && config.backend !== "convex") {
    const serverDir = path.join(projectPath, "server");
    const { deps, devDeps } = buildDependencyList(config);
    const installCmd = getInstallCommand(config.packageManager);

    if (deps.length > 0) {
      logger.info("📦 Installing server dependencies...");
      execSync(`${config.packageManager} ${installCmd} ${deps.join(" ")}`, {
        cwd: serverDir,
        stdio: "inherit",
        shell: true,
      });
    }

    if (devDeps.length > 0) {
      logger.info("📦 Installing server dev dependencies...");
      const devFlag = config.packageManager === "npm" ? "--save-dev" : "-D";
      execSync(`${config.packageManager} ${installCmd} ${devFlag} ${devDeps.join(" ")}`, {
        cwd: serverDir,
        stdio: "inherit",
        shell: true,
      });
    }

    // Install client dependencies
    const clientDir = path.join(projectPath, "client");
    if (fs.existsSync(clientDir)) {
      logger.info("📦 Installing client dependencies...");
      execSync(`${config.packageManager} install`, {
        cwd: clientDir,
        stdio: "inherit",
        shell: true,
      });
    }
  }

  // 10. Save config
  fs.writeJsonSync(path.join(projectPath, "celtrix.config.json"), config, { spaces: 2 });

  logger.success("✅ Custom stack scaffolded successfully!");
}
