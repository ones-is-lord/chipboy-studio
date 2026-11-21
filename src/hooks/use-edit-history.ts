import { useCallback, useState } from "react";
import type { SetStateAction } from "react";

type History<T> = { past: T[]; present: T; future: T[]; group: string | null };

export function useEditHistory<T>(initial: () => T) {
  const [history, setHistory] = useState<History<T>>(() => ({ past: [], present: initial(), future: [], group: null }));
  const edit = useCallback((action: SetStateAction<T>, group: string | null = null) => {
    setHistory(h => {
      const next = typeof action === "function" ? (action as (value: T) => T)(h.present) : action;
      if (JSON.stringify(next) === JSON.stringify(h.present)) return h;
      return {
        past: group && group === h.group ? h.past : [...h.past, h.present].slice(-100),
        present: next, future: [], group,
      };
    });
  }, []);
  const finishGroup = useCallback(() => setHistory(h => h.group === null ? h : { ...h, group: null }), []);
  const undo = useCallback(() => setHistory(h => h.past.length ? {
    past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], group: null,
  } : h), []);
  const redo = useCallback(() => setHistory(h => h.future.length ? {
    past: [...h.past, h.present].slice(-100), present: h.future[0], future: h.future.slice(1), group: null,
  } : h), []);
  return { song: history.present, edit, finishGroup, undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
}
