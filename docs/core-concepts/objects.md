# Objects

Objects are the core unit of data that applications read and write through Sia’s indexer (`indexd`). Higher-level interfaces like the S3 gateway, `fsd`, or Sia Drive may present objects as “files” or “bucket + key” pairs, but internally **`indexd` only works with sealed, encrypted objects identified by a content-derived object ID**.

An object hides the underlying slabs, sectors, and hosts that actually store the data, so apps work with a single logical object rather than individual storage pieces.

## What is an object?

An **object** is encrypted application data plus metadata, together with the slab layout needed to reconstruct that data, all tied to a single **object ID**.

- The **object ID** is a 32-byte content ID derived from the object’s slab slices. If the data (and thus the slab layout) changes, the object ID changes.
- The **data** lives in one or more **slabs**, each erasure-coded into encrypted shards distributed across many hosts.
- The **metadata** is opaque, application-defined bytes (often JSON).
- The SDK also tracks **timestamps** (`createdAt`, `updatedAt`).

Internally, `indexd` never sees plaintext data or plaintext metadata. The SDK **seals** objects before they are sent to `indexd`: it encrypts the master key and metadata, signs the sealed object with the app key, and `indexd` stores that sealed form indexed by the object ID for a specific account + app.

### Object anatomy (SDK view)

In the Go SDK an object looks roughly like this:

```go
type Object struct {
    masterKey []byte
    slabs     []slabs.SlabSlice
    metadata  json.RawMessage
    createdAt time.Time
    updatedAt time.Time
}
```
At this level, the SDK gives you:

- a **master key** used to encrypt/decrypt the object’s data and metadata
- a list of **slab slices** (`slabs`) that define where the data lives
- an opaque **metadata** blob that your app defines
- **timestamps** for creation and last update

### Sealed objects (`indexd` view)

`indexd` stores a sealed form of the object rather than the in-memory `Object`. A `SealedObject` contains:

- the **encrypted master key** (`encryptedMasterKey`)
- the **slab layout** (`slabs`)
- the **encrypted metadata** (`encryptedMetadata`)
- a **signature** over the object ID and encrypted fields
- **timestamps** (`createdAt`, `updatedAt`)

The SDK creates this `SealedObject` from an `Object` using the app key. `indexd` never sees the master key or metadata in plaintext; it only sees this sealed blob plus the slab layout and timestamps.

Everything beyond the object ID, slabs, and timestamps—names, logical paths, content type, versions, etc.—lives in your application’s metadata or separate indexes.


## Objects, apps, accounts, and users

At the `indexd` layer there are four main actors:

- **User:** ultimately owns the data and the account on `indexd`.
- **Account:** - created and managed via the Admin API; tracks usage, limits, and billing for a user or organization.
- **App:** - code that talks to `indexd` using an **app key**. Each app has its own key pair and is isolated.
- **Object:** - encrypted data + metadata that an app stores into an account.

A typical flow looks like this:

1. An operator creates an **account** and issues a **connect key** for it.
2. A user runs an app. The app derives or loads its **app key** and connects to `indexd` using that connect key via the SDK.
3. `indexd` associates the app key with the account and allows that app to create and read objects in that account.
4. When the app uploads data, the SDK builds an `Object`, seals it, and calls `SaveObject`. `indexd` stores the resulting `SealedObject`, indexed by the object ID under that account and app.

The combination of **account** and **app key** is the only namespace `indexd` cares about. There are no additional buckets, directories, or per-object keys at this layer—just objects addressed by their IDs within an `(account, app)` pair.


## Differences from a file system

Sia’s object model differs from a traditional filesystem in a few key ways.

### Identity and naming

- **File system:** Files live in a directory tree (`/home/user/photos/...`) and are identified by path.
- **Sia objects:** Objects are identified by an **object ID**, a hash of their slab layout (slab slices). `indexd` doesn’t know about filenames, folders, or buckets. Any human-friendly naming (like “filename” or logical path segments) lives in your application’s metadata or in a separate index that you control.

### Access model

- **File system:** Applications open file handles and perform stateful operations (`open`,`read`, `write`, `close`) with POSIX-style permissions.
- **Sia objects:** Applications make **stateless SDK calls** to create, read, share, and delete objects. There are no long-lived file handles at the `indexd` layer. Access is controlled by:
  - the **account** you are connected to  
  - the **app key** you are using  
  - optional **share URLs**, which are effectively public (anyone with the link
    can read that object)

  Fine-grained ACLs (“user A but not user B”) are implemented by your application, not by `indexd` itself.

### Updates

- **File system:** You can modify part of a file in place while keeping the same path.
- **Sia objects:** Objects are **content-addressed**. Changing the data changes the slab layout, which changes the object ID. `indexd` never updates an object’s data in place; each new layout is a new object with a new ID. There is no built-in “latest” alias—if you need versioning or “current document” semantics, you track multiple object IDs for a logical item in your own index or metadata.

### Durability and layout

- **File system:** File data typically lives on local disks or RAID; durability is provided by local hardware or replication.
- **Sia objects:** Object data is stored in **slabs** that are erasure-coded into encrypted shards and spread across many hosts in the Sia network. `indexd` tracks which hosts hold which shards and runs background jobs to repair slabs when redundancy drops. Your application only talks to `indexd` via the SDK; it never has to manage hosts, contracts, or repairs directly.


## Are objects mutable?

At the `indexd` layer, **objects are effectively immutable**:

- The **object ID** is a hash of the object’s slab layout.
- Changing the data changes the slabs, which produces a **new object ID**.
- `indexd` never updates an object’s data “in place”; each new layout is stored as a separate object with its own ID.

You can still change some things without touching the data:

- **Metadata-only changes:** Updating metadata without changing slabs keeps the same object ID, so you can fix labels, add tags, or tweak app fields without re-uploading.

If you need versions, implement them in your app by tracking multiple object IDs for the same logical item and marking one as “current”.

Think in terms of whole immutable objects, not in-place byte edits.

## Object contents and metadata

From the SDK + `indexd` point of view, each object carries a small set of well-defined fields.

### Identity

- **Object ID** - a 32-byte content ID derived from the object’s slab layout.
- **Account + app key** - determine which account owns the object and which app is allowed to read or write it.

There are no buckets, keys, or paths at this layer. The combination of account and app key is the only namespace `indexd` cares about.

### Contents (data)

- **Master key** – secret key the SDK uses to encrypt/decrypt data and metadata. `indexd` only sees the **encrypted** master key (`encryptedMasterKey`).
- **Slab slices** – references into one or more slabs that hold the encrypted data.
- **Slabs and shards** – slabs are erasure-coded into encrypted shards stored as sectors on many hosts. `indexd` tracks shard locations and repairs slabs when redundancy drops.


### Metadata

- **Application-defined metadata** – an opaque blob (often JSON) your app controls. In the SDK this is `metadata`; in `indexd` it is `encryptedMetadata`. You might store:
  - filenames or logical paths
  - content type
  - titles/descriptions
  - checksums, version pointers, or other app fields

- **Timestamps** – `createdAt` and `updatedAt`, tracked by the SDK/`indexd`.

There is no separate “system metadata” schema like S3 headers. Size is derivable from slab slices, and health is tracked per slab/host, not as first-class object fields. Everything beyond the object ID, slabs, and timestamps is defined by your application.

