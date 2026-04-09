import { useTuiTheme } from "@bunli/runtime/app";
import { useCallback } from "react";

import { useFormField } from "./form-context.js";

export interface FormFieldProps {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  description?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  prompt?: string;
  charLimit?: number;
  showCharCount?: boolean;
  width?: number;
}

export function FormField({
  label,
  name,
  placeholder,
  required,
  description,
  defaultValue = "",
  onChange,
  onSubmit,
  prompt,
  charLimit,
  showCharCount = false,
  width,
}: FormFieldProps) {
  const { tokens } = useTuiTheme();
  const field = useFormField<string>(name, {
    defaultValue,
    submitOnEnter: true,
  });

  const handleInput = useCallback(
    (newValue: string) => {
      if (charLimit && newValue.length > charLimit) {
        newValue = newValue.slice(0, charLimit);
      }
      field.setValue(newValue);
      onChange?.(newValue);
    },
    [field, onChange, charLimit],
  );

  const handleSubmit = useCallback(() => {
    const submittedValue = field.value ?? "";
    field.setValue(submittedValue);
    field.blur();
    onSubmit?.(submittedValue);
  }, [field, onSubmit]);

  const currentLength = (field.value ?? "").length;

  return (
    <box style={{ flexDirection: "column", marginBottom: 1, gap: 1 }}>
      <text
        content={`${field.focused ? ">" : " "} ${label}${required ? " *" : ""}`}
        fg={field.focused ? tokens.accent : tokens.textPrimary}
      />
      {description ? <text content={description} fg={tokens.textMuted} /> : null}
      <box
        title={label}
        border
        height={3}
        width={width}
        style={{
          marginTop: 0.5,
          borderColor: field.error
            ? tokens.textDanger
            : field.focused
              ? tokens.accent
              : tokens.borderMuted,
        }}
      >
        {prompt ? (
          <box style={{ flexDirection: "row" }}>
            <text content={prompt} fg={tokens.accent} />
            <input
              value={field.value ?? ""}
              placeholder={placeholder}
              onInput={handleInput}
              onSubmit={handleSubmit}
              focused={field.focused}
              style={{ focusedBackgroundColor: tokens.backgroundMuted, flexGrow: 1 }}
            />
          </box>
        ) : (
          <input
            value={field.value ?? ""}
            placeholder={placeholder}
            onInput={handleInput}
            onSubmit={handleSubmit}
            focused={field.focused}
            style={{
              focusedBackgroundColor: tokens.backgroundMuted,
            }}
          />
        )}
      </box>
      {showCharCount && (
        <text
          content={charLimit ? `${currentLength}/${charLimit}` : `${currentLength} chars`}
          fg={charLimit && currentLength >= charLimit ? tokens.textWarning : tokens.textMuted}
        />
      )}
      {field.error ? <text content={field.error} fg={tokens.textDanger} /> : null}
    </box>
  );
}
