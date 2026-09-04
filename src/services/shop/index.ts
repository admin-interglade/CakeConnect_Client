/**
 * The shop-owner API layer, one module per backend resource.
 *
 * Mirrors `services/admin` exactly: each file owns the endpoints named in its
 * header, so a failing screen leads straight to one file.
 *
 *   dashboard.api.ts      /dashboard/shop-owner, /ledger/shops/:id/outstanding
 *   catalogue.api.ts      /products, /categories, /shops/:id (price list)
 *   orders.api.ts         /orders/*
 *   cutoff.api.ts         /cutoff/shops/:id/effective
 *   ledger.api.ts         /ledger
 *   invoices.api.ts       /invoices/*
 *   payments.api.ts       /payments/*
 *   offers.api.ts         /offers/*
 *   notifications.api.ts  /notifications/*
 *
 * Transport (base URL, auth header, refresh, retry, envelope unwrapping) lives
 * in `services/api`. Wire-to-domain translation lives in `services/mappers`.
 * Neither belongs in this folder.
 *
 * Everything here is scoped to the signed-in owner by the *server*, from the
 * shop ids on the JWT. Where a `shopId` is passed it narrows a multi-outlet
 * login (FR-4) to the selected outlet; it is never the access control.
 */

export * from './cutoff.api';
export * from './dashboard.api';
export * from './catalogue.api';
export * from './orders.api';
export * from './ledger.api';
export * from './invoices.api';
export * from './payments.api';
export * from './offers.api';
export * from './notifications.api';
