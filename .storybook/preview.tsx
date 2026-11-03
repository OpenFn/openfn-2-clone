/// <reference types="vite/client" />
import type { Preview, Decorator } from "@storybook/react";
import "../src/index.css";
import "../src/monacoSetup";
import { DEFAULT_THEME_ID, THEMES } from "../src/theme/themes";
import SessionProvider from "../src/session/SessionProvider";
import { session } from "../src/mock-data/users";

/**
 * Reflects the toolbar-selected theme onto <html> so every story can be
 * previewed under any app theme — the same mechanism the app uses.
 */
const withTheme: Decorator = (Story, context) => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute(
      "data-theme",
      (context.globals.theme as string) || DEFAULT_THEME_ID
    );
  }
  return <Story />;
};

/** Signs every story in as the session fixture's user, as main.tsx does for the app. */
const withSession: Decorator = (Story) => (
  <SessionProvider session={session}>
    <Story />
  </SessionProvider>
);

const preview: Preview = {
  parameters: {
    // The tiers first, as in src/components/ (docs/building.md), then the areas, then pages.
    // An axe violation fails the story's test (`npm run test:stories`).
    // Headless UI's focus guards are aria-hidden buttons that hand focus back to the panel; axe can't tell.
    a11y: { test: "error", context: { exclude: ["[data-headlessui-focus-guard]"] } },
    options: { storySort: { order: ["Primitives", "Domain", "Shell", "*", "Pages"] } },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: "App theme",
      // STORYBOOK_THEME=dark npm run test:stories runs axe under another theme.
      defaultValue: import.meta.env.STORYBOOK_THEME ?? DEFAULT_THEME_ID,
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: THEMES.map((t) => ({
          value: t.id,
          title: t.id === DEFAULT_THEME_ID ? `${t.name} (default)` : t.name,
        })),
        dynamicTitle: true,
      },
    },
  },
  decorators: [withTheme, withSession],
};

export default preview;
