// @vitest-environment node
import { describe, expect, it } from "vitest";
import { viewIdForLocation } from "./annotations/viewIds";

const sources = import.meta.glob<string>("./**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
});

describe("source file layout", () => {
  it("no file starts with a blank line", () => {
    const blank = Object.keys(sources).filter((path) => /^\s*\n/.test(sources[path]!));
    expect(blank).toEqual([]);
  });

  it("imports come before any top-level declaration", () => {
    const late = Object.entries(sources).filter(([, text]) => {
      const lines = text.split("\n");
      const firstDeclaration = lines.findIndex((l) => /^(export |interface |type |const |let |function |class |enum )/.test(l));
      return firstDeclaration >= 0 && lines.slice(firstDeclaration).some((l) => /^import /.test(l));
    });
    expect(late.map(([path]) => path)).toEqual([]);
  });

  it("a story's group in Storybook is its folder", () => {
    // primitives/ is "Primitives", project-settings/ is "Project settings", any page is "Pages".
    const label = (folder: string) => folder[0]!.toUpperCase() + folder.slice(1).replace(/-/g, " ");
    const wrong = Object.entries(sources)
      .filter(([path]) => /^\.\/(components|pages)\/.*\.stories\.tsx$/.test(path))
      .flatMap(([path, text]) => {
        const [, top, folder] = path.split("/");
        const group = /title: "([^"/]+)\//.exec(text)?.[1];
        const expected = top === "pages" ? "Pages" : label(folder!);
        return group === expected ? [] : [`${path}: "${group}", not "${expected}"`];
      });
    expect(wrong).toEqual([]);
  });
});

// Each list below is what was already missing when the rule started. A file
// leaves its list when it's fixed (the test fails while it stays listed), and
// nothing new joins.
const paths = Object.keys(sources);
const isSource = (path: string) => !/\.(stories|test)\.tsx?$/.test(path);
const pages = paths.filter((path) => /^\.\/pages\/[^/]+\/[A-Z]\w*\.tsx$/.test(path));
const components = paths.filter((path) => /^\.\/components\/.+\/[A-Z]\w*\.tsx$/.test(path) && isSource(path));

function expectOnlyKnown(missing: string[], known: string[]) {
  expect({ new: missing.filter((p) => !known.includes(p)), fixed: known.filter((p) => !missing.includes(p)) }).toEqual({ new: [], fixed: [] });
}

describe("every page and component can be seen and checked", () => {
  it("every page has a story", () => {
    const missing = pages.filter((path) => !sources[path.replace(".tsx", ".stories.tsx")]);
    expectOnlyKnown(missing, ["./pages/workflow-editor/WorkflowEditorPage.tsx"]);
  });

  it("every page has a renderPage test", () => {
    const missing = pages.filter((path) => !sources[path.replace(".tsx", ".test.tsx")]);
    expectOnlyKnown(missing, [
      "./pages/admin/AdminLiveDashboardPage.tsx",
      "./pages/auth/AuthConfirmAccountPage.tsx",
      "./pages/auth/AuthResetPasswordPage.tsx",
      "./pages/auth/AuthTwoFactorPage.tsx",
      "./pages/profile/TokensPage.tsx",
      "./pages/projects/MfaRequiredPage.tsx",
    ]);
  });

  it("every component has a story beside it, or is shown by a story in its folder", () => {
    const missing = components.filter((path) => {
      if (sources[path.replace(".tsx", ".stories.tsx")]) return false;
      const folder = path.slice(0, path.lastIndexOf("/") + 1);
      const name = path.slice(folder.length, -".tsx".length);
      return !paths.some((story) => story.startsWith(folder) && story.endsWith(".stories.tsx") && sources[story]!.includes(`from "./${name}"`));
    });
    expectOnlyKnown(missing, ["./components/shell/ProjectBreadcrumbs.tsx"]);
  });

  it("every primitive gives themes a data-ui hook", () => {
    const missing = components.filter((path) => path.startsWith("./components/primitives/") && !sources[path]!.includes("data-ui"));
    expectOnlyKnown(missing, [
      "./components/primitives/Breadcrumbs.tsx",
      "./components/primitives/ButtonMenu.tsx",
      "./components/primitives/CloseButton.tsx",
      "./components/primitives/ConfirmModal.tsx",
      "./components/primitives/CopyButton.tsx",
      "./components/primitives/DateTime.tsx",
      "./components/primitives/DetailList.tsx",
      "./components/primitives/Disclosure.tsx",
      "./components/primitives/FormModal.tsx",
      "./components/primitives/IconButton.tsx",
      "./components/primitives/InfoTooltip.tsx",
      "./components/primitives/Markdown.tsx",
      "./components/primitives/MetricCard.tsx",
      "./components/primitives/NameBadge.tsx",
      "./components/primitives/NameField.tsx",
      "./components/primitives/Picker.tsx",
      "./components/primitives/SectionHeader.tsx",
      "./components/primitives/SplitButton.tsx",
      "./components/primitives/TextPingLoader.tsx",
      "./components/primitives/UserAvatar.tsx",
    ]);
  });

  it("every routed page has an annotations view id", () => {
    // Each <Route path> that renders a page must resolve, with its params
    // filled in, to a view id the annotations panel can show.
    const routes = [...sources["./App.tsx"]!.matchAll(/<Route path="([^"]+)" element={<\w+Page /g)];
    expect(routes.length).toBeGreaterThan(30);
    const missing = routes
      .map(([, path]) => path!)
      .filter((path) => !viewIdForLocation(path.replace(/:\w+/g, "x"), "", ""));
    expect(missing).toEqual([]);
  });
});

describe("dates are formatted in one place", () => {
  it("only src/utils reads a date's parts or formats one for display", () => {
    // Use a formatter from utils/format.ts, or add one there.
    const dateParts = /\.(toLocale\w*String|getUTC\w+|get(FullYear|Month|Date|Day|Hours|Minutes|Seconds))\(|\bIntl\./;
    const missing = paths.filter(
      (path) => isSource(path) && !/^\.\/(utils|mock-data|test)\//.test(path) && dateParts.test(sources[path]!)
    );
    expectOnlyKnown(missing, ["./components/projects/WelcomeBanner.tsx", "./components/projects/health/VolumeBars.tsx"]);
  });
});
