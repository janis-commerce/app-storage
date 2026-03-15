/**
 * Retrieves the current application version from the device info.
 *
 * Uses `getVersion()` from `@janiscommerce/app-device-info` to obtain
 * the app version string (e.g. "1.2.3").
 *
 * If `@janiscommerce/app-device-info` is not installed, returns `null`
 * and version-based invalidation is silently disabled (graceful degradation).
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
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { getVersion } = require('@janiscommerce/app-device-info');
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
