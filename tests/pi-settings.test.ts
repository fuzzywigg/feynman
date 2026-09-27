import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createModelRegistry } from "../src/model/registry.js";
import {
	CORE_PACKAGE_SOURCES,
	filterPackageSourcesForCurrentNode,
	getOptionalPackagePresetSources,
	isOptionalPackagePresetSupported,
	listOptionalPackagePresetInstallTargets,
	listOptionalPackagePresets,
	NATIVE_PACKAGE_SOURCES,
	normalizeOptionalPackagePresetName,
	resolvePackageUpdateSources,
	shouldPruneLegacyDefaultPackages,
	supportsNativePackageSources,
} from "../src/pi/package-presets.js";
import { normalizeFeynmanSettings, normalizeThinkingLevel, parseModelSpec, readJson } from "../src/pi/settings.js";

test("normalizeThinkingLevel accepts the latest Pi thinking levels", () => {
	assert.equal(normalizeThinkingLevel("off"), "off");
	assert.equal(normalizeThinkingLevel("minimal"), "minimal");
	assert.equal(normalizeThinkingLevel("low"), "low");
	assert.equal(normalizeThinkingLevel("medium"), "medium");
	assert.equal(normalizeThinkingLevel("high"), "high");
	assert.equal(normalizeThinkingLevel("xhigh"), "xhigh");
});

test("normalizeThinkingLevel rejects unknown values", () => {
	assert.equal(normalizeThinkingLevel("turbo"), undefined);
	assert.equal(normalizeThinkingLevel(undefined), undefined);
});

test("normalizeFeynmanSettings seeds the fast core package set", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-settings-"));
	const settingsPath = join(root, "settings.json");
	const bundledSettingsPath = join(root, "bundled-settings.json");
	const authPath = join(root, "auth.json");

	writeFileSync(bundledSettingsPath, "{}\n", "utf8");
	writeFileSync(authPath, "{}\n", "utf8");

	normalizeFeynmanSettings(settingsPath, bundledSettingsPath, "medium", authPath);

	const settings = JSON.parse(readFileSync(settingsPath, "utf8")) as { packages?: string[] };
	assert.deepEqual(settings.packages, [...CORE_PACKAGE_SOURCES]);
});

test("normalizeFeynmanSettings prunes the legacy slow default package set", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-settings-"));
	const settingsPath = join(root, "settings.json");
	const bundledSettingsPath = join(root, "bundled-settings.json");
	const authPath = join(root, "auth.json");

	writeFileSync(
		settingsPath,
		JSON.stringify(
			{
				packages: [
					...CORE_PACKAGE_SOURCES,
					"npm:pi-generative-ui",
				],
			},
			null,
			2,
		) + "\n",
		"utf8",
	);
	writeFileSync(bundledSettingsPath, "{}\n", "utf8");
	writeFileSync(authPath, "{}\n", "utf8");

	normalizeFeynmanSettings(settingsPath, bundledSettingsPath, "medium", authPath);

	const settings = JSON.parse(readFileSync(settingsPath, "utf8")) as { packages?: string[] };
	assert.deepEqual(settings.packages, [...CORE_PACKAGE_SOURCES]);
});

test("optional package presets map friendly aliases", () => {
	assert.deepEqual(getOptionalPackagePresetSources("memory"), undefined);
	assert.deepEqual(getOptionalPackagePresetSources("ui", "darwin"), ["npm:pi-generative-ui"]);
	assert.deepEqual(getOptionalPackagePresetSources("generative-ui", "linux"), undefined);
	assert.deepEqual(getOptionalPackagePresetSources("all-extras", "darwin"), ["npm:pi-generative-ui"]);
	assert.deepEqual(getOptionalPackagePresetSources("all-extras", "linux"), undefined);
	assert.deepEqual(getOptionalPackagePresetSources("search"), undefined);
	assert.equal(normalizeOptionalPackagePresetName("ui"), "generative-ui");
	assert.equal(normalizeOptionalPackagePresetName("  All-Extras  "), "all-extras");
	assert.equal(normalizeOptionalPackagePresetName("generative-ui"), "generative-ui");
	assert.equal(normalizeOptionalPackagePresetName("unknown-preset"), undefined);
	assert.equal(isOptionalPackagePresetSupported("generative-ui", "darwin"), true);
	assert.equal(isOptionalPackagePresetSupported("generative-ui", "linux"), false);
	assert.equal(isOptionalPackagePresetSupported("generative-ui", "win32"), false);
	assert.deepEqual(listOptionalPackagePresets("linux"), []);
	assert.deepEqual(listOptionalPackagePresets("darwin"), [
		{
			name: "generative-ui",
			description: "Interactive Glimpse UI widgets.",
			sources: ["npm:pi-generative-ui"],
		},
	]);
	assert.deepEqual(listOptionalPackagePresetInstallTargets("linux"), []);
	assert.equal(shouldPruneLegacyDefaultPackages(["npm:custom"]), false);
});

