import { create } from 'zustand';
import {
  isOpsOnlyView,
  loadShellPerspective,
  SHELL_PERSPECTIVES,
  type ShellPerspective,
} from '@/domain/shellPerspective';
import type { PlatformRole } from '@/domain/rbac';

const LS_PERSPECTIVE = 'mssclaw_shell_perspective_v1';

function loadStoredPerspective(): ShellPerspective | null {
  try {
    const v = localStorage.getItem(LS_PERSPECTIVE);
    if (v && (SHELL_PERSPECTIVES as readonly string[]).includes(v)) {
      return v as ShellPerspective;
    }
  } catch {
    /* ignore */
  }
  return null;
}

interface ShellPerspectiveState {
  perspective: ShellPerspective;
  /** Sync shell from login role; a stored manual choice wins. */
  hydrate: (role: PlatformRole | undefined) => void;
  /** Manual switch; persisted across sessions and role re-hydration. */
  setPerspective: (p: ShellPerspective) => void;
  /** Ops-only deep links must not flip business shell to ops. */
  ensureOpsForView: (view: string) => void;
}

export const useShellPerspectiveStore = create<ShellPerspectiveState>((set, get) => ({
  perspective: loadStoredPerspective() ?? 'business',

  hydrate: (role) => {
    try {
      localStorage.removeItem('mssclaw_shell_perspective');
    } catch {
      /* ignore */
    }
    const stored = loadStoredPerspective();
    set({ perspective: stored ?? loadShellPerspective(role) });
  },

  setPerspective: (p) => {
    try {
      localStorage.setItem(LS_PERSPECTIVE, p);
    } catch {
      /* ignore */
    }
    set({ perspective: p });
  },

  ensureOpsForView: (view) => {
    // Business shell stays business; routing gate handles ops-only views.
    const p = get().perspective;
    if ((p === 'ops' || p === 'it') && isOpsOnlyView(view)) return;
  },
}));
