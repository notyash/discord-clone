# Deferred Features & Technical Debt

This document tracks features deliberately postponed to maintain focus on foundational SurrealDB mastery, along with their technical context, rationale, and planned implementation paths.

---

## 1. Native TOTP 2FA via Rust/WASM (Surrealism)

* **Status**: Postponed (Foundational auth must be solid first).
* **Technical Blocker**:
  SurrealQL has native hashing and KDF primitives (`crypto::argon2::*`, `crypto::bcrypt::*`, `crypto::pbkdf2::*`, `crypto::scrypt::*`, `crypto::sha256::*`, etc.) and base64 encoding (`encoding::base64::*`), but lacks native HMAC functions (`crypto::hmac`) and Base32 encoding/decoding (`encoding::base32::*`). RFC 6238 TOTP computation requires both.
* **SurrealDB Implementation Path**:
  Compile a custom Rust module to the `wasm32-wasip2` target implementing TOTP secret generation, Base32 decoding, and HMAC-SHA1/SHA256 window verification. Load the module into SurrealDB via the experimental module system ("Surrealism") using engine capability flags:
  `SURREAL_CAPS_ALLOW_EXPERIMENTAL=files,surrealism`.

---

## 2. Scheduled Session & Expired Record Cleanup

* **Status**: Postponed (Filter-only evaluation in place).
* **Technical Blocker**:
  SurrealDB does not contain an internal cron or clock-driven background scheduler. `DEFINE EVENT` executes strictly on record mutations (`CREATE`, `UPDATE`, `DELETE`), not on a temporal trigger.
* **Mitigation Strategy**:
  Active authentication and queries evaluate expiration timestamps conditionally (`WHERE expires_at > time::now()` or via `DURATION FOR TOKEN / FOR SESSION` token expiry).
* **SurrealDB Implementation Path**:
  If accumulated expired rows impact index performance or disk storage, implement an external lightweight worker or evaluate SurrealDB 3.x background agent tasks.

---

## 3. Production TLS/WSS Reverse Proxy & Cluster Topologies

* **Status**: Postponed (Local single-node Docker container in use).
* **Technical Context**:
  Currently connecting directly over unencrypted WebSockets (`ws://localhost:8000`) and HTTP (`http://localhost:8000`) to Docker pinned at `surrealdb/surrealdb:v3.2.4`.
* **Future Implementation Path**:
  Deploy distributed TiKV/SurrealDB storage engine backend with Caddy/Nginx for TLS termination and WSS connection upgrading once multi-node architecture benchmarking begins.
