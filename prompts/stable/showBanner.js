import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";

// Custom gradient theme
const celtrixGradient = gradient(["#00F2FE", "#4FACFE", "#667EEA"]);

export function showBanner() {
  const banner = figlet.textSync("Celtrix", {
    font: "ANSI Shadow",
    horizontalLayout: "fitted",
    verticalLayout: "default",
  });

  console.log("");
  console.log(celtrixGradient(banner));
  console.log("");
  console.log(
    chalk.gray("  ") +
    celtrixGradient("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  );
  console.log(
    chalk.gray("  ") +
    chalk.white.bold("  ⚡ ") +
    chalk.gray("Setup Web-apps in seconds, not hours") +
    chalk.white.bold(" ⚡")
  );
  console.log(
    chalk.gray("  ") +
    celtrixGradient("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  );
  console.log("");
}