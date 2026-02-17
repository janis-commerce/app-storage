import { getVersion } from '@janiscommerce/app-device-info';

/**
 * Retrieves the current application version from the device info.
 *
 * Uses `getVersion()` from `@janiscommerce/app-device-info` to obtain
 * the app version string (e.g. "1.2.3").
 *
 * This is an optional peer dependency. If not installed, the function will
 * catch the import error and return `null`, causing `expireWithVersion` to
 * be silently ignored.
 *
 * @returns The application version string, or `null` if it cannot be obtained.
 *
 * @example
 * ```ts
 * const version = getAppVersion();
 * // "1.2.3" or null
 * ```
 */
export const getAppVersion = (): string | null => {
	try {
		const version = getVersion();

		if (typeof version !== 'string' || version.trim() === '') {
			return null;
		}

		return version;
	} catch (error) {
		console.warn('[app-storage] Failed to get app version:', error);
		return null;
	}
};
