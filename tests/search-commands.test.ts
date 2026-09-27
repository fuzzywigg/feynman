import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { clearSearchConfig, printSearchStatus, setSearchProvider } from "../src/search/commands.js";
import {
	getPiWebAccessStatus,
	getPiWebSearchConfigPath,
	loadPiWebAccessConfig,
	savePiWebAccessConfig,
} from "../src/pi/web-access.js";

function withFeynmanHome<T>(home: string, fn: () => T): T {
	const previous = process.env.FEYNMAN_HOME;
	process.env.FEYNMAN_HOME = home;
	try {
		return fn();
	} finally {
		if (previous === undefined) {
			delete process.env.FEYNMAN_HOME;
		} else {
			process.env.FEYNMAN_HOME = previous;
		}
	}
}

function captureConsoleLog(fn: () => void): string[] {
	const lines: string[] = [];
	const original = console.log;
	console.log = (...args: unknown[]) => {
		lines.push(args.map((arg) => String(arg)).join(" "));
	};
	try {
		fn();
	} finally {
		console.log = original;
	}
	return lines;
}

function stripAnsi(line: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI strip
	return line.replace(/\x1b\[[0-9;]*m/g, "");
}

test("printSearchStatus marks config path and prints setup hint when web-search.json is missing", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-search-cmds-"));
	const configPath = getPiWebSearchConfigPath(root);
	const status = getPiWebAccessStatus(loadPiWebAccessConfig(configPath), configPath);

	const output = captureConsoleLog(() => printSearchStatus(status)).map(stripAnsi);

	const configLine = output.find((line) => line.includes("Config path:"));
	assert.ok(configLine, "expected Config path line");
	assert.ok(configLine!.includes("(not created yet)"), `expected '(not created yet)' marker, got: ${configLine}`);
	assert.ok(
		output.some((line) => line.toLowerCase().includes("feynman search set")),
		"expected a hint referencing `feynman search set`",
	);
});

test("printSearchStatus omits marker and hint when web-search.json exists", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-search-cmds-"));
	const configPath = getPiWebSearchConfigPath(root);
	savePiWebAccessConfig({ provider: "auto", searchProvider: "auto" }, configPath);
	const status = getPiWebAccessStatus(loadPiWebAccessConfig(configPath), configPath);

	const output = captureConsoleLog(() => printSearchStatus(status)).map(stripAnsi);

	const configLine = output.find((line) => line.includes("Config path:"));
	assert.ok(configLine, "expected Config path line");
	assert.ok(!configLine!.includes("(not created yet)"), `did not expect '(not created yet)' marker: ${configLine}`);
	assert.ok(
		!output.some((line) => line.toLowerCase().includes("feynman search set")),
		"did not expect a setup hint when config exists",
	);
});

test("setSearchProvider rejects unknown providers and api keys on auto", () => {
	assert.throws(
		() => setSearchProvider("bing" as never),
		/Usage: feynman search set <auto\|perplexity\|exa\|gemini>/,
	);
	assert.throws(() => setSearchProvider("auto", "should-not-be-used"), /auto provider does not use an API key/);
});

test("setSearchProvider persists provider, workflow none, and provider-specific api key fields", () => {
	const home = mkdtempSync(join(tmpdir(), "feynman-search-set-"));
	withFeynmanHome(home, () => {
		const output = captureConsoleLog(() => setSearchProvider("exa", "exa_test_key"));
		assert.ok(output.some((line) => /Web search provider set to Exa/.test(line)));

		const configPath = getPiWebSearchConfigPath();
		const config = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
		assert.equal(config.provider, "exa");
		assert.equal(config.searchProvider, "exa");
		assert.equal(config.workflow, "none");
		assert.equal(config.exaApiKey, "exa_test_key");
		assert.equal("route" in config, false);

		captureConsoleLog(() => setSearchProvider("perplexity", "pplx_key"));
		const perplexity = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
		assert.equal(perplexity.perplexityApiKey, "pplx_key");
		assert.equal(perplexity.provider, "perplexity");

		captureConsoleLog(() => setSearchProvider("gemini", "gem_key"));
		const gemini = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
		assert.equal(gemini.geminiApiKey, "gem_key");

		captureConsoleLog(() => setSearchProvider("auto"));
		const auto = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
		assert.equal(auto.provider, "auto");
		assert.equal(auto.workflow, "none");
	});
});

test("clearSearchConfig clears provider fields while keeping workflow none", () => {
	const home = mkdtempSync(join(tmpdir(), "feynman-search-clear-"));
	withFeynmanHome(home, () => {
		captureConsoleLog(() => setSearchProvider("exa", "exa_clear_key"));
		const output = captureConsoleLog(() => clearSearchConfig());
		assert.ok(output.some((line) => /Web search provider reset to/.test(line)));

		const config = loadPiWebAccessConfig(getPiWebSearchConfigPath());
		assert.equal(config.provider, undefined);
		assert.equal(config.searchProvider, undefined);
		assert.equal(config.route, undefined);
		assert.equal(config.workflow, "none");
		assert.equal(config.exaApiKey, "exa_clear_key");
	});
});
