import type { Role } from "@/types";

export type Action =
  | "project:create"
  | "project:delete"
  | "column:manage"
  | "sprint:manage"
  | "task:create"
  | "task:edit"
  | "task:move"
  | "task:assign"
  | "task:delete";

const CONTRIBUTOR: readonly Action[] = ["task:create", "task:edit", "task:move"];
const MANAGER: readonly Action[] = [...CONTRIBUTOR, "project:create", "column:manage", "sprint:manage", "task:assign", "task:delete"];
const ADMIN: readonly Action[] = [...MANAGER, "project:delete"];

const MATRIX: Record<Role, readonly Action[]> = { ADMIN, MANAGER, CONTRIBUTOR };

/**
 * The single source of truth for who may do what. The server calls this on every mutation;
 * the UI uses it only to hide buttons, never as the actual protection.
 */
export function can(role: Role, action: Action): boolean {
  return MATRIX[role].includes(action);
}

export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Admin", MANAGER: "Manager", CONTRIBUTOR: "Contributor" };
