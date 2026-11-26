import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type StatusMessage = string | { text: string; undo?: () => boolean | void };

interface Props {
  message: StatusMessage | null;
  onClose: () => void;
}

/**
 * The app's status line: floats above every view and open profile, so a
 * message (and its Undo) is seen wherever the action happened. With Undo it
 * stays 8 s instead of 4, pauses while hovered or focused, and Ctrl/⌘+Z
 * triggers it from anywhere — inside a profile too.
 */
export function StatusToast({ message, onClose }: Props) {
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const text = failed ?? (typeof message === "string" ? message : message?.text ?? null);
  const undo = failed || typeof message === "string" ? undefined : message?.undo;
  const undoRef = useRef(undo);
  undoRef.current = undo;

  useEffect(() => setFailed(null), [message]);
  useEffect(() => {
    if (!text || paused) return;
    const t = window.setTimeout(onClose, undo ? 8000 : 4000);
    return () => window.clearTimeout(t);
  }, [text, undo, paused, onClose]);

  const runUndo = () => {
    const ok = undoRef.current?.() !== false;
    if (!ok) { setFailed("That could not be undone: your saved places are full."); return; }
    onClose();
    document.getElementById("main-content")?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (!undo) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "z") {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return; // text undo stays the field's
        e.preventDefault();
        runUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!text) return null;
  // On the page body, so it sits above an open profile and every view.
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="tc-toast tc-toast--floating panel-warm flex items-center justify-between gap-3 px-3 py-2 anim-fade-in"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="text-sm text-frost">{text}</span>
      {undo ? (
        <button type="button" className="btn-ghost !text-xs !py-1" onClick={runUndo} title="Undo (Ctrl+Z)" aria-keyshortcuts="Control+Z Meta+Z">
          Undo
        </button>
      ) : null}
      <button type="button" onClick={onClose} className="btn-ghost !text-xs !py-1" aria-label="Dismiss message" title="Dismiss message">
        <X className="w-3 h-3" aria-hidden /> Dismiss
      </button>
    </div>,
    document.body,
  );
}
