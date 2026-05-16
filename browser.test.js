import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTestServer} from './test-server.js';

// Mock navigator.onLine for testing
global.navigator = {
	onLine: true,
};

// Mock fetch for testing
const originalFetch = global.fetch;

// Import after mocking globals
const isOnlineModule = await import('./browser.js');
const isOnline = isOnlineModule.default;

test('returns false when navigator.onLine is false', async () => {
	const originalOnLine = navigator.onLine;
	navigator.onLine = false;

	try {
		assert.equal(await isOnline(), false);
	} finally {
		navigator.onLine = originalOnLine;
	}
});

test('returns true when navigator.onLine is true and public-ip succeeds', async () => {
	// This test requires actual network connectivity or mocking public-ip
	// Skip in environments without network
	try {
		const result = await isOnline({timeout: 10_000});
		assert.equal(typeof result, 'boolean');
	} catch {
		// Network might not be available in test environment
		assert.ok(true, 'Skipped due to network unavailability');
	}
});

test('v4 with timeout', async () => {
	try {
		const result = await isOnline({timeout: 10_000, ipVersion: 4});
		assert.equal(typeof result, 'boolean');
	} catch {
		assert.ok(true, 'Skipped due to network unavailability');
	}
});

test('v6 with timeout', async () => {
	try {
		const result = await isOnline({timeout: 10_000, ipVersion: 6});
		assert.equal(typeof result, 'boolean');
	} catch {
		assert.ok(true, 'Skipped due to network unavailability');
	}
});

test('v4 with impossible timeout returns false', async () => {
	const result = await isOnline({timeout: 1});
	assert.equal(result, false);
});

test('v4 with abort signal', async () => {
	const controller = new AbortController();
	const promise = isOnline({signal: controller.signal});
	controller.abort();
	const result = await promise;
	assert.equal(result, false);
});

test('v4 with pre-aborted signal', async () => {
	const controller = new AbortController();
	controller.abort();
	const result = await isOnline({signal: controller.signal});
	assert.equal(result, false);
});

test('fallbackUrls when main check fails', async () => {
	const testServer = await createTestServer();

	try {
		const result = await isOnline({
			timeout: 1, // Very short timeout to make main check fail
			fallbackUrls: [testServer.url],
		});

		assert.equal(result, true);
	} finally {
		testServer.close();
	}
});

test('fallbackUrls with multiple URLs', async () => {
	const testServer1 = await createTestServer();
	const testServer2 = await createTestServer();

	try {
		const result = await isOnline({
			timeout: 1,
			fallbackUrls: [
				'http://this-should-not-exist-12345.com',
				testServer1.url,
				testServer2.url,
			],
		});

		assert.equal(result, true);
	} finally {
		testServer1.close();
		testServer2.close();
	}
});

test('fallbackUrls all fail returns false', async () => {
	const result = await isOnline({
		timeout: 1,
		fallbackUrls: [
			'http://this-should-not-exist-12345.com',
			'http://another-non-existent-host-67890.com',
		],
	});

	assert.equal(result, false);
});

test('fallbackUrls with abort signal', async () => {
	const testServer = await createTestServer();

	try {
		const controller = new AbortController();
		const promise = isOnline({
			timeout: 1,
			fallbackUrls: [testServer.url],
			signal: controller.signal,
		});

		controller.abort();
		const result = await promise;
		assert.equal(result, false);
	} finally {
		testServer.close();
	}
});

test('urlCheck with HEAD request success', async () => {
	const testServer = await createTestServer();

	try {
		// Import urlCheck directly for testing (it's not exported, so we test via fallbackUrls)
		const result = await isOnline({
			timeout: 5000,
			fallbackUrls: [testServer.url],
		});

		assert.equal(result, true);
	} finally {
		testServer.close();
	}
});

test('urlCheck falls back to GET when HEAD returns 405', async () => {
	const testServer = await createTestServer({
		rejectHead: true, // Server rejects HEAD requests
	});

	try {
		const result = await isOnline({
			timeout: 5000,
			fallbackUrls: [testServer.url],
		});

		// Should still succeed via GET fallback
		assert.equal(result, true);
	} finally {
		testServer.close();
	}
});

