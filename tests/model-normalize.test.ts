import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	getCurrentModelSpec,
	isLocalBaseUrl,
	normalizeBaseUrl,
	normalizeCustomProviderBaseUrl,
	normalizeModelIds,
	normalizeProviderId,
} from "../src/model/commands.js";

test("normalizeProviderId trims, lowercases, and hyphenates whitespace", () => {
	assert.equal(normalizeProviderId("  Open AI  "), "open-ai");
	assert.equal(normalizeProviderId("Amazon Bedrock"), "amazon-bedrock");
});

test("normalizeModelIds trims, drops empties, and dedupes", () => {
	assert.deepEqual(normalizeModelIds(" gpt-5.4 , , gpt-5 , gpt-5.4 "), ["gpt-5.4", "gpt-5"]);
	assert.deepEqual(normalizeModelIds("   "), []);
});

test("normalizeBaseUrl strips trailing slashes", () => {
	assert.equal(normalizeBaseUrl(" https://api.example.com/v1/// "), "https://api.example.com/v1");
	assert.equal(normalizeBaseUrl("   "), "");
});

test("normalizeCustomProviderBaseUrl strips trailing /v1 for anthropic-messages only", () => {
	assert.deepEqual(normalizeCustomProviderBaseUrl("anthropic-messages", "https://proxy.example/v1"), {
		baseUrl: "https://proxy.example",
		note: "Stripped trailing /v1 for Anthropic mode.",
	});
	assert.deepEqual(normalizeCustomProviderBaseUrl("openai-completions", "https://proxy.example/v1"), {
		baseUrl: "https://proxy.example/v1",
	});
	assert.deepEqual(normalizeCustomProviderBaseUrl("anthropic-messages", "   "), { baseUrl: "" });
});

test("isLocalBaseUrl detects localhost variants with or without scheme", () => {
	assert.equal(isLocalBaseUrl("http://localhost:11434"), true);
	assert.equal(isLocalBaseUrl("https://127.0.0.1/v1"), true);
	assert.equal(isLocalBaseUrl("0.0.0.0:8000"), true);
	assert.equal(isLocalBaseUrl("localhost"), true);
	assert.equal(isLocalBaseUrl("https://api.openai.com"), false);
	assert.equal(isLocalBaseUrl("https://local.example.com"), false);
});

test("getCurrentModelSpec requires both defaultProvider and defaultModel", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-model-spec-"));
	const both = join(root, "both.json");
	const providerOnly = join(root, "provider.json");
	const modelOnly = join(root, "model.json");
	const missing = join(root, "missing.json");

	writeFileSync(both, JSON.stringify({ defaultProvider: "openai", defaultModel: "gpt-5.4" }), "utf8");
	writeFileSync(providerOnly, JSON.stringify({ defaultProvider: "openai" }), "utf8");
	writeFileSync(modelOnly, JSON.stringify({ defaultModel: "gpt-5.4" }), "utf8");

	assert.equal(getCurrentModelSpec(both), "openai/gpt-5.4");
	assert.equal(getCurrentModelSpec(providerOnly), undefined);
	assert.equal(getCurrentModelSpec(modelOnly), undefined);
	assert.equal(getCurrentModelSpec(missing), undefined);
});
