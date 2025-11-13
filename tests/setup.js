// Global test setup
jest.setTimeout(10000); // 10 second timeout for all tests

// Mock environment variables if not set
process.env.API_KEY = process.env.API_KEY || 'secret-key';
process.env.GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
process.env.ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3001';
process.env.INSTANCE_MANAGER_URL = process.env.INSTANCE_MANAGER_URL || 'http://localhost:3002';
process.env.HOST_ADAPTER_URL = process.env.HOST_ADAPTER_URL || 'http://localhost:4000';