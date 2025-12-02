"use client";

import { useState, useRef } from "react";

export default function CharacterSelector({ onSelect, currentPlayer }) {
  const [customImage, setCustomImage] = useState(null);
  const fileInputRef = useRef(null);

  const emojis = [
    "🐦",
    "🦅",
    "🦆",
    "🦉",
    "🦇",
    "🐝",
    "🦋",
    "🐞",
    "🚀",
    "🛸",
    "🚁",
    "✈️",
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomImage(event.target.result);
        onSelect({ type: "image", value: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-black border border-green-500/50 rounded-none w-full max-w-md">
      <h2 className="text-xl font-mono font-bold text-green-500 mb-2 uppercase tracking-widest">
        Select Unit
      </h2>

      <div className="flex flex-wrap justify-center gap-2">
        {/* Default Bird */}
        <button
          onClick={() => onSelect({ type: "emoji", value: "🐦" })}
          className={`w-12 h-12 flex items-center justify-center text-2xl border transition-all ${
            currentPlayer.value === "🐦"
              ? "bg-green-500/20 border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
              : "bg-black border-gray-700 hover:border-green-500/50"
          }`}
        >
          🐦
        </button>

        {/* Emojis */}
        {emojis.slice(1).map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect({ type: "emoji", value: emoji })}
            className={`w-12 h-12 flex items-center justify-center text-2xl border transition-all ${
              currentPlayer.value === emoji
                ? "bg-green-500/20 border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                : "bg-black border-gray-700 hover:border-green-500/50"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-green-900/50 my-2"></div>

      {/* Custom Image */}
      <div className="flex flex-col items-center gap-2 w-full">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 border border-green-500 text-green-500 hover:bg-green-500 hover:text-black transition-colors text-sm font-mono uppercase tracking-wider"
        >
          Upload Custom Unit
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        {customImage && (
          <button
            onClick={() => onSelect({ type: "image", value: customImage })}
            className={`relative w-16 h-16 border-2 transition-all ${
              currentPlayer.value === customImage
                ? "border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)]"
                : "border-gray-700"
            }`}
          >
            <img
              src={customImage}
              alt="Custom"
              className="w-full h-full object-cover"
            />
          </button>
        )}
      </div>
    </div>
  );
}