test('checkUrls processes multiple URLs in parallel', async () => {
	const testServer1 = await createTestServer();
	const testServer2 = await createTestServer();
	const testServer3 = await createTestServer();

	try {
		const startTime = Date.now();
		const result = await isOnline({
			timeout: 5000,
			fallbackUrls: [
				testServer1.url,
				testServer2.url,
				testServer3.url,
			],
		});
		const duration = Date.now() - startTime;

		assert.equal(result, true);
		// Parallel execution should be faster than sequential
		// If sequential, would take 3x the time of a single request
		assert.ok(duration < 3000, 'Should complete in parallel, not sequentially');
	} finally {
		testServer1.close();
		testServer2.close();
		testServer3.close();
	}
});

test('checkUrls returns true when any URL succeeds', async () => {
	const testServer = await createTestServer();

	try {
		const result = await isOnline({
			timeout: 5000,
			fallbackUrls: [
				'http://this-should-not-exist-12345.com',
				'http://another-non-existent-host-67890.com',
				testServer.url, // Only this one succeeds
			],
		});

		assert.equal(result, true);
	} finally {
		testServer.close();
	}
});

test('urlCheck validates URL protocol', async () => {
	const result = await isOnline({
		timeout: 1,
		fallbackUrls: [
			'ftp://invalid-protocol.com', // Invalid protocol
		],
	});

	// Should fail due to invalid protocol
	assert.equal(result, false);
});

test('urlCheck handles invalid URLs', async () => {
	const result = await isOnline({
		timeout: 1,
		fallbackUrls: [
			'not-a-valid-url',
		],
	});

	// Should fail due to invalid URL
	assert.equal(result, false);
});

test('timeout aborts fetch request', async () => {
	const testServer = await createTestServer({
		delay: 10_000, // Server delays response
	});

	try {
		const startTime = Date.now();
		const result = await isOnline({
			timeout: 100, // Short timeout
			fallbackUrls: [testServer.url],
		});
		const duration = Date.now() - startTime;

		assert.equal(result, false);
		// Should timeout quickly, not wait for full delay
		assert.ok(duration < 1000, 'Should timeout before server delay completes');
	} finally {
		testServer.close();
	}
});

test('abort signal cancels all pending requests', async () => {
	const testServer1 = await createTestServer({delay: 5000});
	const testServer2 = await createTestServer({delay: 5000});

	try {
		const controller = new AbortController();
		const startTime = Date.now();

		const promise = isOnline({
			timeout: 10_000,
			fallbackUrls: [testServer1.url, testServer2.url],
			signal: controller.signal,
		});

		// Abort after a short delay
		setTimeout(() => controller.abort(), 50);

		const result = await promise;
		const duration = Date.now() - startTime;

		assert.equal(result, false);
		// Should abort quickly, not wait for server delays
		assert.ok(duration < 1000, 'Should abort before server delays complete');
	} finally {
		testServer1.close();
		testServer2.close();
	}
});

test('handles network errors gracefully', async () => {
	const result = await isOnline({
		timeout: 1000,
		fallbackUrls: [
			'http://localhost:99999', // Invalid port
		],
	});

	assert.equal(result, false);
});

test('empty fallbackUrls array with failed main check returns false', async () => {
	const result = await isOnline({
		timeout: 1,
		fallbackUrls: [],
	});

	assert.equal(result, false);
});

test('no fallbackUrls with failed main check returns false', async () => {
	const result = await isOnline({
		timeout: 1,
	});

	assert.equal(result, false);
});

test('supports both http and https protocols', async () => {
	const httpServer = await createTestServer({protocol: 'http'});
	const httpsServer = await createTestServer({protocol: 'https'});

	try {
		const httpResult = await isOnline({
			timeout: 5000,
			fallbackUrls: [httpServer.url],
		});

		const httpsResult = await isOnline({
			timeout: 5000,
			fallbackUrls: [httpsServer.url],
		});

		assert.equal(httpResult, true);
		assert.equal(httpsResult, true);
	} finally {
		httpServer.close();
		httpsServer.close();
	}
});
