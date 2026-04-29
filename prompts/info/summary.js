import chalk from "chalk";
import gradient from "gradient-string";
import boxen from "boxen";
import { formatElapsed } from "./formatElapsed.js";
import { getStackMeta } from "../stable/getStackMeta.js";

const successGradient = gradient(["#00b09b", "#96c93d"]);

export function showSummaryBox({ projectName, config, installedDeps, elapsed }) {
  const isCustom = config.stack === "custom";
  const { frontend, backend } = isCustom
    ? { frontend: config.frontend, backend: config.backend }
    : getStackMeta(config.stack);

  const pad = 14;
  const row = (label, value) => `  ${chalk.bold(label.padEnd(pad))} ${chalk.gray('│')} ${value}`;

  const lines = [
    row("Project", chalk.greenBright(projectName)),
    row("Stack", chalk.cyanBright(isCustom ? "Custom" : config.stack)),
    row("Language", chalk.yellow(config.language)),
    ...(frontend && frontend !== "none" ? [row("Frontend", chalk.blueBright(frontend))] : []),
    ...(backend && backend !== "none"   ? [row("Backend", chalk.magentaBright(backend))] : []),
    row("Runtime", config.runtime === 'bun' ? chalk.white("Bun") : chalk.greenBright("Node.js")),
    row("Pkg Manager", chalk.magenta(config.packageManager)),
  ];

  // Custom-stack expanded fields
  if (isCustom) {
    if (config.database && config.database.type !== "none") {
      const dbVal = config.database.provider
        ? `${config.database.type} ${chalk.gray("via")} ${config.database.provider}`
        : config.database.type;
      lines.push(row("Database", chalk.cyanBright(dbVal)));
    }
    if (config.orm && config.orm !== "none")     lines.push(row("ORM", chalk.greenBright(config.orm)));
    if (config.api && config.api !== "none")     lines.push(row("API", chalk.blueBright(config.api)));
    if (config.auth && config.auth !== "none")   lines.push(row("Auth", chalk.magentaBright(config.auth)));
    if (config.addons && config.addons.length > 0) lines.push(row("Add-ons", chalk.yellow(config.addons.join(", "))));
  }

  lines.push(
    "",
    row("Dependencies", installedDeps ? chalk.greenBright("✔ Installed") : chalk.gray("⊘ Skipped")),
    row("Time", chalk.white(formatElapsed(elapsed))),
  );

  console.log("");
  console.log(
    boxen(lines.join("\n"), {
      padding: { top: 1, bottom: 1, left: 3, right: 5 },
      margin: { left: 1, bottom: 0 },
      borderColor: "greenBright",
      borderStyle: "round",
      title: successGradient(" ✔ Project Created Successfully "),
    })
  );

  // Next Steps section
  console.log("");
  console.log(chalk.gray("  ") + chalk.white.bold("  Next steps:"));
  console.log("");
  console.log(chalk.gray("  ") + chalk.gray("  $") + chalk.cyanBright(` cd ${projectName}`));
  if (!installedDeps) {
    console.log(chalk.gray("  ") + chalk.gray("  $") + chalk.cyanBright(` ${config.packageManager} install`));
  }
  console.log(chalk.gray("  ") + chalk.gray("  $") + chalk.cyanBright(` ${config.packageManager} run dev`));
  console.log("");
  console.log(chalk.gray("  ✨ Made with ❤️  by Celtrix ✨\n"));
}