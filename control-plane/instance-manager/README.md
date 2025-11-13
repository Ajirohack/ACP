# Control Plane Instance Manager

This service is responsible for tracking the state and network address of all active Android instances. It provides endpoints for instances to register themselves and for other services (like the Gateway) to discover where to send commands.

## Running the Service

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

The server will start on port 3002 by default.
