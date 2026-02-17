import { describe, it, expect, beforeEach } from 'vitest';
import Storage from '@/index';
import { mockMMKVInstance, mockStorage, mockGetVersion } from './setup';

describe('Storage', () => {
	let storage: Storage;

	beforeEach(() => {
		mockStorage.clear();
		// Reset all mocks (clears call history, return values, and implementations)
		mockMMKVInstance.set.mockReset();
		mockMMKVInstance.getString.mockReset();
		mockMMKVInstance.delete.mockReset();
		mockMMKVInstance.clearAll.mockReset();
		mockGetVersion.mockReset();
		// Re-establish implementations
		mockMMKVInstance.set.mockImplementation((key: string, value: string) => {
			mockStorage.set(key, value);
		});
		mockMMKVInstance.getString.mockImplementation((key: string) => {
			const value = mockStorage.get(key);
			return value !== undefined ? value : undefined;
		});
		mockMMKVInstance.delete.mockImplementation((key: string) => {
			mockStorage.delete(key);
		});
		mockMMKVInstance.clearAll.mockImplementation(() => {
			mockStorage.clear();
		});
		mockGetVersion.mockReturnValue('1.0.0');
		storage = new Storage();
	});

	describe('constructor', () => {
		it('should create a new Storage instance with default id', () => {
			const defaultStorage = new Storage();
			expect(defaultStorage).toBeInstanceOf(Storage);
		});

		it('should create a new Storage instance with custom id', () => {
			const customStorage = new Storage({ id: 'custom-storage' });

			expect(customStorage).toBeInstanceOf(Storage);
		});
	});

	describe('set', () => {
		it.each([
			['string', 'test-key', 'test-value', '"test-value"'],
			['number', 'number-key', 123, '123'],
			['boolean true', 'boolean-key', true, 'true'],
			['boolean false', 'boolean-key', false, 'false'],
		])('should store a %s value', (type, key, value, expected) => {
			storage.set(key, value);
			expect(mockMMKVInstance.set).toHaveBeenCalledWith(key, expected);
		});

		it.each([
			['object', { name: 'test', value: 123 }],
			['array', [1, 2, 3]],
		])('should store %s as JSON string', (type, value) => {
			storage.set(`${type}-key`, value);
			expect(mockMMKVInstance.set).toHaveBeenCalledWith(`${type}-key`, JSON.stringify(value));
		});

		it('should not store null values', () => {
			storage.set('null-key', null);
			expect(mockMMKVInstance.set).not.toHaveBeenCalled();
		});

		it('should not store undefined values', () => {
			storage.set('undefined-key', undefined);
			expect(mockMMKVInstance.set).not.toHaveBeenCalled();
		});

		it('should not store with null key', () => {
			// @ts-expect-error - Testing null key
			storage.set(null, 'value');
			expect(mockMMKVInstance.set).not.toHaveBeenCalled();
		});

		it('should store object with TTL metadata', () => {
			const obj = { test: 'value' };
			storage.set('ttl-object', obj, { expiresAt: 30 });

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('ttl-object', JSON.stringify(obj));
			expect(mockMMKVInstance.set).toHaveBeenCalledWith(
				'ttl-object:__meta',
				expect.stringContaining('expiresAt'),
			);
		});

		it('should store array with TTL metadata', () => {
			const arr = [1, 2, 3];
			storage.set('ttl-array', arr, { expiresAt: 30 });

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('ttl-array', JSON.stringify(arr));
			expect(mockMMKVInstance.set).toHaveBeenCalledWith(
				'ttl-array:__meta',
				expect.stringContaining('expiresAt'),
			);
		});

		it('should handle JSON.stringify error and store as string', () => {
			const circular: Record<string, unknown> = {};
			circular.self = circular; // Create circular reference

			storage.set('circular', circular);

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('circular', '[object Object]');
		});

		it('should handle function values (JSON.stringify returns undefined)', () => {
			const fn = () => 'test';
			storage.set('function-key', fn);

			// JSON.stringify(function) returns undefined, so we fallback to String()
			// Arrow functions: () => 'test', Regular functions: function name() {}
			expect(mockMMKVInstance.set).toHaveBeenCalledWith('function-key', '() => "test"');
		});

		it('should handle Symbol values (JSON.stringify returns undefined)', () => {
			const sym = Symbol('test');
			storage.set('symbol-key', sym);

			// JSON.stringify(Symbol) returns undefined, so we fallback to String()
			expect(mockMMKVInstance.set).toHaveBeenCalledWith(
				'symbol-key',
				expect.stringContaining('Symbol'),
			);
		});

		it('should store appVersion in metadata when expireWithVersion is true', () => {
			mockGetVersion.mockReturnValue('2.0.0');
			storage.set('versioned-key', 'value', { expireWithVersion: true });

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('versioned-key', '"value"');
			expect(mockMMKVInstance.set).toHaveBeenCalledWith(
				'versioned-key:__meta',
				JSON.stringify({ appVersion: '2.0.0' }),
			);
		});

		it('should store both expiresAt and appVersion in metadata', () => {
			mockGetVersion.mockReturnValue('1.5.0');
			storage.set('both-key', { data: true }, { expiresAt: 60, expireWithVersion: true });

			expect(mockMMKVInstance.set).toHaveBeenCalledWith(
				'both-key',
				JSON.stringify({ data: true }),
			);

			const metaCall = mockMMKVInstance.set.mock.calls.find(
				(call: string[]) => call[0] === 'both-key:__meta',
			);
			expect(metaCall).toBeDefined();
			const meta = JSON.parse(metaCall![1]);
			expect(meta.expiresAt).toBeTypeOf('number');
			expect(meta.appVersion).toBe('1.5.0');
		});

		it('should not store appVersion in metadata when getVersion returns empty string', () => {
			mockGetVersion.mockReturnValue('');
			storage.set('no-version-key', 'value', { expireWithVersion: true });

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('no-version-key', '"value"');
			// No metadata call since version is invalid, but metadata deletion call is made
			expect(mockMMKVInstance.set).toHaveBeenCalledTimes(1);
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('no-version-key:__meta');
		});

		it('should not store metadata when expireWithVersion is false', () => {
			storage.set('no-expire-key', 'value', { expireWithVersion: false });

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('no-expire-key', '"value"');
			expect(mockMMKVInstance.set).toHaveBeenCalledTimes(1);
			// Should delete metadata since no options are set
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('no-expire-key:__meta');
		});

		it('should continue without appVersion in metadata when getVersion throws', () => {
			mockGetVersion.mockImplementation(() => {
				throw new Error('Device info unavailable');
			});
			storage.set('error-key', 'value', { expireWithVersion: true });

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('error-key', '"value"');
			// No metadata because getVersion failed and no other options set
			expect(mockMMKVInstance.set).toHaveBeenCalledTimes(1);
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('error-key:__meta');
		});

		it('should store string with TTL metadata', () => {
			storage.set('ttl-string', 'hello', { expiresAt: 10 });

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('ttl-string', '"hello"');
			expect(mockMMKVInstance.set).toHaveBeenCalledWith(
				'ttl-string:__meta',
				expect.stringContaining('expiresAt'),
			);
		});

		it('should save metadata with expiresAt: 0 (issue #2)', () => {
			storage.set('immediate', 'data', { expiresAt: 0 });

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('immediate', '"data"');
			expect(mockMMKVInstance.set).toHaveBeenCalledWith(
				'immediate:__meta',
				expect.stringContaining('expiresAt'),
			);
		});

		it('should clear appVersion metadata when set without expireWithVersion (issue #3)', () => {
			mockGetVersion.mockReturnValue('1.0.0');
			storage.set('key', 'v1', { expireWithVersion: true });

			// Verify metadata has appVersion
			const meta1 = JSON.parse(mockStorage.get('key:__meta') as string);
			expect(meta1.appVersion).toBe('1.0.0');

			// Set again without expireWithVersion
			storage.set('key', 'v2');

			// Metadata should be deleted (no expiresAt, no appVersion)
			expect(mockStorage.get('key:__meta')).toBeUndefined();
		});

		it('should preserve string type for numeric strings (issue #5)', () => {
			storage.set('code', '42');

			// Should be stored as JSON string
			expect(mockMMKVInstance.set).toHaveBeenCalledWith('code', '"42"');
		});

		it('should preserve leading zeros in strings (issue #5)', () => {
			storage.set('zip', '00123');

			// Should be stored as JSON string
			expect(mockMMKVInstance.set).toHaveBeenCalledWith('zip', '"00123"');
		});

		it('should preserve string "true" as string type (issue #5)', () => {
			storage.set('flag', 'true');

			// Should be stored as JSON string, not boolean
			expect(mockMMKVInstance.set).toHaveBeenCalledWith('flag', '"true"');
		});
	});

	describe('get', () => {
		it('should return null for non-existent key', () => {
			mockMMKVInstance.getString.mockReturnValue(undefined);
			const result = storage.get('non-existent');
			expect(result).toBeNull();
		});

		it('should return null for null key', () => {
			// @ts-expect-error - Testing null key
			const result = storage.get(null);
			expect(result).toBeNull();
		});

		it.each([
			[
				'parsed JSON object',
				{ name: 'test', value: 123 },
				JSON.stringify({ name: 'test', value: 123 }),
			],
			['parsed JSON array', [1, 2, 3], JSON.stringify([1, 2, 3])],
		])('should return %s', (description, expected, storedValue) => {
			mockMMKVInstance.getString
				.mockReturnValueOnce(undefined) // No metadata
				.mockReturnValueOnce(storedValue); // Actual value

			const result = storage.get('test-key');
			expect(result).toEqual(expected);
		});

		it.each([
			['boolean true', true, 'true'],
			['boolean false', false, 'false'],
			['number', 123, '123'],
			['string', 'plain string', 'plain string'],
		])('should return %s', (description, expected, storedValue) => {
			mockMMKVInstance.getString
				.mockReturnValueOnce(undefined) // No metadata
				.mockReturnValueOnce(storedValue); // Actual value

			const result = storage.get('test-key');
			expect(result).toBe(expected);
		});

		it('should handle corrupted metadata by removing key and returning null', () => {
			mockMMKVInstance.getString
				.mockReturnValueOnce('invalid json') // Corrupted metadata
				.mockReturnValueOnce('value');

			const result = storage.get('corrupted-key');

			expect(result).toBeNull();
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('corrupted-key');
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('corrupted-key:__meta');
		});

		it('should return null for expired key and clean up', () => {
			const expiredTime = Date.now() - 60000; // Expired 1 minute ago
			const expiredMeta = JSON.stringify({ expiresAt: expiredTime });

			mockMMKVInstance.getString
				.mockReturnValueOnce(expiredMeta) // Expired metadata
				.mockReturnValueOnce('value'); // Won't be reached

			const result = storage.get('expired-key');

			expect(result).toBeNull();
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('expired-key');
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('expired-key:__meta');
		});

		it('should return value when stored appVersion matches current version', () => {
			mockGetVersion.mockReturnValue('1.0.0');
			const meta = JSON.stringify({ appVersion: '1.0.0' });

			mockMMKVInstance.getString
				.mockReturnValueOnce(meta) // Metadata with matching version
				.mockReturnValueOnce(JSON.stringify({ data: 'test' })); // Actual value

			const result = storage.get('versioned-key');
			expect(result).toEqual({ data: 'test' });
			expect(mockMMKVInstance.delete).not.toHaveBeenCalled();
		});

		it('should return null and clean up when stored appVersion differs from current version', () => {
			mockGetVersion.mockReturnValue('2.0.0');
			const meta = JSON.stringify({ appVersion: '1.0.0' });

			mockMMKVInstance.getString
				.mockReturnValueOnce(meta) // Metadata with old version
				.mockReturnValueOnce('value');

			const result = storage.get('outdated-key');

			expect(result).toBeNull();
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('outdated-key');
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('outdated-key:__meta');
		});

		it('should return value when metadata has no appVersion (backward compatibility)', () => {
			const meta = JSON.stringify({ expiresAt: Date.now() + 60000 });

			mockMMKVInstance.getString
				.mockReturnValueOnce(meta) // Metadata without appVersion
				.mockReturnValueOnce('"old-data"'); // Actual value

			const result = storage.get('legacy-key');
			expect(result).toBe('old-data');
			expect(mockMMKVInstance.delete).not.toHaveBeenCalled();
		});

		it('should invalidate when getVersion fails but metadata has appVersion (strict mode - issue #4)', () => {
			mockGetVersion.mockImplementation(() => {
				throw new Error('Device info unavailable');
			});
			const meta = JSON.stringify({ appVersion: '1.0.0' });

			mockMMKVInstance.getString.mockReturnValueOnce(meta).mockReturnValueOnce('"data"');

			const result = storage.get('error-version-key');
			// STRICT: getAppVersion returns null on error, but metadata has appVersion → invalidate
			expect(result).toBeNull();
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('error-version-key');
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('error-version-key:__meta');
		});

		it('should check version before TTL expiration', () => {
			mockGetVersion.mockReturnValue('2.0.0');
			const meta = JSON.stringify({
				appVersion: '1.0.0',
				expiresAt: Date.now() + 60000, // Not yet expired
			});

			mockMMKVInstance.getString.mockReturnValueOnce(meta).mockReturnValueOnce('value');

			const result = storage.get('version-first-key');

			// Should be invalidated by version check, not TTL
			expect(result).toBeNull();
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('version-first-key');
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('version-first-key:__meta');
		});

		it('should check TTL expiration when version matches', () => {
			mockGetVersion.mockReturnValue('1.0.0');
			const meta = JSON.stringify({
				appVersion: '1.0.0',
				expiresAt: Date.now() - 60000, // Already expired
			});

			mockMMKVInstance.getString.mockReturnValueOnce(meta).mockReturnValueOnce('value');

			const result = storage.get('expired-version-key');

			expect(result).toBeNull();
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('expired-version-key');
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('expired-version-key:__meta');
		});

		it('should return value when version matches and TTL is valid', () => {
			mockGetVersion.mockReturnValue('1.0.0');
			const meta = JSON.stringify({
				appVersion: '1.0.0',
				expiresAt: Date.now() + 60000, // Not yet expired
			});

			mockMMKVInstance.getString
				.mockReturnValueOnce(meta)
				.mockReturnValueOnce(JSON.stringify({ result: true }));

			const result = storage.get('valid-key');
			expect(result).toEqual({ result: true });
			expect(mockMMKVInstance.delete).not.toHaveBeenCalled();
		});

		it('should return value when metadata has only appVersion and version matches', () => {
			mockGetVersion.mockReturnValue('3.0.0');
			const meta = JSON.stringify({ appVersion: '3.0.0' });

			mockMMKVInstance.getString
				.mockReturnValueOnce(meta)
				.mockReturnValueOnce('"only-version"');

			const result = storage.get('only-version-key');
			expect(result).toBe('only-version');
		});

		it('should return string "42" as string type, not number (issue #5)', () => {
			mockMMKVInstance.getString
				.mockReturnValueOnce(undefined) // No metadata
				.mockReturnValueOnce('"42"'); // JSON stringified string

			const result = storage.get<string>('code');

			expect(result).toBe('42');
			expect(typeof result).toBe('string');
		});

		it('should preserve leading zeros in string values (issue #5)', () => {
			mockMMKVInstance.getString
				.mockReturnValueOnce(undefined) // No metadata
				.mockReturnValueOnce('"00123"'); // JSON stringified string

			const result = storage.get<string>('zip');

			expect(result).toBe('00123');
			expect(typeof result).toBe('string');
		});

		it('should return string "true" as string type, not boolean (issue #5)', () => {
			mockMMKVInstance.getString
				.mockReturnValueOnce(undefined) // No metadata
				.mockReturnValueOnce('"true"'); // JSON stringified string

			const result = storage.get<string>('flag');

			expect(result).toBe('true');
			expect(typeof result).toBe('string');
		});
	});

	describe('remove', () => {
		it('should remove key and its metadata', () => {
			storage.remove('test-key');

			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('test-key');
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('test-key:__meta');
		});

		it('should not call delete for null key', () => {
			// @ts-expect-error - Testing null key
			storage.remove(null);
			expect(mockMMKVInstance.delete).not.toHaveBeenCalled();
		});
	});

	describe('clear', () => {
		it('should clear all keys from storage', () => {
			storage.clear();
			expect(mockMMKVInstance.clearAll).toHaveBeenCalled();
		});
	});

	describe('Backward compatibility with legacy format', () => {
		it('should parse legacy number with explicit plus sign', () => {
			mockMMKVInstance.getString
				.mockReturnValueOnce(undefined) // No metadata
				.mockReturnValueOnce('+123'); // Not valid JSON, but Number('+123') = 123

			const result = storage.get('legacy-plus-number');
			expect(result).toBe(123);
			expect(typeof result).toBe('number');
		});

		it('should parse legacy decimal without leading zero', () => {
			mockMMKVInstance.getString
				.mockReturnValueOnce(undefined) // No metadata
				.mockReturnValueOnce('.5'); // Not valid JSON, but Number('.5') = 0.5

			const result = storage.get('legacy-decimal');
			expect(result).toBe(0.5);
			expect(typeof result).toBe('number');
		});

		it('should parse legacy plain strings (no JSON.stringify)', () => {
			mockMMKVInstance.getString
				.mockReturnValueOnce(undefined) // No metadata
				.mockReturnValueOnce('hello world'); // Legacy format (plain string without quotes)

			const result = storage.get('legacy-string');
			expect(result).toBe('hello world');
			expect(typeof result).toBe('string');
		});
	});

	describe('Version-based expiration - edge cases', () => {
		it('should return value when there is no metadata at all (backward compatibility)', () => {
			mockMMKVInstance.getString
				.mockReturnValueOnce(undefined) // No metadata
				.mockReturnValueOnce('plain-value');

			const result = storage.get('no-meta-key');
			expect(result).toBe('plain-value');
			expect(mockMMKVInstance.delete).not.toHaveBeenCalled();
		});

		it('should store expiresAt metadata even when getVersion throws with expireWithVersion true', () => {
			mockGetVersion.mockImplementation(() => {
				throw new Error('Device info unavailable');
			});
			storage.set('fallback-key', 'value', { expiresAt: 30, expireWithVersion: true });

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('fallback-key', '"value"');
			const metaCall = mockMMKVInstance.set.mock.calls.find(
				(call: string[]) => call[0] === 'fallback-key:__meta',
			);
			expect(metaCall).toBeDefined();
			const meta = JSON.parse(metaCall![1]);
			expect(meta.expiresAt).toBeTypeOf('number');
			expect(meta.appVersion).toBeUndefined();
		});

		it('should delete key when metadata has only appVersion and version does not match', () => {
			mockGetVersion.mockReturnValue('5.0.0');
			const meta = JSON.stringify({ appVersion: '1.0.0' });

			mockMMKVInstance.getString.mockReturnValueOnce(meta).mockReturnValueOnce('old-value');

			const result = storage.get('mismatch-ver-key');
			expect(result).toBeNull();
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('mismatch-ver-key');
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('mismatch-ver-key:__meta');
		});

		it('should handle set and get round-trip with version-based expiration', () => {
			mockGetVersion.mockReturnValue('1.0.0');
			storage.set('roundtrip-key', { test: true }, { expireWithVersion: true });

			// Simulate reading back with same version
			const result = storage.get('roundtrip-key');
			expect(result).toEqual({ test: true });
		});

		it('should invalidate on get after app version update', () => {
			mockGetVersion.mockReturnValue('1.0.0');
			storage.set('upgrade-key', 'data', { expireWithVersion: true });

			// Simulate app upgrade
			mockGetVersion.mockReturnValue('2.0.0');
			const result = storage.get('upgrade-key');
			expect(result).toBeNull();
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('upgrade-key');
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('upgrade-key:__meta');
		});

		it('should not store metadata when no options are provided', () => {
			storage.set('simple-key', 'simple-value');
			expect(mockMMKVInstance.set).toHaveBeenCalledTimes(1);
			expect(mockMMKVInstance.set).toHaveBeenCalledWith('simple-key', '"simple-value"');
			expect(mockMMKVInstance.delete).toHaveBeenCalledWith('simple-key:__meta');
		});
	});
});
