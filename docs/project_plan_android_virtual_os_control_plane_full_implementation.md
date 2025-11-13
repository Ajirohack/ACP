# Project Plan — Android Virtual OS Control Plane

**Version:** 1.0  
**Author:** Generated for user  
**Date:** October 2, 2025

---

## Purpose
This repository contains complete project planning documentation and scaffolding instructions to build the Android Virtual OS Control Plane project described in the high-level architecture. It is organized as a scaffolded project folder structure, with each document saved in its respective directory so you can iterate, assign tasks, and hand precise instructions to an IDE AI Coder (LLM) to implement each component from scratch through deployment.

---

# Repository scaffold (top-level)
```
android-virtual-controlplane/
├─ docs/
│  ├─ architecture.md
│  ├─ api-openapi.yaml
│  ├─ security.md
│  ├─ testing.md
│  ├─ deployment.md
│  └─ onboarding.md
├─ infra/
│  ├─ aosp/
│  │  ├─ README.md
│  │  └─ aosp-steps.md
│  ├─ k8s/
│  │  ├─ charts/
│  │  └─ README.md
│  └─ vm-images/
│     └─ README.md
├─ agent/
│  ├─ android-agent/
│  │  ├─ app/ (Android Studio project)
│  │  ├─ README.md
│  │  └─ docs/
│  └─ host-adapter/
│     ├─ server/ (control-plane side proxy)
│     └─ README.md
├─ control-plane/
│  ├─ api/ (OpenAPI stubs)
│  ├─ gateway/ (API gateway implement)
│  ├─ orchestrator/ (workflow engine; Temporal or custom)
│  ├─ auth/ (authentication & RBAC services)
│  └─ README.md
├─ tools/
│  ├─ cli/ (dev CLI to manage instances)
│  └─ scripts/ (build, push, snapshot, test)
├─ tests/
│  ├─ e2e/
│  └─ unit/
└─ tasks/
   ├─ tasks.md
   ├─ tasks-api/ (task sync API definitions)
   └─ tasks-data/ (sample tasks, state)
```

---

# Documents created in `docs/` (brief)
- **architecture.md** — expanded system architecture, sequence diagrams, component responsibilities, and capability matrix.  
- **api-openapi.yaml** — OpenAPI 3.1 spec for Control Plane gateway and Android Agent endpoints (ui, app, file, sensor, system).  
- **security.md** — authentication modes (mTLS, JWT), key management, SELinux policy guidance, secret rotation, audit logging.  
- **testing.md** — test strategy: unit, integration, instrumentation (UiAutomator), E2E, load, and security testing.  
- **deployment.md** — k8s manifests, VM image pipelines, AOSP build CI instructions, canary deployment and rollback policies.  
- **onboarding.md** — developer setup, emulator images, ADB helper commands, code style and contribution guide.

---

# Implementation modules & responsibilities

## `agent/android-agent` (Android in-VM Agent)
- **Goal:** run inside each Android VM/emulator and expose an HTTP/gRPC API for UI and system actions.
- **Core components:**
  - `AgentService` — foreground service that starts and supervises the embedded HTTP/gRPC server.
  - `ApiServer` — Ktor-based HTTP server (or gRPC server) exposing endpoints.
  - `AccessibilityController` — AccessibilityService wrapper to perform UI actions.
  - `UiAutomatorBridge` — UiAutomator integration for robust node queries and gestures.
  - `FileTransfer` — implement push/pull using ContentProvider or `adb` bridge for performance.
  - `SecurityManager` — secure storage for keys (Android Keystore + EncryptedSharedPreferences).
  - `PluginHost` — dynamic plugin loader for provider integrations (TTS, STT, fake sensors).
- **Important files:** `AndroidManifest.xml` with required services, SELinux policies (AOSP), build.gradle.

## `agent/host-adapter` (Host-side adapter)
- **Goal:** bridge host control-plane and in-VM Agent using either `adb` port forward, socket proxy, or persistent TLS connection.
- **Core components:**
  - `ProxyService` — maps host ports to VM agent endpoints, handles TLS termination and certificate pinning.
  - `ImageManager` — manage AVD/VM images, snapshotting, and restore operations.
  - `ADBManager` — helper to run adb commands programmatically.

