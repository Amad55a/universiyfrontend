import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";

function SnapshotPage({ page, width, height }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return undefined;

    let cancelled = false;
    let staticCanvas;
    let loadPromise = Promise.resolve();

    const renderPage = async () => {
      try {
        const json = typeof page.canvas_json === "string"
          ? JSON.parse(page.canvas_json)
          : page.canvas_json;
        if (!json || typeof json !== "object" || Array.isArray(json)) {
          throw new Error("Saved page data is not a canvas object.");
        }

        staticCanvas = new fabric.StaticCanvas(canvasElement, {
          width,
          height,
          enableRetinaScaling: false,
        });
        loadPromise = Promise.resolve(staticCanvas.loadFromJSON(json));
        await loadPromise;
        if (!cancelled) staticCanvas.renderAll();
      } catch (renderError) {
        if (!cancelled) {
          console.error("Failed to render submitted Design Lab page:", renderError);
          setError("This saved poster page could not be rendered. Its submitted canvas data is retained.");
        }
      }
    };

    void renderPage();
    return () => {
      cancelled = true;
      if (staticCanvas) {
        void loadPromise
          .catch(() => {})
          .then(() => staticCanvas?.dispose())
          .catch((disposeError) => console.error("Failed to dispose submitted design preview:", disposeError));
      }
    };
  }, [page.canvas_json, width, height]);

  return (
    <figure className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <figcaption className="border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 dark:border-zinc-800 dark:text-gray-300">
        {page.title || "Design page"}
      </figcaption>
      <div className="overflow-auto bg-white p-2 dark:bg-zinc-950">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Submitted design page: ${page.title || "Design page"}`}
          width={width}
          height={height}
          className="mx-auto h-auto max-w-full"
          style={{ width: "min(100%, 640px)" }}
        />
        {error && <p role="alert" className="p-3 text-sm text-amber-700 dark:text-amber-300">{error}</p>}
      </div>
    </figure>
  );
}

export default function DesignSnapshotPreview({ snapshot, label = "Submitted design" }) {
  if (!snapshot || !Array.isArray(snapshot.pages) || snapshot.pages.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-400">
        This submission has no saved Design Lab snapshot. Its submitted poster cannot be reconstructed from the current editable design.
      </div>
    );
  }

  const width = Number(snapshot.width) || 1080;
  const height = Number(snapshot.height) || 1080;
  const pages = [...snapshot.pages].sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

  return (
    <div className="space-y-3" aria-label={label}>
      {pages.map((page, index) => (
        <SnapshotPage
          key={page.id || `${page.title || "page"}-${index}`}
          page={page}
          width={width}
          height={height}
        />
      ))}
    </div>
  );
}
