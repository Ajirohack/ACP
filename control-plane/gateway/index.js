require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3001';
const INSTANCE_MANAGER_URL = process.env.INSTANCE_MANAGER_URL || 'http://localhost:3002';
const HOST_ADAPTER_URL = process.env.HOST_ADAPTER_URL || 'http://localhost:4001';

// For this PoC, the API key is hardcoded. In a real system, this would come from a secure vault.
const API_KEY = process.env.API_KEY || 'secret-key';

// --- Middleware ---

app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(morgan('dev')); // HTTP request logger
app.use(express.json()); // for parsing application/json

/**
 * Authentication middleware.
 * Checks for a valid Bearer token in the Authorization header.
 */
const authenticate = (req, res, next) => {
    // Allow health check to pass without authentication
    if (req.path === '/health') {
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (token !== API_KEY) {
        return res.status(403).json({ error: 'Forbidden: Invalid API Key' });
    }

    next();
};

// Apply authentication middleware to all routes
app.use(authenticate);

// --- Routes ---

/**
 * Health check endpoint (unauthenticated)
 */
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

/**
 * Lists all registered instances by querying the Instance Manager.
 */
app.get('/instances', async (req, res) => {
    try {
        const response = await axios.get(`${INSTANCE_MANAGER_URL}/instances`);
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error fetching instances from Instance Manager:', error.message);
        const status = error.response ? error.response.status : 500;
        res.status(status).json({ error: 'Failed to fetch instances' });
    }
});

/**
 * Starts a new emulator instance by calling the Host-Adapter.
 */
app.post('/instances/start', async (req, res) => {
    const { avdName, headless = true, readOnly = false, gpu = 'host', noSnapshot = false, extraArgs = [] } = req.body || {};
    if (!avdName) {
        return res.status(400).json({ error: 'Missing avdName in request body' });
    }

    try {
        const response = await axios.post(`${HOST_ADAPTER_URL}/instances/start`, { avdName, headless, readOnly, gpu, noSnapshot, extraArgs });
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error calling Host-Adapter to start instance:', error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: 'Failed to start instance' };
        res.status(status).json(data);
    }
});

// Proxy helpers to Host Adapter advanced endpoints
app.post('/instances/:instanceId/stop', async (req, res) => {
    const { instanceId } = req.params;
    try {
        const response = await axios.post(`${HOST_ADAPTER_URL}/instances/${instanceId}/stop`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error stopping instance via Host-Adapter:', error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: 'Failed to stop instance' };
        res.status(status).json(data);
    }
});

app.get('/instances/:instanceId/status', async (req, res) => {
    const { instanceId } = req.params;
    // Enforce no caching at the source for status responses
    res.set('Cache-Control', 'no-store');
    try {
        const response = await axios.get(`${HOST_ADAPTER_URL}/instances/${instanceId}/status`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error getting instance status via Host-Adapter:', error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: 'Failed to get status' };
        res.status(status).json(data);
    }
});

app.get('/devices', async (req, res) => {
    try {
        const response = await axios.get(`${HOST_ADAPTER_URL}/devices`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error listing devices via Host-Adapter:', error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: 'Failed to list devices' };
        res.status(status).json(data);
    }
});

app.post('/instances/:instanceId/apk/install', async (req, res) => {
    const { instanceId } = req.params;
    const { apkPath } = req.body || {};
    if (!apkPath) return res.status(400).json({ error: 'apkPath is required' });
    try {
        const response = await axios.post(`${HOST_ADAPTER_URL}/instances/${instanceId}/apk/install`, { apkPath });
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error installing APK via Host-Adapter:', error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: 'Failed to install APK' };
        res.status(status).json(data);
    }
});

app.post('/instances/:instanceId/app/launch', async (req, res) => {
    const { instanceId } = req.params;
    const { packageName, activityName } = req.body || {};
    if (!packageName || !activityName) return res.status(400).json({ error: 'packageName and activityName are required' });
    try {
        const response = await axios.post(`${HOST_ADAPTER_URL}/instances/${instanceId}/app/launch`, { packageName, activityName });
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error launching app via Host-Adapter:', error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: 'Failed to launch app' };
        res.status(status).json(data);
    }
});

// Proxy dispatch endpoints to Host Adapter
app.post('/dispatch/:instanceId', async (req, res) => {
    const { instanceId } = req.params;
    const { command, payload } = req.body || {};
    if (!command) return res.status(400).json({ error: 'Missing command' });
    try {
        const response = await axios.post(`${HOST_ADAPTER_URL}/dispatch/${instanceId}`, { command, payload });
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error proxying dispatch to Host-Adapter:', error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: 'Dispatch failed' };
        res.status(status).json(data);
    }
});

app.post('/dispatch/:instanceId/agent', async (req, res) => {
    const { instanceId } = req.params;
    const { path, payload } = req.body || {};
    if (!path || !payload) return res.status(400).json({ error: 'Missing path or payload' });
    try {
        const response = await axios.post(`${HOST_ADAPTER_URL}/dispatch/${instanceId}/agent`, { path, payload });
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error proxying agent dispatch to Host-Adapter:', error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: 'Agent dispatch failed' };
        res.status(status).json(data);
    }
});

// List available AVDs from Host Adapter
app.get('/avds', async (req, res) => {
    try {
        const response = await axios.get(`${HOST_ADAPTER_URL}/avds`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error fetching AVDs from Host-Adapter:', error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: 'Failed to fetch AVDs' };
        res.status(status).json(data);
    }
});

/**
 * Generic RPC endpoint to an agent.
 * It now delegates orchestration commands to the Orchestrator service.
 * For direct commands, it looks up the instance address from the Instance Manager.
 */
app.post('/instances/:instanceId/rpc', async (req, res) => {
    const { instanceId } = req.params;
    const { command, payload } = req.body;

    if (!command || !payload) {
        return res.status(400).json({ error: 'Missing command or payload in request body' });
    }

    // If the command is 'orchestrate', forward it to the orchestrator service
    if (command === 'orchestrate') {
        console.log(`Forwarding orchestration request for instance ${instanceId} to Orchestrator.`);
        try {
            const orchestratorResponse = await axios.post(`${ORCHESTRATOR_URL}/orchestrate`, {
                instanceId: instanceId,
                steps: payload.steps
            });
            return res.status(orchestratorResponse.status).json(orchestratorResponse.data);
        } catch (error) {
            console.error('Error forwarding request to orchestrator:', error.message);
            const status = error.response ? error.response.status : 500;
            const data = error.response ? error.response.data : { error: 'Internal Server Error' };
            return res.status(status).json(data);
        }
    }

    // For direct commands, first find the instance address
    let instance;
    try {
        const instanceResponse = await axios.get(`${INSTANCE_MANAGER_URL}/instances/${instanceId}`);
        instance = instanceResponse.data;
    } catch (error) {
        console.error(`Failed to find instance '${instanceId}':`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: 'Instance lookup failed' };
        return res.status(status).json(data);
    }

    console.log(`Found instance '${instanceId}' at address: ${instance.address}`);

    // TODO: Implement the actual RPC call to the agent's Host-Adapter
    // using the address `instance.address`.

    res.status(202).json({
        message: `Direct command '${command}' for instance '${instanceId}' is ready for dispatch.`,
        dispatchAddress: instance.address,
        status: 'pending'
    });
});

// --- Server Initialization ---

app.listen(PORT, () => {
    console.log(`Control Plane Gateway listening on port ${PORT}`);
});
