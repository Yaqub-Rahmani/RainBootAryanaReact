import { useEffect, useState } from 'react';
import { customTheme, applyTheme } from './customTheme';

export default function ThemeProvider({ initial='light', children }) {
  const [mode, setMode] = useState(initial);

  useEffect(() => {
    applyTheme(customTheme[mode]);
  }, [mode]);

  // isteğe bağlı: dışarı aktarmak için window.theme = {setMode,...}
  useEffect(() => {
    window.theme = { setMode };
  }, []);

  return children;
}
