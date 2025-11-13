# Control Plane CLI

A command-line interface for managing and interacting with the Android Virtual OS Control Plane.

## Installation

```bash
npm install
```

## Configuration

The CLI uses environment variables for configuration. Copy `.env.example` to `.env` and configure:

```bash
GATEWAY_URL=http://localhost:3000
API_KEY=secret-key
```

## Usage

### List Instances

List all registered emulator instances:

```bash
node index.js instances-list
```

### Start Instance (Advanced)

Start a new emulator instance with advanced options:

```bash
node index.js instance-start <avdName> [--headless] [--gpu <mode>] [--no-snapshot] [--read-only] [--extra-arg <arg...>]
```

Examples:
- Headless CI: `node index.js instance-start Pixel8_API34 --headless --no-snapshot`
- GPU host: `node index.js instance-start Pixel8_API34 --gpu host`
- Extra args: `node index.js instance-start Pixel8_API34 --extra-arg -camera-back=none --extra-arg -no-metrics`

Options:
- `--headless` Start without window/audio and snapshots
- `--gpu <mode>` GPU mode (`host`, `swiftshader_indirect`, etc.)
- `--no-snapshot` Disable loading/saving snapshots
- `--read-only` Start AVD in read-only mode
- `--extra-arg <arg...>` Additional emulator args to forward

### Send RPC Commands

Send generic RPC commands to running instances:

```bash
node index.js rpc <instanceId> <command> [--payload <jsonPayload>]
```

Examples:

```bash
# Find UI elements
node index.js rpc inst_123 ui/find --payload '{"text": "Settings"}'

# Click on an element
node index.js rpc inst_123 ui/click --payload '{"node_id": "node_456"}'

# Type text into an element
node index.js rpc inst_123 ui/type --payload '{"nodeId": "node_456", "text": "Hello World"}'

# Scroll an element
node index.js rpc inst_123 ui/scroll --payload '{"nodeId": "node_456", "direction": "down"}'

# Get UI tree inspection
node index.js rpc inst_123 ui/inspect

# Health check
node index.js rpc inst_123 health
```

## Available Commands

- `instances-list` - List all registered emulator instances
- `instance-start <avdName>` - Start a new emulator instance (advanced options supported)
- `instance-status <instanceId>` - Get instance status and boot readiness
- `instance-stop <instanceId>` - Stop a running instance
- `devices` - List connected ADB devices
- `apk-install <instanceId> <apkPath>` - Install APK on an instance
- `app-launch <instanceId> <packageName> <activityName>` - Launch an app activity on an instance
- `rpc <instanceId> <command> [--payload <json>]` - Send generic RPC command to an instance

## RPC Command Reference

The RPC command supports all endpoints available on the Android Agent API:

- `health` - Check agent health status
- `ui/find` - Find UI elements by selector
- `ui/click` - Click on UI elements
- `ui/type` - Type text into UI elements
- `ui/scroll` - Scroll UI elements
- `ui/inspect` - Get full UI tree inspection

For orchestrated commands, use the `orchestrate` command with a steps array payload.
### Instance Status

```bash
node index.js instance-status <instanceId>
```

### Stop Instance

```bash
node index.js instance-stop <instanceId>
```

### List ADB Devices

```bash
node index.js devices
```

### Install APK

```bash
node index.js apk-install <instanceId> <apkPath>
```

### Launch App Activity

```bash
node index.js app-launch <instanceId> <packageName> <activityName>
```