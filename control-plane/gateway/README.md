# Control Plane Gateway

This service is the main API gateway for the entire system. It is responsible for authenticating incoming requests, routing them to the appropriate backend service (like the Orchestrator or Instance Manager), and returning responses to the client.

## Running the Service

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

The server will start on port 3000 by default.
