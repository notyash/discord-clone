# Architectural & Schema Decisions (ADR)

This document records the architectural, data-modeling, and schema design decisions made during the Discord clone build, along with their context, trade-offs, and technical rationale.

---

## ADR 001: Pure SurrealDB as a Backend-as-a-Service (BaaS)

* **Decision**: Eliminate intermediate API application layers (e.g., Axum/Rust) and connect the client application directly to SurrealDB.
* **Context**:
  The project exists to achieve deep mastery of SurrealDB across its full surface area for a Forward Deployed Engineer (FDE) opening.
* **Trade-offs**:
  * *Pros*: Forces direct utilization of native SurrealDB capabilities: `DEFINE ACCESS` (auth), `PERMISSIONS` (authorization), custom functions (business logic), `DEFINE API` (routing), and `LIVE SELECT` (real-time).
  * *Cons*: Requires shifting all security boundaries directly into SurrealQL statements and permission rules rather than relying on application middleware.
* **Rationale**:
  Building custom API layers abstracts away database internals. Pure BaaS exposes every protocol nuance, error mode, and query behavior directly to the client.

---

## ADR 002: Direct WebSocket Connection for Real-Time State

* **Decision**: Connect the Electron/React client directly to SurrealDB via WebSocket (`ws://` / `wss://`) using the official JavaScript/TypeScript SDK.
* **Context**:
  Discord requires low-latency real-time updates for messages, presence, and channel states.
* **Trade-offs**:
  * *Pros*: Leverages native `LIVE SELECT` queries without needing custom Redis pub/sub or socket servers.
  * *Cons*: Requires managing WebSocket connection lifecycle, re-authentication, and query unsubscription handling on the client.
* **Rationale**:
  Demonstrates mastery of SurrealDB's real-time engine and live query mechanics.

---

## ADR 003: Native Graph Edges (`TYPE RELATION`) vs Array Pointers

* **Decision**: Implement channel membership using `DEFINE TABLE member_of TYPE RELATION FROM user TO channel SCHEMAFULL;` rather than storing channel IDs in a `channels: array<record<channel>>` field on `user`.
* **Context**:
  Users belong to multiple channels, and channels contain multiple users.
* **Trade-offs**:
  * *Pros*: Enables native graph traversal (`user:alice->member_of->channel`), bi-directional navigation without index redundancy, and storage of edge-specific properties (`joined_at`, role metadata) directly on the relation record.
  * *Cons*: Requires `RELATE` syntax and graph-aware query modeling instead of basic array mutations.
* **Rationale**:
  Tests and exercises SurrealDB's graph query engine capabilities, relationship constraints, and traversal optimization.

---

## ADR 004: Strict Schemafull Tables with Engine Assertions

* **Decision**: Define all tables (`user`, `channel`, `message`, `trusted_device`, `member_of`) with `SCHEMAFULL` and explicit field assertions.
* **Context**:
  SurrealDB supports both schemaless flexibility and strict schema enforcement.
* **Trade-offs**:
  * *Pros*: Enforces data integrity directly in the storage engine via `ASSERT string::is_email($value)` and length validations, preventing corrupted state across clients.
  * *Cons*: Schema migrations require explicit `DEFINE FIELD` updates.
* **Rationale**:
  Enterprise and production deployments of SurrealDB prioritize strict schema validation and query performance over untyped flexibility.

---

## ADR 005: Record-Level Access (`TYPE RECORD`) for Authentication

* **Decision**: Use `DEFINE ACCESS account ON DATABASE TYPE RECORD` with native `crypto::argon2` password hashing instead of external JWT issuers (`TYPE JWT`) or system users.
* **Context**:
  User authentication needs to bind directly to `user` table records.
* **Trade-offs**:
  * *Pros*: Directly sets the `$auth` context to the authenticated `user` record pointer (`user:id`), allowing row-level `PERMISSIONS` clauses (`WHERE user = $auth`) to execute without custom token parsing.
  * *Cons*: Database engine directly manages password verification and token generation.
* **Rationale**:
  Exercises native SurrealDB authentication pipelines, cryptographic primitives, and `$auth` session state binding.
