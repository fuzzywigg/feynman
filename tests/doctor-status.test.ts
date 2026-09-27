import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { collectStatusSnapshot } from "../src/setup/doctor.js";

function createDoctorFixture(options?: {
	auth?: Record<string, unknown>;
	settings?: Record<string, unknown>;
}): {
	root: string;
	options: {
		settingsPath: string;
		authPath: string;
		sessionDir: string;
		workingDir: string;
		appRoot: string;
	};
} {
	const root = mkdtempSync(join(tmpdir(), "feynman-doctor-status-"));
	const appRoot = resolve(root, "app");
	const workingDir = resolve(root, "project");
	const sessionDir = resolve(root, "sessions");
	const settingsPath = resolve(root, "settings.json");
	const authPath = resolve(root, "auth.json");

	mkdirSync(appRoot, { recursive: true });
	mkdirSync(workingDir, { recursive: true });
	mkdirSync(sessionDir, { recursive: true });
	writeFileSync(settingsPath, JSON.stringify(options?.settings ?? {}, null, 2) + "\n", "utf8");
	writeFileSync(authPath, JSON.stringify(options?.auth ?? {}, null, 2) + "\n", "utf8");

	return {
		root,
		options: { settingsPath, authPath, sessionDir, workingDir, appRoot },
	};
}

test("collectStatusSnapshot reports missing Pi runtime bits for an empty appRoot", () => {
	const fixture = createDoctorFixture();
	const snapshot = collectStatusSnapshot(fixture.options);
	assert.equal(snapshot.piReady, false);
	assert.ok(snapshot.missingPiBits.length > 0);
	assert.equal(snapshot.sessionDir, fixture.options.sessionDir);
	assert.equal(typeof snapshot.webRouteLabel, "string");
	assert.ok(snapshot.webRouteLabel.length > 0);
});

test("collectStatusSnapshot marks a valid configured model and honors PUPPETEER_EXECUTABLE_PATH", () => {
	const fixture = createDoctorFixture({
		auth: {
			openai: { type: "api_key", key: "openai-test-key" },
		},
		settings: {
			defaultProvider: "openai",
			defaultModel: "gpt-5.4",
		},
	});
	const previousBrowser = process.env.PUPPETEER_EXECUTABLE_PATH;
	process.env.PUPPETEER_EXECUTABLE_PATH = "/tmp/fake-chrome-for-doctor-status";

	try {
		const snapshot = collectStatusSnapshot(fixture.options);
		assert.equal(snapshot.model, "openai/gpt-5.4");
		assert.equal(snapshot.modelValid, true);
		assert.ok(snapshot.authenticatedModelCount > 0);
		assert.ok(snapshot.authenticatedProviderCount > 0);
		assert.equal(snapshot.browserReady, true);
		assert.ok(snapshot.availableModels.some((spec) => spec.startsWith("openai/")));
	} finally {
		if (previousBrowser === undefined) {
			delete process.env.PUPPETEER_EXECUTABLE_PATH;
		} else {
			process.env.PUPPETEER_EXECUTABLE_PATH = previousBrowser;
		}
	}
});

test("collectStatusSnapshot flags an unavailable default model", () => {
	const envKeys = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY"];
	const savedEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
	for (const key of envKeys) {
		delete process.env[key];
	}

	try {
		const fixture = createDoctorFixture({
			auth: {},
			settings: {
				defaultProvider: "anthropic",
				defaultModel: "claude-opus-4-6",
			},
		});
		const snapshot = collectStatusSnapshot(fixture.options);
		assert.equal(snapshot.model, "anthropic/claude-opus-4-6");
		assert.equal(snapshot.modelValid, false);
		assert.equal(snapshot.authenticatedModelCount, 0);
		assert.ok(snapshot.modelGuidance.length > 0);
	} finally {
		for (const [key, value] of Object.entries(savedEnv)) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	}
});
