import { mkdirSync, realpathSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const requireFromHelper = createRequire(import.meta.url);

function linkIntoNodeModules(target: string, destination: string) {
  mkdirSync(path.dirname(destination), { recursive: true });
  symlinkSync(realpathSync(target), destination, "dir");
}

function resolveExternalPackageDirectory(packageName: string): string {
  const packageJsonPath = requireFromHelper.resolve(`${packageName}/package.json`);
  return path.dirname(packageJsonPath);
}

export function linkFixturePackages(fixtureDir: string, repoRoot: string, packageNames: string[]) {
  const nodeModulesDir = path.join(fixtureDir, "node_modules");
  mkdirSync(nodeModulesDir, { recursive: true });

  for (const packageName of packageNames) {
    if (packageName.startsWith("@bunli/")) {
      const packageDir = packageName.slice("@bunli/".length);
      linkIntoNodeModules(
        path.join(repoRoot, "packages", packageDir),
        path.join(nodeModulesDir, "@bunli", packageDir),
      );
      continue;
    }

    linkIntoNodeModules(
      resolveExternalPackageDirectory(packageName),
      path.join(nodeModulesDir, packageName),
    );
  }
}
