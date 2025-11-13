/**
 * Complex orchestration workflows for Android emulator control
 */
const axios = require('axios');

// Workflow definitions
const workflows = {
    // App installation and launch workflow
    appInstallAndLaunch: {
        name: 'App Installation and Launch',
        description: 'Installs an APK and launches the app',
        steps: [
            {
                name: 'Install APK',
                command: 'install',
                payloadTemplate: { apkPath: '' }
            },
            {
                name: 'Launch App',
                command: 'launch',
                payloadTemplate: { packageName: '', activityName: '' }
            }
        ]
    },
    
    // UI test automation workflow
    uiTestAutomation: {
        name: 'UI Test Automation',
        description: 'Performs a series of UI interactions and captures screenshots',
        steps: [
            {
                name: 'Launch App',
                command: 'launch',
                payloadTemplate: { packageName: '', activityName: '' }
            },
            {
                name: 'Wait for App',
                command: 'shell',
                payloadTemplate: { shellCommand: 'sleep 2' }
            },
            {
                name: 'Take Screenshot',
                command: 'screenshot',
                payloadTemplate: {}
            },
            {
                name: 'Perform UI Interaction',
                command: 'shell',
                payloadTemplate: { shellCommand: 'input tap 500 500' }
            },
            {
                name: 'Take Final Screenshot',
                command: 'screenshot',
                payloadTemplate: {}
            }
        ]
    },
    
    // Device reset workflow
    deviceReset: {
        name: 'Device Reset',
        description: 'Resets the device to a clean state',
        steps: [
            {
                name: 'Stop Running Apps',
                command: 'shell',
                payloadTemplate: { shellCommand: 'am force-stop com.example.app' }
            },
            {
                name: 'Clear App Data',
                command: 'shell',
                payloadTemplate: { shellCommand: 'pm clear com.example.app' }
            },
            {
                name: 'Restart Device',
                command: 'shell',
                payloadTemplate: { shellCommand: 'reboot' }
            }
        ]
    }
};

/**
 * Executes a workflow on a specific instance
 * @param {string} workflowId - The ID of the workflow to execute
 * @param {string} instanceId - The ID of the instance to run the workflow on
 * @param {object} payloadValues - Values to substitute in the payload templates
 * @param {object} options - Additional options for workflow execution
 * @returns {Promise<object>} - Results of the workflow execution
 */
async function executeWorkflow(workflowId, instanceId, payloadValues, options = {}) {
    const workflow = workflows[workflowId];
    if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
    }
    
    const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
    const apiKey = process.env.API_KEY || 'secret-key';
    
    const results = [];
    let stepIndex = 0;
    
    try {
        for (const step of workflow.steps) {
            console.log(`Executing workflow step ${stepIndex + 1}/${workflow.steps.length}: ${step.name}`);
            
            // Prepare payload by merging template with provided values
            const payload = { ...step.payloadTemplate };
            
            // Replace template values with actual values
            for (const key in payload) {
                if (payloadValues[key]) {
                    payload[key] = payloadValues[key];
                }
            }
            
            // Execute the command via Gateway
            const response = await axios.post(
                `${gatewayUrl}/instances/${instanceId}/rpc`,
                {
                    command: step.command,
                    payload
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            results.push({
                step: stepIndex,
                name: step.name,
                command: step.command,
                payload,
                result: response.data
            });
            
            stepIndex++;
            
            // Optional delay between steps
            if (options.stepDelay && stepIndex < workflow.steps.length) {
                await new Promise(resolve => setTimeout(resolve, options.stepDelay));
            }
        }
        
        return {
            workflowId,
            instanceId,
            status: 'completed',
            steps: results
        };
    } catch (error) {
        console.error(`Workflow execution failed at step ${stepIndex}:`, error);
        return {
            workflowId,
            instanceId,
            status: 'failed',
            error: error.message,
            steps: results,
            failedStep: stepIndex
        };
    }
}

/**
 * Gets the list of available workflows
 * @returns {object} - Object containing workflow definitions
 */
function getAvailableWorkflows() {
    return Object.keys(workflows).map(id => ({
        id,
        name: workflows[id].name,
        description: workflows[id].description,
        stepCount: workflows[id].steps.length
    }));
}

module.exports = {
    executeWorkflow,
    getAvailableWorkflows,
    workflows
};