import { execSync } from 'child_process';
import net from 'net';

/**
 * Checks if a given TCP port is currently occupied on 0.0.0.0 or 127.0.0.1
 */
export function isPortOccupied(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        resolve(err.code === 'EADDRINUSE');
      })
      .once('listening', () => {
        tester.close(() => resolve(false));
      })
      .listen(Number(port), '0.0.0.0');
  });
}

/**
 * Automatically terminates/kills any process occupying the target port.
 * Works seamlessly across Windows, Linux, macOS, and Android Termux.
 */
export function freePort(port) {
  if (!port) return;
  const targetPort = Number(port);
  const currentPid = process.pid;

  try {
    if (process.platform === 'win32') {
      // Windows: parse netstat output for listening PIDs on the target port
      try {
        const out = execSync('netstat -ano -p tcp', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const lines = out.split('\n');
        for (const line of lines) {
          if (line.includes(`:${targetPort}`) && line.includes('LISTENING')) {
            const parts = line.trim().split(/\s+/);
            const pid = Number(parts[parts.length - 1]);
            if (pid && pid !== currentPid) {
              console.log(`⚡ [Auto-Port] Port ${targetPort} is occupied by PID ${pid}. Freeing/overwriting port...`);
              try {
                execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
              } catch {}
            }
          }
        }
      } catch {}
    } else {
      // Unix / Linux / macOS / Android Termux
      // 1. Try fuser (Linux/Termux)
      try {
        execSync(`fuser -k -n tcp ${targetPort} 2>/dev/null`, { stdio: 'ignore' });
      } catch {}

      // 2. Try lsof (macOS / Linux / Termux)
      try {
        const out = execSync(`lsof -ti tcp:${targetPort} 2>/dev/null`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const pids = out.trim().split('\n').map((p) => Number(p.trim())).filter(Boolean);
        for (const pid of pids) {
          if (pid && pid !== currentPid) {
            console.log(`⚡ [Auto-Port] Port ${targetPort} is occupied by PID ${pid}. Freeing/overwriting port...`);
            try {
              process.kill(pid, 'SIGKILL');
            } catch {}
          }
        }
      } catch {}
    }
  } catch (err) {
    // Non-fatal fallback
  }
}
