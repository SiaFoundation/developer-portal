---
title: Indexers
---

# Indexers

An **indexer** is a service that sits between applications and storage providers. It tracks where objects live on the Sia network, coordinates ongoing repairs, and enforces a simple access model so apps don’t need to manage storage providers or contracts themselves.

Applications talk to the indexer for object IDs, metadata, storage layout, and access control, and the SDK coordinates uploads and downloads to storage providers using information supplied by the indexer.

## What does an indexer do?

An indexer is responsible for:

* Storing **object records** keyed by object ID, including encrypted metadata and slab layouts.
* Tracking which **slabs** (and their shards on storage providers) belong to each object.
* racking slab health and **coordinating repairs** when redundancy drops.
* Managing **accounts and registered app identities** so multiple apps can safely share the same indexer.
* Exposing an API/SDK so applications can save, list, and fetch objects without dealing with storage providers or contracts directly.

You can think of it as the “object directory and health manager” for a set of applications using the Sia network.

## The role of indexers

### Metadata

Indexers know just enough about each object to track and maintain it. For every object, an indexer knows the following:

* The **object ID** (a deterministic identifier derived during object sealing)
* The set of **slabs** that store the object’s data
* The **creation timestamp**
* The **size** of the opaque metadata blob

The metadata itself is:

* **Application-Defined** — the app chooses the structure and fields.
* **Encrypted** — the indexer never sees it in plaintext.
* **Opaque** — the indexer cannot derive any meaning from it.

Indexers **do not** know filenames, paths, tags, content types, versions, or any other semantic information about objects. If you want to search or filter by those things, you build that logic in your application or in a separate index.

### Access controls

Indexers enforce access permissions based on the account and the app’s registered public key.

* Each **account** represents a logical owner (user, team, or service).
* Each **app** derives an **app key** and registers the corresponding public key with the indexer.
* When an app stores an object, the indexer associates that object ID with the account and app key that signed it.

When an application calls the indexer:

* It authenticates using its app key for a specific account.
* The indexer will only list, return, or delete objects associated with a specific account and registered public app key.
* The indexer never inspects metadata to decide who “should” see an object.

Indexers can also support **share URLs** that allow anyone with the link to read a specific object. Fine-grained permissions (per-user ACLs, groups, roles, and so on) are intentionally out of scope and implemented entirely at the app layer.

### Data health and repair

Indexers are responsible for keeping stored data healthy over time.

For each object ID, the indexer maintains a mapping:

```mermaid
flowchart LR
    O["Object ID"]
    S["Slabs"]
    H["Shards on storage providers"]

    O --> S --> H
```

Using this basic mapping, an indexer:

* Periodically scans storage providers to measure availability
* Tracks how many shards for each slab remain healthy
* Repairs slabs by re-encoding data and uploading new shards when redundancy falls below a target threshold
* Deletes slabs when applications unpin or remove objects

If an indexer server crashes or is offline, its database is not lost, but health checks and repair coordination do not run. During this time, existing redundancy remains intact, but no new repairs are scheduled until the indexer is back online. If downtime is prolonged, it may be necessary to migrate to a new server so repairs can resume before redundancy decays too far.

## Privacy boundary

Objects are sealed by the SDK before they reach the indexer. The SDK encrypts the data and metadata and sends only:

* The **object ID**,
* The **slab layout** (which slabs and storage providers hold the encrypted shards),
* The **encrypted metadata** blob, and
* Timestamps.

Indexers never see plaintext data or metadata.

Storage providers store encrypted **shards** only; they do not see object IDs, metadata, or any application-level information about the data they hold. The keys needed to decrypt data and metadata stay with the application (or user), not with the indexer or storage providers.

Indexers **can** observe operational information, such as:

* Approximate object sizes (derived from the slab layout)
* Which account and app key own which object IDs
* When objects are created and when layout/metadata is requested

Indexers **cannot** see:

* The plaintext contents of objects
* The structure or fields of metadata
* Application-level concepts like filenames, folders, tags, or document semantics

This boundary lets indexers manage data placement and health without learning
what the data actually is.

## What indexers don’t do

Indexers deliberately avoid higher-level object-store features. They **do not**:

* Provide paths, prefixes, or buckets
* Implement directories or folder hierarchies
* Search or filter over metadata
* Introspect or validate metadata or schemas
* Implement per-user ACLs, groups, or role-based permissions
* Handle application logic such as version history, trash, or billing

Their job is to track objects on the Sia network and keep the underlying data healthy. Everything else belongs at the application layer. Apps that need richer behavior build it on top of the indexer’s simple, object-centric interface.

## Why indexers are central to Sia’s user-friendly architecture

Without an indexer, every application would need to:

* Discover and score storage providers
* Form and maintain contracts and payment accounts
* Decide where to place slabs and how to repair them
* Track which slabs belong to which objects
* Bolt on its own access-control system

Indexers centralize that complexity into a reusable service:

* **For users:** they can allow multiple apps to work with objects in the same account while keeping each app’s objects isolated by app key and preserving data privacy.
* **For developers:** they provide a small, stable API focused on objects and metadata, instead of forcing each app to manage storage providers and contracts.
* **For operators:** they cleanly separate “run indexers and storage providers” from “build applications,” so infrastructure and apps can evolve independently.

By staying narrow—tracking objects, preserving privacy, managing data health, and enforcing a simple access model—indexers make Sia’s decentralized storage layer feel like a straightforward, user-friendly object service.
