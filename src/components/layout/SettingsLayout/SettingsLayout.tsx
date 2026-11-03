import type { ReactNode } from "react";

type SettingsLayoutProps = {
  /** A `Breadcrumbs`. */
  breadcrumbs: ReactNode;
  title: string;
  description?: string;
  /** A `SettingsNav`. */
  nav: ReactNode;
  /** The section you're on, starting with a `SectionHeading`. */
  children: ReactNode;
};

/**
 * The frame of every settings page: breadcrumbs, the title, the side menu on the left and the section on the right.
 * On a small screen the menu sits above the section.
 */
export function SettingsLayout({ breadcrumbs, title, description, nav, children }: SettingsLayoutProps) {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
      {breadcrumbs}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-strong">{title}</h1>
        {description && <p className="text-sm text-muted">{description}</p>}
      </header>
      <div className="mt-2 flex flex-col gap-6 md:flex-row md:gap-8">
        {nav}
        <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>
      </div>
    </main>
  );
}
