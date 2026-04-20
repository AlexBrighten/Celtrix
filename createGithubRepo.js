import { execSync } from "child_process";

export async function createGithubRepo(projectName) {
  try {
    console.log("\n🔍 Checking GitHub CLI...\n");

    // 1. Check if gh is installed
    try {
      execSync("gh --version", { stdio: "ignore" });
    } catch {
      console.log("❌ GitHub CLI is not installed.");
      console.log("👉 Install it from: https://cli.github.com");
      process.exit(1);
    }

    // 2. Check if user is logged in
    console.log("🔐 Checking GitHub authentication...\n");
    try {
      execSync("gh auth status", { stdio: "inherit" });
    } catch {
      console.log("\n❌ You are not logged into GitHub.");
      console.log("👉 Run: gh auth login");
      process.exit(1);
    }

    // 3. Initialize git (only if not already initialized)
    console.log("\n⚙ Setting up Git...\n");
    try {
      execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
      console.log("✔ Git already initialized");
    } catch {
      execSync("git init", { stdio: "inherit" });
      console.log("✔ Git initialized");
    }

    // 4. Add and commit
    execSync("git add .", { stdio: "inherit" });

    try {
      execSync('git commit -m "Initial commit"', { stdio: "inherit" });
    } catch {
      console.log("⚠ Nothing to commit (might already be committed)");
    }

    // 5. Create GitHub repo and push
    console.log("\n🚀 Creating GitHub repository...\n");

    execSync(
      `gh repo create ${projectName} --public --source=. --remote=origin --push`,
      { stdio: "inherit" }
    );

    console.log(`\n🌍 Repository created successfully!`);
    console.log(`👉 https://github.com/<your-username>/${projectName}\n`);

  } catch (err) {
    console.error("\n❌ Failed to create GitHub repository");
    console.error(err.message);
    process.exit(1);
  }
}