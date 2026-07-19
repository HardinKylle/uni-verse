"use client";

import { Input, Label, TextField } from "@heroui/react";

import { miniLabel } from "@/components/ui/form-styles";

type TextInputProps = {
  label: string;
  name: string;
  type?: "text" | "email";
  autoComplete?: string;
  placeholder?: string;
};

/**
 * Matches {@link import("./password-input").PasswordInput} so the auth forms read
 * as one set. Uses native `required` rather than HeroUI's `isRequired`, which
 * renders a visible `*` into the field's accessible name.
 */
export function TextInput({ label, name, type = "text", autoComplete, placeholder }: TextInputProps) {
  return (
    <TextField name={name} type={type}>
      <Label className={miniLabel}>{label}</Label>
      <Input required autoComplete={autoComplete} placeholder={placeholder} />
    </TextField>
  );
}
