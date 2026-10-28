---
title: Apps
description: "Understand the App identity model: App IDs, App Keys, sandboxing, and the user-approval flow."
---

# Apps

In the Sia ecosystem, an ***App*** is the cryptographic identity of software acting on a user's behalf. Apps aren't user accounts, wallets, or [storage providers](./storage-providers.md) — they're separate, user-approved identities that authenticate requests and operate on encrypted [objects](./objects.md).

## Sandboxed by design

Each App has its own keypair, derived from the user's recovery phrase **and** the developer-chosen App ID. Different App IDs produce different keys, so two apps from the same user cannot see or modify each other's data — even though both are acting for the same person.

This isolation is structural, enforced by the cryptographic key derivation. An object [pinned](./pinning.md) under App A's key is invisible to App B; revoking App B's access doesn't affect App A.

## App ID

The App ID is a 32-byte identifier the developer chooses **once** and ships with the app.

- It's the same across all installs of your software.
- It's an input to App Key derivation, so changing it invalidates all existing user data. Never change it after release.
- Generate it once with `openssl rand -hex 32` (or any cryptographically random 32 bytes).

## App Key

The App Key is the per-user signing key derived during onboarding from the recovery phrase, the App ID, and a user secret returned by the indexer when the user approves the connection. It:

- Is unique per (user, app) pair.
- Is stored by your app (keychain, keystore, encrypted file, etc.).
- Authenticates every subsequent request as that app, for that user.

Only the corresponding public key is visible outside the app. If a user's device is lost, they can derive the same App Key on a new device by obtaining a fresh approval from the same indexer account and using the recovery phrase, App ID, and newly returned user secret.

## Recovery phrase

Onboarding asks the user for a BIP-39 recovery phrase (or generates one). The phrase is the user's master secret. Combined with the App ID and the user secret returned by the indexer after approval, it derives the App Key.

The app should never store or transmit the recovery phrase. After onboarding, only the derived App Key is needed for ongoing operation. To derive the key on a new device, the user must approve the app again on the same indexer account so the SDK receives the user secret.

From `sia_storage 0.12.0`, registering a different valid recovery phrase can create a new, empty App Key instead of failing. Before registering a phrase for a returning user, use the SDK's `matches_existing_app_key()` check where available (named `matchesExistingAppKey()` in JavaScript and Dart); do not treat approval alone as proof that the entered phrase matches existing data. The Go SDK does not currently expose an equivalent check.

## User approval

Before an app can act for a user, the user explicitly approves it. Approval binds the app to the user's account, happens once per (user, app) pair, and can be revoked at any time. Revocation immediately cuts off that app's access. Subsequent connections after approval are silent.

See [Connect a Storage Account](../quickstart/connect-to-an-indexer.md) for the approval flow.

## Apps vs. users

| Concept       | Meaning                                  |
|---------------|------------------------------------------|
| User          | Owner of the recovery phrase and data    |
| App           | Software acting with user permission     |
| App ID        | Developer-chosen, stable across releases |
| App Key       | Per-user signing key                     |

## Best practices

- Generate the App ID once and never change it.
- Store the App Key in a secure store (Keychain, Keystore, encrypted file).
- Never store or transmit the recovery phrase.
- Attempt silent reconnection before triggering approval.
- Make the approval prompt clear about what the app will do.
