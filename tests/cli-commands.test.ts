import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
	handleAlphaCommand,
	handleModelCommand,
	handlePackagesCommand,
	handleSearchCommand,
	handleUpdateCommand,
	loadPackageVersion,
} from "../src/cli.js";
import { CORE_PACKAGE_SOURCES } from "../src/pi/package-presets.js";

function captureConsole<T>(fn: () => T | Promise<T>): Promise<{ result: T; lines: string[] }> {
	const lines: string[] = [];
	const originalLog = console.log;
	const originalWrite = process.stdout.write;
	console.log = (...args: unknown[]) => {
		lines.push(args.map(String).join(" "));
	};
	process.stdout.write = ((chunk: string | Uint8Array) => {
		lines.push(String(chunk));
		return true;
	}) as typeof process.stdout.write;

	return Promise.resolve()
		.then(fn)
		.finally(() => {
			console.log = originalLog;
			process.stdout.write = originalWrite;
		})
		.then((result) => ({ result, lines }));
}

function tempAgentPaths(): { settingsPath: string; authPath: string; root: string } {
	const root = mkdtempSync(join(tmpdir(), "feynman-cli-cmd-"));
	const settingsPath = join(root, "settings.json");
	const authPath = join(root, "auth.json");
	writeFileSync(settingsPath, "{}\n", "utf8");
	writeFileSync(authPath, "{}\n", "utf8");
	return { settingsPath, authPath, root };
}

function withFeynmanHome<T>(fn: (home: string) => T | Promise<T>): Promise<T> {
	const home = mkdtempSync(join(tmpdir(), "feynman-cli-home-"));
	const previous = process.env.FEYNMAN_HOME;
	process.env.FEYNMAN_HOME = home;
	return Promise.resolve()
		.then(() => fn(home))
		.finally(() => {
			if (previous === undefined) {
				delete process.env.FEYNMAN_HOME;
			} else {
				process.env.FEYNMAN_HOME = previous;
			}
		});
}

test("loadPackageVersion reads version from package.json", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-pkg-version-"));
	writeFileSync(join(root, "package.json"), JSON.stringify({ name: "demo", version: "9.8.7" }), "utf8");
	assert.equal(loadPackageVersion(root).version, "9.8.7");
});

test("loadPackageVersion returns empty object for missing or invalid package.json", () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-pkg-version-bad-"));
	assert.deepEqual(loadPackageVersion(root), {});
	writeFileSync(join(root, "package.json"), "{not-json", "utf8");
	assert.deepEqual(loadPackageVersion(root), {});
});

test("handleSearchCommand status prints managed-by lines", async () => {
	const { lines } = await captureConsole(() => handleSearchCommand("status", []));
	const output = lines.join("");
	assert.match(output, /Managed by: pi-web-access/);
	assert.match(output, /Search route:/);
});

test("handleSearchCommand defaults to status when subcommand is omitted", async () => {
	const { lines } = await captureConsole(() => handleSearchCommand(undefined, []));
	assert.match(lines.join(""), /Managed by: pi-web-access/);
});

test("handleSearchCommand set validates provider and persists auto", async () => {
	assert.throws(() => handleSearchCommand("set", []), /Usage: feynman search set/);
	assert.throws(() => handleSearchCommand("set", ["bing"]), /Usage: feynman search set/);

	await withFeynmanHome(async () => {
		const { lines } = await captureConsole(() => handleSearchCommand("set", ["auto"]));
		assert.match(lines.join("\n"), /Web search provider set to/);
	});
});

test("handleSearchCommand clear resets provider config", async () => {
	await withFeynmanHome(async () => {
		handleSearchCommand("set", ["auto"]);
		const { lines } = await captureConsole(() => handleSearchCommand("clear", []));
		assert.match(lines.join("\n"), /Web search provider reset to/);
	});
});

test("handleSearchCommand rejects unknown subcommands", () => {
	assert.throws(() => handleSearchCommand("bogus", []), /Unknown search command: bogus/);
});

test("handleModelCommand list prints available models section", async () => {
	const { settingsPath, authPath } = tempAgentPaths();
	const { lines } = await captureConsole(() => handleModelCommand("list", [], settingsPath, authPath));
	assert.match(lines.join(""), /No authenticated Pi models|Available Models|Default model/i);
});

test("handleModelCommand set requires a model spec", async () => {
	const { settingsPath, authPath } = tempAgentPaths();
	await assert.rejects(
		() => handleModelCommand("set", [], settingsPath, authPath),
		/Usage: feynman model set/,
	);
});

