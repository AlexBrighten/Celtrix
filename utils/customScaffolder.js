import path from "path";
import fs from "fs-extra";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";
import { buildViteCommand, getInstallCommand } from "./shared.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CUSTOM_TEMPLATES = path.join(__dirname, "..", "templates", "custom");

// ─── Compatibility Matrix ────────────────────────────────────────────────────

/**
 * Convex is a BaaS — these features are incompatible with it.
 * When Convex is the backend, we skip these layers with warnings.
 */
const CONVEX_INCOMPATIBLE = {
  database: true,
  orm: true,
};

// ─── Merge Utilities ─────────────────────────────────────────────────────────

/**
 * Reads a deps.json manifest from a template fragment and merges
 * its dependencies into the target server package.json.
 *
 * deps.json format: { "dependencies": {...}, "devDependencies": {...}, "scripts": {...} }
 *
 * @param {string} fragmentDir - Directory containing deps.json.
 * @param {string} targetPkgPath - Path to the server's package.json.
 */
function mergeDeps(fragmentDir, targetPkgPath) {
  const depsFile = path.join(fragmentDir, "deps.json");
  if (!fs.existsSync(depsFile) || !fs.existsSync(targetPkgPath)) return;

  const fragment = fs.readJsonSync(depsFile);
  const pkg = fs.readJsonSync(targetPkgPath);

  if (fragment.dependencies) {
    pkg.dependencies = { ...(pkg.dependencies || {}), ...fragment.dependencies };
  }
  if (fragment.devDependencies) {
    pkg.devDependencies = { ...(pkg.devDependencies || {}), ...fragment.devDependencies };
  }
  if (fragment.scripts) {
    pkg.scripts = { ...(pkg.scripts || {}), ...fragment.scripts };
  }

  fs.writeJsonSync(targetPkgPath, pkg, { spaces: 2 });
}

/**
 * Reads an .env.fragment file and appends its contents to the
 * target .env.example, avoiding duplicates.
 *
 * @param {string} fragmentDir - Directory containing .env.fragment.
 * @param {string} targetEnvPath - Path to the target .env.example.
 */
function mergeEnv(fragmentDir, targetEnvPath) {
  const envFragment = path.join(fragmentDir, ".env.fragment");
  if (!fs.existsSync(envFragment)) return;

  const content = fs.readFileSync(envFragment, "utf-8").trim();
  if (!content) return;

  // Create .env.example if it doesn't exist
  if (!fs.existsSync(targetEnvPath)) {
    fs.writeFileSync(targetEnvPath, "", "utf-8");
  }

  const existing = fs.readFileSync(targetEnvPath, "utf-8");
  // Only append lines that aren't already present
  const newLines = content
    .split("\n")
    .filter((line) => !existing.includes(line.split("=")[0] + "="))
    .join("\n");

  if (newLines.trim()) {
    fs.appendFileSync(targetEnvPath, `\n${newLines}\n`, "utf-8");
  }
}

// ─── Root Project Scaffolding ────────────────────────────────────────────────

/**
 * Creates root-level project files: package.json (workspaces), .gitignore, README.
 */
function scaffoldRoot(projectPath, projectName, config) {
  const { backend, packageManager } = config;
  const hasServer = backend !== "none";

  // Root package.json with workspaces
  const workspaces = ["client"];
  if (hasServer && backend !== "convex") workspaces.push("server");

  const devClientCmd = packageManager === "npm" ? "npm run dev --prefix client" :
                       packageManager === "yarn" ? "yarn workspace client dev" :
                       packageManager === "pnpm" ? "pnpm --filter client run dev" :
                       "bun --cwd client run dev";

  const rootPkg = {
    name: projectName,
    version: "0.1.0",
    private: true,
    workspaces,
    scripts: {
      "dev:client": devClientCmd,
    },
  };

  if (hasServer && backend !== "convex") {
    const devServerCmd = packageManager === "npm" ? "npm run dev --prefix server" :
                         packageManager === "yarn" ? "yarn workspace server dev" :
                         packageManager === "pnpm" ? "pnpm --filter server run dev" :
                         "bun --cwd server run dev";
    rootPkg.scripts["dev:server"] = devServerCmd;
  }

  fs.writeJsonSync(path.join(projectPath, "package.json"), rootPkg, { spaces: 2 });

  // Root .gitignore
  const gitignore = [
    "node_modules/", "dist/", "build/", ".env", ".env.local", ".env.*.local",
    "*.log", "npm-debug.log*", ".DS_Store", "Thumbs.db",
    ".vscode/", ".idea/", "coverage/", ".nyc_output/",
  ].join("\n");
  fs.writeFileSync(path.join(projectPath, ".gitignore"), gitignore, "utf-8");

  // Root README
  const readme = [
    `# ${projectName}`,
    "",
    `> Bootstrapped with [Celtrix](https://github.com/celtrix-os/Celtrix) — Custom Stack`,
    "",
    "## Getting Started",
    "",
    "```bash",
    `cd ${projectName}`,
    `# Install all workspace dependencies`,
    `${packageManager} install`,
    "",
    `# Start client`,
    `${packageManager} run dev:client`,
    hasServer && backend !== "convex" ? `\n# Start server\n${packageManager} run dev:server` : "",
    "```",
  ].filter(Boolean).join("\n");
  fs.writeFileSync(path.join(projectPath, "README.md"), readme, "utf-8");
}