test("package update sources map core and optional aliases", () => {
	assert.deepEqual(resolvePackageUpdateSources("memory"), ["npm:@samfp/pi-memory"]);
	assert.deepEqual(resolvePackageUpdateSources("pi-memory"), ["npm:@samfp/pi-memory"]);
	assert.deepEqual(resolvePackageUpdateSources("session-search"), ["npm:@kaiserlich-dev/pi-session-search"]);
	assert.deepEqual(resolvePackageUpdateSources("pi-session-search"), ["npm:@kaiserlich-dev/pi-session-search"]);
	assert.deepEqual(resolvePackageUpdateSources("generative-ui", "darwin"), ["npm:pi-generative-ui"]);
	assert.deepEqual(resolvePackageUpdateSources("all-extras", "darwin"), ["npm:pi-generative-ui"]);
	assert.deepEqual(resolvePackageUpdateSources("ui", "darwin"), ["npm:pi-generative-ui"]);
	assert.deepEqual(resolvePackageUpdateSources("npm:@samfp/pi-memory"), ["npm:@samfp/pi-memory"]);
	assert.deepEqual(resolvePackageUpdateSources("custom-package"), ["custom-package"]);
	assert.deepEqual(resolvePackageUpdateSources(""), []);
	assert.deepEqual(resolvePackageUpdateSources("   "), []);
	assert.deepEqual(resolvePackageUpdateSources("github:org/repo"), ["github:org/repo"]);
	assert.deepEqual(resolvePackageUpdateSources("file:./local-pkg"), ["file:./local-pkg"]);
});

test("supportsNativePackageSources disables sqlite-backed packages on Node 25+", () => {
	assert.equal(supportsNativePackageSources("24.8.0"), true);
	assert.equal(supportsNativePackageSources("v24.8.0"), true);
	assert.equal(supportsNativePackageSources("25.0.0"), false);
	// Unparseable majors become 0, which is treated as supported (<= 24).
	assert.equal(supportsNativePackageSources("not-a-version"), true);
});

test("filterPackageSourcesForCurrentNode drops native packages only on Node 25+", () => {
	const mixed = [...CORE_PACKAGE_SOURCES, "npm:extra-tool"];
	assert.deepEqual(filterPackageSourcesForCurrentNode(mixed, "24.9.0"), mixed);
	const filtered = filterPackageSourcesForCurrentNode(mixed, "25.1.0");
	for (const source of NATIVE_PACKAGE_SOURCES) {
		assert.equal(filtered.includes(source), false);
	}
	assert.ok(filtered.includes("npm:extra-tool"));
});

test("shouldPruneLegacyDefaultPackages matches exact legacy set order-insensitively", () => {
	assert.equal(shouldPruneLegacyDefaultPackages(undefined), false);
	assert.equal(shouldPruneLegacyDefaultPackages("not-an-array" as never), false);
	assert.equal(shouldPruneLegacyDefaultPackages([{ source: "npm:x" } as never]), false);
	assert.equal(shouldPruneLegacyDefaultPackages([...CORE_PACKAGE_SOURCES]), false);
	assert.equal(
		shouldPruneLegacyDefaultPackages(["npm:pi-generative-ui", ...CORE_PACKAGE_SOURCES]),
		true,
	);
});

test("listOptionalPackagePresetInstallTargets includes all-extras on darwin", () => {
	assert.deepEqual(listOptionalPackagePresetInstallTargets("darwin"), ["generative-ui", "all-extras"]);
});

test("parseModelSpec accepts provider:model and provider/model and rejects malformed specs", () => {
	const authPath = join(mkdtempSync(join(tmpdir(), "feynman-parse-model-")), "auth.json");
	writeFileSync(authPath, "{}\n", "utf8");
	const registry = createModelRegistry(authPath);

	const colon = parseModelSpec("anthropic:claude-opus-4-6", registry);
	const slash = parseModelSpec("anthropic/claude-opus-4-6", registry);
	assert.ok(colon);
	assert.equal(colon!.provider, "anthropic");
	assert.equal(colon!.id, "claude-opus-4-6");
	assert.equal(slash?.id, "claude-opus-4-6");

	assert.equal(parseModelSpec("bare-model", registry), undefined);
	assert.equal(parseModelSpec(":missing-provider", registry), undefined);
	assert.equal(parseModelSpec("provider/", registry), undefined);
	assert.equal(parseModelSpec("   ", registry), undefined);
});

test("readJson returns empty object for missing or invalid files", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-read-json-"));
	const valid = join(root, "valid.json");
	const invalid = join(root, "invalid.json");
	writeFileSync(valid, JSON.stringify({ a: 1 }), "utf8");
	writeFileSync(invalid, "{bad", "utf8");

	assert.deepEqual(readJson(valid), { a: 1 });
	assert.deepEqual(readJson(invalid), {});
	assert.deepEqual(readJson(join(root, "missing.json")), {});
});

test("normalizeFeynmanSettings prunes native core packages on unsupported Node majors", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-settings-"));
	const settingsPath = join(root, "settings.json");
	const bundledSettingsPath = join(root, "bundled-settings.json");
	const authPath = join(root, "auth.json");

	writeFileSync(
		settingsPath,
		JSON.stringify(
			{
				packages: [...CORE_PACKAGE_SOURCES],
			},
			null,
			2,
		) + "\n",
		"utf8",
	);
	writeFileSync(bundledSettingsPath, "{}\n", "utf8");
	writeFileSync(authPath, "{}\n", "utf8");

	const originalVersion = process.versions.node;
	Object.defineProperty(process.versions, "node", { value: "25.0.0", configurable: true });
	try {
		normalizeFeynmanSettings(settingsPath, bundledSettingsPath, "medium", authPath);
	} finally {
		Object.defineProperty(process.versions, "node", { value: originalVersion, configurable: true });
	}

	const settings = JSON.parse(readFileSync(settingsPath, "utf8")) as { packages?: string[] };
	for (const source of NATIVE_PACKAGE_SOURCES) {
		assert.equal(settings.packages?.includes(source), false);
	}
});
