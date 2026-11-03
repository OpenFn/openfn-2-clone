import {
  arrow,
  autoUpdate,
  flip,
  FloatingArrow,
  FloatingPortal,
  offset,
  safePolygon,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
} from "@floating-ui/react";
import { cloneElement, useState, type ReactElement, type ReactNode, type Ref, type SyntheticEvent } from "react";
import { cn } from "../../utils/cn";
import { useCopy } from "../../utils/useCopy";

// One tooltip at a time, like Radix: one open from keyboard focus closes when another opens on hover.
let closeShown: (() => void) | undefined;

/**
 * Lightning's React `Tooltip` (assets/js/components/Tooltip.tsx), on Floating
 * UI, which Headless UI's menus and popovers also sit on. The child must be a
 * single element that can take a ref; it becomes the trigger. No `content`
 * renders no tooltip. With `copy`, clicking the child copies that text and the
 * tooltip says "Copied!" for 1.5 seconds, then hides, like Lightning's Tooltip
 * and Copy hooks. With `disabled`, the child is a disabled control: a wrapper
 * takes its hover and swallows its presses, and a `<button>` stays focusable
 * (`aria-disabled` in place of `disabled`) so the keyboard can reach the
 * reason; any other control stays natively disabled. With `interactive`, the pointer can move onto the
 * tooltip, so a link in it can be clicked.
 */
export default function Tooltip({
  children,
  content,
  copy,
  side = "bottom",
  disabled,
  interactive = false,
}: {
  children: ReactElement;
  content: ReactNode;
  /** Text to copy when the child is clicked. */
  copy?: string | undefined;
  side?: "top" | "right" | "bottom" | "left" | undefined;
  /** The child is a disabled control. */
  disabled?: boolean | undefined;
  /** The tooltip holds something to click, such as a link. */
  interactive?: boolean | undefined;
}) {
  const [open, setOpen] = useState(false);
  // With no content the listeners are off, so text that goes while the tooltip is open would leave this set.
  if (!content && open) setOpen(false);
  const { copied, copy: copyNow } = useCopy(copy ?? "", 1500);
  const [arrowEl, setArrowEl] = useState<SVGSVGElement | null>(null);
  const { refs: { setReference, setFloating }, floatingStyles, context } = useFloating({
    open: !!content && (open || copied),
    onOpenChange: (next) => {
      if (next) {
        closeShown?.();
        closeShown = () => setOpen(false);
      }
      setOpen(next);
    },
    placement: side,
    middleware: [offset(10), flip(), shift(), arrow({ element: arrowEl })],
    whileElementsMounted: autoUpdate,
  });
  const enabled = !!content;
  const { getReferenceProps, getFloatingProps } = useInteractions([
    // Only mouseenter opens it, so the next mouse move doesn't undo a press that closed it.
    useHover(context, { enabled, delay: { open: 200 }, mouseOnly: true, move: false, handleClose: interactive ? safePolygon() : null }),
    // Only keyboard focus: Headless Menu and Dialog hand focus back to their trigger after a mouse close.
    useFocus(context, { enabled, visibleOnly: true }),
    // Escape goes on to a modal too, so one press closes both. A press on the trigger closes it, unless it copies.
    useDismiss(context, { enabled, referencePress: copy === undefined, bubbles: { escapeKey: true } }),
    useRole(context, { enabled, role: "tooltip" }),
  ]);

  // The tree is the same whether the control is disabled or not (a `disabled` prop that is passed adds
  // the wrapper), so enabling a control never remounts it.
  const child = children as ReactElement<{
    ref?: Ref<Element>;
    onClick?: (e: SyntheticEvent) => void;
    "aria-label"?: string;
    label?: string;
    disabled?: boolean;
    "aria-disabled"?: boolean;
    "aria-description"?: string;
  }>;
  // A tooltip that only repeats the control's name (its `aria-label`, or an IconButton's `label`) isn't linked as its
  // description too, or a screen reader says the name twice.
  const repeatsName = typeof content === "string" && content === (child.props["aria-label"] ?? child.props.label);
  const wrap = disabled !== undefined;
  const onWrapper = !!disabled && !!content;
  // Disabled controls don't get hover events in every browser, so the wrapper takes them. It
  // swallows the click before the control sees it (a keyboard press clicks the control itself),
  // since a disabled control's click does nothing, not even a clickable row's or a form's submit.
  const swallow = (e: SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const base: { onClick?: ((e: SyntheticEvent) => void) | undefined; onClickCapture?: (e: SyntheticEvent) => void } = onWrapper
    ? { onClickCapture: swallow }
    : child.props;
  const ref = useMergeRefs([setReference, onWrapper ? undefined : child.props.ref]);
  // Like Lightning's Copy hook, the click copies and goes no further, even inside a link or a clickable row.
  const onClick = (e: SyntheticEvent) => {
    base.onClick?.(e);
    if (copy === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    copyNow();
    setOpen(false); // "Copied!" holds it open, then it hides.
  };
  const referenceProps = getReferenceProps({ ...base, ref, onClick });
  if (repeatsName) delete referenceProps["aria-describedby"];
  const disabledProps = {
    // A natively disabled control can't take focus to open the tooltip, so a plain <button> is
    // `aria-disabled` instead; the wrapper swallows its presses. Only a button: the wrapper can't stop
    // typing in a field. A component child keeps its own `disabled`.
    ...(child.type === "button" && { disabled: false, "aria-disabled": true }),
    // The tooltip's aria-describedby lands on the wrapper, so the reason goes on the control for screen readers.
    ...(typeof content === "string" && !repeatsName && { "aria-description": content }),
  };
  const trigger = wrap ? (
    <span className={onWrapper ? "inline-flex cursor-not-allowed *:pointer-events-none" : "contents"} {...(onWrapper ? referenceProps : {})}>
      {cloneElement(child, onWrapper ? disabledProps : referenceProps)}
    </span>
  ) : (
    cloneElement(child, referenceProps)
  );

  return (
    <>
      {trigger}
      {context.open && (
        <FloatingPortal>
          {/* z-300: the same layer as Menu and Popover panels, above modals. Clicks go through it to whatever is underneath, unless it is interactive. */}
          <div
            ref={setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className={cn("z-300 max-w-xs rounded-md bg-inverse px-3 py-1.5 text-center text-xs text-inverse shadow-md", !interactive && "pointer-events-none")}
            data-ui="tooltip"
          >
            {copied ? "Copied!" : content}
            <FloatingArrow ref={setArrowEl} context={context} width={10} height={5} style={{ fill: "var(--background-color-inverse)" }} />
          </div>
        </FloatingPortal>
      )}
      {copy !== undefined && (
        <span role="status" className="sr-only">
          {copied ? "Copied to clipboard" : ""}
        </span>
      )}
    </>
  );
}
