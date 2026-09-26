// Fatal-process safeguards.
//
// An uncaught exception can leave the WhatsApp session, file state, or HTTP
// server in an unknown state. Log a redacted error and let the process manager
// restart a clean process instead of continuing in a potentially corrupted state.
import { redactSecrets } from './security.js';

let shuttingDown = false;

function fatal(reason, err) {
  if (shuttingDown) return;
  shuttingDown = true;
  const message = redactSecrets(err?.stack || err?.message || err || reason);
  console.error('🛑 [Fatal]', message);
  setTimeout(() => process.exit(1), 50).unref();
}

process.on('uncaughtException', (err) => fatal('uncaughtException', err));
process.on('unhandledRejection', (reason) => fatal('unhandledRejection', reason));
