/**
 * Projects, modelled on Lightning's demo seed (openhie-project, dhis2-project)
 * plus a sandbox, so the project picker shows the parent/child tree.
 */

import { kickstartProjects } from "./generated/kickstart";
import type { Project } from "../types/projects";

export const projects: Project[] = [
  {
    id: "4adf2644-ed4e-4f97-a24c-ab35b3cb1efa",
    name: "openhie-project",
    description: "Moves patient registrations from CommCare into the OpenHIE shared health record.",
    parentId: null,
    color: null,
    concurrency: null,
    retentionPolicy: "retain_all",
    historyRetentionPeriod: 90,
    dataclipRetentionPeriod: 30,
    requiresMfa: false,
    members: [
      { userId: "user-amy", role: "owner", failureAlert: true, digest: "weekly" },
      { userId: "user-esther", role: "editor", failureAlert: true, digest: "never" },
      { userId: "user-vikram", role: "viewer", failureAlert: false, digest: "never" },
    ],
    lastUpdatedAt: "2026-10-14T09:12:00Z",
    insertedAt: "2024-03-12T10:00:00Z",
  },
  {
    id: "1f0b7c2e-9d3a-4a4b-8f5e-2c6d7e8f9a01",
    name: "dhis2-project",
    description: "Pulls DHIS2 aggregate data into Google Sheets for weekly reporting.",
    parentId: null,
    color: null,
    concurrency: 1,
    retentionPolicy: "retain_with_errors",
    historyRetentionPeriod: 30,
    dataclipRetentionPeriod: 7,
    requiresMfa: false,
    members: [
      { userId: "user-amy", role: "admin", failureAlert: true, digest: "daily" },
      { userId: "user-esther", role: "owner", failureAlert: true, digest: "never" },
    ],
    lastUpdatedAt: "2026-10-11T16:40:00Z",
    insertedAt: "2024-03-12T10:05:00Z",
  },
  {
    id: "8c1d2e3f-4a5b-4c6d-9e7f-0a1b2c3d4e5f",
    name: "fhir-mapping-v2",
    description: "Trying out the new FHIR mapping before merging it into openhie-project.",
    parentId: "4adf2644-ed4e-4f97-a24c-ab35b3cb1efa",
    color: "#f59e0b",
    concurrency: null,
    retentionPolicy: "retain_all",
    historyRetentionPeriod: 7,
    dataclipRetentionPeriod: 7,
    requiresMfa: false,
    members: [
      { userId: "user-amy", role: "owner", failureAlert: false, digest: "never" },
      { userId: "user-esther", role: "editor", failureAlert: false, digest: "never" },
    ],
    lastUpdatedAt: "2026-10-13T12:00:00Z",
    insertedAt: "2026-09-30T08:00:00Z",
  },
  // Projects loaded from kickstart/exports/ (see kickstart/sync.mjs).
  ...kickstartProjects,
];

export function findProject(id: string | undefined): Project | undefined {
  return projects.find((p) => p.id === id);
}
