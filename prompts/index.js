import inquirer from "inquirer";
import chalk from "chalk";
import boxen from "boxen";
import gradient from "gradient-string";
import { askLanguage } from "./web-parts/language.js";
import { askFrontend } from "./web-parts/frontend.js";
import { askBackend } from "./web-parts/backend.js";
import { askRuntime } from "./web-parts/runtime.js";
import { askDatabase } from "./web-parts/database.js";
import { askORM } from "./web-parts/orm.js";
import { askAPI } from "./web-parts/api.js";
import { askAuth } from "./web-parts/auth.js";
import { askAddons } from "./web-parts/addons.js";

const TOTAL_STEPS = 10;

/**
 * Builds a dim step label like "[3/10]" for prompt prefixes.
 *
 * @param {number} n - Current step.
 * @returns {string}
 */
function step(n) {
  return chalk.dim(`[${n}/${TOTAL_STEPS}]`);
}

/**
 * Renders a styled confirmation box showing all selections at a glance.
 *
 * @param {object} config - Gathered config object.
 */
function showConfirmationSummary(config) {
  const pad = 12;
  const row = (label, value, color) =>
    value && value !== "none"
      ? `  ${color("●")}  ${chalk.bold(label.padEnd(pad))} ${chalk.gray('│')} ${color(value)}`
      : null;

  const lines = [
    row("Language", config.language, chalk.yellowBright),
    row("Frontend", config.frontend, chalk.cyanBright),
    row("Backend", config.backend, chalk.magentaBright),
    row("Runtime", config.runtime === "bun" ? "Bun" : "Node.js", chalk.greenBright),
  ];

  if (config.database.type !== "none") {
    const dbVal = config.database.provider
      ? `${config.database.type} ${chalk.gray("via")} ${config.database.provider}`
      : config.database.type;
    lines.push(`  ${chalk.hex("#00F2FE")("●")}  ${chalk.bold("Database".padEnd(pad))} ${chalk.gray('│')} ${chalk.hex("#00F2FE")(dbVal)}`);
  }

  lines.push(
    row("ORM", config.orm, chalk.greenBright),
    row("API", config.api, chalk.blueBright),
    row("Auth", config.auth, chalk.hex("#E040FB")),
  );

  if (config.addons.length > 0) {
    lines.push(`  ${chalk.yellow("●")}  ${chalk.bold("Add-ons".padEnd(pad))} ${chalk.gray('│')} ${chalk.yellow(config.addons.join(", "))}`);
  }

  console.log("");
  console.log(
    boxen(lines.filter(Boolean).join("\n"), {
      padding: { top: 1, bottom: 1, left: 2, right: 4 },
      margin: { left: 1, bottom: 1 },
      borderColor: "blueBright",
      borderStyle: "round",
      title: gradient(["#667EEA", "#764BA2"])(" ✦ Your Custom Stack ✦ "),
    })
  );
}

/**
 * Orchestrates all custom-stack prompts in the correct order, applying
 * conditional logic (e.g. skip ORM when no DB, skip API type when no backend).
 *
 * Features step numbering, a language prompt, and a confirmation gate.
 *
 * @returns {Promise<{
 *   language: string,
 *   frontend: string,
 *   backend: string,
 *   runtime: string,
 *   database: { type: string, provider: string },
 *   orm: string,
 *   api: string,
 *   auth: string,
 *   addons: string[]
 * }>}
 */
export async function gatherCustomConfig() {
  // This outer loop allows the user to re-do selections if they reject
  // the confirmation prompt.
  while (true) {
    // 1. Language
    const { language } = await askLanguage(step(1));

    // 2. Frontend
    const { frontend } = await askFrontend(step(2));

    // 3. Backend
    const { backend } = await askBackend(step(3));
    if (backend === "none") {
      console.log(chalk.yellow("   ⚠️  No backend selected — this will be a frontend-only project."));
    }

    // 4. Runtime
    const { runtime } = await askRuntime(step(4));

    // 5. Database (includes conditional provider/setup prompt)
    let database = { type: "none" };
    if (backend === "convex") {
      console.log(chalk.gray(`   ${step(5)} Database selection skipped ${chalk.dim("(managed by Convex)")}`));
    } else {
      const dbResult = await askDatabase(step(5));
      database = dbResult.database;
    }

    // 6. ORM — skip when no database is selected or Convex is used
    let orm = "none";
    if (backend === "convex") {
      console.log(chalk.gray(`   ${step(6)} ORM selection skipped ${chalk.dim("(managed by Convex)")}`));
    } else if (database.type !== "none") {
      const ormResult = await askORM(step(6));
      orm = ormResult.orm;
    } else {
      console.log(chalk.gray(`   ${step(6)} ORM selection skipped ${chalk.dim("(no database)")}`));
    }

    // 7. API type — skip when no backend is selected
    let api = "none";
    if (backend !== "none") {
      const apiResult = await askAPI(step(7));
      api = apiResult.api;
    } else {
      console.log(chalk.gray(`   ${step(7)} API type selection skipped ${chalk.dim("(no backend)")}`));
    }

    // 8. Auth provider
    let auth = "none";
    if (backend === "none" || backend === "convex") {
      console.log(chalk.gray(`   ${step(8)} Auth selection skipped ${chalk.dim(`(${backend === "none" ? "no backend" : "managed by Convex"})`)}`));
    } else {
      const authResult = await askAuth(step(8));
      auth = authResult.auth;
    }

    // 9. Add-ons (multi-select)
    const { addons } = await askAddons(step(9));

    const config = { language, frontend, backend, runtime, database, orm, api, auth, addons };

    // 10. Confirmation
    showConfirmationSummary(config);

    const { confirmed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message: chalk.bold(`${step(10)} Proceed with this configuration?`),
        default: true,
      },
    ]);

    if (confirmed) {
      return config;
    }

    // User rejected — loop back and re-do selections
    console.log(chalk.yellow("\n🔄 Let's try again!\n"));
  }
}
