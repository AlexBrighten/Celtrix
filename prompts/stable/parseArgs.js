import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import ora from "ora";
import boxen from "boxen";
import fs from "fs";
import path from "path";

export function parseArgs() {
  // Find the exact argument that represents the CLI entry point
  const idx = process.argv.findIndex((arg, i) => {
    if (i === 0) return false;
    const basename = path.basename(arg);
    return basename === "celtrix.js" || basename === "index.js" || basename === "celtrix";
  });

  return idx !== -1 ? process.argv.slice(idx + 1) : process.argv.slice(2);
}