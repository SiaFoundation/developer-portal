---
title: Objects
---

# Objects

Objects are the primary unit of data you read and write through Sia’s application interfaces (fsd, S3, Sia Drive). An object bundles your raw bytes together with metadata and a key (path) inside a bucket, while hiding the underlying slabs, sectors, and hosts that actually store the data.

---

## What is an object?

An **object** is an opaque blob of data plus metadata, addressable by a key
inside a bucket.

At the app layer an object has:
- A **bucket** (namespace)
- A **key** (path within that bucket)
- A **payload** (the bytes you uploaded)
- **System metadata** 
- **User-defined metadata** (arbitrary key–value pairs you attach)

Internally, the indexer maps each object to one or more **slabs**, and each slab is split into encrypted shards stored on many hosts. The object abstraction hides this layout - meaning you work with one logical object, not individual storage provider pieces.

## Differences from a file system

Sia’s object model differs from a traditional file system in several important ways.

### Namespace

- **File system:** Hierarchical directories like `/home/user/photos/2025/...`.  
- **Sia object storage:** Flat keys inside buckets. A path like `photos/2025/hello.png` is just a key – “folders” are a naming convention, not real directories.

### Access model

- **Stateless API, no file handles:**  
  You don’t `open` files or hold handles; you make stateless `PUT` / `GET` / `DELETE` calls on objects.

- **Coarse-grained permissions:**  
  Access is controlled per bucket/object by accounts and API keys (with optional public-read), not POSIX-style owner/group/other or execute bits.

- **No `fsync` or locking:**  
  The SDK uploads slabs directly to hosts and the storage layer handles durability. There is no local disk to `fsync`, and no file locking – your application or versioning handles concurrency.

### Updates

- **File system:** You can modify a portion of a file in place.  
- **Sia object storage:** Objects are treated as whole units:
  - To “change” an object, you upload a new object (or version) at the same key.
  - The underlying slabs and sectors are rewritten; existing data is not edited in place.

### Scaling and metadata

- **File system:** Central metadata structures and directory trees can become bottlenecks at large scale.  
- **Sia object storage:** Buckets and object metadata live in renter/indexer databases designed to scale to large numbers of objects, while the actual bytes live on many hosts.

## Are objects mutable?

Objects are effectively immutable at the storage layer:

- Once an object is written, its backing slabs are not modified in place.
- Updating an object means:
  - uploading a new payload
  - re-encoding it into slabs and sectors
  - updating the object metadata so the key points to the new layout

Older layouts may be retained as historical versions or eventually garbage collected, but the storage layer treats each layout as a new immutable backing for that object key.

For app developers, this means you should think in terms of overwriting or versioning whole objects, not editing bytes inside them.

## Object contents and metadata
At the Sia object layer, each object carries different classes of information.

### Identity
- Bucket name – which logical container it belongs to
- Object key – its unique path within that bucket

### Core system metadata
- Size in bytes
- Content type
- Last modified timestamp
- Integrity information
- Health indicators (how well-protected the object is across hosts)

This metadata is used by Sia to serve requests, validate data, and expose object details via APIs and UIs.