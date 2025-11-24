---
title: Objects
---

# Objects

Objects are the primary unit of data you read and write through Sia’s
application interfaces (fsd, S3, Sia Drive). An object bundles your raw
bytes together with metadata and a key (path) inside a bucket, while hiding the
underlying slabs, sectors, and hosts that actually store the data.

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

Internally, the indexer maps each object to one or more **slabs**, and each
slab is split into encrypted shards stored on many hosts. The object abstraction
hides this layout - meaning you work with one logical object, not individual storage provider pieces.

## Differences from a file system

Sia’s object model differs from a traditional file system in several important ways:

### Namespace
- File System: Hierarchical directories `/home/user/photos/2025...`
- Sia object storage: Flat keys inside buckets
    - `photo/2025/hello.png` is a key, where "directories" are a naming convention, not the real folders.

### Access Model

### Scaling and metadata
- File system: Central metadata structures and directory trees can become bottlenecks at large scale.
- Sia object storage: Buckets and object metadata live in renter/indexer databases designed to scale to large numbers of objects, while the actual bytes live on many hosts.

### Updates
- File system: Can modify a portion of a file in place.
- Sia object storage: Treats objects as whole units:
    - To “change” an object, you upload a new version (or overwrite) at the same key.
    - The underlying slabs and sectors are rewritten; existing data is not edited in place.

## Are objects mutable?

Conceptually, Sia objects are immutable:
- Once an object is written, its underlying slabs are not modified in place.
- Updating an object means:
    - Uploading a new payload
    - Re-encoding it into slabs and sectors
    - Updating the object metadata to point to the new layout

Older data may be retained as historical versions or garbage collected later, but the storage layer treats each layout as a new immutable backing for that object key.

For app developers, this means you should think in terms of overwriting or versioning whole objects, not editing bytes inside them.

## What information does an object carry?
At the Sia object layer, each object carries several classes of information.

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

### User-provided metadata
Arbitrary key–value pairs attached by the application.

## Internal layout metadata (not exposed to apps)
Inside indexers, additional metadata is tracked so Sia can rebuild any object:
- Which **slabs** back the object
- Which **storage providers** currently hold shards for each slab
- Associated **contracts**, repair status, and accounting information

Applications never see this; they interact with Sia purely through the object abstraction, while the network handles durability and distribution behind the scenes.