# Changelog

## [Unreleased]

## [1.4.0] - 2026-04-09

### Added

- `useStorageValue(key, storage)` hook for reactive storage reads in React components — re-renders automatically when the value changes via MMKV listeners
- `Storage.subscribe(listener)` method to subscribe to value changes outside of React
- `react` added as optional peer dependency (required only when using `useStorageValue`)

### Changed

- Reorganized storage module into `lib/storage/` subfolder for cleaner project structure
- Switched coverage provider from V8 to Istanbul for accurate multi-environment coverage reporting
- Coverage thresholds enforced in CI (`test:coverage`)

## [1.3.0] - 2026-03-17

### Added

- Version-based invalidation: `expireWithVersion` option in `set()` to automatically expire stored data when the app version changes
- If `@janiscommerce/app-device-info` is not installed, version-based invalidation is silently skipped instead of crashing

### Changed

- `@janiscommerce/app-device-info` is now an optional peer dependency (only required for `expireWithVersion`)
- Updated `@janiscommerce/app-device-info` peer dependency to `^1.3.0`
- Replaced static import of `@janiscommerce/app-device-info` with dynamic `require()` for optional loading

## [1.2.0] - 2026-02-21

### Added

- support for React Native 0.80.2

### Changed

- upgrade CI/CD to Node 22
- upgrade GitHub Actions to checkout@v4 and setup-node@v4

## [1.1.0] - 2025-11-06

### Added

- support up to react 19

## [1.0.0] - 2025-10-13

### Added

- storage class
- vitest test config with its tests
- added readonly db method to have usage of storage methods
