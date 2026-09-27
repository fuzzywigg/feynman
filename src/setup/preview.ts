import { spawnSync } from "node:child_process";

import { BREW_FALLBACK_PATHS, PANDOC_FALLBACK_PATHS, resolveExecutable } from "../system/executables.js";

export type PreviewSetupResult =
	| { status: "ready"; message: string }
	| { status: "installed"; message: string }
	| { status: "manual"; message: string };

type ResolveExecutableFn = (name: string, fallbackPaths?: string[]) => string | undefined;

type SpawnSyncFn = (
	command: string,
	args: readonly string[],
	options?: { stdio?: "inherit" | "ignore" | "pipe" },
) => { status: number | null };

export type SetupPreviewDependenciesOptions = {
	platform?: NodeJS.Platform;
	resolveCommand?: ResolveExecutableFn;
	runCommand?: SpawnSyncFn;
};

export function setupPreviewDependencies(options: SetupPreviewDependenciesOptions = {}): PreviewSetupResult {
	const platform = options.platform ?? process.platform;
	const resolveCommand = options.resolveCommand ?? resolveExecutable;
	const runCommand = options.runCommand ?? ((command, args, spawnOptions) => spawnSync(command, args, spawnOptions));

	const pandocPath = resolveCommand("pandoc", PANDOC_FALLBACK_PATHS);
	if (pandocPath) {
		return { status: "ready", message: `pandoc already installed at ${pandocPath}` };
	}

	if (platform === "darwin") {
		const brewPath = resolveCommand("brew", BREW_FALLBACK_PATHS);
		if (brewPath) {
			const result = runCommand(brewPath, ["install", "pandoc"], { stdio: "inherit" });
			if (result.status !== 0) {
				throw new Error("Failed to install pandoc via Homebrew.");
			}
			return { status: "installed", message: "Preview dependency installed: pandoc" };
		}
	}

	if (platform === "win32") {
		const wingetPath = resolveCommand("winget");
		if (wingetPath) {
			const result = runCommand(wingetPath, ["install", "--id", "JohnMacFarlane.Pandoc", "-e"], { stdio: "inherit" });
			if (result.status === 0) {
				return { status: "installed", message: "Preview dependency installed: pandoc (via winget)" };
			}
		}
	}

	if (platform === "linux") {
		const aptPath = resolveCommand("apt-get");
		if (aptPath) {
			const result = runCommand(aptPath, ["install", "-y", "pandoc"], { stdio: "inherit" });
			if (result.status === 0) {
				return { status: "installed", message: "Preview dependency installed: pandoc (via apt)" };
			}
		}
	}

	return {
		status: "manual",
		message: "pandoc is required for preview support. Install it manually and rerun `feynman --doctor`.",
	};
}
