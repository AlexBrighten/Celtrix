import { setupProject } from "../utils/project.js";

export async function createProject(projectName, config, installDeps, spinner) {
  return await setupProject(projectName, config, installDeps, spinner);
}
