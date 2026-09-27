import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { upsertProviderBaseUrl, upsertProviderConfig } from "../src/model/models-json.js";

test("upsertProviderConfig creates models.json and merges provider config", () => {
	const dir = mkdtempSync(join(tmpdir(), "feynman-models-"));
	const modelsPath = join(dir, "models.json");

	const first = upsertProviderConfig(modelsPath, "custom", {
		baseUrl: "http://localhost:11434/v1",
		apiKey: "ollama",
		api: "openai-completions",
		authHeader: true,
		models: [{ id: "llama3.1:8b" }],
	});
	assert.deepEqual(first, { ok: true });

	const second = upsertProviderConfig(modelsPath, "custom", {
		baseUrl: "http://localhost:9999/v1",
	});
	assert.deepEqual(second, { ok: true });

	const parsed = JSON.parse(readFileSync(modelsPath, "utf8")) as any;
	assert.equal(parsed.providers.custom.baseUrl, "http://localhost:9999/v1");
	assert.equal(parsed.providers.custom.api, "openai-completions");
	assert.equal(parsed.providers.custom.authHeader, true);
	assert.deepEqual(parsed.providers.custom.models, [{ id: "llama3.1:8b" }]);
});

test("upsertProviderConfig writes LiteLLM proxy config with master key", () => {
	const dir = mkdtempSync(join(tmpdir(), "feynman-litellm-"));
	const modelsPath = join(dir, "models.json");

	const result = upsertProviderConfig(modelsPath, "litellm", {
		baseUrl: "http://localhost:4000/v1",
		apiKey: "LITELLM_MASTER_KEY",
		api: "openai-completions",
		authHeader: true,
		models: [{ id: "gpt-4o" }],
	});
	assert.deepEqual(result, { ok: true });

	const parsed = JSON.parse(readFileSync(modelsPath, "utf8")) as any;
	assert.equal(parsed.providers.litellm.baseUrl, "http://localhost:4000/v1");
	assert.equal(parsed.providers.litellm.apiKey, "LITELLM_MASTER_KEY");
	assert.equal(parsed.providers.litellm.api, "openai-completions");
	assert.equal(parsed.providers.litellm.authHeader, true);
	assert.deepEqual(parsed.providers.litellm.models, [{ id: "gpt-4o" }]);
});

test("upsertProviderConfig writes LiteLLM proxy config without master key", () => {
	const dir = mkdtempSync(join(tmpdir(), "feynman-litellm-"));
	const modelsPath = join(dir, "models.json");

	const result = upsertProviderConfig(modelsPath, "litellm", {
		baseUrl: "http://localhost:4000/v1",
		apiKey: "local",
		api: "openai-completions",
		authHeader: false,
		models: [{ id: "llama3" }],
	});
	assert.deepEqual(result, { ok: true });

	const parsed = JSON.parse(readFileSync(modelsPath, "utf8")) as any;
	assert.equal(parsed.providers.litellm.baseUrl, "http://localhost:4000/v1");
	assert.equal(parsed.providers.litellm.apiKey, "local");
	assert.equal(parsed.providers.litellm.api, "openai-completions");
	assert.equal(parsed.providers.litellm.authHeader, false);
	assert.deepEqual(parsed.providers.litellm.models, [{ id: "llama3" }]);
});

test("upsertProviderConfig rejects invalid or non-object models.json content", () => {
	const dir = mkdtempSync(join(tmpdir(), "feynman-models-"));
	const invalidPath = join(dir, "invalid.json");
	const nonObjectPath = join(dir, "non-object.json");
	writeFileSync(invalidPath, "{not-json\n", "utf8");
	writeFileSync(nonObjectPath, "42\n", "utf8");

	const invalid = upsertProviderConfig(invalidPath, "custom", { baseUrl: "http://localhost:1/v1" });
	assert.equal(invalid.ok, false);
	if (!invalid.ok) {
		assert.match(invalid.error, /Failed to read models\.json/);
	}

	const nonObject = upsertProviderConfig(nonObjectPath, "custom", { baseUrl: "http://localhost:1/v1" });
	assert.equal(nonObject.ok, false);
	if (!nonObject.ok) {
		assert.match(nonObject.error, /Invalid models\.json/);
	}
});

test("upsertProviderConfig treats an empty models.json file as an empty providers map", () => {
	const dir = mkdtempSync(join(tmpdir(), "feynman-models-"));
	const modelsPath = join(dir, "models.json");
	writeFileSync(modelsPath, "   \n", "utf8");

	const result = upsertProviderConfig(modelsPath, "custom", {
		baseUrl: "http://localhost:11434/v1",
		apiKey: "ollama",
	});
	assert.deepEqual(result, { ok: true });

	const parsed = JSON.parse(readFileSync(modelsPath, "utf8")) as any;
	assert.equal(parsed.providers.custom.baseUrl, "http://localhost:11434/v1");
	assert.equal(parsed.providers.custom.apiKey, "ollama");
});

test("upsertProviderBaseUrl merges only the baseUrl field", () => {
	const dir = mkdtempSync(join(tmpdir(), "feynman-models-"));
	const modelsPath = join(dir, "models.json");

	assert.deepEqual(
		upsertProviderConfig(modelsPath, "custom", {
			baseUrl: "http://localhost:11434/v1",
			apiKey: "keep-me",
			api: "openai-completions",
		}),
		{ ok: true },
	);
	assert.deepEqual(upsertProviderBaseUrl(modelsPath, "custom", "http://localhost:9999/v1"), { ok: true });

	const parsed = JSON.parse(readFileSync(modelsPath, "utf8")) as any;
	assert.equal(parsed.providers.custom.baseUrl, "http://localhost:9999/v1");
	assert.equal(parsed.providers.custom.apiKey, "keep-me");
	assert.equal(parsed.providers.custom.api, "openai-completions");
});

test("upsertProviderConfig reports write failures", () => {
	const dir = mkdtempSync(join(tmpdir(), "feynman-models-"));
	const blockedDir = join(dir, "blocked");
	mkdirSync(blockedDir, { recursive: true });
	chmodSync(blockedDir, 0o500);
	const modelsPath = join(blockedDir, "nested", "models.json");

	try {
		const result = upsertProviderConfig(modelsPath, "custom", { baseUrl: "http://localhost:1/v1" });
		assert.equal(result.ok, false);
		if (!result.ok) {
			assert.match(result.error, /Failed to write models\.json/);
		}
	} finally {
		chmodSync(blockedDir, 0o700);
	}
});
