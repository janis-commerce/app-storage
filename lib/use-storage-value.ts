import { useCallback, useState, useEffect } from 'react';
import Storage from './storage';

export const useStorageValue = <T = unknown>(key: string, storage: Storage): T | null => {
	const readValue = useCallback((): T | null => {
		try {
			return storage.get<T>(key) ?? null;
		} catch {
			return null;
		}
	}, [storage, key]);

	const [value, setValue] = useState<T | null>(readValue);

	useEffect(() => {
		const listener = storage.subscribe((changedKey: string) => {
			if (changedKey === key) {
				setValue(readValue());
			}
		});

		return () => {
			listener.remove();
		};
	}, [storage, key, readValue]);

	return value;
};
