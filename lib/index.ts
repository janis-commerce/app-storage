import { MMKV } from 'react-native-mmkv';

interface StorageOptions {
	/**
	 * Identifier for the underlying MMKV instance.
	 * @remarks Defaults to 'app-storage' when omitted.
	 */
	id?: string;
}

/**
 * A thin wrapper around MMKV with optional per-key expiration (TTL).
 *
 * - Serializes objects/arrays to JSON on set.
 * - get() attempts JSON parse; otherwise returns string/number/boolean.
 * - Optional per-key expiration via `expiresAt` (minutes from now).
 * - Expired keys are automatically removed on get().
 * - remove() deletes the value and its expiration metadata.
 * @public
 */
class Storage {
	private readonly storage: MMKV;
	private static readonly META_SUFFIX = ':__meta';
	private static readonly MILLISECONDS_PER_MINUTE = 60_000;

	/**
	 * Creates a new Storage instance.
	 * @param options - Initialization options for the underlying MMKV instance.
	 */
	constructor(options: StorageOptions = {}) {
		const { id } = options;
		this.storage = new MMKV({ id: id || 'app-storage' });
	}

	private metaKey(key: string): string {
		return `${key}${Storage.META_SUFFIX}`;
	}

	/**
	 * Stores a value by key with optional expiration.
	 *
	 * Semantics:
	 * - key null/undefined: no-op
	 * - value null/undefined: no-op (null will not be stored; it is ignored)
	 * - string/number/boolean are stored as string
	 * - objects/arrays are serialized to JSON
	 *
	 * Expiration:
	 * - options.expiresAt: minutes from now until expiration.
	 * - Stored under `${key}:__meta` as an absolute timestamp in milliseconds.
	 *
	 * @param key - The storage key.
	 * @param value - The value to store.
	 * @param options - Optional expiration configuration.
	 */
	public set(key: string, value: unknown, options?: { expiresAt?: number }): void {
		if (key == null || value == null) return;

		const storageKey = key;
		const metaKey = this.metaKey(storageKey);

		const valueType = typeof value;
		if (valueType === 'string') {
			this.storage.set(storageKey, value as string);
			return;
		}

		if (valueType === 'number' || valueType === 'boolean') {
			this.storage.set(storageKey, String(value));
			return;
		}

		try {
			const serialized = JSON.stringify(value);
			this.storage.set(storageKey, serialized);
		} catch {
			this.storage.set(storageKey, String(value));
		}

		if (options?.expiresAt != null) {
			const minutes = options.expiresAt;
			const expiresAt = Date.now() + minutes * Storage.MILLISECONDS_PER_MINUTE;

			this.storage.set(metaKey, JSON.stringify({ expiresAt }));
		}
	}

	/**
	 * Retrieves a value by key. If expired or metadata is invalid, the key is removed and null is returned.
	 * @typeParam T - Expected value type after JSON parse.
	 * @param key - The storage key.
	 * @returns Parsed JSON as T, or string/number/boolean; null if missing/expired/invalid.
	 */
	public get<T = unknown>(key: string): T | null | undefined {
		if (key == null) return null;

		const storageKey = key;
		const metaKey = this.metaKey(storageKey);

		const metaRaw = this.storage.getString(metaKey);

		if (metaRaw != null) {
			try {
				const meta = JSON.parse(metaRaw) as { expiresAt?: number };
				if (meta?.expiresAt != null && Date.now() > meta.expiresAt) {
					this.storage.delete(storageKey);
					this.storage.delete(metaKey);
					return null;
				}
			} catch {
				// If metadata is invalid/corrupt, delete to avoid inconsistencies
				this.storage.delete(storageKey);
				this.storage.delete(metaKey);
				return null;
			}
		}

		const stored = this.storage.getString(storageKey);

		if (stored == null) return null;

		try {
			return JSON.parse(stored) as T;
		} catch {
			if (stored === 'true') return true as unknown as T;
			if (stored === 'false') return false as unknown as T;
			const asNumber = Number(stored);
			if (!Number.isNaN(asNumber) && stored.trim() !== '') {
				return asNumber as unknown as T;
			}
			return stored as unknown as T;
		}
	}

	/**
	 * Removes a key and its expiration metadata.
	 * @param key - The storage key to remove.
	 */
	public remove(key: string): void {
		if (key == null) return;
		const storageKey = key;
		const metaKey = this.metaKey(storageKey);
		this.storage.delete(storageKey);
		this.storage.delete(metaKey);
	}

	/**
	 * Clears all keys from the current MMKV instance.
	 */
	public clear(): void {
		this.storage.clearAll();
	}
}

export default Storage;
