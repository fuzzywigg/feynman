import assert from "node:assert/strict";
import test from "node:test";

import { ensurePromiseWithResolvers } from "../src/system/promise-polyfill.js";

test("ensurePromiseWithResolvers is a no-op when withResolvers already exists", () => {
	assert.equal(typeof Promise.withResolvers, "function");
	assert.equal(ensurePromiseWithResolvers(Promise), false);
});

test("ensurePromiseWithResolvers installs a working polyfill when missing", async () => {
	type PromiseCtor = PromiseConstructor & {
		withResolvers?: <T>() => {
			promise: Promise<T>;
			resolve: (value: T | PromiseLike<T>) => void;
			reject: (reason?: unknown) => void;
		};
	};

	const FakePromise = function FakePromise<T>(
		executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: unknown) => void) => void,
	) {
		return new Promise<T>(executor);
	} as unknown as PromiseCtor;

	assert.equal(typeof FakePromise.withResolvers, "undefined");
	assert.equal(ensurePromiseWithResolvers(FakePromise), true);
	assert.equal(typeof FakePromise.withResolvers, "function");

	const { promise, resolve } = FakePromise.withResolvers!<string>();
	resolve("ok");
	assert.equal(await promise, "ok");

	const rejected = FakePromise.withResolvers!<never>();
	rejected.reject(new Error("boom"));
	await assert.rejects(rejected.promise, /boom/);

	assert.equal(ensurePromiseWithResolvers(FakePromise), false);
});
