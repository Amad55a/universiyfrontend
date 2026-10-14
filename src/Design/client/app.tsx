import { EditorContext } from "./context";
import { useCanvasState } from "./hooks/use-canvas";
import { useDesigns } from "./hooks/use-designs";
import { useRouter } from "./hooks/use-router";
import { Editor } from "./components/editor";
import { Home } from "./components/home";
import WebFont from "webfontloader";
import { useCallback, useEffect, useRef, useState } from "react";

export function App({ question, examId, questionId, initialDesignId, onDesignCreated, onSubmissionPreparation, embedded = false }: {
  question?: any;
  examId?: string;
  questionId?: string;
  initialDesignId?: string;
  onDesignCreated?: (id: string) => void;
  onSubmissionPreparation?: (prepare: (() => Promise<void>) | null) => void;
  embedded?: boolean;
} = {}) {
  const { path, navigate, designId } = useRouter();
  // Exam questions render this editor inside the existing exam route. In that
  // mode there is no /design/:id URL, so the persisted answer is authoritative.
  const currentDesignId = initialDesignId || designId;
  const canvasState = useCanvasState();
  const designState = useDesigns(canvasState.getCanvasJSONForPage, { examId, questionId });
  const [fontWarning, setFontWarning] = useState("");
  const designCreationStartedRef = useRef(false);
  const onDesignCreatedRef = useRef(onDesignCreated);

  useEffect(() => {
    onDesignCreatedRef.current = onDesignCreated;
  }, [onDesignCreated]);

  useEffect(() => {
    const prepareSubmission = async () => {
      await canvasState.flushPendingAssets();
      await designState.flushSave();
    };
    onSubmissionPreparation?.(prepareSubmission);
    return () => onSubmissionPreparation?.(null);
  }, [canvasState.flushPendingAssets, designState.flushSave, onSubmissionPreparation]);

  const createEmbeddedDesign = useCallback(async () => {
    if (designCreationStartedRef.current) return;
    designCreationStartedRef.current = true;
    const id = await designState.createDesign();
    if (id) {
      onDesignCreatedRef.current?.(id);
    } else {
      designCreationStartedRef.current = false;
    }
  }, [designState.createDesign]);

  useEffect(() => {
    WebFont.load({
      google: {
        families: [
          "Inter:400,500,600,700",
          "Playfair Display:400,500,600,700,800,900",
          "Montserrat:400,500,600,700,800,900",
          "Poppins:400,500,600,700",
          "Roboto:400,500,700",
          "Open Sans:400,600,700",
          "Lora:400,700",
          "Raleway:400,500,600",
          "Source Sans Pro:400,600,700",
          "Merriweather:400,700",
        ],
      },
      active: () => setFontWarning(""),
      inactive: () => setFontWarning("Some fonts could not be loaded. The editor is using browser fallback fonts."),
    });
  }, []);

  // Load design from URL on initial load and when designId changes
  useEffect(() => {
    if (currentDesignId && !designState.loading) {
      if (designState.activeDesign?.id !== currentDesignId) {
        designState.loadDesign(currentDesignId);
      }
    }
  }, [currentDesignId, designState.loading]);

  // Sync canvas size to the loaded design's dimensions
  useEffect(() => {
    if (designState.activeDesign) {
      const { width, height } = designState.activeDesign;
      if (width && height && (width !== canvasState.canvasWidth || height !== canvasState.canvasHeight)) {
        canvasState.setCanvasSize(width, height);
      }
    }
  }, [designState.activeDesign]);

  // Auto-activate first page when pages load and canvases are registered
  useEffect(() => {
    if (designState.pages.length > 0 && !canvasState.activeCanvasId) {
      canvasState.setActiveCanvas(designState.pages[0].id);
    }
  }, [designState.pages, canvasState.activeCanvasId]);

  // Auto-save on every canvas modification (debounced inside scheduleSave)
  useEffect(() => {
    if (canvasState.lastModified > 0) {
      designState.scheduleSave({
        width: canvasState.canvasWidth,
        height: canvasState.canvasHeight,
      });
    }
  }, [canvasState.lastModified]);

  useEffect(() => {
    if (initialDesignId) {
      if (!designState.loading && designState.activeDesign?.id !== initialDesignId) {
        designState.loadDesign(initialDesignId);
      }
    } else if (embedded && !currentDesignId && !designId && !designState.loading && !designState.activeDesign) {
      void createEmbeddedDesign();
    }
  }, [currentDesignId, designId, designState.loading, designState.activeDesign, initialDesignId, embedded, createEmbeddedDesign]);

  if (designState.loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F3F4F7]">
        <div className="text-center">
          <div className="spinner !w-6 !h-6 !border-accent/30 !border-t-accent mb-3 mx-auto" />
          <p className="text-zinc-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!embedded && !designId) {
    return (
      <EditorContext.Provider value={{ ...canvasState, ...designState, navigate }}>
        <Home />
      </EditorContext.Provider>
    );
  }

  if (designState.error && (!designState.activeDesign || designState.activeDesign.id !== currentDesignId)) {
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 bg-[#F3F4F7] p-6 text-center text-zinc-700">
        <p className="font-medium">Design Lab could not load.</p>
        <p className="text-sm">{designState.error}</p>
        <button className="rounded border px-3 py-2" onClick={() => currentDesignId ? designState.loadDesign(currentDesignId) : createEmbeddedDesign()}>
          Retry
        </button>
      </div>
    );
  }

  if (currentDesignId && designState.activeDesign?.id !== currentDesignId) {
    return (
      <div role="status" className="flex h-full items-center justify-center bg-[#F3F4F7]">
        <div className="text-center">
          <div className="spinner !w-6 !h-6 !border-accent/30 !border-t-accent mb-3 mx-auto" />
          <p className="text-zinc-400 text-sm">Loading saved design…</p>
        </div>
      </div>
    );
  }

  if (!currentDesignId && !designState.activeDesign) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F3F4F7]">
        <div className="text-center">
          <div className="spinner !w-6 !h-6 !border-accent/30 !border-t-accent mb-3 mx-auto" />
          <p className="text-zinc-400 text-sm">Initializing Design Lab...</p>
        </div>
      </div>
    );
  }

  // Editor view
  const contextValue = {
    ...canvasState,
    ...designState,
    error: designState.error || canvasState.assetError,
    // activeCanvasId is the source of truth for which page is active
    activePageId: canvasState.activeCanvasId ?? designState.activePageId,
    navigate,
    teacherResources: question?.designResources || [],
    teacherColors: question?.designColors || [],
    teacherTemplates: question?.designTemplates || [],
  };

  return (
    <div className="design-lab-root h-full">
      {fontWarning && (
        <p role="note" className="border-b border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-900">
          {fontWarning}
        </p>
      )}
      <EditorContext.Provider value={contextValue}>
        <Editor />
      </EditorContext.Provider>
    </div>
  );
}
