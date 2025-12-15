---
title: Objects
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

- the **encrypted master key** (`encryptedMasterKey`)
- the **slab layout** (`slabs`)
- the **encrypted metadata** (`encryptedMetadata`)
- a **signature** over the object ID and encrypted fields
- **timestamps** (`createdAt`, `updatedAt`) 

`indexd` stores this sealed form keyed by the object ID under a specific account and app key. It doesn’t attach filenames, paths, content types, or other higher-level attributes to an object. If you need those, you store them yourself in the object’s metadata or in your own indexer.

## Differences from a file system

Traditional file systems identify data by a mutable path like `/home/user/photos/...` and let you edit bytes in place while keeping that path. In `indexd`, an object is identified only by its **object ID**, a hash of its slabs; if the data changes, the slabs and the object ID change, so objects are
immutable.

An object’s data is stored in **slabs** that are erasure-coded into encrypted **shards** and spread across many hosts. `indexd` tracks those shards and repairs slabs in the background, so applications just read and write whole objects via the SDK instead of managing hosts or files directly.

## Are objects mutable?

At the `indexd` layer, **objects are immutable**:

- The **object ID** is a hash of the object’s slab layout.
- Changing the data changes the slabs, which produces a **new object ID**.
- `indexd` never updates an object’s data in place; each new layout is stored as a separate object with its own ID.

