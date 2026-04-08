import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStorageValue } from '@/use-storage-value';
import Storage from '@/storage';
import { mockMMKVInstance, mockStorage, mockListeners, notifyValueChanged } from './setup';

describe('useStorageValue', () => {
	let storage: Storage;

	beforeEach(() => {
		mockStorage.clear();
		mockListeners.clear();
		vi.clearAllMocks();
		// Re-establish MMKV mock implementations after vi.clearAllMocks()
		mockMMKVInstance.set.mockImplementation((key: string, val: string) =>
			mockStorage.set(key, val),
		);
		mockMMKVInstance.getString.mockImplementation((key: string) => mockStorage.get(key));
		mockMMKVInstance.delete.mockImplementation((key: string) => mockStorage.delete(key));
		mockMMKVInstance.clearAll.mockImplementation(() => mockStorage.clear());
		mockMMKVInstance.addOnValueChangedListener.mockImplementation(
			(cb: (key: string) => void) => {
				mockListeners.add(cb);
				return {
					remove: vi.fn(() => {
						mockListeners.delete(cb);
					}),
				};
			},
		);
		storage = new Storage();
	});

	it('returns initial value from storage', () => {
		mockStorage.set('user', '"Alice"');
		const { result } = renderHook(() => useStorageValue<string>('user', storage));
		expect(result.current).toBe('Alice');
	});

	it('returns null when key does not exist', () => {
		const { result } = renderHook(() => useStorageValue<string>('missing-key', storage));
		expect(result.current).toBeNull();
	});

	it('re-renders when the monitored key changes', async () => {
		mockStorage.set('score', '10');
		const { result } = renderHook(() => useStorageValue<number>('score', storage));
		expect(result.current).toBe(10);

		mockStorage.set('score', '42');
		await act(async () => {
			notifyValueChanged('score');
		});

		expect(result.current).toBe(42);
	});

	it('does not re-render when a different key changes', async () => {
		mockStorage.set('name', '"Bob"');
		const { result } = renderHook(() => useStorageValue<string>('name', storage));
		expect(result.current).toBe('Bob');

		await act(async () => {
			notifyValueChanged('other-key');
		});

		expect(result.current).toBe('Bob');
	});

	it('removes listener on unmount', () => {
		const { unmount } = renderHook(() => useStorageValue<string>('key', storage));
		expect(mockListeners.size).toBe(1);

		unmount();

		expect(mockListeners.size).toBe(0);
	});

	it('returns null when storage.get() throws', () => {
		vi.spyOn(storage, 'get').mockImplementation(() => {
			throw new Error('read error');
		});

		const { result } = renderHook(() => useStorageValue<string>('crash-key', storage));
		expect(result.current).toBeNull();
	});
});
