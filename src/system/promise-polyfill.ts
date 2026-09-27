type PromiseWithResolvers<T> = {
	promise: Promise<T>;
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (reason?: unknown) => void;
};

declare global {
	interface PromiseConstructor {
		withResolvers?<T>(): PromiseWithResolvers<T>;
	}
}

export function ensurePromiseWithResolvers(promiseCtor: PromiseConstructor = Promise): boolean {
	if (typeof promiseCtor.withResolvers === "function") {
		return false;
	}

	promiseCtor.withResolvers = function withResolvers<T>(): PromiseWithResolvers<T> {
		let resolve!: (value: T | PromiseLike<T>) => void;
		let reject!: (reason?: unknown) => void;
		const promise = new Promise<T>((res, rej) => {
			resolve = res;
			reject = rej;
		});
		return { promise, resolve, reject };
	};
	return true;
}

ensurePromiseWithResolvers();
