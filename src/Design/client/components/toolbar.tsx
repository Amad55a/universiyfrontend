import { useState } from "react";
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  ChevronDown,
} from "lucide-react";
import { useEditor, CANVAS_SIZES } from "../context";

export function Toolbar() {
  const {
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    undo,
    redo,
    canUndo,
    canRedo,
    zoom,
    fitScale,
    zoomToFit,
    zoomIn,
    zoomOut,
    exportPNG,
    activeDesign,
    renameDesign,
    saving,
    error,
  } = useEditor();

  const [showSizeDropdown, setShowSizeDropdown] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const ACTION_BTN = "inline-flex items-center justify-center rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors duration-150 px-2.5 py-2";

  const currentSize = CANVAS_SIZES.find(
    (s) => s.width === canvasWidth && s.height === canvasHeight
  );
  const sizeLabel = currentSize ? currentSize.label : `${canvasWidth} x ${canvasHeight}`;

  const startRename = () => {
    if (!activeDesign) return;
    setNameValue(activeDesign.name);
    setEditingName(true);
  };

  const finishRename = () => {
    if (activeDesign && nameValue.trim()) {
      renameDesign(activeDesign.id, nameValue.trim());
    }
    setEditingName(false);
  };

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-white dark:bg-gray-900 border-b border-zinc-200 shrink-0">
      {/* Left: Home + Design name + Canvas size */}
      <div className="flex items-center gap-3">

        {activeDesign && (
          editingName ? (
            <input
              className="bg-zinc-100 border border-accent rounded px-2 py-0.5 text-xs text-zinc-900 outline-none w-40"
              value={nameValue}
              onInput={(e) => setNameValue((e.target as HTMLInputElement).value)}
              onBlur={finishRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") finishRename();
                if (e.key === "Escape") setEditingName(false);
              }}
              autoFocus
            />
          ) : (
            <span
              className="text-xs font-semibold text-zinc-600 cursor-pointer hover:text-zinc-900 transition-colors"
              onDoubleClick={startRename}
            >
              {activeDesign.name}
            </span>
          )
        )}

        <div className="relative">
          <button
            className={ACTION_BTN}
            onClick={() => setShowSizeDropdown(!showSizeDropdown)}
          >
            {sizeLabel}
            <ChevronDown size={12} />
          </button>
          {showSizeDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSizeDropdown(false)} />
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-zinc-300 rounded-lg shadow-xl z-20 min-w-[200px] py-1">
                {CANVAS_SIZES.map((s) => (
                  <button
                    key={s.label}
                    className={ACTION_BTN}
                    onClick={() => {
                      setCanvasSize(s.width, s.height);
                      setShowSizeDropdown(false);
                    }}
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="text-zinc-400 ml-2">
                      {s.width} x {s.height}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center: Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          className={ACTION_BTN}
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Cmd+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          className={ACTION_BTN}
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* Right: Zoom + Export */}
      <div className="flex items-center gap-2">
        <span role={error ? "alert" : "status"} className={`text-[10px] ${error ? "text-red-600" : saving ? "text-amber-600" : "text-emerald-700"}`}>
          {error ? "Save error" : saving ? "Saving…" : "Saved"}
        </span>
        <div className="flex items-center gap-1.5">
        <button
          className={ACTION_BTN}
          onClick={zoomOut}
          title="Zoom out"
        >
          <ZoomOut size={15} />
        </button>
        <span className="text-[11px] text-zinc-400 font-mono w-10 text-center">
          {Math.round((zoom / (fitScale || 1)) * 100)}%
        </span>
        <button
          className={ACTION_BTN}
          onClick={zoomIn}
          title="Zoom in"
        >
          <ZoomIn size={15} />
        </button>
        <button
          className={ACTION_BTN}
          onClick={zoomToFit}
          title="Fit to screen"
        >
          <Maximize size={15} />
        </button>

        <div className="w-px h-5 bg-zinc-300 mx-1" />

        <button
          className={ACTION_BTN}
          onClick={exportPNG}
          title="Export as PNG"
        >
          <Download size={13} />
          Export
        </button>
        </div>
      </div>
    </div>
  );
}
