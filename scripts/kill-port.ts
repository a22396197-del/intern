import { execSync } from 'child_process';

const targetPort = Number(process.env.PORT) || 3000;

console.log(`[Kill-Port] Checking for processes occupying port ${targetPort}...`);

try {
  if (process.platform === 'win32') {
    const output = execSync(`netstat -ano | findstr :${targetPort}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const lines = output.trim().split('\n');
    const pids = new Set<string>();
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const state = parts[3];
      const pid = parts[parts.length - 1];
      if (state === 'LISTENING' && pid && pid !== '0' && pid !== String(process.pid)) {
        pids.add(pid);
      }
    }
    if (pids.size > 0) {
      for (const pid of pids) {
        console.log(`[Kill-Port] Terminating process PID ${pid} on port ${targetPort}...`);
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        } catch (_e) {
          // Ignore if already terminated
        }
      }
      console.log(`[Kill-Port] Port ${targetPort} is now completely free.`);
    } else {
      console.log(`[Kill-Port] Port ${targetPort} is already free.`);
    }
  } else {
    try {
      execSync(`lsof -t -i :${targetPort} | xargs -r kill -9`, { stdio: 'ignore' });
      console.log(`[Kill-Port] Port ${targetPort} is now completely free.`);
    } catch (_e) {
      console.log(`[Kill-Port] Port ${targetPort} is already free.`);
    }
  }
} catch (_err) {
  console.log(`[Kill-Port] Port ${targetPort} is already free.`);
}
