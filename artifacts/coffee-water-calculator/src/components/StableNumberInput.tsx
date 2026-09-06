import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from 'react';

type NumberInputValue = string | number | null | undefined;

export type StableNumberInputProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'value'
> & {
  value: NumberInputValue;
  onValueChange?: (value: string) => void;
  onCommit?: (value: string) => void;
};

function displayValue(value: NumberInputValue): string {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * Keeps the text being edited separate from the parsed value supplied by the
 * parent. This allows intermediate decimal states such as "12." to stay in
 * the input without React rewriting the value and moving the caret.
 */
export const StableNumberInput = forwardRef<HTMLInputElement, StableNumberInputProps>(
  function StableNumberInput({
    value,
    onChange,
    onFocus,
    onBlur,
    onKeyDown,
    onValueChange,
    onCommit,
    ...props
  }, forwardedRef) {
    const [draft, setDraft] = useState(() => displayValue(value));
    const isFocusedRef = useRef(false);
    const draftRef = useRef(draft);

    useEffect(() => {
      draftRef.current = draft;
    }, [draft]);

    useEffect(() => {
      if (isFocusedRef.current) return;
      const nextValue = displayValue(value);
      setDraft(current => current === nextValue ? current : nextValue);
    }, [value]);

    return (
      <input
        {...props}
        ref={forwardedRef}
        type="text"
        inputMode={props.inputMode ?? 'decimal'}
        value={draft}
        onFocus={event => {
          isFocusedRef.current = true;
          onFocus?.(event);
        }}
        onChange={event => {
          const nextValue = event.target.value;
          draftRef.current = nextValue;
          setDraft(nextValue);
          onValueChange?.(nextValue);
          onChange?.(event);
        }}
        onKeyDown={event => {
          if (event.key === 'e' || event.key === 'E' || event.key === '+' || event.key === '-') {
            event.preventDefault();
            return;
          }
          onKeyDown?.(event);
        }}
        onBlur={event => {
          isFocusedRef.current = false;
          onCommit?.(draftRef.current);
          onBlur?.(event);
        }}
      />
    );
  },
);

StableNumberInput.displayName = 'StableNumberInput';