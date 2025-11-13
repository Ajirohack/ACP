const axios = require('axios');

// Configure test environment
const HOST_ADAPTER_URL = process.env.HOST_ADAPTER_URL || 'http://localhost:4000';
const INSTANCE_ID = 'test-instance-001';

describe('Host-Adapter Service E2E Tests', () => {
  // Test health endpoint
  test('Health endpoint returns 200 OK', async () => {
    const response = await axios.get(`${HOST_ADAPTER_URL}/health`);
    expect(response.status).toBe(200);
    expect(response.data.status).toBe('ok');
  });

  // Test dispatch endpoint with mock commands
  test('Dispatch endpoint handles commands correctly', async () => {
    // This test will be skipped if no real instance is available
    try {
      const response = await axios.post(`${HOST_ADAPTER_URL}/dispatch/${INSTANCE_ID}`, {
        command: 'shell',
        payload: { shellCommand: 'echo "test"' }
      });
      
      expect(response.status).toBe(200);
      expect(response.data.result).toBeDefined();
    } catch (error) {
      // Skip test if instance not found
      if (error.response && error.response.status === 404) {
        console.log('Skipping test: No instance available');
        return;
      }
      throw error;
    }
  });
});