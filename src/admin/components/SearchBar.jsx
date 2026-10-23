import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SearchBar = ({
  value,
  onChange,
  placeholder,
  className,
  onClear,
  onFocus,
  onKeyDown,
  inputRef,
  activeDescendant,
  expanded = false,
  clearLabel = "Clear search",
}) => (
  <div
    className={cn(
      "relative flex items-center",
      className
    )}
  >
    <Search
      size={16}
      className="pointer-events-none absolute left-3 text-gray-400 dark:text-gray-500"
    />
    <input
      type="text"
      aria-label={placeholder}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={expanded}
      aria-controls={expanded ? "admin-global-search-results" : undefined}
      aria-activedescendant={activeDescendant}
      autoComplete="off"
      ref={inputRef}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className={cn(
        "h-10 w-full rounded-xl border border-gray-200/80 dark:border-white/10",
        "bg-white/70 dark:bg-white/5 backdrop-blur-md",
        "pl-10 pr-10 text-sm text-gray-900 shadow-sm dark:text-white",
        "placeholder:text-gray-400 dark:placeholder:text-gray-500",
        "focus:outline-none focus:ring-2 focus:ring-[#2C2DE0]/30 focus:border-[#2C2DE0]/40",
        "transition-all duration-200"
      )}
    />
    {value && (
      <button
        type="button"
        aria-label={clearLabel}
        onClick={() => {
          onChange?.("");
          onClear?.();
        }}
        className="absolute right-2 rounded-md p-1 text-gray-500 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0]/60 dark:text-gray-400 dark:hover:text-white"
      >
        <X size={14} />
      </button>
    )}
  </div>
);

export default SearchBar;
