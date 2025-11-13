# Android Virtual OS Control Plane

This repository contains the complete source code and documentation for the Android Virtual OS Control Plane project.

## Current Status (As of 2025-10-03)

Milestone 6 is complete. The project now includes a comprehensive web UI dashboard, expanded CLI functionality with generic RPC commands, and unit testing framework for quality assurance.

Key features include:
- **Web UI Dashboard**: React-based interface for monitoring instances
- **Enhanced CLI**: Generic RPC command support for direct agent interaction
- **Unit Testing**: Jest framework with initial test coverage
- **Full End-to-End Functionality**: Complete control plane with persistent state
- **Persistent State**: Instance state survives system restarts

## Documentation

- [Architecture Overview](./docs/architecture.md): High-level system design and component interactions
- [API Documentation](./docs/api-openapi.yaml): OpenAPI specification for all endpoints
- [Deployment Guide](./docs/deployment.md): Instructions for deploying the system
- [Security Information](./docs/security.md): Security considerations and implementation
- [Technical Evaluation](./docs/technical_review_and_evaluation_report_v4.md): Latest technical assessment

## Project Components

- `/agent`: Android agent implementation
- `/control-plane`: Backend services (Gateway, Orchestrator, Instance Manager)
- `/web-ui`: React-based dashboard interface
- `/tools`: CLI and utility scripts
- `/tests`: Automated test suite

## Setup Instructions

### Prerequisites
- Node.js v16 or higher
- Android SDK with emulator support
- ADB (Android Debug Bridge) installed and in PATH

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-org/android-virtual-controlplane.git
   cd android-virtual-controlplane
   ```

2. Install dependencies for each component:
   ```
   # Control Plane services
   cd control-plane/gateway && npm install
   cd ../instance-manager && npm install
   cd ../orchestrator && npm install
   
   # Host Adapter
   cd ../../agent/host-adapter/server && npm install
   
   # Web UI
   cd ../../../web-ui && npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env` in each service directory
   - Update values as needed for your environment

### Starting the System

1. Start the Control Plane services (in separate terminals):
   ```
   # Instance Manager
   cd control-plane/instance-manager && node index.js
   
   # Gateway
   cd control-plane/gateway && node index.js
   
   # Orchestrator
   cd control-plane/orchestrator && node index.js
   
   # Host Adapter
   cd agent/host-adapter/server && node index.js
   ```

2. Start the Web UI:
   ```
   cd web-ui && npm run dev
   ```

3. Access the dashboard at http://localhost:7000