import { useEffect, useState } from "react";
import { localHour } from "../../utils/format";
import TextLink from "../primitives/TextLink";

const PARAGRAPH =
  "Click on a project to get started. If you need some help, head to docs.openfn.org or community.openfn.org to learn more.";

const STEP_MS = 50;

/** Lightning's time-of-day greeting (TypewriterHook in assets/js/hooks). */
function greetingFor(name: string, hour: number): string {
  if (hour >= 22 || hour < 3) return `Good evening, ${name}. You're up late!`;
  if (hour < 7) return `Good morning, ${name}. You're up early!`;
  if (hour < 12) return `Good morning, ${name}!`;
  if (hour < 18) return `Good afternoon, ${name}!`;
  return `Good evening, ${name}!`;
}

/**
 * The projects dashboard greeting (DashboardLive.Components.welcome_banner):
 * a typed-out "Good evening, Sizwe!" and a help line linking to the docs and
 * community. With `animate={false}` it renders the finished text at once.
 */
export default function WelcomeBanner({
  firstName,
  hour = localHour(),
  animate = true,
}: {
  firstName: string;
  hour?: number;
  animate?: boolean;
}) {
  const heading = greetingFor(firstName, hour);
  const total = heading.length + PARAGRAPH.length;
  const [typed, setTyped] = useState(animate ? 0 : total);
  const done = typed >= total;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setTyped((n) => n + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [typed, done]);

  const h1 = heading.slice(0, typed);
  const p = PARAGRAPH.slice(0, Math.max(0, typed - heading.length));
  const typingHeading = typed < heading.length;

  return (
    <div className="mb-2 min-h-25 pt-6" id="welcome-banner-typewriter">
      {/* eslint-disable-next-line no-restricted-syntax -- debt: 24px medium title has no Heading size */}
      <h2 className="text-2xl font-medium">
        {h1}
        {typingHeading && <span className="typewriter-cursor animate-pulse text-muted">|</span>}
      </h2>
      <p id="welcome-banner-content" className="mb-6 mt-4">
        {done ? (
          <>
            Click on a project to get started. If you need some help, head to{" "}
            <TextLink to="https://docs.openfn.org" external>
              docs.openfn.org
            </TextLink>{" "}
            or{" "}
            <TextLink to="https://community.openfn.org" external>
              community.openfn.org
            </TextLink>{" "}
            to learn more.
          </>
        ) : (
          <>
            {p}
            {!typingHeading && <span className="animate-pulse text-muted">|</span>}
          </>
        )}
      </p>
    </div>
  );
}
