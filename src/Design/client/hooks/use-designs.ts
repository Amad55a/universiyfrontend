import { useState, useCallback, useRef, useEffect } from "react";
import type { Design, DesignWithPages, Template, Page } from "../types";
import { api } from "../api";

export function useDesigns(
  getCanvasJSONForPage: (pageId: string) => string,
  examContext: { examId?: string; questionId?: string } = {},
) {
  const { examId, questionId } = examContext;
  const [designs, setDesigns] = useState<Design[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeDesign, setActiveDesign] = useState<Design | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const errorRef = useRef(error);
  errorRef.current = error;
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const activeIdRef = useRef<string | null>(null);
  const activePageIdRef = useRef<string | null>(null);
  const canvasSizeRef = useRef<{ width: number; height: number } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef<Promise<boolean> | null>(null);

  const reportError = useCallback((message: string) => {
    setError(message);
  }, []);

  // Keep activePageIdRef in sync
  useEffect(() => {
    activePageIdRef.current = activePageId;
  }, [activePageId]);

  // Load designs + templates on mount
  useEffect(() => {
    // These catalogues populate optional sidebar lists. They must never gate
    // the actual exam canvas or a saved design's restoration.
    setLoading(false);
    (async () => {
      try {
        const [d, t] = await Promise.all([
          api<Design[]>("GET", "/api/designs"),
          api<Template[]>("GET", "/api/templates"),
        ]);
        setDesigns(d);
        setTemplates(t);
      } catch (e) {
        console.error("Failed to load data:", e);
        // The catalogue is optional: keep the editor available and surface
        // failures only if the requested design itself cannot be loaded.
      }
    })();
  }, []);

  const saveDesign = useCallback(async (canvasSize?: { width: number; height: number }): Promise<boolean> => {
    if (saveInFlightRef.current) await saveInFlightRef.current;
    if (!activeIdRef.current) return false;
    if (canvasSize) canvasSizeRef.current = canvasSize;
    setSaving(true);
    errorRef.current = "";
    setError("");
    const operation = (async () => {
      try {
        // Save all pages' canvas JSON
        const currentPages = pagesRef.current;
        for (const page of currentPages) {
          const json = getCanvasJSONForPage(page.id);
          const updatedPage = await api<Page>("PUT", `/api/pages/${page.id}`, {
            canvas_json: json || "{}",
          });
          setPages((prev) => prev.map((p) => (p.id === updatedPage.id ? updatedPage : p)));
        }
        // Also update design's canvas_json with first page for backwards compat
        const firstPageJson = currentPages.length > 0 ? getCanvasJSONForPage(currentPages[0].id) : "{}";
        const updated = await api<Design>("PUT", `/api/designs/${activeIdRef.current}`, {
          canvas_json: firstPageJson,
          ...(canvasSizeRef.current ?? { width: 1080, height: 1080 }),
        });
        setDesigns((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        setActiveDesign(updated);
        return true;
      } catch (e) {
        console.error("Failed to save:", e);
        const message = e instanceof Error ? e.message : "Could not save this design.";
        errorRef.current = message;
        setError(message);
        return false;
      } finally {
        setSaving(false);
      }
    })();
    saveInFlightRef.current = operation;
    try {
      return await operation;
    } finally {
      if (saveInFlightRef.current === operation) saveInFlightRef.current = null;
    }
  }, [getCanvasJSONForPage]);

  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const saved = await saveDesign(canvasSizeRef.current ?? undefined);
    if (!saved) throw new Error(errorRef.current || "Could not save the submitted design.");
  }, [saveDesign]);

  const createDesign = useCallback(async (): Promise<string | undefined> => {
    setError("");
    try {
      const d = await api<Design>("POST", "/api/designs", {
        name: "Untitled Design",
        canvas_json: "{}",
        ...(examId && questionId ? { examId, questionId } : {}),
      });
      setDesigns((prev) => [d, ...prev]);
      setActiveDesign(d);
      activeIdRef.current = d.id;
      canvasSizeRef.current = { width: d.width, height: d.height };
      setPages(d.pages ?? []);
      setActivePageId(d.pages?.[0]?.id ?? null);
      return d.id;
    } catch (e) {
      console.error("Failed to create design:", e);
      setError(e instanceof Error ? e.message : "Could not create a design.");
    }
  }, [examId, questionId]);

  const createFromTemplate = useCallback(async (template: Template): Promise<string | undefined> => {
    try {
      const d = await api<Design>("POST", "/api/designs", {
        name: template.name,
        canvas_json: template.canvas_json,
        width: template.width,
        height: template.height,
        ...(examId && questionId ? { examId, questionId } : {}),
      });
      setDesigns((prev) => [d, ...prev]);
      return d.id;
    } catch (e) {
      console.error("Failed to create from template:", e);
    }
  }, [examId, questionId]);

  const loadDesign = useCallback(
    async (id: string) => {
      setError("");
      try {
        const d = await api<DesignWithPages>("GET", `/api/designs/${id}`);
        setActiveDesign(d);
        activeIdRef.current = d.id;
        canvasSizeRef.current = { width: d.width, height: d.height };
        setPages(d.pages);
        if (d.pages.length > 0) {
          setActivePageId(d.pages[0].id);
        } else {
          setActivePageId(null);
        }
      } catch (e) {
        console.error("Failed to load design:", e);
        setError(e instanceof Error ? e.message : "Could not load this design.");
      }
    },
    []
  );

  const deleteDesign = useCallback(async (id: string) => {
    try {
      await api<{ ok: boolean }>("DELETE", `/api/designs/${id}`);
      setDesigns((prev) => prev.filter((d) => d.id !== id));
      if (activeIdRef.current === id) {
        setActiveDesign(null);
        activeIdRef.current = null;
      }
    } catch (e) {
      console.error("Failed to delete:", e);
    }
  }, []);

  const renameDesign = useCallback(async (id: string, name: string) => {
    try {
      const updated = await api<Design>("PUT", `/api/designs/${id}`, { name });
      setDesigns((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      if (activeIdRef.current === id) setActiveDesign(updated);
    } catch (e) {
      console.error("Failed to rename:", e);
    }
  }, []);

  // ── Page management ─────────────────────────────────────────────────

  const addPage = useCallback(async (afterPageId?: string) => {
    if (!activeIdRef.current) return;
    try {
      const body: Record<string, unknown> = {};
      if (afterPageId) {
        const afterPage = pages.find((p) => p.id === afterPageId);
        if (afterPage) body.after_sort_order = afterPage.sort_order;
      }
      const page = await api<Page>("POST", `/api/designs/${activeIdRef.current}/pages`, body);
      // Re-fetch all pages to get correct sort_order after shifts
      const d = await api<DesignWithPages>("GET", `/api/designs/${activeIdRef.current}`);
      setPages(d.pages);
      setActivePageId(page.id);
    } catch (e) {
      console.error("Failed to add page:", e);
    }
  }, [pages]);

  const duplicatePage = useCallback(
    async (pageId: string) => {
      // Save current canvas state for the page being duplicated
      const json = getCanvasJSONForPage(pageId);
      if (json && json !== "{}") {
        try {
          await api<Page>("PUT", `/api/pages/${pageId}`, { canvas_json: json });
        } catch {
          // best effort
        }
      }
      try {
        const page = await api<Page>("POST", `/api/pages/${pageId}/duplicate`, {});
        // Re-fetch all pages to get correct sort_order
        if (activeIdRef.current) {
          const d = await api<DesignWithPages>("GET", `/api/designs/${activeIdRef.current}`);
          setPages(d.pages);
        }
        setActivePageId(page.id);
      } catch (e) {
        console.error("Failed to duplicate page:", e);
      }
    },
    [getCanvasJSONForPage]
  );

  const deletePage = useCallback(
    async (pageId: string) => {
      try {
        await api<{ ok: boolean }>("DELETE", `/api/pages/${pageId}`);
        const remaining = pages.filter((p) => p.id !== pageId);
        setPages(remaining);
        if (activePageIdRef.current === pageId && remaining.length > 0) {
          setActivePageId(remaining[0].id);
        }
      } catch (e) {
        console.error("Failed to delete page:", e);
      }
    },
    [pages]
  );

  const renamePage = useCallback(async (pageId: string, title: string) => {
    try {
      const updated = await api<Page>("PUT", `/api/pages/${pageId}`, { title });
      setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e) {
      console.error("Failed to rename page:", e);
    }
  }, []);

  // switchToPage is now just scrolling + activating — handled by CanvasArea/PagesBar
  const switchToPage = useCallback((pageId: string) => {
    setActivePageId(pageId);
  }, []);

  const activePage = pages.find((p) => p.id === activePageId) ?? null;

  // Auto-save debounced
  const scheduleSave = useCallback((canvasSize?: { width: number; height: number }) => {
    if (canvasSize) canvasSizeRef.current = canvasSize;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void saveDesign(canvasSizeRef.current ?? undefined);
    }, 2000);
  }, [saveDesign]);

  useEffect(() => () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      void saveDesign(canvasSizeRef.current ?? undefined);
    }
  }, [saveDesign]);

  return {
    designs,
    templates,
    activeDesign,
    setActiveDesign,
    activeIdRef,
    loading,
    saving,
    error,
    reportError,
    createDesign,
    createFromTemplate,
    loadDesign,
    saveDesign,
    flushSave,
    deleteDesign,
    renameDesign,
    scheduleSave,
    // Pages
    pages,
    activePageId,
    activePage,
    addPage,
    duplicatePage,
    deletePage,
    renamePage,
    switchToPage,
  };
}
