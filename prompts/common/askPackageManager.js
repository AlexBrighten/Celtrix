import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import ora from "ora";
import boxen from "boxen";
import fs from "fs";
import path from "path";
import { detectPackageManager } from "../stable/detectPackageManager.js";

export async function askPackageManager() {
  return await inquirer.prompt([
    {
      type: "list",
      name: "packageManager",
      message: "Choose a package manager:",
      choices: [
        { name: chalk.bold.red("npm"), value: "npm" },
        { name: chalk.bold.cyan("yarn"), value: "yarn" },
        { name: chalk.bold.yellow("pnpm"), value: "pnpm" },
        { name: chalk.bold.white("bun"), value: "bun" },
      ],
      pageSize: 10,
      default: detectPackageManager(),
    },
  ]);
}