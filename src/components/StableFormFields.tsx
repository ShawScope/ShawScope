import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface StableInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> {
  value: string;
  onValueCommit: (value: string) => void;
}

/**
 * Input that manages its own local state to prevent focus loss
 * when parent re-renders due to form state changes.
 */
export const StableInput = React.memo(function StableInput({
  value: externalValue,
  onValueCommit,
  ...props
}: StableInputProps) {
  const [localValue, setLocalValue] = useState(externalValue);
  const commitRef = useRef(onValueCommit);
  commitRef.current = onValueCommit;

  // Sync from parent when external value changes (e.g. AI prefill, draft load)
  const prevExternal = useRef(externalValue);
  useEffect(() => {
    if (externalValue !== prevExternal.current) {
      setLocalValue(externalValue);
      prevExternal.current = externalValue;
    }
  }, [externalValue]);

  return (
    <Input
      {...props}
      value={localValue}
      onChange={(e) => {
        const v = e.target.value;
        setLocalValue(v);
        prevExternal.current = v;
        commitRef.current(v);
      }}
    />
  );
});

interface StableTextareaProps extends Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange"> {
  value: string;
  onValueCommit: (value: string) => void;
}

export const StableTextarea = React.memo(function StableTextarea({
  value: externalValue,
  onValueCommit,
  ...props
}: StableTextareaProps) {
  const [localValue, setLocalValue] = useState(externalValue);
  const commitRef = useRef(onValueCommit);
  commitRef.current = onValueCommit;

  const prevExternal = useRef(externalValue);
  useEffect(() => {
    if (externalValue !== prevExternal.current) {
      setLocalValue(externalValue);
      prevExternal.current = externalValue;
    }
  }, [externalValue]);

  return (
    <Textarea
      {...props}
      value={localValue}
      onChange={(e) => {
        const v = e.target.value;
        setLocalValue(v);
        prevExternal.current = v;
        commitRef.current(v);
      }}
    />
  );
});
