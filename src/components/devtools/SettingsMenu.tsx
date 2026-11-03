import { useTheme } from "../../theme/theme-context";
import type { ThemeMeta } from "../../theme/themes";
import { useAnnotations } from "../../annotations/annotations-context";
import { cn } from "../../utils/cn";
import Heading from "../primitives/Heading";
import CloseButton from "../primitives/CloseButton";
import IconButton from "../primitives/IconButton";
import { Field, Radio } from "../primitives/Inputs";
import Popover from "../primitives/Popover";
import Toggle from "../primitives/Toggle";
import { ANNOTATIONS_PANEL_WIDTH } from "./AnnotationsPanel";
import Tooltip from "../primitives/Tooltip";
import { Stack } from "../primitives/Stack";

/**
 * Floating settings button in the bottom-right corner. Its panel opens and
 * closes the annotations panel and swaps the app's theme (by changing the
 * `data-theme` attribute on <html>). It slides left of the annotations
 * panel when that's open.
 *
 * Demo tooling, not Lightning UI, but built from the same primitives, so it
 * follows the active theme like everything else.
 */
export default function SettingsMenu() {
  const { themeId, setTheme, themes } = useTheme();
  const annotations = useAnnotations();

  return (
    <div data-devtools className="fixed bottom-5 z-9999" style={{ right: annotations.open ? ANNOTATIONS_PANEL_WIDTH + 20 : 20 }}>
      <Popover
        align="end"
        // eslint-disable-next-line local/primitive-classname -- debt: F526 box (p-4)
        className="w-80 p-4"
        trigger={
          <IconButton
            icon="hero-cog-6-tooth"
            label="Open settings"
            tooltip="Settings"
            data-ui="settings-trigger"
            // eslint-disable-next-line local/primitive-classname -- debt: F526 box, F527 colour (rounded-full bg-inverse text-inverse shadow-lg hover:bg-inverse/90)
            className="h-12 w-12 rounded-full bg-inverse text-inverse shadow-lg hover:bg-inverse/90"
          />
        }
      >
        {(close) => (
          // The panel is portalled out of the root, so it marks itself as
          // devtools too: hovering it mustn't change the annotation shown.
          <Stack gap="md" data-devtools aria-label="Settings">
            <div className="flex items-center justify-between">
              <Heading size="sm">Settings</Heading>
              <CloseButton label="Close settings" size="xs" onClick={close} />
            </div>
            <Toggle
              checked={annotations.open}
              onChange={annotations.setOpen}
              label="Annotations panel"
              description="Show the behaviour annotation for whatever you hover over."
            />
            <div className="border-t border-subtle pt-4">
              <Field group label="Theme">
                <Stack gap="sm">
                  {themes.map((theme) => (
                    <Radio
                      key={theme.id}
                      name="theme"
                      checked={theme.id === themeId}
                      onChange={() => setTheme(theme.id)}
                      label={<ThemeName meta={theme} />}
                      hint={theme.description}
                    />
                  ))}
                </Stack>
              </Field>
            </div>
          </Stack>
        )}
      </Popover>
    </div>
  );
}

/** The theme's colour swatches, its name, and a light / dark dot. */
function ThemeName({ meta }: { meta: ThemeMeta }) {
  const dark = meta.mode === "dark";
  return (
    <span className="flex items-center gap-2 font-medium text-strong">
      <span className="grid grid-cols-2 gap-0.5" aria-hidden="true">
        {meta.swatches.map((color, i) => (
          <span key={i} className="h-2 w-2 rounded-xs" style={{ background: color }} />
        ))}
      </span>
      {meta.name}
      <Tooltip content={dark ? "Dark" : "Light"}>
        <span
          role="img"
          aria-label={dark ? "Dark" : "Light"}
           
          className={cn("h-2 w-2 rounded-full border", dark ? "border-transparent bg-inverse" : "border-strong bg-emphasis")}
        />
      </Tooltip>
    </span>
  );
}
