import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		setupFiles: ['./test/setup.ts'],
		include: ['test/**/*.test.ts'],
		coverage: {
			provider: 'v8',
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
			'@': './lib',
			'test/*': 'test/*',
		},
	},
});
