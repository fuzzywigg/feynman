import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	getConfiguredServiceTier,
	normalizeServiceTier,
	resolveActiveServiceTier,
	resolveProviderServiceTier,
	setConfiguredServiceTier,
} from "../src/model/service-tier.js";

test("normalizeServiceTier accepts supported values only", () => {
	assert.equal(normalizeServiceTier("priority"), "priority");
	assert.equal(normalizeServiceTier("standard_only"), "standard_only");
	assert.equal(normalizeServiceTier("FAST"), undefined);
	assert.equal(normalizeServiceTier(undefined), undefined);
});

test("setConfiguredServiceTier persists and clears settings.json values", () => {
	const dir = mkdtempSync(join(tmpdir(), "feynman-service-tier-"));
	const settingsPath = join(dir, "settings.json");

	setConfiguredServiceTier(settingsPath, "priority");
	assert.equal(getConfiguredServiceTier(settingsPath), "priority");

	const persisted = JSON.parse(readFileSync(settingsPath, "utf8")) as { serviceTier?: string };
	assert.equal(persisted.serviceTier, "priority");

	setConfiguredServiceTier(settingsPath, undefined);
	assert.equal(getConfiguredServiceTier(settingsPath), undefined);
});

test("resolveProviderServiceTier filters unsupported provider+tier pairs", () => {
	assert.equal(resolveProviderServiceTier("openai", "priority"), "priority");
	assert.equal(resolveProviderServiceTier("openai-codex", "flex"), "flex");
	assert.equal(resolveProviderServiceTier("anthropic", "standard_only"), "standard_only");
	assert.equal(resolveProviderServiceTier("anthropic", "priority"), undefined);
	assert.equal(resolveProviderServiceTier("google", "priority"), undefined);
});

test("resolveActiveServiceTier prefers env over settings and ignores invalid env", () => {
	const dir = mkdtempSync(join(tmpdir(), "feynman-service-tier-active-"));
	const settingsPath = join(dir, "settings.json");
	setConfiguredServiceTier(settingsPath, "flex");

	const previous = process.env.FEYNMAN_SERVICE_TIER;
	try {
		process.env.FEYNMAN_SERVICE_TIER = "priority";
		assert.equal(resolveActiveServiceTier(settingsPath), "priority");

		process.env.FEYNMAN_SERVICE_TIER = "not-a-tier";
		assert.equal(resolveActiveServiceTier(settingsPath), "flex");

		delete process.env.FEYNMAN_SERVICE_TIER;
		assert.equal(resolveActiveServiceTier(settingsPath), "flex");

		setConfiguredServiceTier(settingsPath, undefined);
		assert.equal(resolveActiveServiceTier(settingsPath), undefined);
	} finally {
		if (previous === undefined) {
			delete process.env.FEYNMAN_SERVICE_TIER;
		} else {
			process.env.FEYNMAN_SERVICE_TIER = previous;
		}
	}
});
