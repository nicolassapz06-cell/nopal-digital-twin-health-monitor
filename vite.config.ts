/**
 * ⚠️ VITE CONFIG — DO NOT MODIFY unless you know what you're doing.
 * This config includes custom plugins for the sandbox environment.
 * Modifying it can break the dev server, HMR, and Tailwind.
 */
import { buildRecord, createSandboxLogger, createViteLogger, writeRecord, type SandboxLogRecord } from '@sticklightapp/sandbox-logger';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';
import { existsSync, constants as fsConstants } from 'fs';
import { access, readFile } from 'fs/promises';
import path from 'path';
import { createLogger, defineConfig, PluginOption, type HotPayload, type Plugin, type Update, type ViteDevServer } from 'vite';

// Check if we're in the monorepo (local dev) vs standalone (sandbox)
const localDevToolsPath = path.resolve(__dirname, '../../libs/sandbox-dev-scripts-injector/src');
const localSandboxLogPath = path.resolve(__dirname, '../../packages/sandbox-logger/src');
const isLocalDev = existsSync(localDevToolsPath);

const defaultLogger = createLogger();

// Every record written here conforms to SandboxLogRecord (@sticklightapp/sandbox-logger). Consumers read
// the schema, never this file — see the package README before changing what is emitted.
const sink = createSandboxLogger();
const emit = (record: SandboxLogRecord) => writeRecord(sink, record);

// Fallback only: plugins and dependencies that bypass Vite's logger and write straight to the
// console. Vite's own errors take the customLogger path below, where the fields are still intact.
console.error = (...args: unknown[]) => {
	const error = args.find((arg): arg is Error => arg instanceof Error);
	const message = args
		.filter((arg) => arg !== error)
		.map((arg) => {
			if (typeof arg === 'object' && arg !== null) {
				try {
					return JSON.stringify(arg);
				} catch {
					return String(arg);
				}
			}
			return String(arg);
		})
		.join(' ');

	emit(buildRecord('error', message || (error?.message ?? ''), error ? { error } : undefined));
};

// Vite plugin to inject sandbox dev tools in dev mode only
function injectDevToolsPlugin(): Plugin {
	return {
		name: 'inject-dev-tools',
		transformIndexHtml: {
			order: 'pre',
			handler(html) {
				return {
					html,
					tags: [
						{
							tag: 'script',
							attrs: { type: 'module' },
							children: `import '@elementor/sandbox-dev-scripts-injector';`,
							injectTo: 'head-prepend',
						},
					],
				};
			},
		},
		apply: 'serve', // Only in dev mode
	};
}

// Vite plugin to inject Tailwind CDN in dev mode
function tailwindDevPlugin(): PluginOption {
	const themeCssPath = path.resolve(__dirname, './src/theme.css');

	let themeCssCache: string | null = null;

	async function readThemeCss(): Promise<string> {
		if (themeCssCache !== null) {
			return themeCssCache;
		}

		try {
			await access(themeCssPath, fsConstants.F_OK);

			themeCssCache = await readFile(themeCssPath, 'utf-8');

			emit({ ts: Date.now(), level: 'info', source: 'devserver', event: 'tailwind-theme-read', message: themeCssPath });
		} catch {
			themeCssCache = '';

			emit({ ts: Date.now(), level: 'warn', source: 'devserver', event: 'tailwind-theme-missing', message: themeCssPath });
		}

		return themeCssCache;
	}

	return [
		{
			name: 'tailwind-cdn',
			configureServer(server: ViteDevServer) {
				server.watcher.add(themeCssPath);

				const invalidate = (filePath: string) => {
					if (path.resolve(filePath) !== themeCssPath) {
						return;
					}

					themeCssCache = null;

					server.ws.send({ type: 'full-reload', path: '*' });

					emit({ ts: Date.now(), level: 'info', source: 'devserver', event: 'tailwind-theme-invalidated', message: themeCssPath });
				};

				server.watcher.on('change', invalidate);
				server.watcher.on('add', invalidate);
				server.watcher.on('unlink', invalidate);
			},
			transformIndexHtml: {
				order: 'pre',
				async handler(html) {
					return {
						html,
						tags: [
							{
								tag: 'script',
								attrs: {
									src: 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4.1.18/dist/index.global.min.js',
									integrity: 'sha384-WrpyCFNrMmN/IC7KmMNiXxIouXEFpoDIuJ2P+ys++uYEzegAW2MSl+X6Unsahaij',
									crossorigin: 'anonymous',
								},
								injectTo: 'head-prepend',
							},
							{
								tag: 'style',
								attrs: { type: 'text/tailwindcss' },
								children: await readThemeCss(),
								injectTo: 'head-prepend',
							},
						],
					};
				},
			},
			apply: 'serve', // Only in dev mode.
		},
	];
}