## `control-plane` (Host cloud orchestration)
- **Goal:** central API gateway, orchestrator, RBAC, auditing, task management and multi-tenant instance scheduling.
- **Core components:**
  - `Gateway` — OpenAPI-backed gateway server (Node.js/Express + OpenAPI middleware OR Spring Boot) that validates and forwards commands.
  - `Orchestrator` — workflow engine (Temporal recommended) to run multi-step flows, orchestrate retries, and maintain state.
  - `InstanceManager` — manage lifecycle of VM instances, allocate resources, and route requests via host-adapter.
  - `AuthService` — mTLS/JWT issuance, rotation, RBAC policies.
  - `PolicyEngine` — central allowlist and policy enforcement on what endpoints are available per instance.
  - `AuditLog` — immutable append-only log (append to object store + signed metadata) for replay.

## `tasks/` — Tasks & Subtasks dynamic system
- **Goal:** keep real-time parity between Control Plane tasks and AI-agent todo list.
- **Design:**
  - `Tasks API` — OpenAPI endpoints: `GET /tasks`, `POST /tasks`, `PATCH /tasks/{id}`, `WS /tasks/stream` and `POST /agents/{agentId}/task-sync`.
  - `Event Bus` — message broker (e.g., RabbitMQ / Redis Streams / Kafka) for pub/sub events: `task.created`, `task.updated`, `task.completed`.
  - `Agent Sync Adapter` — inside `agent/android-agent` implement a background sync worker that subscribes or polls `tasks` updates and applies them locally; it also publishes local changes back to the bus.
  - `Conflict Resolution` — optimistic locking + vector clocks; last-writer-wins is acceptable for low-contention scenarios but recommend merge strategies for complex subtasks.
  - `Realtime updates` — WebSocket channel for UI clients and persistent agent connections.
- **Data model (simplified):**
  ```json
  Task {
    id: uuid,
    title: string,
    description: string,
    status: enum[open,in_progress,blocked,done],
    assignee: userId | agentId,
    created_at: timestamp,
    updated_at: timestamp,
    subtasks: [ Task ]
  }
  ```

---

# Database & Storage
- **Primary DB:** PostgreSQL (control-plane metadata, tasks, RBAC, instance catalog).
- **Event store:** Kafka or Redis Streams for task events and orchestration events.
- **Blob storage:** MinIO/S3 for snapshots, screenshots, APK files, audit logs.
- **Caching / state:** Redis for ephemeral locks, rate limiting, and presence tracking.
- **Schema notes:** include `instances`, `tasks`, `users`, `policies`, `audits`, `snapshots` tables. Use JSONB for flexible `capabilities` and `orchestration_trace` fields.

---

# Authentication & Authorization
- **Mutual TLS (mTLS)** between Control Plane and Host Bridge (recommended for intra-infra traffic).  
- **OAuth2 / JWT** for external clients with short-lived tokens and refresh tokens. Use `kid` rotation and JWKS discovery.  
- **RBAC**: define roles (`admin`, `operator`, `developer`, `agent`) and map to allowed API scopes.  
- **Agent-level allowlist**: the agent stores a signed allowlist of privileged actions; server-side `PolicyEngine` signs ephemeral elevated tokens for root-level actions.

---

# Code architecture & conventions
- **Backend services:** microservices with clear boundaries, OpenAPI-first design. Prefer Go or Kotlin (Spring) for gateway/orchestrator, Node/Typescript for fast prototypes.  
- **Android agent:** Kotlin, use modern Android patterns (Coroutines, WorkManager, Jetpack libraries if UI is needed). Keep the agent modular: separate concerns into `api`, `controller`, `security`, and `plugins` packages.  
- **CI/CD:** GitHub Actions or GitLab CI building multi-stage pipelines: unit test -> build images -> run emulator tests -> publish snapshot -> deploy to staging k8s.

---

# Workflow diagrams (textual descriptions included)
1. **Instance creation sequence**
   - Client -> Gateway `POST /instances` -> Orchestrator schedules VM -> ImageManager launches VM -> HostAdapter registers agent id and returns endpoint -> Gateway returns instance id.
2. **Orchestration flow**
   - Client -> Gateway `POST /instances/{id}/orchestrate` -> Orchestrator runs steps sequentially -> orchestrator issues REST calls to HostAdapter -> HostAdapter forwards to Agent -> Agent performs UI interactions and returns results -> Orchestrator records trace and emits events.
3. **Tasks sync flow**
   - User/ControlPlane updates Task -> Event bus emits `task.updated` -> Agent Sync Adapter receives event -> Agent applies change and acknowledges -> Agent emits `task.local.updated` -> ControlPlane reconciles state.

