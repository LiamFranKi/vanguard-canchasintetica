const { exec } = require('child_process');
const os = require('os');

const platform = os.platform();
const ports = [3000, 5000]; // Puerto del cliente y servidor

function killPortWindows(port) {
  return new Promise((resolve, reject) => {
    // Encontrar el PID del proceso que usa el puerto
    exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
      if (error) {
        console.log(`Puerto ${port} no está en uso o no se encontró proceso`);
        resolve();
        return;
      }

      const lines = stdout.split('\n');
      const pids = new Set();

      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length > 0) {
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid)) {
            pids.add(pid);
          }
        }
      });

      if (pids.size === 0) {
        console.log(`No se encontraron procesos en el puerto ${port}`);
        resolve();
        return;
      }

      // Matar cada proceso
      const killPromises = Array.from(pids).map(pid => {
        return new Promise((resolveKill) => {
          exec(`taskkill /PID ${pid} /F`, (killError) => {
            if (killError) {
              console.log(`Error al matar proceso ${pid}: ${killError.message}`);
            } else {
              console.log(`✓ Proceso ${pid} en puerto ${port} terminado`);
            }
            resolveKill();
          });
        });
      });

      Promise.all(killPromises).then(() => resolve());
    });
  });
}

function killPortUnix(port) {
  return new Promise((resolve, reject) => {
    exec(`lsof -ti:${port}`, (error, stdout) => {
      if (error) {
        console.log(`Puerto ${port} no está en uso`);
        resolve();
        return;
      }

      const pids = stdout.trim().split('\n').filter(pid => pid);
      
      if (pids.length === 0) {
        console.log(`No se encontraron procesos en el puerto ${port}`);
        resolve();
        return;
      }

      const killPromises = pids.map(pid => {
        return new Promise((resolveKill) => {
          exec(`kill -9 ${pid}`, (killError) => {
            if (killError) {
              console.log(`Error al matar proceso ${pid}: ${killError.message}`);
            } else {
              console.log(`✓ Proceso ${pid} en puerto ${port} terminado`);
            }
            resolveKill();
          });
        });
      });

      Promise.all(killPromises).then(() => resolve());
    });
  });
}

async function killAllPorts() {
  console.log('🔪 Cerrando procesos en los puertos...\n');
  
  if (platform === 'win32') {
    // Windows
    for (const port of ports) {
      await killPortWindows(port);
    }
  } else {
    // Unix/Linux/Mac
    for (const port of ports) {
      await killPortUnix(port);
    }
  }

  console.log('\n✅ Todos los puertos han sido liberados');
}

killAllPorts().catch(console.error);



