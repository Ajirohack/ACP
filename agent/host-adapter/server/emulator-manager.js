const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const adbManager = require('./adb-manager');

const INSTANCE_MANAGER_URL = process.env.INSTANCE_MANAGER_URL || 'http://localhost:3002';
const EMULATOR_PATH = process.env.EMULATOR_PATH || 'emulator';

// Track running emulator processes and metadata
const runningEmulators = new Map();

function getFreePort() {
  return Math.floor(Math.random() * (49151 - 10000 + 1)) + 10000;
}

async function deregisterInstance(instanceId) {
  try {
    await axios.post(`${INSTANCE_MANAGER_URL}/deregister`, { instanceId });
    console.log(`Instance ${instanceId} de-registered from Instance Manager.`);
  } catch (err) {
    console.warn(`Failed to de-register instance ${instanceId}: ${err.message}`);
  }
}

/**
 * Start an Android emulator and wire it for control.
 * @param {string|object} config Either AVD name string or { avdName, headless, readOnly, gpu, noSnapshot, extraArgs }.
 * @returns {Promise<object>} { instanceId, deviceSerial, avdName, address }
 */
async function startEmulator(config) {
  const opts = typeof config === 'string' ? { avdName: config } : (config || {});
  const { avdName, headless = true, readOnly = false, gpu = 'host', noSnapshot = false, extraArgs = [] } = opts;
  if (!avdName) throw new Error('avdName is required');

  const instanceId = uuidv4();
  const args = ['-avd', avdName];
  if (headless) args.push('-no-window', '-no-audio');
  if (readOnly) args.push('-read-only');
  if (gpu) args.push('-gpu', gpu);
  if (noSnapshot) args.push('-no-snapshot');
  if (Array.isArray(extraArgs) && extraArgs.length) args.push(...extraArgs);

  console.log(`Spawning emulator: ${EMULATOR_PATH} ${args.join(' ')} (instanceId=${instanceId})`);
  const child = spawn(EMULATOR_PATH, args, { detached: true, stdio: 'pipe' });

  runningEmulators.set(instanceId, { process: child, avdName });

  child.stdout.on('data', (d) => console.log(`[${instanceId} stdout] ${d.toString().trim()}`));
  child.stderr.on('data', (d) => console.error(`[${instanceId} stderr] ${d.toString().trim()}`));
  child.on('exit', (code, signal) => {
    console.log(`Emulator ${instanceId} exited (code=${code}, signal=${signal})`);
    runningEmulators.delete(instanceId);
    deregisterInstance(instanceId);
  });

  try {
    // Allow device to appear in adb
    await new Promise((r) => setTimeout(r, 5000));
    const deviceSerial = await adbManager.findNewEmulatorDevice();
    await adbManager.waitForBoot(deviceSerial);

    const hostPort = getFreePort();
    const guestPort = 8080; // Android Agent port inside emulator
    await adbManager.setupPortForwarding(deviceSerial, hostPort, guestPort);
    await adbManager.startAgentApp(deviceSerial);

    const instanceDetails = {
      instanceId,
      deviceSerial,
      avdName,
      address: `http://localhost:${hostPort}`,
    };

    // Best-effort register with Instance Manager
    try {
      await axios.post(`${INSTANCE_MANAGER_URL}/register`, instanceDetails);
      console.log(`Instance ${instanceId} registered with Instance Manager.`);
    } catch (regErr) {
      console.warn(`Instance registration failed: ${regErr.message}`);
    }

    runningEmulators.set(instanceId, { ...runningEmulators.get(instanceId), ...instanceDetails });
    console.log(`Instance ready: ${JSON.stringify(instanceDetails)}`);
    return instanceDetails;
  } catch (err) {
    console.error(`Failed to start/configure emulator (instanceId=${instanceId}): ${err.message}`);
    try { child.kill('SIGTERM'); } catch (_) {}
    runningEmulators.delete(instanceId);
    throw err;
  }
}

function stopEmulator(instanceId) {
  const instance = runningEmulators.get(instanceId);
  if (instance && instance.process) {
    console.log(`Stopping emulator ${instanceId} (pid=${instance.process.pid})`);
    instance.process.kill('SIGTERM');
    runningEmulators.delete(instanceId);
    deregisterInstance(instanceId);
    return true;
  }
  console.warn(`No running emulator found for instanceId=${instanceId}`);
  return false;
}

function getInstanceDetails(instanceId) {
  return runningEmulators.get(instanceId);
}

module.exports = { startEmulator, stopEmulator, getInstanceDetails };