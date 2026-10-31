// components/ImageUploadField.jsx
// Shared upload control used by Coding Lab, Design Lab, and Terminal Lab
// question editors. Uploads to /api/exams/teacher/upload-image and stores
// the returned URL on the question (question.image).
import React, { useState } from "react";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon } from "lucide-react";

export default function ImageUploadField({ value, onChange, label = "Image" }) {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB for direct embedding");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result);
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read file");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Image processing failed");
      setUploading(false);
    } finally {
      e.target.value = ""; // allow re-selecting the same file later
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">
        {label}
      </label>
      {value ? (
        <div className="relative border rounded-lg overflow-hidden dark:border-neutral-600 w-fit">
          <img src={value} alt={label} className="max-h-48 object-contain bg-neutral-50" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 bg-white/90 dark:bg-neutral-800/90 rounded-full p-1 hover:bg-red-100"
          >
            <X className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer text-sm text-neutral-500 hover:border-[#2C2DE0] dark:border-neutral-600 w-fit">
          {uploading ? <Upload className="w-4 h-4 animate-pulse" /> : <ImageIcon className="w-4 h-4" />}
          {uploading ? "Uploading..." : "Click to upload an image"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      )}
    </div>
  );
}