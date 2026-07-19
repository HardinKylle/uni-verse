"use client";

import { Button, InputGroup, Label, TextField } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { miniLabel } from "@/components/ui/form-styles";

type PasswordInputProps = {
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
};

export function PasswordInput({ label, name, autoComplete }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);
  const Icon = isVisible ? EyeOff : Eye;

  return (
    <TextField name={name} type={isVisible ? "text" : "password"}>
      <Label className={miniLabel}>{label}</Label>
      <InputGroup>
        {/* Native `required` on the input rather than `isRequired` on TextField: on
            the root it makes Label render a visible `*` that is not aria-hidden,
            so the field's accessible name becomes "Password*". */}
        <InputGroup.Input required autoComplete={autoComplete} placeholder="••••••••" />
        <InputGroup.Suffix>
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            // This name necessarily contains the field's own label, so it
            // collides with a substring `getByLabel("Password")`. Tests match
            // the field by exact accessible name instead.
            aria-label={isVisible ? `Hide ${label.toLowerCase()} text` : `Reveal ${label.toLowerCase()} text`}
            onPress={() => setIsVisible((visible) => !visible)}
          >
            <Icon className="size-4" aria-hidden />
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
    </TextField>
  );
}
