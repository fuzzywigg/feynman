import assert from "node:assert/strict";
import test from "node:test";

import { setupPreviewDependencies } from "../src/setup/preview.js";

test("setupPreviewDependencies returns ready when pandoc is already resolvable", () => {
	const result = setupPreviewDependencies({
		platform: "linux",
		resolveCommand: (name) => (name === "pandoc" ? "/usr/bin/pandoc" : undefined),
		runCommand: () => {
			throw new Error("should not spawn when pandoc is ready");
		},
	});

	assert.deepEqual(result, {
		status: "ready",
		message: "pandoc already installed at /usr/bin/pandoc",
	});
});

test("setupPreviewDependencies installs pandoc via Homebrew on darwin", () => {
	const calls: Array<{ command: string; args: readonly string[] }> = [];
	const result = setupPreviewDependencies({
		platform: "darwin",
		resolveCommand: (name) => (name === "brew" ? "/opt/homebrew/bin/brew" : undefined),
		runCommand: (command, args) => {
			calls.push({ command, args });
			return { status: 0 };
		},
	});

	assert.deepEqual(result, {
		status: "installed",
		message: "Preview dependency installed: pandoc",
	});
	assert.deepEqual(calls, [{ command: "/opt/homebrew/bin/brew", args: ["install", "pandoc"] }]);
});

test("setupPreviewDependencies throws when Homebrew install fails", () => {
	assert.throws(
		() =>
			setupPreviewDependencies({
				platform: "darwin",
				resolveCommand: (name) => (name === "brew" ? "/usr/local/bin/brew" : undefined),
				runCommand: () => ({ status: 1 }),
			}),
		/Failed to install pandoc via Homebrew/,
	);
});

test("setupPreviewDependencies installs pandoc via winget on win32", () => {
	const calls: Array<{ command: string; args: readonly string[] }> = [];
	const result = setupPreviewDependencies({
		platform: "win32",
		resolveCommand: (name) => (name === "winget" ? "C:\\Windows\\System32\\winget.exe" : undefined),
		runCommand: (command, args) => {
			calls.push({ command, args });
			return { status: 0 };
		},
	});

	assert.deepEqual(result, {
		status: "installed",
		message: "Preview dependency installed: pandoc (via winget)",
	});
	assert.deepEqual(calls, [
		{
			command: "C:\\Windows\\System32\\winget.exe",
			args: ["install", "--id", "JohnMacFarlane.Pandoc", "-e"],
		},
	]);
});

test("setupPreviewDependencies falls through to manual when winget install fails", () => {
	const result = setupPreviewDependencies({
		platform: "win32",
		resolveCommand: (name) => (name === "winget" ? "winget" : undefined),
		runCommand: () => ({ status: 1 }),
	});

	assert.equal(result.status, "manual");
	assert.match(result.message, /Install it manually/);
});

test("setupPreviewDependencies installs pandoc via apt on linux", () => {
	const calls: Array<{ command: string; args: readonly string[] }> = [];
	const result = setupPreviewDependencies({
		platform: "linux",
		resolveCommand: (name) => (name === "apt-get" ? "/usr/bin/apt-get" : undefined),
		runCommand: (command, args) => {
			calls.push({ command, args });
			return { status: 0 };
		},
	});

	assert.deepEqual(result, {
		status: "installed",
		message: "Preview dependency installed: pandoc (via apt)",
	});
	assert.deepEqual(calls, [{ command: "/usr/bin/apt-get", args: ["install", "-y", "pandoc"] }]);
});

test("setupPreviewDependencies returns manual when no installer is available", () => {
	const result = setupPreviewDependencies({
		platform: "linux",
		resolveCommand: () => undefined,
		runCommand: () => {
			throw new Error("should not spawn without an installer");
		},
	});

	assert.deepEqual(result, {
		status: "manual",
		message: "pandoc is required for preview support. Install it manually and rerun `feynman --doctor`.",
	});
});

test("setupPreviewDependencies returns manual when apt install fails", () => {
	const result = setupPreviewDependencies({
		platform: "linux",
		resolveCommand: (name) => (name === "apt-get" ? "/usr/bin/apt-get" : undefined),
		runCommand: () => ({ status: 1 }),
	});

	assert.equal(result.status, "manual");
});
