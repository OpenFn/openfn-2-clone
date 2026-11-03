// @vitest-environment node
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const sources = import.meta.glob<string>("./**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
});

// The probes are made-up files outside the TypeScript project, so the type-aware rule is off for them.
const eslint = new ESLint({
  overrideConfig: {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { parserOptions: { projectService: false } },
    rules: { "@typescript-eslint/no-deprecated": "off" },
  },
});

async function seamMessages(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? [])
    .filter((m) => m.ruleId === "no-restricted-imports")
    .map((m) => m.message);
}

describe("the data seam lint rule", () => {
  it("every import that crosses the seam is tagged wiring: or debt:", () => {
    const untagged = Object.entries(sources).flatMap(([path, text]) =>
      [...text.matchAll(/(?:\/\/|\/\*)\s*eslint-disable[^\n]*no-restricted-imports[^\n]*/g)]
        .filter((m) => !/ -- (wiring|debt):/.test(m[0]))
        .map((m) => `${path}: ${m[0].trim()}`),
    );
    expect(untagged).toEqual([]);
  });

  it("covers utils and pages, and the router message fits both", async () => {
    const code = 'import { useNavigate } from "react-router-dom";\nexport const x = useNavigate;\n';
    const message =
      "'react-router-dom' import is restricted from being used. Navigate through useRouter() and Link from src/routing/router.";
    expect(await seamMessages("src/utils/seamProbe.ts", code)).toEqual([message]);
    expect(await seamMessages("src/pages/SeamProbePage.tsx", code)).toEqual([message]);
  });

  it("utils may not import mock-data or the session", async () => {
    const code =
      'import { projects } from "../mock-data/projects";\nimport { useCurrentUser } from "../session/session";\nexport const x = [projects, useCurrentUser];\n';
    expect(await seamMessages("src/utils/seamProbe.ts", code)).toHaveLength(2);
  });

  it("pages, components and contract shapes may not import the replica's models, and say so once", async () => {
    const code = (from: string) => `import type { WorkflowSummary } from "${from}";\nexport type X = WorkflowSummary;\n`;
    const message = (from: string) =>
      `'${from}' import is restricted from being used by a pattern. Models are the replica's records: take a hand-written contract shape from src/types/ (STANDARDS §11).`;
    for (const [probe, from] of [
      ["src/pages/SeamProbePage.tsx", "../mock-data/models/workflows"],
      ["src/components/primitives/SeamProbe.tsx", "../../mock-data/models/workflows"],
      ["src/types/seamProbe.ts", "../mock-data/models/workflows"],
    ] as const) {
      expect(await seamMessages(probe, code(from))).toEqual([message(from)]);
    }
    expect(await seamMessages("src/pages/x/SeamProbe.replica.tsx", code("../../mock-data/models/workflows"))).toEqual([]);
  });

  it("pages and components may not call the API client; their wrappers do", async () => {
    const code = (from: string) => `import { listCredentials } from "${from}";\nexport const x = listCredentials;\n`;
    expect(await seamMessages("src/pages/SeamProbePage.tsx", code("../api/credentials"))).toHaveLength(1);
    expect(await seamMessages("src/components/primitives/SeamProbe.tsx", code("../../api/credentials"))).toHaveLength(1);
    expect(await seamMessages("src/pages/x/SeamProbe.replica.tsx", code("../../api/credentials"))).toEqual([]);
  });

  it("pages and contract shapes may take CurrentProject from types/projects, but not the Project and User records", async () => {
    const code = (name: string, from: string) => `import type { ${name} } from "${from}";\nexport type X = ${name};\n`;
    expect(await seamMessages("src/pages/SeamProbePage.tsx", code("Project", "../types/projects"))).toHaveLength(1);
    expect(await seamMessages("src/types/seamProbe.ts", code("User", "./users"))).toHaveLength(1);
    expect(await seamMessages("src/types/seamProbe.ts", code("User", "../types/users"))).toHaveLength(1);
    expect(await seamMessages("src/pages/SeamProbePage.tsx", code("CurrentProject", "../types/projects"))).toEqual([]);
  });
});

describe("the type size lint rule", () => {
  const typeMessages = async (filePath: string, className: string) => {
    const code = `export const X = () => <span className="${className}" />;\n`;
    const [result] = await eslint.lintText(code, { filePath });
    return (result?.messages ?? []).filter((m) => m.message.startsWith("Type size:"));
  };

  it.each(["text-sm", "leading-5", "tracking-wide"])("bans %s outside the primitives", async (className) => {
    expect(await typeMessages("src/components/history/Probe.tsx", className)).toHaveLength(1);
    expect(await typeMessages("src/components/projects/health/Probe.tsx", className)).toHaveLength(1);
    expect(await typeMessages("src/pages/Probe.tsx", className)).toHaveLength(1);
    expect(await typeMessages("src/components/primitives/Probe.tsx", className)).toEqual([]);
  });

  // A later block for the same file replaces the consumer block, so check every file.
  it("applies to every component and page outside the primitives", async () => {
    const files = Object.keys(sources)
      .filter((path) => /^\.\/(components\/(?!primitives\/)[^/]+|pages)\/.+\.tsx$/.test(path) && !/\.(test|stories)\.tsx$/.test(path))
      .map((path) => `src${path.slice(1)}`);
    expect(files.length).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const file of files) {
      const config = await eslint.calculateConfigForFile(file);
      const options = (config.rules?.["no-restricted-syntax"] ?? []) as Array<{ message?: string }>;
      if (!options.some((o) => o?.message?.startsWith("Type size:"))) missing.push(file);
    }
    expect(missing).toEqual([]);
  });
});

