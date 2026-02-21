import { createContext, useContext } from "react";

export const GlobalLoadingContext = createContext({
  visible: false,
  show: () => {},
  hide: () => {},
  toggle: () => {},
});

export const useGlobalLoading = () => useContext(GlobalLoadingContext);
