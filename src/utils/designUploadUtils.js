/**
 * designUploadUtils.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Utilities for exporting design lab canvases to Cloudinary
 * ─────────────────────────────────────────────────────────────────────────────
 */

import apiClient from "../api/client";

/**
 * Convert a data URL to a Blob
 */
function dataURLToBlob(dataURL) {
    const parts = dataURL.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const bstr = atob(parts[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * Upload a design image to Cloudinary
 * @param {string} dataURL - Canvas data URL from design.toDataURL()
 * @returns {Promise<string>} - Cloudinary URL
 */
export async function uploadDesignToCloudinary(dataURL) {
    try {
        if (!dataURL) return null;

        const blob = dataURLToBlob(dataURL);
        const fd = new FormData();
        fd.append("image", blob, "design-export.png");

        const res = await apiClient.post("/api/upload/design", fd, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 30000,
        });

        return res.data?.url || null;
    } catch (err) {
        console.error("Design upload failed:", err);
        return null;
    }
}

/**
 * Export design canvas and upload to Cloudinary
 * Requires access to canvas reference with toDataURL method
 * @param {Object} canvasRef - Reference to fabric canvas
 * @returns {Promise<{designId: string, imageUrl: string} | null>}
 */
export async function exportAndUploadDesign(designId, canvasRef) {
    try {
        if (!canvasRef || typeof canvasRef.toDataURL !== "function") {
            return null;
        }

        // Export canvas to PNG data URL
        const dataURL = canvasRef.toDataURL({
            format: "png",
            multiplier: 1,
        });

        // Upload to Cloudinary
        const imageUrl = await uploadDesignToCloudinary(dataURL);

        if (imageUrl) {
            return {
                designId,
                imageUrl,
                exportedAt: new Date().toISOString(),
            };
        }

        return null;
    } catch (err) {
        console.error("Export and upload failed:", err);
        return null;
    }
}
