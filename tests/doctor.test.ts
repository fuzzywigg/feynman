import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { findProvidersMissingApiKey } from "../src/setup/doctor.js";

function writeModelsJson(contents: unknown): string {
	const root = mkdtempSync(join(tmpdir(), "feynman-doctor-"));
	const path = join(root, "models.json");
	writeFileSync(path, typeof contents === "string" ? contents : `${JSON.stringify(contents, null, 2)}\n`, "utf8");
	return path;
}

test("findProvidersMissingApiKey returns empty for missing or unreadable files", () => {
	assert.deepEqual(findProvidersMissingApiKey("/tmp/does-not-exist-models.json"), []);
});

test("findProvidersMissingApiKey returns empty for blank or invalid JSON", () => {
	assert.deepEqual(findProvidersMissingApiKey(writeModelsJson("   \n")), []);
	assert.deepEqual(findProvidersMissingApiKey(writeModelsJson("{not-json")), []);
});

test("findProvidersMissingApiKey returns empty when providers is missing or not an object", () => {
	assert.deepEqual(findProvidersMissingApiKey(writeModelsJson({})), []);
	assert.deepEqual(findProvidersMissingApiKey(writeModelsJson({ providers: null })), []);
	assert.deepEqual(findProvidersMissingApiKey(writeModelsJson({ providers: [] })), []);
});

test("findProvidersMissingApiKey skips non-object provider configs and empty models lists", () => {
	const path = writeModelsJson({
		providers: {
			broken: null,
			stringy: "nope",
			emptyModels: { apiKey: "", models: [] },
			noModels: { apiKey: "" },
		},
	});
	assert.deepEqual(findProvidersMissingApiKey(path), []);
});

test("findProvidersMissingApiKey collects providers with models but blank apiKey", () => {
	const path = writeModelsJson({
		providers: {
			ok: { apiKey: "sk-live", models: [{ id: "m1" }] },
			missing: { apiKey: "   ", models: [{ id: "m2" }] },
			undefinedKey: { models: [{ id: "m3" }] },
			numericKey: { apiKey: 123, models: [{ id: "m4" }] },
		},
	});
	assert.deepEqual(findProvidersMissingApiKey(path).sort(), ["missing", "numericKey", "undefinedKey"]);
});
