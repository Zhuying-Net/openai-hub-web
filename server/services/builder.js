const { spawn } = require('child_process');
const path = require('path');

function triggerBuild(reason = 'content-updated') {
  return new Promise((resolve) => {
    const projectRoot = path.resolve(__dirname, '..', '..');
    const buildScript = path.join(projectRoot, 'scripts', 'build.js');

    const child = spawn(process.execPath, [buildScript], {
      cwd: projectRoot,
      env: {
        ...process.env,
        CMS_BUILD_REASON: reason
      },
      stdio: 'ignore',
      detached: false
    });

    child.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    child.on('exit', (code) => {
      resolve({ success: code === 0, code });
    });
  });
}

module.exports = {
  triggerBuild
};
