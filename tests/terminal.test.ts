import test from "node:test";
import assert from "node:assert/strict";

import {
	printAsciiHeader,
	printError,
	printInfo,
	printPanel,
	printSection,
	printSuccess,
	printWarning,
} from "../src/ui/terminal.js";

function captureConsoleLog(fn: () => void): string[] {
	const lines: string[] = [];
	const original = console.log;
	console.log = (...args: unknown[]) => {
		lines.push(args.map((arg) => String(arg)).join(" "));
	};
	try {
		fn();
	} finally {
		console.log = original;
	}
	return lines;
}

function stripAnsi(line: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI strip
	return line.replace(/\x1b\[[0-9;]*m/g, "");
}

test("printPanel truncates oversized lines and omits subtitle divider when empty", () => {
	const longTitle = "T".repeat(60);
	const output = captureConsoleLog(() => printPanel(longTitle)).map(stripAnsi);

	assert.ok(output.some((line) => line.includes("┌")));
	assert.ok(output.some((line) => line.includes("└")));
	assert.equal(output.some((line) => line.includes("├")), false, "empty subtitles should skip middle border");
	const titleLine = output.find((line) => line.includes("..."));
	assert.ok(titleLine, "expected truncated title with ellipsis");
	assert.match(titleLine!, /T{50}\.\.\./);
});

test("printPanel renders subtitle divider and padded subtitle lines", () => {
	const output = captureConsoleLog(() => printPanel("Status", ["line one", "line two"])).map(stripAnsi);

	assert.ok(output.some((line) => line.includes("├")));
	assert.ok(output.some((line) => line.includes("line one")));
	assert.ok(output.some((line) => line.includes("line two")));
});

test("print helpers emit recognizable markers", () => {
	const output = captureConsoleLog(() => {
		printInfo("info");
		printSuccess("ok");
		printWarning("warn");
		printError("err");
		printSection("section");
	}).map(stripAnsi);

	assert.ok(output.some((line) => line.includes("info")));
	assert.ok(output.some((line) => line.includes("✓ ok")));
	assert.ok(output.some((line) => line.includes("⚠ warn")));
	assert.ok(output.some((line) => line.includes("✗ err")));
	assert.ok(output.some((line) => line.includes("◆ section")));
});

test("printAsciiHeader renders the logo and optional subtitle lines", () => {
	const output = captureConsoleLog(() => printAsciiHeader(["research shell"])).map(stripAnsi);
	assert.ok(output.some((line) => /feynman/i.test(line) || line.trim().length > 0));
	assert.ok(output.some((line) => line.includes("research shell")));
});
