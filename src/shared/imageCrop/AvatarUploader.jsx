import { useMemo, useRef, useCallback } from "react";
import { cssVar } from "../styles/theme/customTheme";

/**
 * AvatarUploader — CSS ayrı, JSX ayrı, tema değişkenleriyle uyumlu
 * Props:
 *  - value: string | null                 // mevcut görsel (dataURL ya da URL)
 *  - onPick: (dataUrl: string) => void    // kırpılmış görsel geri dönüşü
 *  - variant: 'profile' | 'card' | 'square' (default: 'profile')
 *  - size: number (default: 144)
 *    * profile/square: kenar uzunluğu
 *    * card: yükseklik (genişlik otomatik: size * 86/54)
 *  - label: string (default: 'Görsel Seç')
 *  - caption: string
 */
import '../styles/crop/AvatarUploader.css';

export function AvatarUploader({
  value: avatar,
  onPick,
  variant = 'profile',
  size = 144,
  label = 'Görsel Seç',
  caption = '',
}){
  const inputRef = useRef(null);
  const openPicker = useCallback(() => inputRef.current?.click(), []);

  // aspect / ölçüler
  const { aspect, targetW, targetH, variantClass } = useMemo(() => {
    const ASPECT = { profile: 1, square: 1, card: 86/54 };
    const a = ASPECT[variant] ?? 1;
    const h = size;                  // profile/square: size; card: height = size
    const w = variant === 'card' ? Math.round(size * a) : size;
    return { aspect: a, targetW: w, targetH: h, variantClass: `au--${variant}` };
  }, [variant, size]);

  // dosya oku + merkezden hedef aspekte kırp
  const readAndCrop = useCallback((file) => new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const srcW = img.width, srcH = img.height;
        const srcRatio = srcW / srcH, targetRatio = aspect;
        let cropW, cropH, sx, sy;
        if (srcRatio > targetRatio){
          cropH = srcH; cropW = Math.round(srcH * targetRatio); sx = Math.round((srcW - cropW)/2); sy = 0;
        } else {
          cropW = srcW; cropH = Math.round(srcW / targetRatio); sx = 0; sy = Math.round((srcH - cropH)/2);
        }
        const canvas = document.createElement('canvas');
        canvas.width = targetW; canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0,0,targetW,targetH);
        ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  }), [aspect, targetW, targetH]);

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const cropped = await readAndCrop(file);
    onPick?.(cropped);
    e.target.value = null; // aynı dosyayı yeniden seçebilmek için
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
  };

  // oranı bozmayan SVG placeholder
  const placeholder = useMemo(() => {
    const label = variant === 'card' ? 'Kart Görseli' : 'Görsel';
    const svg = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='${targetW}' height='${targetH}'>
        <rect width='100%' height='100%' fill='#f3f4f6'/>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-family='sans-serif' font-size='14'>${label}</text>
      </svg>`
    );
    return `data:image/svg+xml;charset=utf-8,${svg}`;
  }, [targetW, targetH, variant]);

  return (
    <div className={`au ${variantClass}`} style={{ '--au-w': `${targetW}px`, '--au-h': `${targetH}px` }}>
      <button
        type="button"
        className="au__btn"
        onClick={openPicker}
        onKeyDown={onKeyDown}
        title={label}
        aria-label={label}
      >
        <img src={avatar || placeholder} alt="avatar" className="au__img" width={targetW} height={targetH} />
      </button>

      {caption ? <div className="au__caption">{caption}</div> : null}

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onChange} />
    </div>
  );
}

export default AvatarUploader;


/* -------------------------------------------
 * Kullanım örnekleri:
 *
 * 1) Profil (yuvarlak):
 * <AvatarUploader
 *   variant="profile"
 *   size={144}
 *   caption="kullanacak görseli seçiniz."
 *   value={avatarUrl}
 *   onPick={setAvatarUrl}
 * />
 *
 * 2) Kart kimlik (dikdörtgen, ID kart oranı):
 * <AvatarUploader
 *   variant="card"
 *   size={160} // yükseklik
 *   caption="kartın ön tarafını seçiniz"
 *   value={frontCard}
 *   onPick={setFrontCard}
 * />
 *
 * 3) Kare:
 * <AvatarUploader
 *   variant="square"
 *   size={200}
 *   caption="Kartın arka tarafına seçiniz"
 *   value={backCard}
 *   onPick={setBackCard}
 * />
 *
 * Not: Kullanıcı bir görsel seçtiğinde, hedef orana göre merkezden kırpılır
 * ve kırpılmış görsel doğrudan bileşene yerleştirilir (onPick ile de döner).
 * ------------------------------------------- */
