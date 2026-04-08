import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		environmentMatchGlobs: [['test/use-storage-value.test.ts', 'jsdom']],
		setupFiles: ['./test/setup.ts'],
		server: {
			deps: {
				// Force Vitest to process these through its module resolver so vi.mock works
				inline: ['@janiscommerce/app-device-info'],
			},
		},
		include: ['test/**/*.test.ts'],
		coverage: {
			provider: 'istanbul',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', 'dist/', 'test/', '**/*.d.ts'],
			lines: 95,
			functions: 100,
			branches: 75,
			statements: 95,
		},

		typecheck: {
			tsconfig: './tsconfig.json',
		},
	},

	resolve: {
		alias: {
			'@': path.resolve(__dirname, './lib'),
			'test/*': 'test/*',
		},
	},
});