describe("the tier lint rule", () => {
  const code = (from: string) => `import X from "${from}";\nexport default X;\n`;
  const tier = /^'.*' import is restricted from being used by a pattern\. (A (primitive|domain component|feature component|util) |Nothing outside src\/pages\/)/;

  it("a primitive may import primitives and utils, not domain, a feature component, the shell or a page", async () => {
    const probe = "src/components/primitives/TierProbe.tsx";
    expect(await seamMessages(probe, code("./Button"))).toEqual([]);
    expect(await seamMessages(probe, code("../../utils/cn"))).toEqual([]);
    for (const from of ["../domain/StatePill", "../history/RunStepList", "../shell/Sidebar", "../../pages/history/RunShowPage"]) {
      expect(await seamMessages(probe, code(from))).toEqual([expect.stringMatching(tier)]);
    }
  });

  it("a domain component may import primitives and domain, not an area, the shell or a page", async () => {
    const probe = "src/components/domain/TierProbe.tsx";
    for (const from of ["../primitives/Pill", "./StatePill", "../../types/history"]) {
      expect(await seamMessages(probe, code(from))).toEqual([]);
    }
    for (const from of ["../history/RunStepList", "../shell/Sidebar", "../../pages/history/RunShowPage"]) {
      expect(await seamMessages(probe, code(from))).toEqual([expect.stringMatching(tier)]);
    }
  });

  it("a feature component may import primitives, domain, the shell and its own area, not another area", async () => {
    const probe = "src/components/workflow/TierProbe.tsx";
    for (const from of ["../primitives/Button", "../domain/StatePill", "../shell/ProjectBreadcrumbs", "./EditorHeader", "../../types/history"]) {
      expect(await seamMessages(probe, code(from))).toEqual([]);
    }
    expect(await seamMessages(probe, code("../history/RunStepList"))).toEqual([expect.stringMatching(tier)]);
    expect(await seamMessages("src/components/shell/TierProbe.tsx", code("../history/RunStepList"))).toEqual([
      expect.stringMatching(tier),
    ]);
  });

  it("nothing outside src/pages/ imports a page except App.tsx, src/index.ts and a page's wrapper", async () => {
    const page = (depth: number) => `${"../".repeat(depth)}pages/profile/ProfilePage`;
    for (const [probe, depth] of [
      ["src/components/profile/TierProbe.tsx", 2],
      ["src/utils/tierProbe.ts", 1],
      ["src/types/tierProbe.ts", 1],
      ["src/mock-data/tierProbe.ts", 1],
      ["src/session/tierProbe.ts", 1],
    ] as const) {
      expect(await seamMessages(probe, code(page(depth)))).toEqual([expect.stringMatching(tier)]);
    }
    expect(await seamMessages("src/App.tsx", code("./pages/profile/ProfilePage"))).toEqual([]);
    expect(await seamMessages("src/index.ts", code("./pages/profile/ProfilePage"))).toEqual([]);
    expect(await seamMessages("src/pages/profile/ProfilePage.replica.tsx", code("./ProfilePage"))).toEqual([]);
    expect(await seamMessages("src/pages/admin/TierProbe.tsx", code("../profile/ProfilePage"))).toEqual([]);
  });

  // A file directly in src/components/ matches no tier's block, so it could import anything.
  it("nothing lives directly in src/components/", () => {
    expect(Object.keys(sources).filter((p) => /^\.\/components\/[^/]+\.tsx?$/.test(p))).toEqual([]);
  });

  it("catches the long way round, through ../../components/", async () => {
    for (const [probe, from] of [
      ["src/components/primitives/TierProbe.tsx", "../../components/domain/StatePill"],
      ["src/components/domain/TierProbe.tsx", "../../components/history/RunStepList"],
      ["src/components/domain/TierProbe.tsx", "../../components/shell/Sidebar"],
      ["src/components/workflow/TierProbe.tsx", "../../components/history/RunStepList"],
    ] as const) {
      expect(await seamMessages(probe, code(from))).toEqual([expect.stringMatching(tier)]);
    }
    expect(await seamMessages("src/components/workflow/TierProbe.tsx", code("../../components/domain/StatePill"))).toEqual([]);
  });

  it("a util may import primitives and no other components", async () => {
    expect(await seamMessages("src/utils/tierProbe.ts", code("../components/primitives/Toast"))).toEqual([]);
    for (const from of ["../components/domain/StatePill", "../components/history/RunStepList", "../components/shell/Sidebar"]) {
      expect(await seamMessages("src/utils/tierProbe.ts", code(from))).toEqual([expect.stringMatching(tier)]);
    }
  });

  it("a replica outside src/pages/ doesn't import a page", async () => {
    for (const probe of ["src/utils/probeReplica.ts", "src/components/history/Probe.replica.tsx", "src/mock-data/probeReplica.ts"]) {
      const depth = probe.split("/").length - 2;
      expect(await seamMessages(probe, code(`${"../".repeat(depth)}pages/admin/AdminUsersPage`))).toEqual([
        expect.stringMatching(tier),
      ]);
    }
  });

  it("keeps the seam's patterns in a tier", async () => {
    for (const probe of ["src/components/history/TierProbe.tsx", "src/components/domain/TierProbe.tsx"]) {
      expect(await seamMessages(probe, code("../../session/session"))).toHaveLength(1);
    }
  });
});