// ─── Frontend Scaffolding ────────────────────────────────────────────────────

const VITE_TEMPLATE_MAP = {
  "react-router": "react",
  tanstack: "react",
  svelte: "svelte",
  solid: "solid",
};

function scaffoldFrontend(projectPath, config) {
  const { frontend, language, packageManager } = config;

  if (frontend === "nextjs") {
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
      cwd: projectPath, stdio: "inherit", shell: true,
    });
    return;
  }

  if (frontend === "astro") {
    logger.info("⚡ Creating Astro frontend...");
    const tsFlag = language === "typescript" ? "--typescript strict" : "--typescript relaxed";
    execSync(`npm create astro@latest client -- --template basics ${tsFlag} --no-install --no-git --yes`, {
      cwd: projectPath, stdio: "inherit", shell: true,
    });
    return;
  }

  // Vite-based frontends
  const baseTemplate = VITE_TEMPLATE_MAP[frontend] || "react";
  const template = language === "typescript" ? `${baseTemplate}-ts` : baseTemplate;
  const cmd = buildViteCommand(config, template, "client");
  logger.info(`⚡ Creating ${frontend} frontend via Vite...`);
  execSync(cmd, { cwd: projectPath, stdio: "inherit", shell: true });
}

// ─── Backend Scaffolding ─────────────────────────────────────────────────────

