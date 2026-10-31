import { Label as HeadlessLabel, Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { useContext, useId, useLayoutEffect, useRef, useState, type RefObject, type FocusEvent, type InputHTMLAttributes, type ReactNode, type Ref, type TextareaHTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import { controlClasses } from "./controlClasses";
import { checkNamed, FieldContext, useFieldControl } from "./fieldControl";
import { floatingPanelClasses } from "./floating";
import IconButton from "./IconButton";
import InfoTooltip from "./InfoTooltip";
import Text from "./Text";

/**
 * Form controls. Every control shares one look (`controlClasses`) and sits
 * in a `Field`, which handles the label, hint and errors. Field passes its
 * control the ids of its hint and errors and `aria-invalid`; a custom
 * control wrapped in `Field` takes them with `useFieldControl()`, and
 * `data-ui="field"` so themes style it like the others.
 */

export function FieldError({ id, children }: { id?: string | undefined; children: ReactNode }) {
  return (
    <p id={id} data-tag="error_message" data-ui="error-message" className="mt-1 inline-flex items-center gap-x-1.5 text-xs text-invalid">
      <span className="hero-exclamation-circle h-4 w-4" />
      {children}
    </p>
  );
}

interface FieldProps {
  label?: ReactNode;
  required?: boolean | undefined;
  /** Help text between the label and the control. */
  hint?: ReactNode;
  errors?: string[] | undefined;
  /** Tooltip text for an info icon after the label. */
  info?: string | undefined;
  /** At the right end of the label row, at the label's size: one link that acts on the field ("New Credential"), or a badge. */
  aside?: ReactNode;
  /** Under the control and read with it: why it's locked (a `PlanLimitNote`). */
  note?: ReactNode;
  /** Classes for the field wrapper (label + control + errors), e.g. `flex-1` to grow in a flex row. `className` styles the control itself. */
  fieldClassName?: string | undefined;
}

/** The control's id, or a generated one, so its label is always linked to it. */
function useFieldId(id?: string) {
  const generated = useId();
  // Inside a Field that names an id (`<Field id="x" label="…"><TextInput /></Field>`), use that one, so its label points here.
  const outer = useContext(FieldContext).id;
  return id ?? outer ?? generated;
}

/**
 * A label, optional hint, a control and its errors. `group` makes it a
 * fieldset named by the label, for a set of radios or checkboxes; a disabled
 * group disables every control in it and dims its text.
 */
export function Field({
  id,
  label,
  required,
  hint,
  errors = [],
  info,
  aside,
  note,
  group = false,
  disabled,
  "aria-label": ariaLabel,
  className,
  children,
}: Omit<FieldProps, "fieldClassName"> & {
  /** The control's id, which the label points at. Leave it out when the control names itself from the label (Select). */
  id?: string | undefined;
  group?: boolean;
  /** Only with `group`. */
  disabled?: boolean | undefined;
  /** Only with `group`: names the group in place of its label. */
  "aria-label"?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  const base = useId();
  const labelId = `${base}-label`;
  const hintId = `${base}-hint`;
  const noteId = `${base}-note`;
  const errorIds = errors.map((_, i) => `${base}-error-${i}`);
  const describedBy = [...(hint ? [hintId] : []), ...(note ? [noteId] : []), ...errorIds].join(" ") || undefined;
  const invalid = errors.length > 0;
  const outer = useContext(FieldContext);
  // A control's own Field with no label, hint or errors (TextInput inside a labelled Field) keeps the outer Field's wiring.
  const passThrough = !group && !label && !hint && !note && !invalid;
  // A label points at its control by id; without one (a group, or a Field around a card) it's plain text.
  const LabelTag = group || !id ? "span" : "label";
  // A hint sits close under its label, so the two read as one; the control comes after a wider gap.
  const gap = hint ? "mb-1" : "mb-2";
  // The info button sits beside the <label>, not in it, so its text stays out of the control's name.
  const labelRow = label && (
    <div data-ui="label-row" className={cn("flex items-center justify-between gap-2", gap)}>
      <span className="flex items-center">
        <LabelTag id={labelId} htmlFor={LabelTag === "label" ? id : undefined} data-ui="label" className="text-sm/6 font-medium text-strong group-disabled/field:text-faint">
          {label}
          {required && <span data-ui="required" className="text-danger-icon"> *</span>}
        </LabelTag>
        {info && <InfoTooltip title={info} />}
      </span>
      {aside && (
        <Text as="span" variant="label-md">
          {aside}
        </Text>
      )}
    </div>
  );
  const Tag = group ? "fieldset" : "div";
  return (
    <Tag
      // A fieldset won't shrink below its content without min-w-0.
      className={cn(group && "group/field min-w-0", className)}
      data-ui="form-group"
      data-invalid={invalid || undefined}
      {...(group && { disabled, "aria-label": ariaLabel, "aria-labelledby": label && !ariaLabel ? labelId : undefined, "aria-describedby": describedBy })}
    >
      {labelRow}
      {hint && <small id={hintId} data-ui="hint" className="mb-4 block text-xs/5 text-muted group-disabled/field:text-faint">{hint}</small>}
      {/* A group's radios take only aria-invalid; the fieldset already carries the hint and errors. */}
      <FieldContext.Provider value={passThrough ? outer : group ? { invalid } : { id, describedBy, invalid, labelled: Boolean(label && id) }}>{children}</FieldContext.Provider>
      {note && (
        <div id={noteId} data-ui="field-note" className="mt-2">
          {note}
        </div>
      )}
      {errors.map((e, i) => (
        <FieldError key={e} id={errorIds[i]}>
          {e}
        </FieldError>
      ))}
    </Tag>
  );
}

/** True when a control has its own label, a hidden name, or sits in a labelled Field. */
function useIsNamed(label: ReactNode, props: { "aria-label"?: string | undefined; "aria-labelledby"?: string | undefined }) {
  const outer = useContext(FieldContext);
  return Boolean(label || props["aria-label"] || props["aria-labelledby"] || outer.labelled);
}

/**
 * Headless UI's ListboxButton fills aria-describedby only from its own
 * Description and drops one passed in, so the Field's hint and errors go on
 * after each change.
 */
function DescribedBy({ target, ids }: { target: RefObject<HTMLElement | null>; ids: string | undefined }) {
  useLayoutEffect(() => {
    if (ids) target.current?.setAttribute("aria-describedby", ids);
    else target.current?.removeAttribute("aria-describedby");
  }, [target, ids]);
  return null;
}

/** Renders a control with the props of the Field around it, for controls that render their own Field. */
function FieldControlProps({ children }: { children: (props: ReturnType<typeof useFieldControl>) => ReactNode }) {
  return children(useFieldControl());
}

export function TextInput({ label, required, hint, errors, info, aside, fieldClassName, className, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useFieldId(rest.id);
  checkNamed("TextInput", useIsNamed(label, rest));
  return (
    <Field id={id} label={label} required={required} hint={hint} errors={errors} info={info} aside={aside} className={fieldClassName}>
      <FieldControlProps>
        {(field) => (
          <input
            type="text"
            autoComplete="off"
            required={required}
            data-ui="field"
            className={controlClasses(className)}
            {...field}
            {...rest}
            id={id}
          />
        )}
      </FieldControlProps>
    </Field>
  );
}

/**
 * Lightning's password `.input` (new_inputs.ex): a text field with an eye
 * button that toggles between hidden and shown.
 */
export function PasswordInput({ label, required, hint, errors, info, aside, fieldClassName, className, ...rest }: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useFieldId(rest.id);
  checkNamed("PasswordInput", useIsNamed(label, rest));
  const [revealed, setRevealed] = useState(false);
  return (
    <Field id={id} label={label} required={required} hint={hint} errors={errors} info={info} aside={aside} className={fieldClassName}>
      <div className="relative">
        <FieldControlProps>
          {(field) => (
            <input
              type={revealed ? "text" : "password"}
              required={required}
              data-ui="field"
              className={controlClasses(cn("pr-10", className))}
              {...field}
              {...rest}
              id={id}
            />
          )}
        </FieldControlProps>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          <IconButton
            icon={revealed ? "hero-eye" : "hero-eye-slash"}
            label={revealed ? "Hide password" : "Show password"}
            onClick={() => setRevealed((r) => !r)}
          />
        </div>
      </div>
    </Field>
  );
}

export function TextArea({ label, required, hint, errors, info, aside, fieldClassName, className, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useFieldId(rest.id);
  checkNamed("TextArea", useIsNamed(label, rest));
  return (
    <Field id={id} label={label} required={required} hint={hint} errors={errors} info={info} aside={aside} className={fieldClassName}>
      <FieldControlProps>
        {(field) => (
          <textarea
            required={required}
            data-ui="field"
            className={controlClasses(cn("overflow-y-auto", className))}
            {...field}
            {...rest}
            id={id}
          />
        )}
      </FieldControlProps>
    </Field>
  );
}

/** An option as a plain string, a `[label, value]` pair or an object. */
export type SelectOption = string | [label: string, value: string] | { label: string; value: string };

function optionParts(o: SelectOption): [string, string] {
  if (typeof o === "string") return [o, o];
  if (Array.isArray(o)) return o;
  return [o.label, o.value];
}

interface SelectProps extends FieldProps {
  id?: string | undefined;
  /** Adds a hidden input with this name, for a plain form post. */
  name?: string | undefined;
  /** The chosen value. */
  value: string;
  options: SelectOption[];
  /** Shown while the value matches no option. It isn't an option itself. */
  prompt?: string | undefined;
  disabled?: boolean | undefined;
  /** Shaped like a select's change event, so handlers read `e.target.value`. */
  onChange?: (e: { target: { value: string } }) => void;
  /** Runs when focus leaves the control, not when it moves into the open list. */
  onBlur?: () => void;
  /** Names the control when it has no visible `label`. */
  "aria-label"?: string | undefined;
  /** Classes for the button. */
  className?: string | undefined;
}

/**
 * A dropdown: a button showing the chosen option, opening a list to pick
 * from (Lightning's `custom-select`, new_inputs.ex). Headless UI's Listbox
 * gives it the keyboard (arrows, Home/End, type-ahead, Enter/Space, Escape)
 * and the listbox ARIA. A value that matches no option shows the prompt.
 */
export function Select({
  label,
  required,
  hint,
  errors = [],
  info,
  aside,
  note,
  fieldClassName,
  options,
  prompt,
  className,
  id: givenId,
  name,
  value,
  disabled,
  onChange,
  onBlur,
  "aria-label": ariaLabel,
}: SelectProps) {
  const id = useFieldId(givenId);
  checkNamed("Select", useIsNamed(label, { "aria-label": ariaLabel }));
  const items = options.map(optionParts);
  const chosen = items.find(([, v]) => v === value)?.[0];
  const button = useRef<HTMLButtonElement>(null);
  // Focus can move between the button and the open list; only leaving both is a blur.
  const leave = (e: FocusEvent) => {
    const to = e.relatedTarget as HTMLElement | null;
    if (to !== button.current && !to?.closest("[role=listbox]")) onBlur?.();
  };
  // Headless UI's Label is a span, without `for`, so clicking it focuses the button by hand
  // (but not a click on a link or button inside the label, such as an InfoTooltip).
  const labelText = (text: ReactNode, className?: string) => (
    <HeadlessLabel
      as="span"
      className={className}
      onClick={(e) => {
        if ((e.target as Element).closest("a, button")) return;
        // Without `for`, the label would pass the click on to the first button inside it.
        e.preventDefault();
        button.current?.focus();
      }}
    >
      {text}
      {required && <span className="sr-only"> (required)</span>}
    </HeadlessLabel>
  );
  // Headless UI's Label names the button "<label> <chosen option>", as a
  // native select is read. A `for` on the label would replace that name with
  // the label alone, so Field gets no id.
  return (
    <Listbox
      value={value}
      {...(name !== undefined && { name })}
      disabled={disabled ?? false}
      invalid={errors.length > 0}
      // Like a native select, picking the option already chosen changes nothing.
      onChange={(v: string) => v !== value && onChange?.({ target: { value: v } })}
    >
      <Field label={label && labelText(label)} required={required} hint={hint} errors={errors} info={info} aside={aside} note={note} className={fieldClassName}>
        {!label && ariaLabel && labelText(ariaLabel, "sr-only")}
        <FieldControlProps>
          {(field) => (
            <>
              <ListboxButton
                ref={button}
                {...field}
                id={id}
                data-ui="field"
                onBlur={leave}
                // Headless UI submits the form on Enter; a native select doesn't. Space and the arrows open it.
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                className={controlClasses(cn("grid grid-cols-1 border py-2 pl-3 pr-2 text-left", className))}
              >
                {/* Only a chosen value turns red with an error, not the prompt. */}
                <span className={cn("col-start-1 row-start-1 truncate pr-6", chosen === undefined && errors.length > 0 && "text-strong")}>
                  {chosen ?? prompt ?? "\u00a0"}
                </span>
                <span className="hero-chevron-up-down col-start-1 row-start-1 size-5 self-center justify-self-end text-muted sm:size-4" />
              </ListboxButton>
              {/* After the button, so its ref is set when the effect runs. */}
              <DescribedBy target={button} ids={field["aria-describedby"]} />
            </>
          )}
        </FieldControlProps>
        <ListboxOptions
          anchor={{ to: "bottom start", gap: 4 }}
          transition
          data-ui="listbox"
          onBlur={leave}
          className={cn(floatingPanelClasses, "max-h-60 min-w-(--button-width) overflow-auto py-1 text-base sm:text-sm")}
        >
          {items.map(([l, v]) => (
            <ListboxOption
              key={v}
              value={v}
              // The same highlight and selected look as MenuItem.
              className="group relative cursor-default select-none py-2 pl-8 pr-4 text-body data-focus:bg-hover data-focus:text-strong"
            >
              <span className="block truncate group-data-selected:font-medium group-data-selected:text-strong">{l}</span>
              <span className="hero-check invisible absolute inset-y-0 left-1.5 my-auto size-5 text-primary-600 group-data-selected:visible" />
            </ListboxOption>
          ))}
        </ListboxOptions>
      </Field>
    </Listbox>
  );
}

type ChoiceProps = { label: ReactNode; hint?: ReactNode; ref?: Ref<HTMLInputElement> } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const choiceClasses = cn(
  "h-4 w-4 border-strong text-primary-600 focus:ring-focus transition duration-200 cursor-pointer",
  "disabled:cursor-not-allowed disabled:border-subtle disabled:bg-subtle disabled:checked:bg-emphasis",
  "aria-invalid:border-invalid"
);

/** A checkbox with its label to the right. `indeterminate` shows a dash, e.g. a partly-selected "select all". */
export function Checkbox({ label, hint, className, indeterminate = false, ref, ...rest }: ChoiceProps & { indeterminate?: boolean }) {
  const setRef = (el: HTMLInputElement | null) => {
    if (el) el.indeterminate = indeterminate;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };
  return <Choice type="checkbox" label={label} hint={hint} className={cn("rounded", className)} ref={setRef} {...rest} />;
}

/** A radio button with its label to the right. Group them with the same `name`. */
export function Radio({ label, hint, className, ...rest }: ChoiceProps) {
  return <Choice type="radio" label={label} hint={hint} className={className} {...rest} />;
}

/** A checkbox or radio. In a Field with errors (a group, or one checkbox) it takes the error look. */
function Choice({ label, hint, className, id: givenId, ...rest }: ChoiceProps & { type: "checkbox" | "radio" }) {
  // In a one-checkbox Field it's tied to the Field's error; in a group the fieldset carries it.
  const { invalid, describedBy } = useContext(FieldContext);
  const generated = useId();
  const id = givenId ?? generated;
  const hintId = `${id}-hint`;
  // The hint sits outside the <label>, so it's read as the control's description, not part of its name.
  const described = [...(hint ? [hintId] : []), ...(describedBy ? [describedBy] : [])].join(" ") || undefined;
  return (
    <div className={cn("flex gap-2 text-sm leading-6 text-body has-disabled:text-muted", hint ? "items-start" : "items-center")}>
      <input
        id={id}
        data-ui="choice"
        aria-invalid={invalid || undefined}
        aria-describedby={described}
        className={cn(choiceClasses, hint && "mt-1", className)}
        {...rest}
      />
      <div>
        <label htmlFor={id} className={rest.disabled ? "cursor-not-allowed" : "cursor-pointer"}>
          {label}
        </label>
        {hint && (
          <Text id={hintId} variant="body-sm" className="block text-muted">
            {hint}
          </Text>
        )}
      </div>
    </div>
  );
}
