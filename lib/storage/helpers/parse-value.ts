/**
 * Parses a stored string value back to its original type.
 *
 * Attempts JSON parse first, then tries boolean, number, and finally string.
 *
 * @typeParam T - Expected return type
 * @param stored - The string value from storage
 * @returns Parsed value as type T
 *
 * @example
 * parseValue('hello')           // => 'hello'
 * parseValue('42')              // => 42
 * parseValue('true')            // => true
 * parseValue('{"a":1}')         // => { a: 1 }
 * parseValue('[1,2]')           // => [1, 2]
 */
export const parseValue = <T = unknown>(stored: string): T => {
	try {
		return JSON.parse(stored) as T;
	} catch {
		// Try number
		const asNumber = Number(stored);
		if (!Number.isNaN(asNumber) && stored.trim() !== '') {
			return asNumber as unknown as T;
		}

		// Fallback to string
		return stored as unknown as T;
	}
};
