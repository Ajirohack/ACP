const axios = require('axios');

// Create a pre-configured axios instance to communicate with the Gateway
const gatewayClient = axios.create({
    baseURL: process.env.GATEWAY_URL || 'http://localhost:3000',
    headers: {
        'Authorization': `Bearer ${process.env.API_KEY || 'secret-key'}`
    }
});

async function listInstances() {
    try {
        const response = await gatewayClient.get('/instances');
        console.log('Registered Instances:');
        console.table(response.data);
    } catch (error) {
        console.error('Error fetching instances:', error.response ? error.response.data : error.message);
    }
}

async function startInstance(avdName, options = {}) {
    console.log(`Requesting to start instance with AVD: ${avdName}...`);
    try {
        const payload = {
            avdName,
            headless: !!options.headless,
            gpu: options.gpu || 'host',
            noSnapshot: !!options.noSnapshot,
            readOnly: !!options.readOnly,
            extraArgs: Array.isArray(options.extraArg) ? options.extraArg : []
        };
        const response = await gatewayClient.post('/instances/start', payload);
        console.log('Request accepted:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error starting instance:', error.response ? error.response.data : error.message);
    }
}

async function instanceStatus(instanceId) {
    console.log(`Fetching status for instance ${instanceId}...`);
    try {
        const response = await gatewayClient.get(`/instances/${instanceId}/status`);
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error getting instance status:', error.response ? error.response.data : error.message);
    }
}

async function instanceStop(instanceId) {
    console.log(`Stopping instance ${instanceId}...`);
    try {
        const response = await gatewayClient.post(`/instances/${instanceId}/stop`);
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error stopping instance:', error.response ? error.response.data : error.message);
    }
}

async function listDevices() {
    console.log('Listing devices via Host Adapter...');
    try {
        const response = await gatewayClient.get('/devices');
        console.log(response.data.output || JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error listing devices:', error.response ? error.response.data : error.message);
    }
}

async function installApk(instanceId, apkPath) {
    console.log(`Installing APK on instance ${instanceId}: ${apkPath}`);
    try {
        const response = await gatewayClient.post(`/instances/${instanceId}/apk/install`, { apkPath });
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error installing APK:', error.response ? error.response.data : error.message);
    }
}

async function launchApp(instanceId, packageName, activityName) {
    console.log(`Launching app on instance ${instanceId}: ${packageName}/${activityName}`);
    try {
        const response = await gatewayClient.post(`/instances/${instanceId}/app/launch`, { packageName, activityName });
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error launching app:', error.response ? error.response.data : error.message);
    }
}

async function sendRpcCommand(instanceId, command, payload) {
    console.log(`Sending RPC command '${command}' to instance ${instanceId}...`);
    try {
        const requestBody = { command };
        if (payload) {
            try {
                requestBody.payload = JSON.parse(payload);
            } catch (parseError) {
                console.error('Error parsing payload JSON:', parseError.message);
                return;
            }
        }
        
        const response = await gatewayClient.post(`/instances/${instanceId}/rpc`, requestBody);
        console.log('RPC Response:');
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Error sending RPC command:', error.response ? error.response.data : error.message);
    }
}

module.exports = { listInstances, startInstance, sendRpcCommand, instanceStatus, instanceStop, listDevices, installApk, launchApp };
