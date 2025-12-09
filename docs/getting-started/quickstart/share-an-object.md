# Share an Object

Sharing allows your application to grant others secure, time-limited access to an object you’ve uploaded. Instead of sharing keys or credentials, the SDK generates a cryptographically signed URL that encodes:

* Which object is being shared
* When the link expires
* A signature preventing tampering or extension

Recipients can then:

* Download the shared object without your App Key
* Or pin it to their own indexer using their own App Key
* Without exposing your keys, metadata, or account details

This enables familiar cloud-sharing workflows—while preserving Sia’s end-to-end encrypted, decentralized design.

## Prerequisites

Before you begin, you should have:

  * A [connected and approved](./connect-to-an-indexer.md) SDK instance
  * A `PinnedObject` returned from a [successful upload](./upload-an-object.md)

Once you have the object, you can generate a share URL and let another app or device resolve and download it.

## Authentication Requirements

Sharing uses the same App Key created when connecting to an indexer.

The App Key plays two key roles:

* **Authorizing creation of share URLs**
:   The request to create a share URL is signed using the App Key’s private key.
    This proves your application is authorized to share that object.

* **Protecting your private data**
:   The share URL exposes only what is necessary to access the encrypted object.
    It does not reveal your App Key, recovery phrase, or account details.
    Recipients download the object using your signature but cannot decrypt or modify your private data unless the object itself is pinned into their account.

## High-Level Overview

#### Share URLs

!!! warning "Shared objects behave like public links"
    Share URLs provide access to the object’s encrypted data, and **anyone who has the link can use it**.

    - **There is no way to revoke access** once a user has the link.  
      Even after the link expires, anyone who already accessed it could have pinned the object into their own account.

    - **Share links cannot be restricted to specific users.**  
      Treat shared objects as publicly accessible to anyone who obtains the URL.

    If you need controlled, permissioned sharing, build your own access layer on top of pinned objects.

A share URL is:

* A signed, time-limited capability
* Valid only until the expiration timestamp
* Safe to send via email, chat, QR code, etc

#### Shared Objects

Once a recipient opens a share URL, the SDK returns a `SharedObject`:

* Read-only
* Downloadable using `sdk.download_shared`
* Pinnable using `sdk.pin_shared`

#### Pinning Shared Objects

If the recipient wants to keep the object permanently:

* They call `sdk.pin_shared(shared)`
* It becomes a new `PinnedObject` in their own indexer
* They can now manage, share, and download it independently

## Example

=== "Python"
    ```python
    import asyncio
    import json
    from datetime import datetime, timedelta, timezone

    from indexd_ffi import (
        generate_recovery_phrase,
        Builder,
        AppMeta,
        Sdk,
        UploadOptions
    )

    # Progress callback is optional and can be used to monitor the progress of the upload
    class PrintProgress:
        def progress(self, uploaded: int, encoded_size: int) -> None:
            if encoded_size == 0:
                print("Starting upload…")
                return
            percent = (uploaded / encoded_size) * 100
            print(f"Upload progress: {percent:.1f}% ({uploaded}/{encoded_size} bytes)")

    async def main():
        #-------------------------------------------------------
        # CONNECT TO AN INDEXER
        #-------------------------------------------------------

        # Create a builder to manage the connection flow
        builder = Builder("https://app.sia.storage")

        # Configure your app identity details
        meta = AppMeta(
            id=b"your-32-byte-app-id.............",
            name="My App",
            description="Demo application",
            service_url="https://example.com",
            logo_url=None,
            callback_url=None
        )

        # Request app connection and get the approval URL
        await builder.request_connection(meta)
        print("Open this URL to approve the app:", builder.response_url())

        # Wait for the user to approve the request
        approved = await builder.wait_for_approval()
        if not approved:
            raise Exception("\nUser rejected the app or request timed out")

        # Ask the user for their recovery phrase
        recovery_phrase = input("\nEnter your recovery phrase (type `seed` to generate a new one): ").strip()

        if recovery_phrase == "seed":
            recovery_phrase = generate_recovery_phrase()
            print("\nRecovery phrase:", recovery_phrase)

        # Register an SDK instance with your recovery phrase.
        sdk: Sdk = await builder.register(recovery_phrase)

        # Export the App Key and store it securely for future launches
        app_key = sdk.app_key()
        print("\nStore this App Key in your app's secure storage:", app_key.export())

        print("\nApp Connected!")

        #-------------------------------------------------------
        # UPLOAD AN OBJECT
        #-------------------------------------------------------

        # Configure Upload Options
        upload_options = UploadOptions(
            # Optional metadata can be attached that will be encrypted with the object's master key
            metadata=json.dumps({"File Name": "example.txt"}).encode(),

            # Progress callback is optional and can be used to monitor the progress of the upload
            progress_callback=PrintProgress()
        )

        # Upload the "Hello world!" data
        print("\nStarting upload...")
        upload_writer = await sdk.upload(upload_options)
        await upload_writer.write(b"Hello world!")
        obj = await upload_writer.finalize()

        sealed = obj.seal(app_key)
        print("\nObject Sealed:")
        print(" - Sealed ID:", sealed.id)
        print(" - Signature:", sealed.signature)

        print("\nUpload complete:")
        print(" - Object ID:", obj.id())
        print(" - Size:", obj.size(), "bytes")

        #-------------------------------------------------------
        # SHARE AN OBJECT
        #-------------------------------------------------------

        # Share the object (valid for 1 hour)
        expires = datetime.now(timezone.utc) + timedelta(hours=1)
        share_url = sdk.share_object(obj, expires)

        print("\nShare URL:", share_url)

    asyncio.run(main())
    ```
=== "JavaScript"
    *🚧 Coming soon*
=== "Rust"
    *🚧 Coming soon*
=== "Go"
    *🚧 Coming soon*
=== "Dart"
    *🚧 Coming soon*
=== "Swift"
    *🚧 Coming soon*
=== "Kotlin"
    *🚧 Coming soon*

## Deep Dive

#### Why share URLs are safe

Share URLs contain:

* An object identifier
* An expiration timestamp
* A signature proving the share was authorized

They cannot be used to modify or replace the object.
They also cannot be extended past expiration without your App Key.

#### Expiration

If a share URL is used after it expires:

* The request fails with an error
* No data is exposed
* You must generate a new URL if you want continued access

#### Read-only by design

Recipients can:

* Download
* Inspect metadata
* Pin the object

They cannot:

* Modify it
* Re-encrypt it

## Next Step
[Download an Object →](./download-an-object.md){ .md-button }