test("handleModelCommand tier get/unset/set/invalid", async () => {
	const { settingsPath, authPath } = tempAgentPaths();

	{
		const { lines } = await captureConsole(() => handleModelCommand("tier", [], settingsPath, authPath));
		assert.equal(lines.join("\n").trim(), "not set");
	}

	{
		const { lines } = await captureConsole(() => handleModelCommand("tier", ["flex"], settingsPath, authPath));
		assert.match(lines.join("\n"), /Service tier set to flex/);
	}

	{
		const { lines } = await captureConsole(() => handleModelCommand("tier", [], settingsPath, authPath));
		assert.equal(lines.join("\n").trim(), "flex");
	}

	for (const clearWord of ["unset", "clear", "off"] as const) {
		await captureConsole(() => handleModelCommand("tier", ["flex"], settingsPath, authPath));
		const { lines } = await captureConsole(() => handleModelCommand("tier", [clearWord], settingsPath, authPath));
		assert.match(lines.join("\n"), /Cleared service tier override/);
	}

	await assert.rejects(
		() => handleModelCommand("tier", ["turbo"], settingsPath, authPath),
		/Usage: feynman model tier/,
	);
});

test("handleModelCommand rejects unknown subcommands", async () => {
	const { settingsPath, authPath } = tempAgentPaths();
	await assert.rejects(
		() => handleModelCommand("explode", [], settingsPath, authPath),
		/Unknown model command: explode/,
	);
});

test("handleAlphaCommand login uses result name then falls back to getUserName", async () => {
	{
		const { lines } = await captureConsole(() =>
			handleAlphaCommand("login", {
				login: async () => ({ userInfo: { name: "Ada" } }) as never,
				getUserName: () => "Fallback",
			}),
		);
		assert.match(lines.join("\n"), /alphaXiv login complete: Ada/);
	}

	{
		const { lines } = await captureConsole(() =>
			handleAlphaCommand("login", {
				login: async () => ({ userInfo: null }) as never,
				getUserName: () => "Grace",
			}),
		);
		assert.match(lines.join("\n"), /alphaXiv login complete: Grace/);
	}

	{
		const { lines } = await captureConsole(() =>
			handleAlphaCommand("login", {
				login: async () => ({}) as never,
				getUserName: () => null,
			}),
		);
		assert.equal(lines.join("\n").trim(), "alphaXiv login complete");
	}
});

test("handleAlphaCommand logout and status branches", async () => {
	let loggedOut = false;
	{
		const { lines } = await captureConsole(() =>
			handleAlphaCommand("logout", {
				logout: () => {
					loggedOut = true;
				},
			}),
		);
		assert.equal(loggedOut, true);
		assert.match(lines.join("\n"), /alphaXiv auth cleared/);
	}

	{
		const { lines } = await captureConsole(() =>
			handleAlphaCommand("status", {
				isLoggedIn: () => true,
				getUserName: () => "Curie",
			}),
		);
		assert.match(lines.join("\n"), /alphaXiv logged in as Curie/);
	}

	{
		const { lines } = await captureConsole(() =>
			handleAlphaCommand(undefined, {
				isLoggedIn: () => true,
				getUserName: () => null,
			}),
		);
		assert.equal(lines.join("\n").trim(), "alphaXiv logged in");
	}

	{
		const { lines } = await captureConsole(() =>
			handleAlphaCommand("status", {
				isLoggedIn: () => false,
			}),
		);
		assert.match(lines.join("\n"), /alphaXiv not logged in/);
	}
});

test("handleAlphaCommand rejects unknown actions", async () => {
	await assert.rejects(() => handleAlphaCommand("sync"), /Unknown alpha command: sync/);
});

test("handleUpdateCommand prints up-to-date when nothing changed", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-cli-update-"));
	const { lines } = await captureConsole(() =>
		handleUpdateCommand(root, root, undefined, {
			updateConfiguredPackages: async () => ({ updated: [], skipped: [] }),
		}),
	);
	assert.equal(lines.join("\n").trim(), "All packages up to date.");
});

test("handleUpdateCommand reports updated and skipped native packages", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-cli-update-"));
	const { lines } = await captureConsole(() =>
		handleUpdateCommand(root, root, undefined, {
			updateConfiguredPackages: async () => ({
				updated: ["npm:pi-btw"],
				skipped: ["npm:@samfp/pi-memory"],
			}),
		}),
	);
	const output = lines.join("\n");
	assert.match(output, /Updated npm:pi-btw/);
	assert.match(output, /Skipped npm:@samfp\/pi-memory on Node/);
	assert.match(output, /All packages up to date\./);
});