function scaffoldBackend(projectPath, config) {
  const { backend, language, runtime } = config;

  if (backend === "none") {
    logger.info("ℹ️  No backend selected — skipping server setup.");
    return;
  }

  if (backend === "convex") {
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

  // Runtime-aware: patch server package.json scripts for bun vs node
  const serverPkg = path.join(serverDest, "package.json");
  if (runtime === "bun" && fs.existsSync(serverPkg)) {
    const pkg = fs.readJsonSync(serverPkg);
    const entry = language === "typescript" ? "server.ts" : "server.js";
    pkg.scripts = {
      ...(pkg.scripts || {}),
      start: `bun ${entry}`,
      dev: `bun --watch ${entry}`,
    };
    fs.writeJsonSync(serverPkg, pkg, { spaces: 2 });
  }
}

// ─── Database Layer ──────────────────────────────────────────────────────────

function scaffoldDatabase(projectPath, config) {
  const { database, backend } = config;

  if (!database || database.type === "none" || backend === "none") return;

  // Convex guard
  if (backend === "convex") {
    logger.warn("⚠️  Convex manages its own database — skipping database setup.");
    return;
  }

  // Use provider-specific template: database/{type}/{provider}/{language}
  const provider = database.provider || "local";
  const dbTemplate = path.join(CUSTOM_TEMPLATES, "database", database.type, provider, config.language);

  // Fallback to database/{type}/{language} if provider dir doesn't exist
  const fallbackTemplate = path.join(CUSTOM_TEMPLATES, "database", database.type, config.language);
  const templateDir = fs.existsSync(dbTemplate) ? dbTemplate : (fs.existsSync(fallbackTemplate) ? fallbackTemplate : null);

  if (!templateDir) {
    logger.warn(`⚠️  No database template for "${database.type}/${provider}".`);
    return;
  }

  const serverDir = path.join(projectPath, "server");
  const serverPkg = path.join(serverDir, "package.json");
  const envPath = path.join(serverDir, ".env.example");

  logger.info(`🗄️  Adding ${database.type} (${provider}) database connection...`);

  // Copy DB files (excluding deps.json and .env.fragment)
  const destDir = path.join(serverDir, "db");
  const files = fs.readdirSync(templateDir);
  for (const file of files) {
    if (file === "deps.json" || file === ".env.fragment") continue;
    fs.copySync(path.join(templateDir, file), path.join(destDir, file));
  }

  // Merge dependencies and env vars
  mergeDeps(templateDir, serverPkg);
  mergeEnv(templateDir, envPath);
}

// ─── ORM Layer ───────────────────────────────────────────────────────────────

function scaffoldORM(projectPath, config) {
  const { orm, database, backend } = config;

  if (!orm || orm === "none" || !database || database.type === "none" || backend === "none") return;

  if (backend === "convex") {
    logger.warn("⚠️  Convex manages its own data layer — skipping ORM setup.");
    return;
  }

  if (orm === "drizzle" && database.type === "mongodb") {
    logger.warn("⚠️  Drizzle does not support MongoDB. Skipping ORM setup.");
    return;
  }

  const ormTemplate = path.join(CUSTOM_TEMPLATES, "orm", orm, database.type, config.language);
  const serverDir = path.join(projectPath, "server");
  const serverPkg = path.join(serverDir, "package.json");

  if (!fs.existsSync(ormTemplate)) {
    logger.warn(`⚠️  No ORM template for ${orm}/${database.type}.`);
    return;
  }

  logger.info(`🔗 Adding ${orm} ORM configuration for ${database.type}...`);

  // Copy ORM files (excluding deps.json and .env.fragment)
  const files = fs.readdirSync(ormTemplate);
  for (const file of files) {
    if (file === "deps.json" || file === ".env.fragment") continue;
    const src = path.join(ormTemplate, file);
    const dest = path.join(serverDir, file);
    fs.copySync(src, dest, { overwrite: false });
  }

  mergeDeps(ormTemplate, serverPkg);

  // Dynamic Wiring for Prisma
  if (orm === "prisma") {
    const indexFile = config.language === "typescript" ? "index.ts" : "index.js";
    const content = config.language === "typescript"
      ? `import { PrismaClient } from "@prisma/client";\n\nexport const prisma = new PrismaClient();\n`
      : `const { PrismaClient } = require("@prisma/client");\n\nconst prisma = new PrismaClient();\n\nmodule.exports = { prisma };\n`;
    fs.writeFileSync(path.join(serverDir, "db", indexFile), content, "utf-8");
  }

  // Dynamic Wiring for Drizzle
  if (orm === "drizzle") {
    const indexFile = config.language === "typescript" ? "index.ts" : "index.js";
    const indexPath = path.join(serverDir, "db", indexFile);
    if (fs.existsSync(indexPath)) {
      let content = fs.readFileSync(indexPath, "utf-8");
      
      const provider = database.provider || "local";
      let importStr = "";
      let wrapStr = "";

      if (config.language === "typescript") {
        if (database.type === "postgres") {
          if (provider === "neon") {
            importStr = `import { drizzle } from "drizzle-orm/neon-http";\nimport * as schema from "./schema";\n`;
            wrapStr = `\nexport const db = drizzle(sql, { schema });\n`;
          } else {
            importStr = `import { drizzle } from "drizzle-orm/node-postgres";\nimport * as schema from "./schema";\n`;
            wrapStr = `\nexport const db = drizzle(pool, { schema });\n`;
          }
        } else if (database.type === "mysql") {
          importStr = `import { drizzle } from "drizzle-orm/mysql2";\nimport * as schema from "./schema";\n`;
          wrapStr = `\nexport const db = drizzle(pool, { schema, mode: "default" });\n`;
        } else if (database.type === "sqlite") {
          if (provider === "turso") {
            importStr = `import { drizzle } from "drizzle-orm/libsql";\nimport * as schema from "./schema";\n`;
            wrapStr = `\nexport const dbInstance = drizzle(db, { schema });\n`;
          } else {
            importStr = `import { drizzle } from "drizzle-orm/better-sqlite3";\nimport * as schema from "./schema";\n`;
            wrapStr = `\nexport const dbInstance = drizzle(db, { schema });\n`;
          }
        }
      } else { // javascript
        if (database.type === "postgres") {
          if (provider === "neon") {
            importStr = `const { drizzle } = require("drizzle-orm/neon-http");\nconst schema = require("./schema");\n`;
            wrapStr = `\nconst dbInstance = drizzle(sql, { schema });\nmodule.exports.db = dbInstance;\n`;
          } else {
            importStr = `const { drizzle } = require("drizzle-orm/node-postgres");\nconst schema = require("./schema");\n`;
            wrapStr = `\nconst dbInstance = drizzle(pool, { schema });\nmodule.exports.db = dbInstance;\n`;
          }
        } else if (database.type === "mysql") {
          importStr = `const { drizzle } = require("drizzle-orm/mysql2");\nconst schema = require("./schema");\n`;
          wrapStr = `\nconst dbInstance = drizzle(pool, { schema, mode: "default" });\nmodule.exports.db = dbInstance;\n`;
        } else if (database.type === "sqlite") {
          if (provider === "turso") {
            importStr = `const { drizzle } = require("drizzle-orm/libsql");\nconst schema = require("./schema");\n`;
            wrapStr = `\nconst dbInstance = drizzle(db, { schema });\nmodule.exports.dbInstance = dbInstance;\n`;
          } else {
            importStr = `const { drizzle } = require("drizzle-orm/better-sqlite3");\nconst schema = require("./schema");\n`;
            wrapStr = `\nconst dbInstance = drizzle(db, { schema });\nmodule.exports.dbInstance = dbInstance;\n`;
          }
        }
      }

      content = importStr + content + wrapStr;
      fs.writeFileSync(indexPath, content, "utf-8");
    }
  }
}

// ─── Auth Layer ──────────────────────────────────────────────────────────────

function scaffoldAuth(projectPath, config) {
  const { auth, language, backend } = config;

  if (!auth || auth === "none") return;

  const authTemplate = path.join(CUSTOM_TEMPLATES, "auth", auth, language);
  const targetDir = backend === "none"
    ? path.join(projectPath, "client")
    : path.join(projectPath, "server");
  const targetPkg = path.join(targetDir, "package.json");
  const envPath = path.join(targetDir, ".env.example");

  if (!fs.existsSync(authTemplate)) {
    logger.warn(`⚠️  No auth template for ${auth}/${language}.`);
    return;
  }

  logger.info(`🔐 Adding ${auth} auth configuration...`);

  const files = fs.readdirSync(authTemplate);
  for (const file of files) {
    if (file === "deps.json" || file === ".env.fragment") continue;
    fs.copySync(path.join(authTemplate, file), path.join(targetDir, file), { overwrite: false });
  }

  mergeDeps(authTemplate, targetPkg);
  mergeEnv(authTemplate, envPath);
}

// ─── API Layer ───────────────────────────────────────────────────────────────

function scaffoldAPI(projectPath, config) {
  const { api, language, backend } = config;

  if (!api || api === "none" || backend === "none") return;

  const apiTemplate = path.join(CUSTOM_TEMPLATES, "api", api, language);
  const serverDir = path.join(projectPath, "server");
  const serverPkg = path.join(serverDir, "package.json");

  if (!fs.existsSync(apiTemplate)) {
    logger.warn(`⚠️  No API template for ${api}/${language}.`);
    return;
  }

  logger.info(`🔌 Adding ${api} API layer...`);

  const files = fs.readdirSync(apiTemplate);
  for (const file of files) {
    if (file === "deps.json" || file === ".env.fragment") continue;
    fs.copySync(path.join(apiTemplate, file), path.join(serverDir, file), { overwrite: false });
  }

  mergeDeps(apiTemplate, serverPkg);
}

// ─── Addons ──────────────────────────────────────────────────────────────────

function scaffoldAddons(projectPath, config) {
  const { addons } = config;

  if (!addons || addons.length === 0) return;

  for (const addon of addons) {
    // Nx requires special handling — not a simple file copy
    if (addon === "nx") {
      logger.info("🧩 Initializing Nx monorepo...");
      try {
        execSync("npx -y nx@latest init --no-interactive", {
          cwd: projectPath, stdio: "inherit", shell: true,
        });
      } catch {
        logger.warn("⚠️  Nx initialization failed. You can run 'npx nx init' manually.");
      }
      continue;
    }

    const addonTemplate = path.join(CUSTOM_TEMPLATES, "addons", addon);

    if (!fs.existsSync(addonTemplate)) {
      logger.warn(`⚠️  No addon template for "${addon}".`);
      continue;
    }

    logger.info(`🧩 Adding ${addon} addon...`);
    // Copy non-manifest files
    const files = fs.readdirSync(addonTemplate);
    for (const file of files) {
      if (file === "deps.json") continue;
      fs.copySync(path.join(addonTemplate, file), path.join(projectPath, file), { overwrite: false });
    }

    // Merge root-level deps if any
    const rootPkg = path.join(projectPath, "package.json");
    mergeDeps(addonTemplate, rootPkg);
  }
}

// ─── Docker ──────────────────────────────────────────────────────────────────

function scaffoldDocker(projectPath, config) {
  const dockerTemplate = path.join(CUSTOM_TEMPLATES, "docker");
  if (!fs.existsSync(dockerTemplate)) return;

  const { backend, runtime } = config;
  const useBun = runtime === "bun";

  // Generate docker-compose.yml
  const composeLines = [
    'version: "3.8"',
    '',
    'services:',
    '  client:',
    '    build:',
    '      context: ./client',
    '      dockerfile: Dockerfile',
    '    ports:',
    '      - "3000:80"',
  ];

  if (backend !== "none" && backend !== "convex") {
    composeLines.push(
      '    depends_on:',
      '      - server',
      '',
      '  server:',
      '    build:',
      '      context: ./server',
      '      dockerfile: Dockerfile',
      '    ports:',
      '      - "5000:5000"',
      '    env_file:',
      '      - ./server/.env'
    );
  }

  fs.writeFileSync(path.join(projectPath, "docker-compose.yml"), composeLines.join("\n") + "\n", "utf-8");

  // Server Dockerfile (runtime-aware)
  if (backend !== "none" && backend !== "convex") {
    const serverDockerfile = path.join(dockerTemplate, "Dockerfile.server");
    if (fs.existsSync(serverDockerfile)) {
      let df = fs.readFileSync(serverDockerfile, "utf-8");
      df = df.replace(/\{\{BASE_IMAGE\}\}/g, useBun ? "oven/bun:alpine" : "node:20-alpine");
      df = df.replace(/\{\{INSTALL_CMD\}\}/g, useBun ? "bun install" : "npm install");
      df = df.replace(/\{\{START_CMD\}\}/g, useBun ? "bun server.js" : "node server.js");
      fs.writeFileSync(path.join(projectPath, "server", "Dockerfile"), df, "utf-8");
    }

    const dockerignore = path.join(dockerTemplate, ".dockerignore");
    if (fs.existsSync(dockerignore)) {
      fs.copySync(dockerignore, path.join(projectPath, "server", ".dockerignore"));
    }
  }

  // Client Dockerfile
  const clientDockerfile = path.join(dockerTemplate, "Dockerfile.client");
  const clientDir = path.join(projectPath, "client");
  if (fs.existsSync(clientDockerfile) && fs.existsSync(clientDir)) {
    let df = fs.readFileSync(clientDockerfile, "utf-8");
    df = df.replace(/\{\{BASE_IMAGE\}\}/g, useBun ? "oven/bun:alpine" : "node:20-alpine");
    df = df.replace(/\{\{INSTALL_CMD\}\}/g, useBun ? "bun install" : "npm install");
    df = df.replace(/\{\{BUILD_CMD\}\}/g, useBun ? "bun run build" : "npm run build");
    fs.writeFileSync(path.join(clientDir, "Dockerfile"), df, "utf-8");
  }

  logger.info("🐳 Added Docker configuration...");
}

// ─── Main Entry ──────────────────────────────────────────────────────────────

/**
 * Orchestrates the full custom stack scaffolding process.
 */
export async function scaffoldCustomStack(projectPath, projectName, config, installDeps) {
  // 0. Root project files (package.json workspaces, .gitignore, README)
  scaffoldRoot(projectPath, projectName, config);

  // 1. Frontend
  scaffoldFrontend(projectPath, config);

  // 2. Backend
  scaffoldBackend(projectPath, config);

  // 3. Database (with provider dimension)
  scaffoldDatabase(projectPath, config);

  // 4. ORM
  scaffoldORM(projectPath, config);

  // 5. Auth
  scaffoldAuth(projectPath, config);

  // 6. API
  scaffoldAPI(projectPath, config);

  // 7. Addons
  scaffoldAddons(projectPath, config);

  // 8. Docker (runtime-aware)
  scaffoldDocker(projectPath, config);

  // 9. Install dependencies
  if (installDeps) {
    const installCmd = getInstallCommand(config.packageManager);

    // Server deps
    const serverDir = path.join(projectPath, "server");
    if (config.backend !== "none" && config.backend !== "convex" && fs.existsSync(serverDir)) {
      logger.info("📦 Installing server dependencies...");
      execSync(`${config.packageManager} install`, {
        cwd: serverDir, stdio: "inherit", shell: true,
      });
    }

    // Client deps
    const clientDir = path.join(projectPath, "client");
    if (fs.existsSync(clientDir)) {
      logger.info("📦 Installing client dependencies...");
      execSync(`${config.packageManager} install`, {
        cwd: clientDir, stdio: "inherit", shell: true,
      });
    }
  }

  // 10. Save config
  fs.writeJsonSync(path.join(projectPath, "celtrix.config.json"), config, { spaces: 2 });

  logger.success("✅ Custom stack scaffolded successfully!");
}
