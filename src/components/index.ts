/**
 * Shared component library, grouped by role:
 *
 *   ui/        primitives (text, buttons, icons, badges)
 *   form/      inputs and the modal form built from them
 *   layout/    screen scaffolding and headers
 *   feedback/  loading, empty, error and toast states
 *   cards/     card surfaces, generic and domain-specific
 *   data/      tables, carousels, filters and pagination
 *   charts/    lightweight bar and line charts
 *
 * Import from this barrel for cross-cutting use, or from a group barrel
 * (e.g. `components/form`) when a screen only needs one slice.
 */
export * from './ui';
export * from './form';
export * from './layout';
export * from './feedback';
export * from './cards';
export * from './data';
export * from './charts';