test("handleUpdateCommand soft-handles missing package manager and generative-ui failures", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-cli-update-"));

	{
		const { lines } = await captureConsole(() =>
			handleUpdateCommand(root, root, undefined, {
				updateConfiguredPackages: async () => {
					throw new Error("No supported package manager found in PATH");
				},
			}),
		);
		const output = lines.join("\n");
		assert.match(output, /No package manager is available for live package updates/);
		assert.match(output, /rerun the installer/);
	}

	{
		const { lines } = await captureConsole(() =>
			handleUpdateCommand(root, root, undefined, {
				updateConfiguredPackages: async () => {
					throw new Error("Installing pi-generative-ui failed: compile error");
				},
			}),
		);
		const output = lines.join("\n");
		assert.match(output, /Installing pi-generative-ui failed/);
		assert.match(output, /Skipped optional generative-ui update/);
	}
});

test("handleUpdateCommand rethrows unrelated errors", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-cli-update-"));
	await assert.rejects(
		() =>
			handleUpdateCommand(root, root, undefined, {
				updateConfiguredPackages: async () => {
					throw new Error("disk full");
				},
			}),
		/disk full/,
	);
});

test("handleUpdateCommand resolves named sources through resolvePackageUpdateSources", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-cli-update-"));
	const seen: Array<string | undefined> = [];
	await captureConsole(() =>
		handleUpdateCommand(root, root, "memory", {
			resolvePackageUpdateSources: (source) => {
				assert.equal(source, "memory");
				return ["npm:@samfp/pi-memory"];
			},
			updateConfiguredPackages: async (_wd, _agent, updateSource) => {
				seen.push(updateSource);
				return { updated: [], skipped: [] };
			},
		}),
	);
	assert.deepEqual(seen, ["npm:@samfp/pi-memory"]);
});

test("handlePackagesCommand list shows core packages and empty optional note on unsupported platforms", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-cli-packages-"));
	const { lines } = await captureConsole(() =>
		handlePackagesCommand("list", [], root, root, {
			platform: "linux",
			createSettingsManager: () => ({
				getPackages: () => [],
				flush: async () => undefined,
			}),
		}),
	);
	const output = lines.join("");
	assert.match(output, /Feynman Packages/);
	assert.match(output, new RegExp(CORE_PACKAGE_SOURCES[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
	assert.match(output, /No optional package presets are available on linux/);
	assert.match(output, /memory and session search/);
});

test("handlePackagesCommand list marks installed optional presets on darwin", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-cli-packages-"));
	const { lines } = await captureConsole(() =>
		handlePackagesCommand(undefined, [], root, root, {
			platform: "darwin",
			createSettingsManager: () => ({
				getPackages: () => ["npm:pi-generative-ui"],
				flush: async () => undefined,
			}),
		}),
	);
	const output = lines.join("");
	assert.match(output, /generative-ui \(installed\)/);
	assert.match(output, /feynman packages install <generative-ui\|all-extras>/);
});

test("handlePackagesCommand install validates targets and core aliases", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-cli-packages-"));

	await assert.rejects(
		() =>
			handlePackagesCommand("install", [], root, root, {
				platform: "linux",
				createSettingsManager: () => ({ getPackages: () => [], flush: async () => undefined }),
			}),
		/No optional package presets are available on linux/,
	);

	await assert.rejects(
		() =>
			handlePackagesCommand("install", [], root, root, {
				platform: "darwin",
				createSettingsManager: () => ({ getPackages: () => [], flush: async () => undefined }),
			}),
		/Usage: feynman packages install <generative-ui\|all-extras>/,
	);

	{
		const { lines } = await captureConsole(() =>
			handlePackagesCommand("install", ["memory"], root, root, {
				platform: "linux",
				createSettingsManager: () => ({ getPackages: () => [], flush: async () => undefined }),
			}),
		);
		assert.match(lines.join("\n"), /memory is installed by default as a core package/);
	}

	{
		const { lines } = await captureConsole(() =>
			handlePackagesCommand("install", ["generative-ui"], root, root, {
				platform: "linux",
				createSettingsManager: () => ({ getPackages: () => [], flush: async () => undefined }),
			}),
		);
		const output = lines.join("\n");
		assert.match(output, /generative-ui is not available on linux/);
		assert.match(output, /supports macOS only/);
	}

	{
		const { lines } = await captureConsole(() =>
			handlePackagesCommand("install", ["all-extras"], root, root, {
				platform: "linux",
				createSettingsManager: () => ({ getPackages: () => [], flush: async () => undefined }),
			}),
		);
		assert.match(lines.join("\n"), /No optional package presets are available on linux/);
	}

	await assert.rejects(
		() =>
			handlePackagesCommand("install", ["mystery"], root, root, {
				platform: "linux",
				createSettingsManager: () => ({ getPackages: () => [], flush: async () => undefined }),
			}),
		/Unknown package preset: mystery/,
	);

	await assert.rejects(
		() =>
			handlePackagesCommand("remove", [], root, root, {
				platform: "linux",
				createSettingsManager: () => ({ getPackages: () => [], flush: async () => undefined }),
			}),
		/Unknown packages command: remove/,
	);
});

