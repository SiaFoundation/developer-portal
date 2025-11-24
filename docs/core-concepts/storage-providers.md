---
title: Storage providers
---

# Storage providers

Storage providers physically store data on the Sia network by running Sia’s hosting software `hostd`, contributing excess storage space and bandwidth and earning Siacoin (SC) in return.

---

## Overview

A storage provider:

- Runs `hostd` on a machine with stable storage, power, and connectivity
- Announces available capacity, pricing, and collateral to the network
- Accepts storage contracts from renters (usually indexers acting on behalf of users)
- Stores encrypted shards of user data for the contract duration
- Submits storage proofs to show the data is still available

As long as the host meets the contract terms, it receives payments in SC. If it fails, it risks losing revenue and the **collateral** it locked into the contract.

---

## Who are they?

Storage providers can be:

- Individuals running a home server or Network Attached Storage (NAS)
- Small operators with a handful of machines in a data center
- Companies integrating Sia storage into their own product and reselling it

On the network, all of these appear simply as “storage” with:

- Capacity and bandwidth offers
- A pricing configuration (storage, egress, contract fees)
- A track record of uptime and responsiveness that renters can score

---

## Why they exist

Storage providers are what make Sia’s decentralized storage model real: instead of trusting a single cloud vendor, the network relies on a permissionless set of independent hosts that turn raw disk and bandwidth into a verifiable storage layer. They exist to:

- **Decentralize control and failure domains** – data is encrypted, erasure-coded, and spread across many unrelated hosts so no single operator or outage can take it offline.  
- **Provide economic guarantees on durability** – hosts lock collateral into contracts and must submit proofs; losing data can burn collateral, while honest uptime is rewarded in Siacoin (SC).  
- **Enable an open storage marketplace** – anyone with excess capacity can join, set prices, and compete for renter demand instead of relying on a single provider’s pricing and policies.
- **Separate infrastructure from applications** – contracts, pricing, and proofs live at the protocol layer, so apps can change without changing the underlying storage providers.

In short, storage providers exist so that Sia’s storage layer is **owned by the network, not by a single company**.

---

## How do they fit?

In the indexer-based architecture, storage providers sit at the edge of the network and only care about storing slabs and honoring contracts. Apps and users never talk to them directly.

From the host’s perspective, the world is simple:

- The indexer inherits the responsibility of forming contracts, uploading slabs and sending requests.
- Data arrives as **encrypted shards**, not files or object keys, and hosts never see user or app metadata.
- Hosts focus on **staying online, serving sectors and submitting storage proofs**.

``` mermaid
flowchart LR
    %% === Hosts on the right ===
    subgraph HOSTS[ ]
        direction TB
        H1["Host 1"]
        H2["Host 2"]
        H3["Host 3"]
    end

    %% === Apps in the middle (grey box) ===
    subgraph APPS[ ]
        direction TB
        F["fsd"]
        S["S3"]
        D["Sia Drive"]
    end

    %% === User on the left ===
    U["User"]

    %% === Indexer between apps and hosts ===
    I["Indexer"]

    %% === Flows ===
    %% User <-> individual apps
    U <--> F
    U <--> S
    U <--> D
    U <--> I

    %% Apps <-> Indexer
    F <--> I
    S <--> I
    D <--> I

    %% Indexer <-> Hosts
    I <--> H1
    I <--> H2
    I <--> H3

    %% Apps box <-> Hosts box
    APPS <--> HOSTS

    %% === Styling ===
    classDef user fill:#e1bee7,stroke:#b39ddb,stroke-width:2px,color:#000;
    classDef apps fill:#ffe0b2,stroke:#ffb74d,stroke-width:2px,color:#000;
    classDef indexer fill:#ffccbc,stroke:#ef9a9a,stroke-width:2px,color:#000;
    classDef hosts fill:#bbdefb,stroke:#64b5f6,stroke-width:2px,color:#000;

    class U user;
    class F,S,D apps;
    class I indexer;
    class H1,H2,H3 hosts;
```

## Who pays them in the indexer model?

In the indexer model, **the indexer is the one that pays storage providers**, but it does so using funds that come from users (or apps). Users deposit funds with the indexer, and the indexer uses that money to fund payment accounts on hosts.

Users and apps never talk to hosts directly; the indexer mediates all operations, manages host payment accounts, and pays hosts for valid storage proofs using user or app funds. Any future model that allows limited direct user–host interaction after account setup will be documented as an explicit exception.
