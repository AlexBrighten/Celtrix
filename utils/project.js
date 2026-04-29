import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import boxen from "boxen";
import { logger } from "./logger.js";
import { copyTemplates, scaffoldFromCustomTemplate } from "./templateManager.js";
import { HonoReactSetup, mernTailwindSetup, installDependencies, mernSetup, serverAuthSetup, serverSetup, mevnSetup, mevnTailwindAuthSetup, nextSetup } from "./installer.js";
import { angularSetup, angularTailwindSetup } from "./installer.js";
import { scaffoldCustomStack } from "./customScaffolder.js";

export async function setupProject(projectName, config, installDeps) {
  const projectPath = path.join(process.cwd(), projectName);

  if (fs.existsSync(projectPath)) {
    logger.error(`❌ Directory ${chalk.red(projectName)} already exists`);
    process.exit(1);
  }

  fs.mkdirSync(projectPath);

  // --- Pretty Project Config (Boxed) ---
  const isCustom = config.stack === "custom";

  const configLines = [
    `${chalk.bold("🌐 Stack:")}  ${chalk.green(isCustom ? "Custom" : config.stack)}`,
    `${chalk.bold("📦 Project Name:")}  ${chalk.blue(projectName)}`,
  ];

  if (isCustom) {
    configLines.push(`${chalk.bold("📖 Language:")}  ${chalk.yellowBright(config.language)}`);
    if (config.frontend)                            configLines.push(`${chalk.bold("🎨 Frontend:")}  ${chalk.cyanBright(config.frontend)}`);
    if (config.backend && config.backend !== "none") configLines.push(`${chalk.bold("⚙️  Backend:")}  ${chalk.magentaBright(config.backend)}`);
    if (config.database && config.database.type !== "none") {
      configLines.push(`${chalk.bold("🗄️  Database:")}  ${chalk.cyanBright(config.database.type)}${config.database.provider ? chalk.gray(" via ") + chalk.white(config.database.provider) : ""}`);
    }
    if (config.orm && config.orm !== "none")         configLines.push(`${chalk.bold("🔗 ORM:")}  ${chalk.greenBright(config.orm)}`);
    if (config.api && config.api !== "none")         configLines.push(`${chalk.bold("🔌 API:")}  ${chalk.blueBright(config.api)}`);
    if (config.auth && config.auth !== "none")       configLines.push(`${chalk.bold("🔐 Auth:")}  ${chalk.magentaBright(config.auth)}`);
    if (config.addons && config.addons.length > 0)   configLines.push(`${chalk.bold("🧩 Add-ons:")}  ${chalk.yellow(config.addons.join(", "))}`);
  } else {
    configLines.push(`${chalk.bold("📖 Language:")}  ${chalk.red(config.language)}`);
  }

  configLines.push(
    `${chalk.bold("⚡ Runtime:")}  ${config.runtime === 'bun' ? chalk.white('Bun') : chalk.greenBright('Node.js')}`,
    `${chalk.bold("📦 Package Manager:")}  ${chalk.magenta(config.packageManager)}`,
  );

  console.log(
    boxen(configLines.join("\n"), {
      padding: 1,
      margin: 1,
      borderColor: "cyan",
      borderStyle: "round",
      title: chalk.cyanBright("📋 Project Configuration"),
      titleAlignment: "center",
    })
  );

  // --- Copy & Install ---

  try {
    if (isCustom) {
      logger.info("📋 Scaffolding custom stack project...");
      await scaffoldCustomStack(projectPath, projectName, config, installDeps);
    }

    else if (config.stack.startsWith("custom-template:")) {
      const templateName = config.stack.split(":")[1];
      scaffoldFromCustomTemplate(projectPath, templateName);
      
      // Update package.json name if it exists
      const pkgPath = path.join(projectPath, "package.json");
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = fs.readJsonSync(pkgPath);
          pkg.name = projectName;
          fs.writeJsonSync(pkgPath, pkg, { spaces: 2 });
          logger.info(`📝 Updated package.json name to ${projectName}`);
        } catch (err) {
          logger.warn(`⚠️ Could not update package.json: ${err.message}`);
        }
      }
    }

    else if (config.stack === "mern") {
      mernSetup(projectPath, config, projectName, installDeps);
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName, false, []);
    }

    else if (config.stack === 'mevn') {
      mevnSetup(projectPath, config, projectName, installDeps);
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName, false, []);
    }

    else if (config.stack === "mean") {
      angularSetup(projectPath, config, projectName, installDeps);
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName);
    }

    else if (config.stack === "mern+tailwind+auth") {
      mernSetup(projectPath, config, projectName, installDeps);
      copyTemplates(projectPath, config);
      mernTailwindSetup(projectPath, config, projectName);
      serverAuthSetup(projectPath, config, projectName, installDeps);
    }

    else if (config.stack === 'mevn+tailwind+auth') {
      mevnTailwindAuthSetup(projectPath, config, projectName, installDeps);
      copyTemplates(projectPath, config);
      serverAuthSetup(projectPath, config, projectName, installDeps);
    }

    else if (config.stack === "mean+tailwind+auth") {
      angularTailwindSetup(projectPath, config, projectName);
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName);
      serverAuthSetup(projectPath, config, projectName, installDeps);
    }

    else if (config.stack === "react+tailwind+firebase") {
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName);
    }

    else if (config.stack === "hono") {
      HonoReactSetup(projectPath, config, projectName, installDeps);
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName, false);
    }

    else if (config.stack === 'nextjs') {
      nextSetup(projectPath, config, projectName);
      copyTemplates(projectPath, config);
      logger.info("✅ Next.js project created successfully!");
    }
  } catch (error) {
    // Clean up the created directory on failure
    logger.error(`❌ Scaffolding failed: ${error.message}`);
    logger.debug(`Cleaning up ${projectPath}...`);
    try {
      fs.removeSync(projectPath);
      logger.debug("Cleanup complete.");
    } catch {
      logger.debug("Cleanup failed — directory may need manual removal.");
    }
    throw error;
  }

  // --- Success + Next Steps ---
  console.log(chalk.gray("-------------------------------------------"));
  console.log(`${chalk.greenBright(`✅ Project ${chalk.bold.yellow(`${projectName}`)} created successfully! 🎉`)}`);
  console.log(chalk.gray("-------------------------------------------"));
  console.log(chalk.cyan("👉 Next Steps:\n"));

  // Provide package-manager commands for dev/start
  const cmd = (script) => {
    const useBunRuntime = config.runtime === 'bun';
    switch (config.packageManager) {
      case "yarn":
        return `yarn ${script === "dev" ? "dev" : (useBunRuntime ? "bun server.js" : "node server.js")}`;
      case "pnpm":
        return script === "dev" ? "pnpm run dev" : (useBunRuntime ? "bun server.js" : "node server.js");
      case "bun":
        return `bun ${script === "dev" ? "run dev" : "server.js"}`;
      case "npm":
      default:
        return script === "dev" ? "npm run dev" : (useBunRuntime ? "bun server.js" : "npm start");
    }
  };

  if (isCustom) {
    console.log(`   ${chalk.yellow("cd")} ${projectName} && ${chalk.green(cmd("dev"))}`);
    if (config.database && config.database.type !== "none") {
      console.log(`   ${chalk.gray("📝 Configure your database connection in .env (see .env.example)")}`);
    }
    if (config.auth && config.auth !== "none") {
      console.log(`   ${chalk.gray(`📝 Configure your ${config.auth} credentials in .env`)}`);
    }
  } else if (config.stack === "mean" || config.stack === "mean+tailwind+auth") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client && ${chalk.green(cmd("start"))}`);
    console.log(`   ${chalk.yellow("cd")} ${projectName}/server && ${chalk.green(cmd("start"))}`);
  } else if (config.stack === "nextjs") {
    console.log(`   ${chalk.yellow("cd")} ${projectName} && ${chalk.green(cmd("dev"))}`);
  } else if (config.stack === "react+tailwind+firebase") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client && ${chalk.green(cmd("dev"))}`);
    console.log(`   ${chalk.gray("📝 Don't forget to configure your Firebase project in .env file!")}`);
  } else if (config.stack === "hono") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client && ${chalk.green(cmd("dev"))}`);
    console.log(`   ${chalk.yellow("cd")} ${projectName}/server && ${chalk.green(cmd("dev"))}`);
  } else {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client && ${chalk.green(cmd("dev"))}`);
    console.log(`   ${chalk.yellow("cd")} ${projectName}/server && ${chalk.green(cmd("start"))}`);
  }

  console.log(chalk.gray("-------------------------------------------"));
  console.log(chalk.gray("\n✨ Made with ❤️  by Celtrix ✨\n"));
}
