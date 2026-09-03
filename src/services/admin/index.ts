/**
 * The API layer, one module per backend resource.
 *
 * Each file owns exactly the endpoints named in its header, so a failing screen
 * leads straight to one file:
 *
 *   auth.api.ts         /auth/*, /users/profile
 *   shops.api.ts        /shops/*
 *   orders.api.ts       /orders/*
 *   dashboard.api.ts    /dashboard/admin, /reports/sales
 *   production.api.ts   /production-plans/*
 *   ledger.api.ts       /ledger/*
 *   payments.api.ts     /payments/*
 *   priceLists.api.ts   /price-lists/*
 *   audit.api.ts        /audit-logs
 *   cutoff.api.ts       /cutoff/*
 *
 * Transport (base URL, auth header, refresh, retry, envelope unwrapping) lives
 * in `services/httpClient`. Wire-to-domain translation lives in
 * `services/mappers`. Neither belongs in this folder.
 *
 * ---------------------------------------------------------------------------
 * WRITES ARE STILL MOCK-BACKED
 *
 * Every function under a "Writes — MOCK-BACKED" heading mutates the in-memory
 * dataset in `mockStore.ts`, which the reads no longer consult. A write
 * therefore appears to succeed and then vanishes on the next refetch. Treat the
 * admin write actions as non-functional until they are converted to `/shops`,
 * `/orders`, `/deliveries` and `/ledger`.
 * ---------------------------------------------------------------------------
 */


export * from './audit.api';
export * from './cutoff.api';
export * from './dashboard.api';
export * from './ledger.api';
export * from './orders.api';
export * from './payments.api';
export * from './priceLists.api';
export * from './production.api';
export * from './shops.api';
