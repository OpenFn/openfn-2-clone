import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { compilerOptions, editors } from "../../test/monaco";
import CodeEditor from "./CodeEditor";

describe("CodeEditor", () => {
  it("shows the job in Monaco as JavaScript and reports what the user types", () => {
    const onChange = vi.fn();
    render(<CodeEditor value={"fn(state => state);"} onChange={onChange} ariaLabel="Job code" />);

    const box = screen.getByRole("textbox", { name: "Job code" });
    expect(box.getAttribute("data-language")).toBe("javascript");
    expect(box.textContent).toBe("fn(state => state);");

    editors.at(-1)!.type("fn(state => ({ ...state }));");
    expect(onChange).toHaveBeenCalledWith("fn(state => ({ ...state }));");
  });

  it("uses Lightning's job editor options, with the caller's on top", () => {
    render(<CodeEditor value="{}" language="json" readOnly ariaLabel="Dataclip body" options={{ minimap: { enabled: true } }} />);

    const { options } = editors.at(-1)!;
    expect(options).toMatchObject({ readOnly: true, ariaLabel: "Dataclip body", minimap: { enabled: true }, fontSize: 14, wordWrap: "on" });
    expect(editors.at(-1)!.theme).toBe("default");
    expect(screen.getByRole("textbox", { name: "Dataclip body" }).getAttribute("data-language")).toBe("json");
  });

  it("hides the suggestions and browser lib that Lightning's job editor hides", () => {
    render(<CodeEditor value="" ariaLabel="Job code" />);

    expect(editors.at(-1)!.options?.suggest).toEqual({
      showModules: true,
      showKeywords: false,
      showFiles: false,
      showClasses: false,
      showInterfaces: false,
      showConstructors: false,
      showDeprecated: false,
    });
    expect(compilerOptions.javascript).toEqual({ allowNonTsExtensions: true, noLib: true });
  });
});
