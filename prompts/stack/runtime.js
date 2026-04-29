import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import ora from "ora";
import boxen from "boxen";
import fs from "fs";
import path from "path";

export async function askRuntimeEnvironment() {
  return await inquirer.prompt([
    {
      type: "list",
      name: "runtime",
      message: "Select a runtime environment:",
      choices: [
        { name: chalk.greenBright.bold("Node.js"), value: "node" },
        { name: chalk.white.bold("Bun"), value: "bun" },
      ],
      default: "node",
    },
  ]);
}