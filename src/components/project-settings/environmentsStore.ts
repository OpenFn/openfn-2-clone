/**
 * PROTOTYPE: "environments as first-class citizens". An environment is a named
 * set of credential values owned by the root project. Every project starts
 * with production and development, both empty. Each project (the root and
 * every sandbox) points at one environment. Held in memory and sessionStorage
 * so the parent's and the sandbox's settings pages see the same thing.
 */
import { useSyncExternalStore } from "react";

export interface Environment {
  id: string;
  name: string;
  description: string;
  /** Production: switching a sandbox onto it asks for confirmation. */
  protected: boolean;
  builtIn: boolean;
}

export interface EnvironmentsState {
  environments: Environment[];
  /** credentialId -> environmentId -> the fields saved for it. */
  values: Record<string, Record<string, Record<string, string>>>;
  /** projectId -> environmentId it runs with. */
  pointers: Record<string, string>;
}

const KEY = "prototype-environments-v1";

export const ROOT_PROJECT_ID = "4adf2644-ed4e-4f97-a24c-ab35b3cb1efa";
export const SANDBOX_ID = "8c1d2e3f-4a5b-4c6d-9e7f-0a1b2c3d4e5f";

function initial(): EnvironmentsState {
  return {
    environments: [
      {
        id: "production",
        name: "production",
        description: "Live systems. Runs in the main project use these values.",
        protected: true,
        builtIn: true,
      },
      {
        id: "development",
        name: "development",
        description: "Test systems and dummy accounts, for building and trying things in sandboxes.",
        protected: false,
        builtIn: true,
      },
    ],
    values: {},
    pointers: { [ROOT_PROJECT_ID]: "production", [SANDBOX_ID]: "development" },
  };
}

function load(): EnvironmentsState {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as EnvironmentsState;
  } catch {
    // Storage blocked: start fresh.
  }
  return initial();
}

let state = load();
const listeners = new Set<() => void>();

function set(next: EnvironmentsState) {
  state = next;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage blocked: keep it in memory.
  }
  listeners.forEach((l) => l());
}

export function useEnvironments(): EnvironmentsState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state
  );
}

export function addEnvironment(name: string, description: string) {
  const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  set({
    ...state,
    environments: [...state.environments, { id, name: id, description, protected: false, builtIn: false }],
  });
}

export function saveValue(credentialId: string, environmentId: string, fields: Record<string, string>) {
  set({
    ...state,
    values: { ...state.values, [credentialId]: { ...state.values[credentialId], [environmentId]: fields } },
  });
}

export function clearValue(credentialId: string, environmentId: string) {
  const forCred = { ...state.values[credentialId] };
  delete forCred[environmentId];
  set({ ...state, values: { ...state.values, [credentialId]: forCred } });
}

export function pointProject(projectId: string, environmentId: string) {
  set({ ...state, pointers: { ...state.pointers, [projectId]: environmentId } });
}

export function resetEnvironments() {
  set(initial());
}

/** The fields a credential of this schema asks for, with fake placeholders. */
export function fieldsFor(schema: string): { key: string; label: string; secret: boolean; placeholder: string }[] {
  switch (schema) {
    case "dhis2":
      return [
        { key: "hostUrl", label: "Host URL", secret: false, placeholder: "https://play.dhis2.org/dev" },
        { key: "username", label: "Username", secret: false, placeholder: "admin" },
        { key: "password", label: "Password", secret: true, placeholder: "••••••••" },
      ];
    case "fhir":
      return [
        { key: "baseUrl", label: "Base URL", secret: false, placeholder: "https://hapi.fhir.org/baseR4" },
        { key: "apiKey", label: "API key", secret: true, placeholder: "••••••••" },
      ];
    case "postgresql":
      return [
        { key: "host", label: "Host", secret: false, placeholder: "db.example.org" },
        { key: "database", label: "Database", secret: false, placeholder: "warehouse" },
        { key: "user", label: "User", secret: false, placeholder: "openfn" },
        { key: "password", label: "Password", secret: true, placeholder: "••••••••" },
      ];
    case "oauth":
      return [{ key: "account", label: "Signed-in account", secret: false, placeholder: "integrations@example.org" }];
    default:
      return [
        { key: "baseUrl", label: "Base URL", secret: false, placeholder: "https://api.example.org" },
        { key: "token", label: "Token", secret: true, placeholder: "••••••••" },
      ];
  }
}
