import { vi } from 'vitest';

// vi.hoisted ensures these are available inside vi.mock factories (which are hoisted above const declarations)
const mockGetVersion = vi.hoisted(() => vi.fn(() => '1.0.0'));

// simulo el store de mmkv
const mockStorage = new Map<string, string>();

const mockListeners = new Set<(key: string) => void>();

const mockMMKVInstance = {
	set: vi.fn((key: string, value: string) => {
		mockStorage.set(key, value);
	}),
	getString: vi.fn((key: string) => {
		const value = mockStorage.get(key);
		return value !== undefined ? value : undefined;
	}),
	delete: vi.fn((key: string) => {
		mockStorage.delete(key);
	}),
	clearAll: vi.fn(() => {
		mockStorage.clear();
	}),
	addOnValueChangedListener: vi.fn((cb: (key: string) => void) => {
		mockListeners.add(cb);
		return {
			remove: vi.fn(() => {
				mockListeners.delete(cb);
			}),
		};
	}),
};

vi.mock('react-native-mmkv', () => ({
	MMKV: vi.fn().mockImplementation(() => mockMMKVInstance),
}));

// Mock getAppVersion directly — vi.mock('@janiscommerce/app-device-info') is unreliable with
// dynamic require() in ESM. We wrap mockGetVersion in a try/catch to preserve original semantics:
// tests that make mockGetVersion throw will cause getAppVersion() to return null (same as real code).
vi.mock('@/storage/helpers/get-app-version', () => ({
	getAppVersion: (): string | null => {
		try {
			const version = mockGetVersion();
			if (typeof version !== 'string' || version.trim() === '') return null;
			return version;
		} catch {
			return null;
		}
	},
}));

const notifyValueChanged = (key: string) => {
	mockListeners.forEach((listener) => listener(key));
};

export { mockMMKVInstance, mockStorage, mockGetVersion, mockListeners, notifyValueChanged };
