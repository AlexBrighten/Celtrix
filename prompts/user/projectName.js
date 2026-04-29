import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import ora from "ora";
import boxen from "boxen";
import fs from "fs";
import path from "path";

const orange = chalk.hex("#FF6200");

export async function askProjectName() {
  const { projectName } = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: chalk.cyan("📦 Enter your project name:"),
      validate: (input) => {
        if (!input.trim()) return chalk.red("Project name is required!");
        if (!/^[a-zA-Z0-9-_]+$/.test(input)) {
          return chalk.red(
            "Only letters, numbers, hyphens, and underscores are allowed."
          );
        }
        return true;
      },
    },
  ]);
  return projectName;
}