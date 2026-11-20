/** Civic sign-in keeps the session only when the database workspace check succeeds.
 * Tenant membership alone is not enough. Invitation acceptance creates the
 * operator-defined participant or reviewer record that this check requires. */
export function civicWorkspaceGranted(workspaceOk: boolean) {
  return workspaceOk;
}
