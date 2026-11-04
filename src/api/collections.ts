/**
 * A project's collections on Lightning's API (API.md "Collections"): the
 * API's shape, the mapper, the keys, the hooks a wrapper calls, and how the
 * stand-in answers. The keys sit under `projectKeys`.
 */
import { useQuery } from "@tanstack/react-query";
import type { ProjectRole } from "../types/projects";
import type { CollectionRow } from "../types/project-settings";
import type { ResourceStatus } from "../types/resource";
import { urlSafeName } from "../utils/format";
import { ApiError, listAll, request, standIn, statusOf, useSave, withFieldNames } from "./client";
import { meQuery } from "./me";
import { membersQuery, projectKeys } from "./projects";
import recorded from "./recorded/collections.json";

// The API's shape.

/** A collection as `GET /api/projects/:project_id/collections` lists it. */
export interface ApiCollection {
  id: string;
  project_id: string;
  name: string;
  /** The bytes its keys and values take up. */
  byte_size_sum: number;
}

// Mapper.

export function collectionRow(c: ApiCollection): CollectionRow {
  return {
    id: c.id,
    name: c.name,
    byteSizeSum: c.byte_size_sum,
    // Lightning's browser route, not the API's: it streams every item as JSON.
    downloadHref: `/download/collections/${c.project_id}/${c.name}`,
  };
}

// Keys.

export const collectionKeys = {
  all: (projectId: string) => [...projectKeys.all, projectId, "collections"] as const,
};

// Requests.

const collectionsPath = (projectId: string, rest = "") => `/api/projects/${encodeURIComponent(projectId)}/collections${rest}`;

/**
 * `PUT …/collections/:id`: creates the collection under a new id, or renames
 * the one with this id. The form sends the name as typed, and Lightning's
 * form saves its URL-safe version, as this does.
 */
const saveCollection = (projectId: string, id: string, rawName: string) =>
  withFieldNames(request("PUT", collectionsPath(projectId, `/${encodeURIComponent(id)}`), { name: urlSafeName(rawName) }), (pointer) =>
    pointer === "#/name" ? "#/rawName" : undefined
  );

/**
 * A rename. `PUT` would make a collection deleted since the page loaded again
 * under its old id, so this first asks whether it is still there, and says
 * Lightning's "Collection not found" if not.
 */
async function renameCollection(projectId: string, id: string, rawName: string) {
  try {
    await request("GET", collectionsPath(projectId, `/${encodeURIComponent(id)}`));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) throw new ApiError(404, "not_found", "Collection not found");
    throw error;
  }
  await saveCollection(projectId, id, rawName);
}

/** Lightning's API reads a collection's items only with an API token, not the signed-in session the app uses. */
const NO_PREVIEW = "Lightning's API can't show a collection's items yet.";

// What a wrapper calls.

export interface ProjectCollections {
  status: ResourceStatus;
  collections: CollectionRow[];
  /** The viewer's role in the project, from its members, for who may manage collections; undefined while loading or when not a member. */
  viewerRole: ProjectRole | undefined;
}

/** The Collections tab's data, and the viewer's role in the project, loaded side by side. */
export function useProjectCollections(projectId: string): ProjectCollections {
  const collections = useQuery({
    queryKey: collectionKeys.all(projectId),
    queryFn: () => listAll<ApiCollection>(collectionsPath(projectId), "data"),
  });
  const me = useQuery(meQuery);
  const members = useQuery(membersQuery(projectId));
  return {
    status: statusOf(collections, me, members),
    collections: (collections.data ?? []).map(collectionRow),
    viewerRole: members.data?.find((m) => m.id === me.data?.id)?.attributes.role,
  };
}

/** The Collections tab's saves. Each resolves once the project's collections have reloaded. */
export function useCollectionSaves(projectId: string) {
  const changes = [collectionKeys.all(projectId)];
  const create = useSave(changes, (id: string, rawName: string) => saveCollection(projectId, id, rawName));
  const rename = useSave(changes, (id: string, rawName: string) => renameCollection(projectId, id, rawName));
  const remove = useSave(changes, (id: string) => request("DELETE", collectionsPath(projectId, `/${encodeURIComponent(id)}`)));
  return {
    onCreateCollection: async (rawName: string) => void (await create([crypto.randomUUID(), rawName])),
    onRenameCollection: async (id: string, rawName: string) => void (await rename([id, rawName])),
    onDeleteCollection: async (id: string) => void (await remove([id])),
    onPreviewCollection: (): Promise<string | null> => Promise.reject(new ApiError(422, "not_supported", NO_PREVIEW)),
  };
}

// The stand-in: the recorded collections, changed as Lightning would change them.

const store = recorded as Record<string, ApiCollection[]>;
const collectionsOf = (projectId: string) => (store[projectId] ??= []);

standIn("GET", "/api/projects/:project_id/collections", ({ project_id }) => ({
  data: [...collectionsOf(project_id!)].sort((x, y) => x.name.localeCompare(y.name)),
  links: { next: null },
}));
standIn("GET", "/api/projects/:project_id/collections/:id", ({ project_id, id }) => {
  const c = collectionsOf(project_id!).find((c) => c.id === id);
  if (!c) throw new ApiError(404, "not_found", "Not found.");
  return { data: { id, project_id, name: c.name } };
});
standIn("PUT", "/api/projects/:project_id/collections/:id", ({ project_id, id }, b) => {
  const name = (b as { name?: string }).name ?? "";
  if (!name) throw new ApiError(422, "invalid", "The request is not valid. See errors.", [{ pointer: "#/name", code: "required", detail: "can't be blank" }]);
  // Names are unique across every project.
  if (Object.values(store).some((list) => list.some((c) => c.id !== id && c.name === name))) {
    throw new ApiError(422, "invalid", "The request is not valid. See errors.", [{ pointer: "#/name", code: "taken", detail: "A collection with this name already exists" }]);
  }
  const list = collectionsOf(project_id!);
  const current = list.find((c) => c.id === id);
  if (current) {
    current.name = name;
    return { data: { id, project_id, name } };
  }
  list.push({ id: id!, project_id: project_id!, name, byte_size_sum: 0 });
  return { data: { id, project_id, name } };
});
standIn("DELETE", "/api/projects/:project_id/collections/:id", ({ project_id, id }) => {
  const list = collectionsOf(project_id!);
  if (!list.some((c) => c.id === id)) throw new ApiError(404, "not_found", "Not found.");
  store[project_id!] = list.filter((c) => c.id !== id);
});
