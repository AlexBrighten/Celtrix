import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import ora from "ora";
import boxen from "boxen";
import fs from "fs";
import path from "path";

export function getStackMeta(stack) {
  const meta = {
    "mern":                    { frontend: "React",   backend: "Express" },
    "mean":                    { frontend: "Angular", backend: "Express" },
    "mevn":                    { frontend: "Vue",     backend: "Express" },
    "mern+tailwind+auth":      { frontend: "React",   backend: "Express" },
    "mean+tailwind+auth":      { frontend: "Angular", backend: "Express" },
    "mevn+tailwind+auth":      { frontend: "Vue",     backend: "Express" },
    "react+tailwind+firebase": { frontend: "React",   backend: null },
    "nextjs":                  { frontend: "Next.js", backend: null },
    "hono":                    { frontend: "React",   backend: "Hono" },
  };
  return meta[stack] || { frontend: null, backend: null };
}