import { vi } from 'vitest';

// simulo el store de mmkv
const mockStorage = new Map<string, string>();

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
};

vi.mock('react-native-mmkv', () => ({
	MMKV: vi.fn().mockImplementation(() => mockMMKVInstance),
}));

// Mock @janiscommerce/app-device-info
const mockGetVersion = vi.fn(() => '1.0.0');

vi.mock('@janiscommerce/app-device-info', () => ({
	getVersion: mockGetVersion,
}));

export { mockMMKVInstance, mockStorage, mockGetVersion };
