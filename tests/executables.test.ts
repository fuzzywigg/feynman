import test from "node:test";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, delimiter, join } from "node:path";

import { getPathWithCurrentNode, resolveExecutable, resolveExecutableAsync } from "../src/system/executables.js";

test("getPathWithCurrentNode prepends process.execPath dirname when missing", () => {
	const nodeDir = dirname(process.execPath);
	const original = `/tmp/other${delimiter}/usr/bin`;
	const next = getPathWithCurrentNode(original);

	assert.equal(next.startsWith(`${nodeDir}${delimiter}`), true);
	assert.ok(next.includes(original));
});

test("getPathWithCurrentNode leaves PATH unchanged when node dir already present", () => {
	const nodeDir = dirname(process.execPath);
	const original = `/usr/local/bin${delimiter}${nodeDir}${delimiter}/usr/bin`;
	assert.equal(getPathWithCurrentNode(original), original);
});

test("getPathWithCurrentNode handles empty PATH by returning only the node dir prefix", () => {
	const nodeDir = dirname(process.execPath);
	const next = getPathWithCurrentNode("");
	assert.equal(next, `${nodeDir}${delimiter}`);
});

test("resolveExecutable prefers an existing fallback path over PATH lookup", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-exec-"));
	const fallback = join(root, "custom-tool");
	writeFileSync(fallback, "#!/bin/sh\necho ok\n", "utf8");
	chmodSync(fallback, 0o755);

	const previousPath = process.env.PATH;
	process.env.PATH = "";
	try {
		assert.equal(resolveExecutable("custom-tool", [fallback, join(root, "missing")]), fallback);
	} finally {
		if (previousPath === undefined) {
			delete process.env.PATH;
		} else {
			process.env.PATH = previousPath;
		}
	}
});

test("resolveExecutable returns undefined when fallbacks and PATH miss", () => {
	const previousPath = process.env.PATH;
	process.env.PATH = "/tmp/feynman-empty-path-dir-that-does-not-exist";
	try {
		assert.equal(resolveExecutable("definitely-not-a-real-binary-xyz", ["/tmp/also-missing-xyz"]), undefined);
	} finally {
		if (previousPath === undefined) {
			delete process.env.PATH;
		} else {
			process.env.PATH = previousPath;
		}
	}
});

test("resolveExecutable finds a PATH executable when fallbacks miss", () => {
	const resolved = resolveExecutable("true", ["/tmp/missing-true-fallback"]);
	assert.ok(resolved);
	assert.match(resolved!, /true$/);
});

test("resolveExecutableAsync mirrors sync fallback preference", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-exec-async-"));
	const fallback = join(root, "async-tool");
	writeFileSync(fallback, "#!/bin/sh\necho ok\n", "utf8");
	chmodSync(fallback, 0o755);

	assert.equal(await resolveExecutableAsync("async-tool", [fallback]), fallback);
});

test("resolveExecutableAsync returns undefined when nothing resolves", async () => {
	const previousPath = process.env.PATH;
	process.env.PATH = "/tmp/feynman-empty-path-dir-that-does-not-exist";
	try {
		assert.equal(await resolveExecutableAsync("definitely-not-a-real-binary-async-xyz", []), undefined);
	} finally {
		if (previousPath === undefined) {
			delete process.env.PATH;
		} else {
			process.env.PATH = previousPath;
		}
	}
});
