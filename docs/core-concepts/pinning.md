# Pinning

Pinning is a foundational concept in Sia’s storage model.
It determines which objects your application wants the indexer to track, synchronize, and maintain over time. Understanding pinning is essential for building apps that upload, share, sync, or list data reliably.

## What “Pinning” Means

When an object is *pinned*, it is registered with the indexer and becomes part of the indexer’s tracked state for your application.

Pinning means:

* The object’s encrypted metadata is recorded by the indexer.
* The indexer records how that object maps to encrypted slabs stored on hosts.
* The object becomes part of the app’s tracked object set.

As a result, a pinned object:

* Appears in object listings and sync queries
* Generates events when it changes
* Can be downloaded, shared, or deleted by authorized apps using the same App Key

Pinning does **not** store or cache data locally.
It simply tells the indexer, “this object matters to my app,” so the indexer can help manage it over time.

## Pinning vs. Storage

It’s important to distinguish:

### Pinning

* Occurs at the **indexer layer**
* Tracks object metadata and references
* Determines which objects your app knows about
* Enables listing, syncing, events, sharing, and deletion

### Storage

* Occurs at the **host layer**
* Stores encrypted slabs
* Maintained by Sia storage providers
* Managed by contract renewals and upload redundancy settings

Your indexer ***does not*** store raw file data.
Hosts do.

Your indexer ***does*** store object metadata and slab mapping so your app can find those slabs again later.

## How Objects Become Pinned

### During Upload

Calling:

```plaintext
upload = sdk.upload(...)
pinned = await upload.finalize()
```

automatically returns a `PinnedObject`, and the indexer records it.

### Pinning a Shared Object

If someone shares a signed URL with you:

```plaintext
shared = await sdk.shared_object(url)
pinned = await sdk.pin_shared(shared)
```

This creates a pinned copy of the shared object under your app’s account.

### Importing a Sealed Object (advanced)

Sealed objects are fully encrypted bundles that can be exported/imported across indexers or devices.
Opening a sealed object results in a pinned object:

```plaintext
pinned = PinnedObject.open(app_key, sealed_object)
```

## When You Should *Not* Pin Objects

Avoid pinning:

* Temporary files your app does not need to persist
* Objects used only for one-time downloads
* Objects the user does not want stored in the indexer’s history

Pinning does not consume storage on hosts, but it does add entries to the indexer’s metadata database, increasing the amount of metadata the user is responsible for storing and may be billed for.

**Apps should only pin what they intend to store long term.**

## Unpinning and Deleting

When you delete a pinned object:

* The indexer marks it as deleted
* `sdk.objects()` returns `{ deleted: true }`
* It stops generating events
* The underlying shards on hosts may remain until contract expiry

The SDK currently treats “delete” and “unpin” as the same operation—removing the object from your app’s indexer state.

## Pinning and Syncing

Pinning is the foundation of Sia’s object sync model.

Every pinned object contributes to an event stream:

```mermaid
stateDiagram-v2
    [*] --> Uploaded

    Uploaded: SDK upload() + finalize()
    Uploaded --> Pinned: Indexer registers object

    Pinned --> Shared: sdk.share_object()
    Shared --> Resolved: sdk.shared_object(url)
    Resolved --> PinnedByRecipient: sdk.pin_shared()

    Pinned --> Deleted: sdk.delete_object() or unpin
    Deleted --> [*]

    PinnedByRecipient --> DeletedByRecipient: sdk.delete_object()
    DeletedByRecipient --> [*]
```

These events are returned via:

```plaintext
sdk.objects(AppObjectsQuery { cursor, ... })
```

This allows your app to synchronize its local state with the indexer efficiently and incrementally.

Without pinning, an object produces no events, cannot be listed, and cannot be synced.

## Best Practices

**Keep App ID Stable**

:   A stable App ID ensures you always derive the same App Key, which ensures access to previously pinned objects.

**Attach Metadata Thoughtfully**

:   Metadata is encrypted, so feel free to include filenames, MIME types, or user-facing labels.

**Pin Shared Objects You Want to Persist**

:   If someone sends you a share URL, pin it to ensure it appears in listings and survives app restarts.

**Avoid Over-pinning**

:   If your app handles lots of temporary files (e.g., transcoding), pin only what you want indexed.