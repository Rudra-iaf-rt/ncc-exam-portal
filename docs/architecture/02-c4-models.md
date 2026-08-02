# Chapter 2: C4 Models & System Topology

To provide clarity on how the NCC Exam Portal is structured, we employ the **C4 Model** for visualizing software architecture. This progresses from a high-level system context down to specific component interactions.

## 2.1 Level 1: System Context Diagram

The System Context diagram illustrates the NCC Exam Portal's relationship with its users and external systems.

```mermaid
flowchart TD
    %% Users
    Cadet[Cadet / Student\nTarget: Mobile & Web users]
    Instructor[College ANO\nTarget: Desktop Dashboard]
    Admin[Unit HQ Admin\nTarget: Desktop Dashboard]
    
    %% Main System
    System((NCC Exam Portal\nCore Assessment Ecosystem))
    
    %% External Systems
    GoogleDrive[Google Drive\nExternal Study Materials]
    Redis[Redis Cache\nSession & Rate Limiting]
    Postgres[(PostgreSQL\nPrimary Persistence)]
    
    Cadet -->|Takes secure exams,\nviews results| System
    Instructor -->|Creates exams,\nmonitors telemetry| System
    Admin -->|Manages colleges,\nglobal analytics| System
    
    System -.->|Fetches external resources| GoogleDrive
    System <-->|Reads/Writes transactional state| Postgres
    System <-->|Queries rate limit quotas| Redis
```

## 2.2 Level 2: Container Diagram

The Container diagram zooms into the system to show the high-level technical containers that make up the software architecture.

```mermaid
flowchart TD
    subgraph Client Applications [User Client Tier]
        AdminSPA[Admin Console\nReact 19, Vite, Tailwind]
        CadetSPA[Cadet Portal\nReact 19, Vite, PWA capabilities]
    end

    subgraph API Services [Services Tier - Node.js / Express]
        Gateway[Auth & Routing Gateway\nJWT Validation, Helmet, CORS]
        ExamEngine[Exam Execution Engine\nAuto-save, Scoring, Submission]
        ProctorEngine[Proctoring Guard\nHeuristic telemetry, Heartbeats]
        AdminService[Admin Services\nBulk CSV, Assignment transactions]
    end

    subgraph Data Stores [Persistence Tier]
        DB[(PostgreSQL 15\nPrisma ORM, JSONB Data)]
        Cache[(Redis 7\nIn-memory datastore)]
    end

    AdminSPA & CadetSPA -->|HTTPS / REST API| Gateway
    Gateway --> ExamEngine
    Gateway --> ProctorEngine
    Gateway --> AdminService
    
    ExamEngine <-->|Read/Write Attempt State| DB
    ProctorEngine -->|Write Violations| DB
    AdminService <-->|Read/Write Schema Data| DB
    
    Gateway <-->|Check Rate Limits| Cache
```

## 2.3 Level 3: Component Diagram (Backend API)

Zooming into the `API Services` container, we map the flow of a critical transactional request: `PATCH /api/exams/saveAnswer`.

```mermaid
flowchart TD
    Client[React Frontend] -->|PATCH /api/exams/saveAnswer| Router[Express Router\nexams.routes.js]
    
    subgraph Express Middleware Chain
        RateLimit[Rate Limiter\n100 req/min bucket]
        AuthGuard[RequireCadet Guard\nValidates JWT Signature]
        ZodValidator[Zod Schema Validator\nSanitizes JSON payload]
    end
    
    Router --> RateLimit
    RateLimit --> AuthGuard
    AuthGuard --> ZodValidator
    
    ZodValidator --> Controller[Exam Controller\nexams.controller.js]
    Controller --> Service[Exam Service\nexam.service.js]
    
    Service --> Prisma[Prisma Client\nORM Abstraction]
    Prisma <--> DB[(PostgreSQL)]
```

### Component Interaction Logic:
1. **Express Router:** Receives the incoming HTTPS request and routes it to the specific middleware chain.
2. **Rate Limiter:** Checks Redis to ensure the IP hasn't exceeded the endpoint-specific threshold.
3. **Auth Guard:** Extracts the HTTP-Only JWT, verifies the cryptographic signature, and asserts that the `role` is `CADET`. Injects `req.user`.
4. **Zod Validator:** Prevents NoSQL/SQL injections by ensuring the body strictly conforms to expected shapes (e.g., `studentId` is an integer, `answer` is a string).
5. **Controller:** Orchestrates the HTTP response (Status Codes) and invokes the business logic service.
6. **Service:** Executes business rules (e.g., checking if the exam hasn't expired) and calls Prisma.
7. **Prisma ORM:** Compiles the query into parameterized SQL to update the `JSONB` answers column safely.
