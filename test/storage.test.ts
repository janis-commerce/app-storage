import { describe, it, expect, beforeEach, vi } from 'vitest';
import Storage from '@/index';
import { mockMMKVInstance, mockStorage } from './setup';

describe('Storage', () => {
	let storage: Storage;

	beforeEach(() => {
		storage = new Storage();
		mockStorage.clear();
		vi.clearAllMocks();
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
			['string', 'test-key', 'test-value', 'test-value'],
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

		it('should store string value with TTL metadata', () => {
			storage.set('ttl-string', 'value', { expiresAt: 30 });

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('ttl-string', 'value');
			expect(mockMMKVInstance.set).toHaveBeenCalledWith(
				'ttl-string:__meta',
				expect.stringContaining('expiresAt'),
			);
		});

		it('should store number value with TTL metadata', () => {
			storage.set('ttl-number', 123, { expiresAt: 30 });

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('ttl-number', '123');
			expect(mockMMKVInstance.set).toHaveBeenCalledWith(
				'ttl-number:__meta',
				expect.stringContaining('expiresAt'),
			);
		});

		it('should store boolean value with TTL metadata', () => {
			storage.set('ttl-bool', true, { expiresAt: 30 });

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('ttl-bool', 'true');
			expect(mockMMKVInstance.set).toHaveBeenCalledWith(
				'ttl-bool:__meta',
				expect.stringContaining('expiresAt'),
			);
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

		it('should handle JSON.stringify error and store as string', () => {
			const circular: Record<string, unknown> = {};
			circular.self = circular; // Create circular reference

			storage.set('circular', circular);

			expect(mockMMKVInstance.set).toHaveBeenCalledWith('circular', '[object Object]');
		});
	});

	describe('get', () => {
		it('should return null for non-existent key', () => {
			mockMMKVInstance.getString.mockReturnValue(null);
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
				.mockReturnValueOnce(null) // No metadata
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
				.mockReturnValueOnce(null) // No metadata
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
});
