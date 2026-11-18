import test from "node:test";
import assert from "node:assert/strict";

import {
	MAX_NODE_MAJOR,
	MIN_NODE_VERSION,
	ensureSupportedNodeVersion,
	getUnsupportedNodeVersionLines,
	isSupportedNodeVersion,
} from "../src/system/node-version.js";

test("isSupportedNodeVersion enforces the exact minimum floor", () => {
	assert.equal(isSupportedNodeVersion("22.22.0"), true);
	assert.equal(isSupportedNodeVersion("22.21.9"), false);
	assert.equal(isSupportedNodeVersion("20.19.0"), false);
	assert.equal(isSupportedNodeVersion("21.0.0"), false);
	assert.equal(isSupportedNodeVersion("23.1.0"), true);
	assert.equal(isSupportedNodeVersion(`${MAX_NODE_MAJOR}.9.9`), true);
	assert.equal(isSupportedNodeVersion(`${MAX_NODE_MAJOR + 1}.0.0`), false);
	assert.equal(isSupportedNodeVersion("18.17.0"), false);
});

test("ensureSupportedNodeVersion throws a guided upgrade message", () => {
	assert.throws(
		() => ensureSupportedNodeVersion("18.17.0"),
		(error: unknown) =>
			error instanceof Error &&
			error.message.includes(`Node.js ${MIN_NODE_VERSION}`) &&
			error.message.includes("nvm install 22 && nvm use 22") &&
			error.message.includes("https://feynman.is/install"),
	);
});

test("unsupported version guidance reports the detected version", () => {
	const lines = getUnsupportedNodeVersionLines("18.17.0");

	assert.equal(lines[0], `feynman supports Node.js ${MIN_NODE_VERSION} through ${MAX_NODE_MAJOR}.x (detected 18.17.0).`);
	assert.ok(lines.some((line) => line.includes("curl -fsSL https://feynman.is/install | bash")));
});

test("unsupported version guidance explains upper-bound failures", () => {
	const lines = getUnsupportedNodeVersionLines("25.1.0");

	assert.equal(lines[0], `feynman supports Node.js ${MIN_NODE_VERSION} through ${MAX_NODE_MAJOR}.x (detected 25.1.0).`);
	assert.ok(lines.some((line) => line.includes("native Pi packages may fail to build")));
});
