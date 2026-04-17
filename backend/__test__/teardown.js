export default async function globalTeardown() {
  // Intentionally no-op.
  // Integration tests use per-suite in-memory MongoDB instances that are
  // created/stopped inside test hooks.
}