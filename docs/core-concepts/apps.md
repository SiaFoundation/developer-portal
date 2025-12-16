# Apps

In the Sia ecosystem, an ***App*** represents the identity of software interacting with the network.
Apps authenticate requests, manage encrypted objects, and operate on behalf of a user.

All interactions with the indexer—uploads, downloads, sharing, and syncing—are performed by an app.

## What Is an App?

An App is a cryptographic identity defined by:

* A 32-byte App ID, chosen by the developer
* A derived App Key, used to sign requests
* User approval via an indexer

Apps are not user accounts, wallets, or storage providers.
They are trusted software identities with explicit, user-granted permissions to access data.

## App Identity Components

### App ID

The App ID is a 32-byte identifier chosen by the developer.

* It uniquely identifies your application
* It must remain stable for the lifetime of the app
* It is shared across all installations of the same software

Changing the App ID invalidates all previously derived App Keys and will break user access to existing objects.

### App Key

The App Key is a 32-byte private key used to authenticate and sign all requests to the indexer.

It is:

* Deterministically derived during onboarding
* Stored securely by the application
* Used to authenticate future requests
* Represented by a public key known to the indexer

The indexer stores only the corresponding ***public key***.

## Recovery Phrase

During onboarding, the user provides (or generates) a ***BIP-32 recovery phrase***.

This phrase:

* Acts as the user’s master secret
* Is used to derive the App Key
* Should never be stored by the app
* Can be reused to recover access if the App Key is lost

After onboarding, the app only needs the derived App Key.

## App Approval

Before an app can access user data, it must be approved by the user through the indexer using an ***Application Connect Key***.

Approval ensures that:

* The user explicitly consents to the app
* The app’s identity is bound to the user
* Unauthorized software cannot access data

This approval process happens once per app and user. Subsequent connections are automatic.

## Authorization Model

Once approved:

* The indexer recognizes the app’s public key
* Signed requests from that app are authorized
* The app may upload, download, share, and manage objects

If approval is revoked, the app immediately loses access.

## Registration and Authorization

Once approved:

1. The app derives its App Key
2. The app registers its public key with the indexer
3. The indexer authorizes future signed requests from that key

On subsequent launches, the app may:

* Import the stored App Key
* Check authorization using the indexer
* Skip the approval flow entirely

## Apps vs Users

| Concept | Meaning |
|------|--------|
| User | Owner of data and recovery phrase |
| App | Software acting with user permission |
| App ID | Stable identifier chosen by the developer |
| App Key | Per-user signing key |
| Indexer | Authorization and coordination layer |

## Best Practices

* Generate the App ID once and never change it
* Store the App Key securely (Keychain, Keystore, encrypted file)
* Never store or transmit the recovery phrase
* Always attempt silent reconnection before triggering approval
* Clearly explain approval to users

## Summary

Apps are the core identity layer of the Sia ecosystem.
They enable secure, user-approved, cryptographically authenticated access to decentralized storage—without accounts, passwords, or centralized identity providers.
