
import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import ora from "ora";
import boxen from "boxen";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createProject } from "./commands/scaffold.js";
import { loginCommand } from "./commands/login.js";
import { gatherCustomConfig } from "./prompts/index.js";
import { isPromptCancellation } from "./utils/shared.js";
import { askStackQuestions } from "./prompts/stack/stack.js";
import { askProjectName } from "./prompts/user/projectName.js";
import { showBanner } from "./prompts/stable/showBanner.js";
import { getStackMeta } from "./prompts/stable/getStackMeta.js";
import { askRuntimeEnvironment } from "./prompts/stack/runtime.js";
import { askPackageManager } from "./prompts/common/askPackageManager.js";
import { showVersion } from "./prompts/info/showVersion.js";
import { showHelp } from "./prompts/info/showHelp.js";
import { formatElapsed } from "./prompts/info/formatElapsed.js";
import { showSummaryBox } from "./prompts/info/summary.js";
import { parseArgs } from "./prompts/stable/parseArgs.js";
import { detectPackageManager } from "./prompts/stable/detectPackageManager.js";
import { getCustomTemplates, addCustomTemplate, removeCustomTemplate } from "./utils/templateManager.js";

const orange = chalk.hex("#FF6200");

const quickTemplates = {
  "mern-js": { stack: "mern", language: "javascript" },
  "mern-ts": { stack: "mern", language: "typescript" }
};


const isVerbose = process.argv.includes("--verbose");

async function main() {
  const args = parseArgs();

  // Handle version flag
  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    process.exit(0);
  }

  // Handle help flag
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('login')) {
    await loginCommand();
    process.exit(0);
  }

  if (args.includes('template')) {
    const action = args[args.indexOf('template') + 1];
    if (action === 'add') {
      const name = args[args.indexOf('add') + 1];
      const source = args[args.indexOf('add') + 2];
      if (!name || !source) {
        console.log(chalk.red('❌ Please provide both name and source.'));
        console.log(chalk.gray('Usage: celtrix template add <name> <source>'));
        process.exit(1);
      }
      try {
        addCustomTemplate(name, source);
        console.log(chalk.green(`✅ Template "${name}" added successfully.`));
      } catch (err) {
        console.log(chalk.red(`❌ Error: ${err.message}`));
      }
    } else if (action === 'list') {
      const templates = getCustomTemplates();
      if (templates.length === 0) {
        console.log(chalk.yellow('No custom templates found.'));
      } else {
        console.log(chalk.cyan('\n📋 Custom Templates:'));
        templates.forEach(t => {
          console.log(`${chalk.bold(t.name)}: ${chalk.gray(t.source)}`);
        });
        console.log('');
      }
    } else if (action === 'remove') {
      const name = args[args.indexOf('remove') + 1];
      if (!name) {
        console.log(chalk.red('❌ Please provide the template name to remove.'));
        process.exit(1);
      }
      try {
        removeCustomTemplate(name);
        console.log(chalk.green(`✅ Template "${name}" removed successfully.`));
      } catch (err) {
        console.log(chalk.red(`❌ Error: ${err.message}`));
      }
    } else {
      console.log(chalk.cyan('\n📋 Template Commands:'));
      console.log(`  add <name> <source>   ${chalk.gray('Add a new custom template')}`);
      console.log(`  list                  ${chalk.gray('List all custom templates')}`);
      console.log(`  remove <name>         ${chalk.gray('Remove a custom template')}`);
      console.log('');
    }
    process.exit(0);
  }

  showBanner();

  let projectName = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));
  let packageManager = detectPackageManager();
  let config;
  const quickKey = args[0];
  let isQuick = false;
  let quickConfig = null;

  if (quickTemplates[quickKey]) {
    isQuick = true;
    quickConfig = quickTemplates[quickKey];
  }

  try {

    if (isQuick) {
      // QUICK MODE (mern-js / mern-ts)
      console.log(chalk.green(`⚡ Using quick template: ${quickKey}`));

      projectName = args[1] || (await askProjectName());

      packageManager = (await askPackageManager()).packageManager;
      const runtimeAnswers = await askRuntimeEnvironment();

      config = {
        stack: quickConfig.stack,       // always mern
        language: quickConfig.language, // js or ts
        projectName,
        packageManager,
        runtime: runtimeAnswers.runtime
      };

    } else {
      // NORMAL MODE
      if (!projectName) {
        projectName = await askProjectName();
      }

      const stackAnswers = await askStackQuestions();

      if (stackAnswers.stack === "custom") {
        // ── Custom Stack Flow ──
        console.log(chalk.gray("\n── Customise your tech stack ──\n"));
        const customConfig = await gatherCustomConfig();
        packageManager = (await askPackageManager()).packageManager;
        config = { stack: "custom", ...customConfig, projectName, packageManager };
      } else {
        // ── Preset Stack Flow ──
        const runtimeAnswers = await askRuntimeEnvironment();
        packageManager = (await askPackageManager()).packageManager;
        config = { ...stackAnswers, ...runtimeAnswers, projectName, packageManager };
      }
    }

    if (config.stack !== "custom") {
      const { backend: stackBackend } = getStackMeta(config.stack);
      if (!stackBackend) {
        console.log(chalk.yellow("⚠️ Note: This stack is frontend-only — no backend server will be created."));
      }
    }

    // Ask whether to install dependencies (handled in main script)
    const { installDeps } = await inquirer.prompt([
      {
        type: "confirm",
        name: "installDeps",
        message: "Do you want to install dependencies?",
        default: true,
      },
    ]);

    // Ask whether to initialize a git repo
    const { initGit } = await inquirer.prompt([
      {
        type: "confirm",
        name: "initGit",
        message: "Initialize a git repository?",
        default: true,
      },
    ]);

    // --- Scaffold with spinner + timing ---
    const startTime = Date.now();
    const scaffoldSpinner = ora({
      text: chalk.yellow("Scaffolding your project…"),
      spinner: "dots12",
    }).start();

    try {
      await createProject(projectName, config, installDeps);
      const elapsed = Date.now() - startTime;
      scaffoldSpinner.succeed(
        chalk.green(`Project scaffolded in ${formatElapsed(elapsed)}`)
      );
    } catch (err) {
      scaffoldSpinner.fail(chalk.red("Scaffolding failed"));
      throw err;
    }

    // --- Git init ---
    if (initGit) {
      const projectPath = path.join(process.cwd(), projectName);
      try {
        const { execSync } = await import("child_process");
        execSync("git init", { cwd: projectPath, stdio: "ignore" });
        execSync("git add .", { cwd: projectPath, stdio: "ignore" });
        execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: "ignore" });
        console.log(chalk.green("\n🎉 Git repository initialized with initial commit."));
      } catch {
        console.log(chalk.yellow("\n⚠️  Could not initialize git — you can run 'git init' manually."));
      }
    }

    // --- Summary box ---
    const totalElapsed = Date.now() - startTime;
    showSummaryBox({
      projectName,
      config,
      installedDeps: installDeps,
      elapsed: totalElapsed,
    });

  } catch (err) {
    // Graceful cancellation (Ctrl+C during any prompt)
    if (isPromptCancellation(err)) {
      console.log(chalk.yellow("\n👋 Cancelled — see you next time!\n"));
      process.exit(0);
    }

    console.log(chalk.red("❌ Error:"), err.message);
    if (isVerbose && err.stack) {
      console.log(chalk.gray(err.stack));
    }
    process.exit(1);
  }
}

main();