import React from "react";
import { Video, Mic, Image as ImageIcon, FileText, File, MapPin, Check } from "lucide-react";

export const TASK_VALIDATIONS = [
  { key: "Video", icon: Video },
  { key: "Audio", icon: Mic },
  { key: "Image", icon: ImageIcon },
  { key: "Description", icon: FileText },
  { key: "File", icon: File },
  { key: "Geo Tag", icon: MapPin },
];

export const ITEM_VALIDATIONS = [
  { key: "Video", icon: Video },
  { key: "Audio", icon: Mic },
  { key: "Image", icon: ImageIcon },
  { key: "File", icon: File },
  { key: "Text", icon: FileText },
  { key: "Dropdown", icon: FileText },
  { key: "Geo Tag", icon: MapPin },
];

export default function ValidationPicker({ open, onClose, value, onChange }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55]" onClick={onClose}>
      <div
        className="absolute bg-white rounded-xl shadow-2xl border border-slate-100 p-2 w-64"
        onClick={(e) => e.stopPropagation()}
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      >
        <p className="text-xs font-bold text-slate-500 px-2 py-1.5">Ask Validations</p>
        <div className="space-y-0.5">
          {TASK_VALIDATIONS.map(({ key, icon: Icon }) => {
            const active = (value || []).includes(key);
            return (
              <button
                key={key}
                onClick={() =>
                  onChange(active ? (value || []).filter((v) => v !== key) : [...(value || []), key])
                }
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 text-left"
              >
                <Icon className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-700 flex-1">{key}</span>
                {active && (
                  <span className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}