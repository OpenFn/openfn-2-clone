import type { Decorator, Preview } from "@storybook/react-vite";
import "../src/theme/index.css";
import { DEFAULT_THEME, THEMES } from "../src/theme/themes";

// The toolbar's theme goes on <html>, as the app does it. `STORYBOOK_THEME=dark npm run test:stories` runs axe under Dark.
const withTheme: Decorator = (Story, context) => {
  document.documentElement.dataset.theme = context.globals.theme as string;
  return <Story />;
};

const preview: Preview = {
  parameters: {
    a11y: { test: "error" },
    options: { storySort: { order: ["ui", "layout", "openfn", "pages"] } },
  },
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: THEMES.map((t) => ({ value: t.id, title: t.name })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: import.meta.env.STORYBOOK_THEME ?? DEFAULT_THEME },
  decorators: [withTheme],
};

export default preview;
