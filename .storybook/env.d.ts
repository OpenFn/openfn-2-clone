interface ImportMetaEnv {
  readonly STORYBOOK_THEME?: string;
  /** `lightning` calls a real Lightning; anything else, the stand-in in src/fake-api/. */
  readonly VITE_API?: string;
}
