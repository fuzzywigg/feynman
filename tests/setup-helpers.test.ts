import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
	printNonInteractiveSetupGuidance,
	runSetup,
	summarizePackageSources,
} from "../src/setup/setup.js";

test("summarizePackageSources joins short lists without truncation", () => {
	assert.equal(summarizePackageSources([]), "");
	assert.equal(summarizePackageSources(["a"]), "a");
	assert.equal(summarizePackageSources(["a", "b", "c"]), "a, b, c");
});

test("summarizePackageSources truncates long lists with a remainder count", () => {
	assert.equal(summarizePackageSources(["a", "b", "c", "d"]), "a, b, c +1 more");
	assert.equal(summarizePackageSources(["a", "b", "c", "d", "e"]), "a, b, c +2 more");
});

test("printNonInteractiveSetupGuidance prints explicit command hints", () => {
	const lines: string[] = [];
	const originalWrite = process.stdout.write;
	process.stdout.write = ((chunk: string | Uint8Array) => {
		lines.push(String(chunk));
		return true;
	}) as typeof process.stdout.write;

	try {
		printNonInteractiveSetupGuidance();
	} finally {
		process.stdout.write = originalWrite;
	}

	const output = lines.join("");
	assert.match(output, /Non-interactive terminal/);
	assert.match(output, /feynman model login/);
	assert.match(output, /feynman model set/);
	assert.match(output, /feynman alpha login/);
	assert.match(output, /feynman doctor/);
});

test("runSetup prints non-interactive guidance and returns when stdin/stdout are not TTYs", async () => {
	const originalStdin = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
	const originalStdout = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
	const lines: string[] = [];
	const originalWrite = process.stdout.write;

	Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: false });
	Object.defineProperty(process.stdout, "isTTY", { configurable: true, value: false });
	process.stdout.write = ((chunk: string | Uint8Array) => {
		lines.push(String(chunk));
		return true;
	}) as typeof process.stdout.write;

	const root = mkdtempSync(join(tmpdir(), "feynman-setup-"));
	const settingsPath = join(root, "settings.json");
	const bundledSettingsPath = join(root, "bundled-settings.json");
	const authPath = join(root, "auth.json");
	writeFileSync(settingsPath, "{}\n", "utf8");
	writeFileSync(bundledSettingsPath, "{}\n", "utf8");
	writeFileSync(authPath, "{}\n", "utf8");

	try {
		await runSetup({
			settingsPath,
			bundledSettingsPath,
			authPath,
			workingDir: root,
			sessionDir: join(root, "sessions"),
			appRoot: root,
		});
	} finally {
		process.stdout.write = originalWrite;
		if (originalStdin) {
			Object.defineProperty(process.stdin, "isTTY", originalStdin);
		} else {
			delete (process.stdin as { isTTY?: boolean }).isTTY;
		}
		if (originalStdout) {
			Object.defineProperty(process.stdout, "isTTY", originalStdout);
		} else {
			delete (process.stdout as { isTTY?: boolean }).isTTY;
		}
	}

	assert.match(lines.join(""), /Non-interactive terminal/);
});
