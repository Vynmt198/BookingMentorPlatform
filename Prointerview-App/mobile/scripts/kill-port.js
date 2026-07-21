const { execSync } = require('child_process');

const port = String(process.argv[2] || '8081').replace(/\D/g, '');
if (!port) process.exit(0);

function killOnWindows() {
  try {
    const out = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const pids = [
      ...new Set(
        out
          .split(/\r?\n/)
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid))
      ),
    ];
    pids.forEach((pid) => {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
        console.log(`[start] freed port ${port} (PID ${pid})`);
      } catch {
        // process may have already exited
      }
    });
  } catch {
    // port already free
  }
}

function killOnUnix() {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, {
      shell: true,
      stdio: 'ignore',
    });
  } catch {
    // port already free
  }
}

if (process.platform === 'win32') {
  killOnWindows();
} else {
  killOnUnix();
}
