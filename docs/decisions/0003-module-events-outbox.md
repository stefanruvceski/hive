# ADR 0003 — Module events: a durable outbox in SQLite

- **Date:** 2026-11-04
- **Status:** Accepted
- **Decided by:** the maintainer (issue #80); details marked "agent" were decided while building

## Context

Modules never import each other ([ADR 0001](0001-modules-sqlite-native-only.md)), yet Wallet receipts must reach Money, and a consumer may not have been opened yet or the app may be killed halfway. The shared database already exists, so the channel lives there.

## Decision

1. **Two core tables.** `core_events(id, type, version, payload JSON, created_at)` is append-only; `core_event_cursor(consumer, last_event_id)` holds one row per registered consumer.
2. **Publish in the producer's transaction.** `publish(tx, event)` inserts the event with the same `tx` that saves the producer's data, so both exist or neither does. A signal wakes listeners after the transaction ends (`onEvents`); pull on app start and on screen open stays the guarantee, the signal is only a hint.
3. **Consume with a cursor.** `consume(consumer, handler)` reads the events after the consumer's cursor, runs the handler for each and moves the cursor in one transaction (the handler gets the same `tx` for its own writes). A crash in between rolls everything back, so events are re-delivered: **handlers must be idempotent**, normally with a unique `source_ref` column on the consumer's own table (an upsert or ignore on conflict).
4. **Replay.** A consumer registers on its first `consume`, with its cursor before the first event still kept, so data published earlier can be imported.
5. **Retention.** An event is deleted once every registered consumer has read it. With no registered consumer nothing is deleted this way, and every event is deleted after 90 days at most (agent: a consumer that never opens cannot pin the table forever).
6. **Versioned payloads.** `version` is part of the payload (and a column). Consumers handle every version still in the table; an unknown type or version is skipped and the cursor moves on.
7. **Update and delete are events too.** A producer publishes `receipt.updated` (full new state) and `receipt.deleted` (the id); consumers keep their own copy in step by `source_ref`.

## Not chosen

- **An in-memory bus**: loses events when the app is killed or a module has not been opened yet.
- **Full event sourcing**: state is not rebuilt from events; the events are a hand-off, deleted after delivery, and each module's tables stay the source of truth.

## Consequences

- One migration; no UI. Code in `src/lib/events/` (pure outbox logic over a small store interface, tested with an in-memory fake; a Drizzle adapter).
- Contract v1: `receipt.scanned`, `receipt.updated`, `receipt.deleted`.