test("handlePackagesCommand install gates standalone macOS generative-ui and already-installed sources", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-cli-packages-"));

	{
		const { lines } = await captureConsole(() =>
			handlePackagesCommand("install", ["generative-ui"], root, root, {
				platform: "darwin",
				isStandaloneBundle: true,
				createSettingsManager: () => ({ getPackages: () => [], flush: async () => undefined }),
			}),
		);
		const output = lines.join("\n");
		assert.match(output, /unavailable in the standalone macOS bundle/);
		assert.match(output, /install Feynman through npm/);
	}

	{
		const { lines } = await captureConsole(() =>
			handlePackagesCommand("install", ["generative-ui"], root, root, {
				platform: "darwin",
				isStandaloneBundle: false,
				createSettingsManager: () => ({
					getPackages: () => ["npm:pi-generative-ui"],
					flush: async () => undefined,
				}),
			}),
		);
		const output = lines.join("\n");
		assert.match(output, /npm:pi-generative-ui already installed/);
		assert.match(output, /Optional packages installed/);
	}
});

test("handlePackagesCommand install succeeds, soft-handles PM/generative-ui failures, and rethrows others", async () => {
	const root = mkdtempSync(join(tmpdir(), "feynman-cli-packages-"));
	let flushed = false;
	const installed: string[][] = [];

	{
		const { lines } = await captureConsole(() =>
			handlePackagesCommand("install", ["ui"], root, root, {
				platform: "darwin",
				isStandaloneBundle: false,
				createSettingsManager: () => ({
					getPackages: () => [],
					flush: async () => {
						flushed = true;
					},
				}),
				installPackageSources: async (_wd, _agent, sources) => {
					installed.push([...sources]);
					return { installed: sources, skipped: ["npm:@samfp/pi-memory"] };
				},
			}),
		);
		const output = lines.join("\n");
		assert.deepEqual(installed, [["npm:pi-generative-ui"]]);
		assert.equal(flushed, true);
		assert.match(output, /Skipped npm:@samfp\/pi-memory on Node/);
		assert.match(output, /Optional packages installed/);
	}

	{
		const { lines } = await captureConsole(() =>
			handlePackagesCommand("install", ["generative-ui"], root, root, {
				platform: "darwin",
				isStandaloneBundle: false,
				createSettingsManager: () => ({ getPackages: () => [], flush: async () => undefined }),
				installPackageSources: async () => {
					throw new Error("No supported package manager found");
				},
			}),
		);
		assert.match(lines.join("\n"), /No package manager is available for optional package installs/);
	}

	{
		const { lines } = await captureConsole(() =>
			handlePackagesCommand("install", ["generative-ui"], root, root, {
				platform: "darwin",
				isStandaloneBundle: false,
				createSettingsManager: () => ({ getPackages: () => [], flush: async () => undefined }),
				installPackageSources: async () => {
					throw new Error("Installing pi-generative-ui failed: native build");
				},
			}),
		);
		assert.match(lines.join("\n"), /Skipped optional generative-ui install/);
	}

	await assert.rejects(
		() =>
			handlePackagesCommand("install", ["generative-ui"], root, root, {
				platform: "darwin",
				isStandaloneBundle: false,
				createSettingsManager: () => ({ getPackages: () => [], flush: async () => undefined }),
				installPackageSources: async () => {
					throw new Error("permission denied");
				},
			}),
		/permission denied/,
	);
});
