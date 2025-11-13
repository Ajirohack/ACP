# Host-Adapter

This service is the bridge between the cloud-based Control Plane and the Android emulators running on a host machine.

Its responsibilities include:

- Starting and stopping emulator processes.
- Managing ADB connections.
- Setting up port forwarding to the agent inside the emulator.
- Registering instances with the Instance Manager.
- Dispatching commands received from the Gateway to the correct agent.

## Running the Service

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Start the server:**

   ```bash
   npm start
   ```

The server starts on port 4001 by default. Override with `PORT`.

## API Endpoints

- GET `/health`
  - Returns `{ status: "ok" }` when the adapter is up.

- POST `/instances/start`
  - Starts an emulator AVD and wires ADB and agent.
  - Body: `{ avdName: string, headless?: boolean, readOnly?: boolean, gpu?: string, noSnapshot?: boolean, extraArgs?: string[] }`
  - Returns: `{ message, instanceId, details }` where `details` includes `deviceSerial` and `address`.

- POST `/instances/:instanceId/stop`
  - Stops a running emulator and de-registers it from Instance Manager.

- POST `/dispatch/:instanceId`
  - Executes ADB-level commands against the emulator.
  - Body: `{ command: 'shell'|'install'|'uninstall'|'screenshot'|'launch', payload: object }`

- POST `/instances/:instanceId/apk/install`
  - Convenience wrapper for `install` with `{ apkPath }`.

- POST `/instances/:instanceId/app/launch`
  - Convenience wrapper for `launch` with `{ packageName, activityName }`.

- GET `/instances/:instanceId/status`
  - Returns boot status and instance details (best-effort via `sys.boot_completed`).

- GET `/devices`
  - Returns raw output of `adb devices`.

- POST `/dispatch/:instanceId/agent`
  - Sends a structured payload directly to the in-emulator agent at `details.address`.

## Quick Smoke Tests

Assuming the adapter runs on `http://localhost:4001`:

```bash
# Health
curl -s http://localhost:4001/health

# Start (fails with 400 when body is missing)
curl -s -X POST http://localhost:4001/instances/start -H 'Content-Type: application/json' -d '{}'

# Status for a fake instance (expect 404)
curl -s http://localhost:4001/instances/fake-instance/status

# List devices (requires adb)
curl -s http://localhost:4001/devices
```
