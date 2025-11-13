const axios = require('axios');

// Configure test environment
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3001';
const API_KEY = process.env.API_KEY || 'secret-key';
const INSTANCE_ID = 'test-instance-001';

describe('Orchestration Service E2E Tests', () => {
  // Test workflows endpoint
  test('Workflows endpoint returns available workflows', async () => {
    const response = await axios.get(`${ORCHESTRATOR_URL}/workflows`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(0);
  });

  // Test workflow execution (mock test)
  test('Workflow execution endpoint handles requests correctly', async () => {
    try {
      const response = await axios.post(
        `${ORCHESTRATOR_URL}/workflows/uiTestAutomation/execute`,
        {
          instanceId: INSTANCE_ID,
          payloadValues: {
            packageName: 'com.android.settings',
            activityName: '.Settings'
          }
        },
        {
          headers: { 'Authorization': `Bearer ${API_KEY}` }
        }
      );
      
      expect(response.status).toBe(200);
      expect(response.data.workflowId).toBe('uiTestAutomation');
    } catch (error) {
      // Skip test if service unavailable
      if (error.code === 'ECONNREFUSED') {
        console.log('Skipping test: Orchestrator service not available');
        return;
      }
      throw error;
    }
  });
});