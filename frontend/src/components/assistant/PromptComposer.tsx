"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type FormEvent } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";

export type ComposerHandle = { focus: () => void };
type Props = { value: string; working: boolean; onChange: (value: string) => void; onSubmit: () => void };

export const PromptComposer = forwardRef<ComposerHandle, Props>(function PromptComposer({ value, working, onChange, onSubmit }, ref) {
  const area = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => ({ focus: () => area.current?.focus() }));
  useEffect(() => {
    const el = area.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  function submit(event: FormEvent) { event.preventDefault(); if (value.trim() && !working) onSubmit(); }
  return (
    <form className="composer" onSubmit={submit}>
      <textarea
        ref={area}
        rows={1}
        value={value}
        aria-label="Ask the assistant"
        placeholder="Ask about this page…"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
      />
      <button type="submit" className="send-button" disabled={!value.trim() || working} aria-label={working ? "Assistant is working" : "Send message"}>
        {working ? <LoaderCircle size={15} className="spin" /> : <ArrowUp size={16} />}
      </button>
    </form>
  );
});
