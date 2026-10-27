import { buildApp } from './app.js';
import { getConfig, ConfigValidationError } from './config/index.js';

/**
 * HTTP server entrypoint. Builds the app, starts listening, and installs
 * SIGTERM/SIGINT handlers for graceful shutdown (drains in-flight requests
 * via app.close()).
 */
async function main(): Promise<void> {
  let config;
  try {
    config = getConfig();
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      // eslint-disable-next-line no-console
      console.error(`[config] ${err.message}`);
      process.exit(1);
    }
    throw err;
  }

  const app = await buildApp({ config });

  const shutdown = (signal: NodeJS.Signals): void => {
    app.log.info({ signal }, 'shutting down');
    app
      .close()
      .then(() => {
        app.log.info('shutdown complete');
        process.exit(0);
      })
      .catch((err: unknown) => {
        app.log.error({ err }, 'error during shutdown');
        process.exit(1);
      });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
  } catch (err) {
    app.log.error({ err }, 'failed to start server');
    process.exit(1);
  }
}

void main();
