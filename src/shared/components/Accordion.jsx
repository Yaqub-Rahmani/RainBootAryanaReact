import { useState } from "react";

export default function Accordion({ items, allowMultiple = false, dir = "rtl" }) {
  const [openKeys, setOpenKeys] = useState([]);

  const toggle = (key) => {
    setOpenKeys((prev) => {
      const has = prev.includes(key);
      if (allowMultiple) {
        return has ? prev.filter((k) => k !== key) : [...prev, key];
      }
      return has ? [] : [key];
    });
  };

  return (
    <div dir={dir} className="w-full">
      {items.map(({ key, title, content }) => {
        const isOpen = openKeys.includes(key);
        return (
          <div key={key} className="border rounded-lg mb-4 overflow-hidden">
            <button
              onClick={() => toggle(key)}
              className="w-full text-right px-4 py-3 font-semibold flex items-center justify-between bg-white hover:bg-gray-50 transition border-b"

            >
              <span>{title}</span>
              <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
            </button>

            <div
              className={`transition-[grid-template-rows] duration-300 ease-in-out grid ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <div className="p-4 bg-white">{content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}