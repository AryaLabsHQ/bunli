import path from "node:path";

import { $ } from "bun";

export const RELEASE_STATE_PATH = path.join(".bunli", "release-state.json");

export type ReleaseStepId =
  | "run-tests"
  | "update-version"
  | "build-project"
  | "publish-platform-packages"
  | "update-main-package-for-binary"
  | "generate-shim"
  | "create-git-tag"
  | "publish-npm"
  | "create-github-release";

export interface ReleaseStatePlatformInfo {
  packageName: string;
  version: string;
}

export interface ReleaseState {
  packageName: string;
  targetVersion: string;
  tag: string;
  options: {
    publishNpm: boolean;
    publishGitHub: boolean;
    binaryEnabled: boolean;
    platforms: string[];
    shimPath?: string;
  };
  status: "in_progress" | "failed";
  currentStep?: ReleaseStepId;
  completedSteps: ReleaseStepId[];
  binary?: {
    publishedPlatforms: Record<string, ReleaseStatePlatformInfo>;
  };
  lastError?: {
    step: ReleaseStepId;
    message: string;
    at: string;
  };
  createdAt: string;
  updatedAt: string;
}

export function createInitialReleaseState(input: {
  packageName: string;
  targetVersion: string;
  tag: string;
  publishNpm: boolean;
  publishGitHub: boolean;
  binaryEnabled: boolean;
  platforms: string[];
  shimPath?: string;
}): ReleaseState {
  const now = new Date().toISOString();
  return {
    packageName: input.packageName,
    targetVersion: input.targetVersion,
    tag: input.tag,
    options: {
      publishNpm: input.publishNpm,
      publishGitHub: input.publishGitHub,
      binaryEnabled: input.binaryEnabled,
      platforms: input.platforms,
      shimPath: input.shimPath,
    },
    status: "in_progress",
    completedSteps: [],
    binary: input.binaryEnabled ? { publishedPlatforms: {} } : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function isReleaseStepId(value: unknown): value is ReleaseStepId {
  return [
    "run-tests",
    "update-version",
    "build-project",
    "publish-platform-packages",
    "update-main-package-for-binary",
    "generate-shim",
    "create-git-tag",
    "publish-npm",
    "create-github-release",
  ].includes(String(value));
}

function parseReleaseState(value: unknown): ReleaseState {
  if (!value || typeof value !== "object") {
    throw new Error("Release state is not an object");
  }

  const state = value as Partial<ReleaseState> & Record<string, unknown>;

  if ("schemaVersion" in state) {
    throw new Error(
      "Legacy release state format is no longer supported. Delete .bunli/release-state.json and rerun release.",
    );
  }

  if (!state.packageName || !state.targetVersion || !state.tag) {
    throw new Error("Release state is missing packageName, targetVersion, or tag");
  }

  if (!state.options || typeof state.options !== "object") {
    throw new Error("Release state is missing options");
  }

  if (
    !Array.isArray(state.completedSteps) ||
    state.completedSteps.some((step) => !isReleaseStepId(step))
  ) {
    throw new Error("Release state has invalid completedSteps");
  }

  if (state.currentStep && !isReleaseStepId(state.currentStep)) {
    throw new Error("Release state has invalid currentStep");
  }

  if (state.status !== "in_progress" && state.status !== "failed") {
    throw new Error(`Release state has invalid status: ${String(state.status)}`);
  }

  return state as ReleaseState;
}

export async function readReleaseState(): Promise<ReleaseState | null> {
  const file = Bun.file(RELEASE_STATE_PATH);
  if (!(await file.exists())) return null;

  const raw = await file.text();
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Release state file is not valid JSON at ${RELEASE_STATE_PATH}`);
  }

  return parseReleaseState(parsed);
}

export async function writeReleaseState(state: ReleaseState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await $`mkdir -p ${path.dirname(RELEASE_STATE_PATH)}`;
  await Bun.write(RELEASE_STATE_PATH, JSON.stringify(state, null, 2) + "\n");
}

export async function clearReleaseState(): Promise<void> {
  await $`rm -f ${RELEASE_STATE_PATH}`.nothrow();
}

export function markStepStarted(state: ReleaseState, step: ReleaseStepId): void {
  state.status = "in_progress";
  state.currentStep = step;
}

export function markStepCompleted(state: ReleaseState, step: ReleaseStepId): void {
  state.currentStep = undefined;
  if (!state.completedSteps.includes(step)) {
    state.completedSteps.push(step);
  }
}

export function markStepFailed(state: ReleaseState, step: ReleaseStepId, message: string): void {
  state.status = "failed";
  state.currentStep = step;
  state.lastError = {
    step,
    message,
    at: new Date().toISOString(),
  };
}

export function markPlatformPublished(
  state: ReleaseState,
  platform: string,
  packageName: string,
  version: string,
): void {
  if (!state.binary) {
    state.binary = { publishedPlatforms: {} };
  }
  state.binary.publishedPlatforms[platform] = { packageName, version };
}

export function getPublishedPlatformsFromState(state: ReleaseState): Array<{
  platform: string;
  packageName: string;
  version: string;
}> {
  if (!state.binary) return [];

  return Object.entries(state.binary.publishedPlatforms).map(([platform, value]) => ({
    platform,
    packageName: value.packageName,
    version: value.version,
  }));
}
