import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { patchAlphaHubAuthSource } from "../scripts/lib/alpha-hub-auth-patch.mjs";

const require = createRequire(import.meta.url);

test("patchAlphaHubAuthSource fixes browser open logic for WSL and Windows", () => {
	const input = [
		"function openBrowser(url) {",
		"  try {",
		"    const plat = platform();",
		"    if (plat === 'darwin') execSync(`open \"${url}\"`);",
		"    else if (plat === 'linux') execSync(`xdg-open \"${url}\"`);",
		"    else if (plat === 'win32') execSync(`start \"\" \"${url}\"`);",
		"  } catch {}",
		"}",
	].join("\n");

	const patched = patchAlphaHubAuthSource(input);

	assert.match(patched, /const isWsl = plat === 'linux'/);
	assert.match(patched, /wslview/);
	assert.match(patched, /cmd\.exe \/c start/);
	assert.match(patched, /cmd \/c start/);
});

test("patchAlphaHubAuthSource includes the auth URL in login output", () => {
	const input = "process.stderr.write('Opening browser for alphaXiv login...\\n');";

	const patched = patchAlphaHubAuthSource(input);

	assert.match(patched, /Auth URL: \$\{authUrl\.toString\(\)\}/);
});

test("patchAlphaHubAuthSource is idempotent", () => {
	const input = [
		"function openBrowser(url) {",
		"  try {",
		"    const plat = platform();",
		"    if (plat === 'darwin') execSync(`open \"${url}\"`);",
		"    else if (plat === 'linux') execSync(`xdg-open \"${url}\"`);",
		"    else if (plat === 'win32') execSync(`start \"\" \"${url}\"`);",
		"  } catch {}",
		"}",
		"process.stderr.write('Opening browser for alphaXiv login...\\n');",
	].join("\n");

	const once = patchAlphaHubAuthSource(input);
	const twice = patchAlphaHubAuthSource(once);

	assert.equal(twice, once);
});

test("alpha-hub 0.1.7 auth source already covers the legacy login patch", () => {
	const authPath = require.resolve("@companion-ai/alpha-hub/lib/auth");
	const source = readFileSync(authPath, "utf8");
	const patched = patchAlphaHubAuthSource(source);

	assert.equal(patched, source);
	assert.match(patched, /function isWsl\(\)/);
	assert.match(patched, /wslview/);
	assert.match(patched, /authUrl\.toString\(\)/);
	assert.match(patched, /start ""/);
});
