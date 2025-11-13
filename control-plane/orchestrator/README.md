# Control Plane Orchestrator

This service is responsible for executing complex, multi-step workflows. The API Gateway delegates requests to this service when a client wants to perform a sequence of actions (e.g., launch an app, find a UI element, then click it).

## Running the Service

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

The server will start on port 3001 by default.
