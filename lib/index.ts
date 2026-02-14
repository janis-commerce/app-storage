import { MMKV } from 'react-native-mmkv';
import { getAppVersion, serializeValue, parseValue } from './helpers';

interface StorageOptions {
	/** MMKV instance ID (default: 'app-storage') */
	id?: string;
}

interface SetOptions {
	/** Minutes until expiration */
	expiresAt?: number;
	/** Invalidate when app version changes */
	expireWithVersion?: boolean;
}

interface Metadata {
	/** Expiration timestamp in ms */
	expiresAt?: number;
	/** App version when stored */
	appVersion?: string;
}

/**
 * MMKV wrapper with TTL and version-based invalidation.
 * Supports auto-serialization, expiration, and version tracking.
 */
class Storage {
	private static readonly META_SUFFIX = ':__meta';
	private static readonly MILLISECONDS_PER_MINUTE = 60_000;

	/** MMKV instance for advanced operations */
	public readonly db: MMKV;

	/** @param options.id - MMKV instance ID */
	constructor(options: StorageOptions = {}) {
		this.db = new MMKV({ id: options.id || 'app-storage' });
	}

	private metaKey(key: string): string {
		return `${key}${Storage.META_SUFFIX}`;
	}

	/** Saves metadata (TTL and/or version) for a key */
	private saveMetadata(key: string, options?: SetOptions): void {
		if (!options?.expiresAt && !options?.expireWithVersion) return;

		const meta: Metadata = {};

		if (options.expiresAt != null) {
			meta.expiresAt = Date.now() + options.expiresAt * Storage.MILLISECONDS_PER_MINUTE;
		}

		if (options.expireWithVersion === true) {
			const version = getAppVersion();
			if (version != null) meta.appVersion = version;
		}

		if (meta.expiresAt != null || meta.appVersion != null) {
			this.db.set(this.metaKey(key), JSON.stringify(meta));
		}
	}

	/** Checks if key is expired (version or TTL) and removes it */
	private isExpired(key: string): boolean {
		const metaRaw = this.db.getString(this.metaKey(key));

		if (metaRaw == null) return false;

		try {
			const meta = JSON.parse(metaRaw) as Metadata;

			if (meta.appVersion != null) {
				const currentVersion = getAppVersion();
				if (currentVersion != null && currentVersion !== meta.appVersion) {
					this.remove(key);
					return true;
				}
			}

			if (meta.expiresAt != null && Date.now() > meta.expiresAt) {
				this.remove(key);
				return true;
			}

			return false;
		} catch {
			this.remove(key);
			return true;
		}
	}

	/**
	 * Stores a value with optional expiration.
	 * @param options.expiresAt - Minutes until expiration
	 * @param options.expireWithVersion - Invalidate on version change
	 */
	public set(key: string, value: unknown, options?: SetOptions): void {
		if (key == null || value == null) return;

		this.db.set(key, serializeValue(value));
		this.saveMetadata(key, options);
	}

	/**
	 * Gets a value. Returns null if missing/expired. Auto-removes expired keys.
	 * @typeParam T - Expected return type
	 */
	public get<T = unknown>(key: string): T | null | undefined {
		if (key == null) return null;

		if (this.isExpired(key)) return null;

		const stored = this.db.getString(key);

		if (stored == null) return null;

		return parseValue<T>(stored);
	}

	/** Removes a key and its metadata */
	public remove(key: string): void {
		if (key == null) return;

		this.db.delete(key);
		this.db.delete(this.metaKey(key));
	}

	/** Clears all keys */
	public clear(): void {
		this.db.clearAll();
	}
}

export default Storage;
