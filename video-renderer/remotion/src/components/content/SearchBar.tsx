import React from "react";
import { useCurrentFrame } from "remotion";

interface Props {
  query: string;
  showDropdown?: boolean;
  typingSpeed?: number;
  dropdownItems?: string[];
  className?: string;
}

export const SearchBar: React.FC<Props> = ({
  query, showDropdown = false, typingSpeed = 2,
  dropdownItems = ["Best electric cargo bike", "Toddler hair styles", "History of Park Slope"],
  className = "",
}) => {
  const frame = useCurrentFrame();
  const visibleChars = Math.min(query.length, Math.floor(frame / typingSpeed));
  const cursorOn = Math.sin(frame * 0.3) > 0;

  return (
    <div className={`relative mb-6 font-sans w-full ${className}`}>
      {/* Search input */}
      <div className="flex items-center gap-3 bg-gray-50 rounded-full py-3 px-5 border border-gray-200">
        <span className="text-xl opacity-60">&#128269;</span>
        <span className="flex-1 text-base text-gray-900">
          {query.slice(0, visibleChars)}
          <span className={`ml-[2px] font-light ${cursorOn ? "opacity-100" : "opacity-0"}`}>|</span>
        </span>
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full px-4 py-2 text-sm font-medium">
          Ask YouTube
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl p-4 z-10">
          {dropdownItems.map((item, i) => (
            <div key={i} className={`py-2.5 text-sm text-gray-900 flex justify-between items-center ${i < dropdownItems.length - 1 ? "border-b border-gray-100" : ""}`}>
              <span>&#128337; {item}</span>
              <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