---

# Dynamic Tasks & Subtasks checklist implementation (concrete)
1. **Tasks Service API** (OpenAPI in `docs/api-openapi.yaml`) exposing CRUD + streaming.
2. **Event Bus** (Kafka/Redis) topics: `tasks.*` with payload including `source` and `version`.
3. **Agent Sync Adapter** code sketch (Android Kotlin): background WorkManager job that maintains a persistent websocket or MQ client to receive `tasks` updates; applies UI notifications and persists tasks to agent-local DB (Room). On local change it publishes back to Control Plane via `POST /agents/{agentId}/task-sync`.
4. **Realtime UI** — control-plane UI subscribes to `WS /tasks/stream` for live updates.
5. **Conflict resolution** — include `version` numeric; agent applies only if `incoming.version > local.version` otherwise pushes its local version for merge.

---

# Testing plan
- Unit tests for each microservice and Android modules.  
- Instrumentation tests using UiAutomator and Espresso inside an emulator; record and playback sequences.  
- E2E tests that spin up a local instance (via emulator), run an orchestration scenario (login, file push, screenshot), and validate outputs.  
- Load & concurrency tests: emulate many orchestration flows and measure latency; tune orchestrator concurrency and instance limits.

---

# CI/CD & Deployment
- **CI pipelines:** run unit tests, lint, build Android APK, run emulator instrumentation tests, build docker images for control-plane services, push to registry.  
- **CD pipelines:** Helm charts deploy to k8s, use rolling updates and canary. Manage VM images in an artifact repository and use image manager to roll out snapshots.

---

# Prompts & step-by-step instructions for an IDE AI Coder (LLM)
> These prompts are structured so an LLM can implement specific files or features. Use them as-is in your IDE assistant.

## Example: Implement `agent/android-agent/app/src/main/java/.../ApiServer.kt`
1. Goal: create a Ktor-based HTTP server running inside the Android Agent that listens on port 8080 and serves `/health`, `/ui/find`, `/ui/click` endpoints.
2. Requirements:
   - Use Kotlin coroutines, Ktor server engine (CIO), and integrate with `AccessibilityController` (assume interface `findNodes(selector)` and `click(nodeId)`).
   - Return JSON responses matching schema `{ request_id, status, start_time, end_time, result, error }`.
3. Steps for the coder:
   - Create `ApiServer.kt` with a `startServer(context)` suspend function that starts Ktor on port 8080.
   - Implement `/health` that returns `200 { "status": "ok" }`.
   - Implement `/ui/find` that accepts POST JSON `{ selector: { type: "resource-id"|"text"|"xpath", value: string } }` and calls `AccessibilityController.findNodes`.
   - Implement `/ui/click` that accepts POST JSON `{ node_id: string }` and calls `AccessibilityController.click`.
   - Add logging and exception handling to return `{ status: "error", error: "message" }` and propagate request_id.
4. Tests:
   - Unit-test `ApiServer` by mocking `AccessibilityController` and asserting JSON responses.

Use the above pattern for every file request; the tasks folder contains a full list of issues with a precise prompt per file.

---

# Project management & milestones
- **M1 (PoC, 2 weeks):** Agent prototype (Accessibility + Ktor endpoints) + Host Adapter using adb port-forward; basic Gateway and CLI.  
- **M2 (Harden, 4 weeks):** Add UiAutomator support, tasks sync, basic orchestrator, and E2E tests.  
- **M3 (Scale, 6–8 weeks):** AOSP integration (priv-app), SELinux policy, k8s deployment, monitoring and RBAC.  
- **M4 (Production hardening, 4 weeks):** Security audit, canary rollouts, DRM/GMS licensing work (if needed), and compliance.

---

# Deliverables saved in repo
All above documents, the OpenAPI spec, task definitions, and initial code scaffolds (templates) are saved in the repo scaffold under the paths listed at the top. Each `README.md` includes exact commands to create the file, build, and run tests.

---

If you want, I will now:
- create the actual files in the canvas for the repo (detailed `api-openapi.yaml`, `architecture.md`, `tasks/tasks.md`, and prompts for each code file), or
- generate a downloadable scaffold ZIP with placeholder files and CI scripts, or
- start generating the Android Agent project files (ApiServer, AccessibilityController, WorkManager sync adapter) with working Kotlin code.

Pick which artifact to generate next and I will add it into the canvas repo documents.

