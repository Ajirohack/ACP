require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'secret-key';

// Axios instance to communicate with the Gateway, with authentication header
const gatewayClient = axios.create({
    baseURL: GATEWAY_URL,
    headers: {
        'Authorization': `Bearer ${API_KEY}`
    }
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// --- Routes ---

app.get('/', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Import workflows module
const workflows = require('./workflows');

// Get available workflows
app.get('/workflows', (req, res) => {
    const availableWorkflows = workflows.getAvailableWorkflows();
    res.status(200).json(availableWorkflows);
});

// Execute a workflow
app.post('/workflows/:workflowId/execute', async (req, res) => {
    const { workflowId } = req.params;
    const { instanceId, payloadValues, options } = req.body;
    
    if (!instanceId) {
        return res.status(400).json({ error: 'Missing instanceId in request body' });
    }
    
    try {
        const result = await workflows.executeWorkflow(workflowId, instanceId, payloadValues || {}, options || {});
        res.status(200).json(result);
    } catch (error) {
        console.error(`Error executing workflow ${workflowId}:`, error);
        res.status(500).json({ error: 'Workflow execution failed', details: error.message });
    }
});

/**
 * The main endpoint for executing a sequence of actions.
 * It iterates through the steps and calls the Gateway for each one.
 */
app.post('/orchestrate', async (req, res) => {
    const { instanceId, steps } = req.body;

    if (!instanceId || !steps || !Array.isArray(steps)) {
        return res.status(400).json({ error: 'Missing instanceId or steps array in request body' });
    }

    console.log(`Orchestration request received for instance ${instanceId} with ${steps.length} steps.`);
    const orchestrationId = `orch_${Date.now()}`;
    const results = [];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const retryPolicy = { count: 1, delay: 0, ...step.retry }; // Defaults
        let lastError = null;
        let success = false;

        console.log(`[${orchestrationId}] Executing step ${i + 1}/${steps.length}: command '${step.command}'`);

        for (let attempt = 1; attempt <= retryPolicy.count; attempt++) {
            try {
                if (attempt > 1) {
                    console.log(`[${orchestrationId}] Retrying step ${i + 1} (Attempt ${attempt}/${retryPolicy.count})...`);
                }

                const stepResponse = await gatewayClient.post(`/instances/${instanceId}/rpc`, {
                    command: step.command,
                    payload: step.payload
                });
                
                results.push({
                    step: i + 1,
                    attempt,
                    status: 'success',
                    result: stepResponse.data
                });
                success = true;
                break; // Exit retry loop on success

            } catch (error) {
                lastError = error;
                console.warn(`[${orchestrationId}] Step ${i + 1}, Attempt ${attempt} failed:`, error.message);
                if (retryPolicy.delay > 0 && attempt < retryPolicy.count) {
                    await new Promise(resolve => setTimeout(resolve, retryPolicy.delay));
                }
            }
        }

        if (!success) {
            console.error(`[${orchestrationId}] Step ${i + 1} failed after ${retryPolicy.count} attempts.`);
            results.push({
                step: i + 1,
                attempt: retryPolicy.count,
                status: 'failed',
                error: lastError.response ? lastError.response.data : 'Communication error'
            });
            // Stop entire orchestration on final failure of a step
            return res.status(500).json({
                message: `Orchestration failed at step ${i + 1}`,
                orchestrationId,
                results
            });
        }
    }

    console.log(`[${orchestrationId}] Orchestration completed successfully.`);
    res.status(200).json({
        message: 'Orchestration completed successfully',
        orchestrationId,
        results
    });
});

// --- Server Initialization ---

app.listen(PORT, () => {
    console.log(`Control Plane Orchestrator listening on port ${PORT}`);
});
