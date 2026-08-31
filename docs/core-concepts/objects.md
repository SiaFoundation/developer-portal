---
title: Objects
description: Understand the object model in Sia's indexd, including object IDs, sealed objects, metadata, slab layouts, and how objects differ from traditional file systems.
---

# Objects

In `indexd`, an **object** is the application-level view of stored data. It ties together encrypted data, encrypted metadata, and the storage layout on the Sia network under a single content-derived **object ID**.

At the storage layer, the data ultimately lives as encrypted **shards** on hosts. `indexd` groups those shards into slabs and exposes them to applications as objects, so apps work with a single logical object rather than individual slabs or shards.

An object carries four pieces of information:

- An **object ID** - a 32-byte content ID derived from the object’s slabs
- A set of **slabs** - the pieces of encrypted data that make up the object
- **metadata** - opaque, application-defined bytes (often JSON)
- **timestamps** - when the object was created and last updated

The **object ID** depends only on the content layout. If the data changes and the slabs change, the object ID changes as well.

### Sealed objects (`indexd` view)

`indexd` never sees plaintext data or plaintext metadata. Before an object is sent to `indexd`, the SDK encrypts the data and metadata and produces a **sealed object** that contains:

- the **encrypted data key** (`encryptedDataKey`) — decrypts the object's slabs
- the **slab layout** (`slabs`)
- a **signature** over the object ID and the encrypted data key (`dataSignature`)
- the **encrypted metadata key** (`encryptedMetadataKey`) — decrypts the metadata, present only if the object has metadata
- the **encrypted metadata** (`encryptedMetadata`)
- a **signature** over the object ID, encrypted metadata key, and encrypted metadata (`metadataSignature`)
- **timestamps** (`createdAt`, `updatedAt`)

Data and metadata are sealed under two independent keys with two independent signatures. That split is why updating an object's metadata never touches the data key — the SDK re-seals only the metadata half.

`indexd` stores this sealed form keyed by the object ID under a specific account and app key. It doesn’t attach filenames, paths, content types, or other higher-level attributes to an object. If you need those, you store them yourself in the object’s metadata or in your own indexer.

### Slab versions

Each slab carries a `version` field. V0 slabs (the original format) encrypt the whole object under one key. V1 slabs derive each slab's encryption key from the object's data key combined with that slab's own key, so a single slab can be re-encrypted independently without reusing a key or touching the rest of the object's data.

## Differences from a file system

Traditional file systems identify data by a mutable path like `/home/user/photos/...` and let you edit bytes in place while keeping that path. In `indexd`, an object is identified only by its **object ID**, a hash of its slabs; if the data changes, the slabs and the object ID change, so objects are immutable.

An object’s data is stored in **slabs** that are [erasure-coded](./erasure-coding.md) into encrypted **shards** and spread across many [storage providers](./storage-providers.md). `indexd` tracks those shards and repairs slabs in the background, so applications just read and write whole objects via the SDK instead of managing hosts or files directly.

## Are objects mutable?

At the `indexd` layer, **objects are immutable**:

- The **object ID** is a hash of the object’s slab layout.
- Changing the data changes the slabs, which produces a **new object ID**.
- `indexd` never updates an object’s data in place; each new layout is stored as a separate object with its own ID.
