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
- **System metadata** (size, MIME type, last modified time, health, ETag/hash)
- **User-defined metadata** (arbitrary key–value pairs you attach)

Internally, the indexer maps each object to one or more **slabs**, and each
slab is split into encrypted shards stored on many hosts. The object abstraction
hides this layout - meaning you work with one logical object, not per storage providers pieces.

