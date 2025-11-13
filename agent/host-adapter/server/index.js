require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { startEmulator, stopEmulator, getInstanceDetails } = require('./emulator-manager');
const adbManager = require('./adb-manager');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// --- Routes ---

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// --- Emulator Process Management ---

app.post('/instances/start', async (req, res) => {
    const { avdName, headless = true, readOnly = false, gpu = 'host', noSnapshot = false, extraArgs = [] } = req.body || {};
    if (!avdName) {
        return res.status(400).json({ error: 'Missing avdName in request body' });
    }

    try {
        const instanceDetails = await startEmulator({ avdName, headless, readOnly, gpu, noSnapshot, extraArgs });
        res.status(202).json({ message: 'Emulator starting', instanceId: instanceDetails.instanceId, details: instanceDetails });
    } catch (error) {
        res.status(500).json({ error: 'Failed to start emulator', details: error.message });
    }
});

app.post('/instances/:instanceId/stop', (req, res) => {
    const { instanceId } = req.params;
    const success = stopEmulator(instanceId);
    if (success) {
        res.status(200).json({ message: `Stop signal sent to instance ${instanceId}` });
    } else {
        res.status(404).json({ error: `Instance ${instanceId} not found or already stopped` });
    }
});


// Dispatch endpoint for receiving commands from the Gateway
app.post('/dispatch/:instanceId', async (req, res) => {
    const { instanceId } = req.params;
    const { command, payload } = req.body;
    
    if (!command) {
        return res.status(400).json({ error: 'Missing command in request body' });
    }
    
    try {
        const instanceDetails = getInstanceDetails(instanceId);
        if (!instanceDetails) {
            return res.status(404).json({ error: `Instance ${instanceId} not found` });
        }
        
        // Execute the command on the emulator
        const result = await adbManager.executeCommand(instanceDetails.deviceSerial, command, payload);
        res.status(200).json({ result });
    } catch (error) {
        console.error(`Error executing command on instance ${instanceId}:`, error);
        res.status(500).json({ error: 'Command execution failed', details: error.message });
    }
});

// --- APK install & app launch helpers ---

app.post('/instances/:instanceId/apk/install', async (req, res) => {
    const { instanceId } = req.params;
    const { apkPath } = req.body || {};
    if (!apkPath) return res.status(400).json({ error: 'apkPath is required' });

    try {
        const instanceDetails = getInstanceDetails(instanceId);
        if (!instanceDetails || !instanceDetails.deviceSerial) {
            return res.status(404).json({ error: `Instance ${instanceId} not found or not ready` });
        }
        const result = await adbManager.executeCommand(instanceDetails.deviceSerial, 'install', { apkPath });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'APK install failed', details: error.message });
    }
});

app.post('/instances/:instanceId/app/launch', async (req, res) => {
    const { instanceId } = req.params;
    const { packageName, activityName } = req.body || {};
    if (!packageName || !activityName) {
        return res.status(400).json({ error: 'packageName and activityName are required' });
    }
    try {
        const instanceDetails = getInstanceDetails(instanceId);
        if (!instanceDetails || !instanceDetails.deviceSerial) {
            return res.status(404).json({ error: `Instance ${instanceId} not found or not ready` });
        }
        const result = await adbManager.executeCommand(instanceDetails.deviceSerial, 'launch', { packageName, activityName });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'App launch failed', details: error.message });
    }
});

app.get('/instances/:instanceId/status', async (req, res) => {
    const { instanceId } = req.params;
    const instanceDetails = getInstanceDetails(instanceId);
    if (!instanceDetails || !instanceDetails.deviceSerial) {
        return res.status(404).json({ error: `Instance ${instanceId} not found or not ready` });
    }
    try {
        const boot = await adbManager.runAdbCommand(`-s ${instanceDetails.deviceSerial} shell getprop sys.boot_completed`);
        res.status(200).json({ instance: instanceDetails, bootCompleted: boot === '1' });
    } catch (error) {
        res.status(500).json({ error: 'Status check failed', details: error.message });
    }
});

app.get('/devices', async (req, res) => {
    try {
        const out = await adbManager.runAdbCommand('devices');
        res.status(200).json({ output: out });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list devices', details: error.message });
    }
});

// Register the host-adapter with the Instance Manager
async function registerWithInstanceManager() {
    try {
        const hostAdapterUrl = `http://localhost:${PORT}`;
        await axios.post(`${process.env.INSTANCE_MANAGER_URL || 'http://localhost:3002'}/register-host-adapter`, {
            url: hostAdapterUrl,
            capabilities: ['emulator-control', 'adb-commands']
        });
        console.log('Successfully registered with Instance Manager');
    } catch (error) {
        console.error('Failed to register with Instance Manager:', error.message);
    }
}

// Dispatch endpoint for agent communication
app.post('/dispatch/:instanceId/agent', async (req, res) => {
    const { instanceId } = req.params;
    const { path, payload } = req.body;
    
    if (!path || !payload) {
        return res.status(400).json({ error: 'Dispatch requests must include a "path" and "payload"' });
    }

    const instance = getInstanceDetails(instanceId);
    if (!instance || !instance.address) {
        return res.status(404).json({ error: `Instance ${instanceId} not found or not fully ready` });
    }

    const targetUrl = `${instance.address}${path}`;
    console.log(`Dispatching command for instance ${instanceId} to ${targetUrl}`);

    try {
        const agentResponse = await axios.post(targetUrl, payload);
        res.status(agentResponse.status).json(agentResponse.data);
    } catch (error) {
        console.error(`Error dispatching command to agent for instance ${instanceId}:`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: 'Failed to communicate with agent' };
        res.status(status).json(data);
    }
});

// --- Server Initialization ---
app.listen(PORT, () => {
    console.log(`Host-Adapter service running on port ${PORT}`);
    registerWithInstanceManager();
});
