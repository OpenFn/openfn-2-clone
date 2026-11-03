import { LoaderCircle } from "@/components/ui/icons";

type SpinnerProps = {
  /** Said aloud and shown beside the spinner ("Loading tokens"). Leave out where the spinner sits inside a control that already says it. */
  label?: string;
};

/** Something is on its way. Spins only for people who haven't asked for less motion. */
export function Spinner({ label }: SpinnerProps) {
  const icon = <LoaderCircle size={14} aria-hidden className="shrink-0 motion-safe:animate-spin" />;
  if (!label) return icon;
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted">
      {icon}
      {label}
    </p>
  );
}