// Vite plugin to log build lifecycle events
function structuredLoggerPlugin() {
	return {
		name: 'structured-logger',
		configureServer(server: ViteDevServer) {
			const originalSend = server.ws.send.bind(server.ws);
			server.ws.send = (payload: HotPayload) => {
				if (payload.type === 'update') {
					payload.updates.forEach((u: Update) => emit({ ts: Date.now(), level: 'info', source: 'devserver', event: 'hmr-update', message: u.path, file: u.path }));
				} else if (payload.type === 'full-reload') {
					emit({ ts: Date.now(), level: 'info', source: 'devserver', event: 'page-reload', message: payload.path ?? '*' });
				}
				return originalSend(payload);
			};
		},
		buildEnd(error?: Error) {
			if (error) {
				emit({ ...buildRecord('error', error.message, { error }), event: 'build-error' });
			} else {
				emit({ ts: Date.now(), level: 'info', source: 'devserver', event: 'build-success', message: 'build succeeded' });
			}
		},
	};
}

/**
 * Suppresses Vite's default error overlay while preserving HMR reload.
 *
 * Why not `server.hmr.overlay: false`?
 * That setting hides the overlay but also breaks HMR — once an error occurs,
 * subsequent fixes no longer trigger a page reload.
 *
 * Instead, this plugin replaces the built-in `ErrorOverlay` class with a no-op
 * stub that immediately removes itself, so errors never block the screen and
 * HMR continues to work normally after the error is resolved.
 */
function viteCustomErrorOverlay(): Plugin {
	return {
		name: 'custom-error-overlay',
		apply: (config) => config.mode === 'development',
		transform(code, id, opts = {}) {
			if (opts?.ssr) {
				return;
			}
			if (!id.includes('vite/dist/client/client.mjs')) {
				return;
			}

			const errorOverlayHTML = 'class ErrorOverlay extends HTMLElement {close() {this.parentNode?.removeChild(this);}}';

			return code.replace('class ErrorOverlay', `${errorOverlayHTML} \n class OldErrorOverlay`);
		},
	};
}

// https://vite.dev/config/
export default defineConfig(() => {
	return {
		// createViteLogger overrides error() too, so RollupError fields (plugin, loc, frame)
		// reach the log as real fields instead of being formatted into one string.
		customLogger: createViteLogger(defaultLogger, emit),
		server: {
			host: '0.0.0.0', // Bind to all interfaces (required for sandbox proxy access)
			port: 5173,
			strictPort: true, // Fail instead of silently switching ports
			warmup: {
				clientFiles: ['./src/main.tsx'], // Pre-transform entry on startup
			},
			watch: {
				ignored: ['**/.sc/**', '**/vite-ignore/**'],
			},
		},
		optimizeDeps: {
			include: ['react', 'react-dom', 'react-router', '@supabase/supabase-js', 'lucide-react'],
		},
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src'),
				// Local dev: resolve to workspace library
				// Sandbox: uses node_modules (npm package)
				...(isLocalDev && {
					'@elementor/sandbox-dev-scripts-injector': localDevToolsPath,
					'@sticklightapp/sandbox-logger': localSandboxLogPath,
				}),
			},
			dedupe: ['react', 'react-dom', 'react-router'],
		},
		plugins: [injectDevToolsPlugin(), tailwindcss(), tailwindDevPlugin(), structuredLoggerPlugin(), react(), viteCustomErrorOverlay()],
		build: { assetsInlineLimit: 100000 },
	};
});
