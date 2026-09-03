import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { LANGUAGES } from "../lib/i18n/translations";

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const current = LANGUAGES.find((l) => l.code === lang);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5"
      >
        🌐 {current?.label}
      </button>
      {open && (
        <div className="absolute end-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`w-full text-start px-3 py-2 text-sm hover:bg-gray-50 ${
                l.code === lang ? "font-semibold text-[#1c3d2e]" : "text-gray-600"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}