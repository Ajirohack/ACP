const { exec } = require('child_process');

// In a real system, the path to the adb executable would be configurable
const ADB_PATH = process.env.ADB_PATH || 'adb';

/**
 * Executes a given adb command.
 * @param {string} command The adb command to execute.
 * @returns {Promise<string>} A promise that resolves with the stdout of the command.
 */
function runAdbCommand(command) {
    return new Promise((resolve, reject) => {
        exec(`${ADB_PATH} ${command}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing adb command: ${command}`, stderr);
                return reject(error);
            }
            resolve(stdout.trim());
        });
    });
}

/**
 * Sets up a port forwarding rule from the host to the guest device.
 * @param {string} deviceSerial The serial number of the target device.
 * @param {number} hostPort The port on the host machine.
 * @param {number} guestPort The port on the guest device.
 * @returns {Promise<string>} The output from the adb command.
 */
async function setupPortForwarding(deviceSerial, hostPort, guestPort) {
    console.log(`Setting up port forwarding for ${deviceSerial}: host ${hostPort} -> guest ${guestPort}`);
    return runAdbCommand(`-s ${deviceSerial} forward tcp:${hostPort} tcp:${guestPort}`);
}

/**
 * Starts the main AgentService within the Android application.
 * @param {string} deviceSerial The serial number of the target device.
 * @returns {Promise<string>} The output from the adb command.
 */
async function startAgentApp(deviceSerial) {
    const componentName = 'com.example.controlplane/.AgentService';
    console.log(`Starting agent service on ${deviceSerial}: ${componentName}`);
    return runAdbCommand(`-s ${deviceSerial} shell am start-service ${componentName}`);
}

/**
 * Finds the device serial for a newly started emulator.
 * This is a simple implementation that assumes only one emulator is starting at a time.
 * @returns {Promise<string>} The serial number of the emulator device.
 */

/**
 * Executes a command on the specified device.
 * @param {string} deviceSerial The serial number of the target device.
 * @param {string} command The command to execute (e.g., 'shell', 'install', etc.).
 * @param {object} payload Additional parameters for the command.
 * @returns {Promise<object>} The result of the command execution.
 */
async function executeCommand(deviceSerial, command, payload = {}) {
    console.log(`Executing command on ${deviceSerial}: ${command}`, payload);
    
    switch (command) {
        case 'shell':
            if (!payload.shellCommand) {
                throw new Error('Shell command is required in payload');
            }
            const shellOutput = await runAdbCommand(`-s ${deviceSerial} shell ${payload.shellCommand}`);
            return { output: shellOutput };
            
        case 'install':
            if (!payload.apkPath) {
                throw new Error('APK path is required in payload');
            }
            const installOutput = await runAdbCommand(`-s ${deviceSerial} install -r ${payload.apkPath}`);
            return { output: installOutput };
            
        case 'uninstall':
            if (!payload.packageName) {
                throw new Error('Package name is required in payload');
            }
            const uninstallOutput = await runAdbCommand(`-s ${deviceSerial} uninstall ${payload.packageName}`);
            return { output: uninstallOutput };
            
        case 'screenshot':
            // Take screenshot and save to temporary file
            const screenshotPath = `/tmp/screenshot_${deviceSerial}_${Date.now()}.png`;
            await runAdbCommand(`-s ${deviceSerial} shell screencap -p /sdcard/screenshot.png`);
            await runAdbCommand(`-s ${deviceSerial} pull /sdcard/screenshot.png ${screenshotPath}`);
            return { 
                output: 'Screenshot captured',
                filePath: screenshotPath
            };
            
        case 'launch':
            if (!payload.packageName || !payload.activityName) {
                throw new Error('Package name and activity name are required in payload');
            }
            const launchOutput = await runAdbCommand(
                `-s ${deviceSerial} shell am start -n ${payload.packageName}/${payload.activityName}`
            );
            return { output: launchOutput };
            
        default:
            throw new Error(`Unsupported command: ${command}`);
    }
}
async function findNewEmulatorDevice() {
    console.log('Querying for emulator devices...');
    const output = await runAdbCommand('devices');
    const lines = output.split('\n').slice(1); // Ignore the "List of devices attached" line
    
    for (const line of lines) {
        const [serial, state] = line.split('\t');
        if (serial && serial.startsWith('emulator-') && state === 'device') {
            console.log(`Found emulator device: ${serial}`);
            return serial;
        }
    }

    throw new Error('No running emulator device found.');
}

/**
 * Waits for an emulator to be fully booted.
 * @param {string} deviceSerial The serial number of the device to check.
 * @param {number} timeoutMs The maximum time to wait in milliseconds.
 * @returns {Promise<void>} A promise that resolves when the device is booted.
 */
async function waitForBoot(deviceSerial, timeoutMs = 120000) {
    console.log(`Waiting for device ${deviceSerial} to complete boot...`);
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
        try {
            const output = await runAdbCommand(`-s ${deviceSerial} shell getprop sys.boot_completed`);
            if (output === '1') {
                console.log(`Device ${deviceSerial} has booted.`);
                return;
            }
        } catch (error) {
            // Ignore errors, as the device may not be fully available yet
        }
        // Wait for a short interval before polling again
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    throw new Error(`Timeout waiting for device ${deviceSerial} to boot.`);
}


module.exports = {
    runAdbCommand,
    setupPortForwarding,
    startAgentApp,
    findNewEmulatorDevice,
    waitForBoot,
    executeCommand
};
