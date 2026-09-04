/**
 * The API layer, one module per backend resource.
 *
 * Each file owns exactly the endpoints named in its header, so a failing screen
 * leads straight to one file:
 *
 *   shops.api.ts        /shops/*
 *   orders.api.ts       /orders/*
 *   dashboard.api.ts    /dashboard/admin, /reports/sales
 *   production.api.ts   /production-plans/*
 *   deliveries.api.ts   /deliveries/*
 *   ledger.api.ts       /ledger/*
 *   payments.api.ts     /payments/*
 *   priceLists.api.ts   /price-lists/*
 *   audit.api.ts        /audit-logs
 *   categories.api.ts   /categories/*
 *   products.api.ts     /products/*
 *   cutoff.api.ts       /cutoff/*
 *
 * Transport (base URL, auth header, refresh, retry, envelope unwrapping) lives
 * in `services/httpClient`. Wire-to-domain translation lives in
 * `services/mappers`. Neither belongs in this folder.
 *
 */


export * from './audit.api';
export * from './categories.api';
export * from './cutoff.api';
export * from './deliveries.api';
export * from './dashboard.api';
export * from './ledger.api';
export * from './orders.api';
export * from './payments.api';
export * from './products.api';
export * from './priceLists.api';
export * from './production.api';
export * from './shops.api';
