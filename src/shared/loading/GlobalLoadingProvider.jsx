import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { GlobalLoadingContext } from "./GlobalLoadingContext";
import "./global-loader.css";
import GlobalLoader from "./GlobalLoader";

export default function GlobalLoadingProvider({ children }) {
  const [visible, setVisible] = useState(false);

  const api = useMemo(() => ({
    visible,
    show: () => setVisible(true),
    hide: () => setVisible(false),
    toggle: () => setVisible(v => !v),
  }), [visible]);

  return (
    <GlobalLoadingContext.Provider value={api}>
      {children}
      {createPortal(<GlobalLoader visible={visible} />, document.body)}
    </GlobalLoadingContext.Provider>
  );
}
