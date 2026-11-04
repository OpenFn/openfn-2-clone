/** The instance on Lightning's API (`GET /api/instance`): what the app needs before anyone signs in. */
import { useQuery } from "@tanstack/react-query";
import type { InstanceInfo } from "../session/session";
import type { SsoProvider } from "../types/auth";
import { request, standIn } from "./client";
import recorded from "./recorded/instance.json";

/** `GET /api/instance`'s `data`. `admin_email` is null unless the request is signed in. */
export interface ApiInstance {
  admin_email: string | null;
  release: { label: string };
  allow_signup: boolean;
  needs_setup: boolean;
  /** Days a deleted project or sandbox is kept before it is purged. */
  purge_deleted_after_days: number | null;
  sign_in_providers: { name: string; kind: string; start_url: string }[];
}

export function instanceInfo(i: ApiInstance): InstanceInfo {
  return { adminEmail: i.admin_email ?? "", releaseLabel: i.release.label };
}

/** The log in page's switches: Register, and the first single sign-on provider. */
export function loginOptions(i: ApiInstance): { allowSignup: boolean; ssoProvider: SsoProvider | null } {
  const provider = i.sign_in_providers[0];
  return { allowSignup: i.allow_signup, ssoProvider: provider ? { name: provider.name, handlerUrl: provider.start_url } : null };
}

export const instanceKeys = {
  all: ["instance"] as const,
};

export const instanceQuery = {
  queryKey: instanceKeys.all,
  queryFn: () => request<{ data: ApiInstance }>("GET", "/api/instance").then((r) => r.data),
};

/** The instance, or undefined while it loads. */
export function useInstance(): ApiInstance | undefined {
  return useQuery(instanceQuery).data;
}

standIn("GET", "/api/instance", () => recorded);
