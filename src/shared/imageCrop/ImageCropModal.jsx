import { useEffect, useMemo, useRef, useState } from "react";
import { cssVar } from "../styles/theme/customTheme";
import { imageViewportRect, clampRect } from "./cropMath.js";
import Button from "../components/Button.jsx";
import { Circle, Scan, Square, SquareDashed } from "lucide-react";

export function ImageCropModal({
  open,
  src,
  onClose,
  onCropped,
  title = "Crop Image",
}) {
  // Viewport size can be themed via --crop-viewport (e.g., 360px)
  const VP = useMemo(() => {
    const v = cssVar("--crop-viewport", "360px");
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 360;
  }, []);
  // Themed tokens
  const TOKENS = useMemo(
    () => ({
      radiusLg: cssVar("--radius-lg", "16px"),
      radiusMd: cssVar("--radius-md", "12px"),
      radiusPill: cssVar("--radius-pill", "999px"),
      spaceXs: cssVar("--space-xs", "6px"),
      spaceSm: cssVar("--space-sm", "10px"),
      spaceMd: cssVar("--space-md", "14px"),
      spaceLg: cssVar("--space-lg", "20px"),
      shadowLg: cssVar("--shadow-lg", "0 20px 40px rgba(0,0,0,.15)"),
      surface: cssVar("--surface", "#fff"),
      surfaceMuted: cssVar("--surface-muted", "#f3f4f6"),
      border: cssVar("--border", "#e5e7eb"),
      text: cssVar("--text", "#111827"),
      textMuted: cssVar("--text-muted", "#6b7280"),
      accent: cssVar("--accent", "#01A89E"),
      accentHover: cssVar("--accent-hover", "#0f9c92"),
      accentContrast: cssVar("--accent-contrast", "#ffffff"),
      sheeps: cssVar("#bababaff"),
    }),
    []
  );

  const primaryColor = "var(--role-primary-bg)";
  const dangerColor = "var(--role-danger-bg)";
  const secondaryColor = "var(--role-secondary-bg)";



  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [imgRect, setImgRect] = useState({ x: 0, y: 0, w: 0, h: 0, scale: 1 });
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 200, h: 200 });
  const [dragMode, setDragMode] = useState(null); // 'move' | 'nw' | 'ne' | 'sw' | 'se'
  const [mode, setMode] = useState("CIRCLE");
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) setDragMode(null);
  }, [open]);

  const onImgLoad = (e) => {
    const iw = e.target.naturalWidth;
    const ih = e.target.naturalHeight;
    setNatural({ w: iw, h: ih });
    const rect = imageViewportRect(iw, ih, VP);
    setImgRect(rect);
    const size = Math.min(rect.w, rect.h) * 0.7;
    setCrop({
      x: rect.x + (rect.w - size) / 2,
      y: rect.y + (rect.h - size) / 2,
      w: size,
      h: size,
    });
  };

  useEffect(() => {
    if (mode === "FREE") return;
    setCrop((c) => {
      const size = Math.max(c.w, c.h);
      const x = c.x + (c.w - size) / 2;
      const y = c.y + (c.h - size) / 2;
      return clampRect({ x, y, w: size, h: size }, imgRect);
    });
  }, [mode, imgRect.x, imgRect.y, imgRect.w, imgRect.h]);

  const startDrag = (type, e) => {
    e.preventDefault();
    setDragMode(type);
    last.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e) => {
    if (!dragMode) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };

    let { x, y, w, h } = crop;
    const lockSquare = mode !== "FREE";

    if (dragMode === "move") {
      ({ x, y, w, h } = clampRect({ x: x + dx, y: y + dy, w, h }, imgRect));
    } else {
      if (dragMode === "nw") {
        x += dx;
        y += dy;
        w -= dx;
        h -= dy;
      }
      if (dragMode === "ne") {
        y += dy;
        w += dx;
        h -= dy;
      }
      if (dragMode === "sw") {
        x += dx;
        w -= dx;
        h += dy;
      }
      if (dragMode === "se") {
        w += dx;
        h += dy;
      }

      if (lockSquare) {
        const size = Math.max(w, h);
        if (dragMode === "nw") {
          x = x + (w - size);
          y = y + (h - size);
        }
        if (dragMode === "ne") {
          y = y + (h - size);
        }
        if (dragMode === "sw") {
          x = x + (w - size);
        }
        w = size;
        h = size;
      }

      ({ x, y, w, h } = clampRect({ x, y, w, h }, imgRect));
    }

    setCrop({ x, y, w, h });
  };

  const endDrag = () => setDragMode(null);

  const handleCrop = () => {
    if (!natural.w) return;
    const s = imgRect.scale;
    const srcX = (crop.x - imgRect.x) / s;
    const srcY = (crop.y - imgRect.y) / s;
    const srcW = crop.w / s;
    const srcH = crop.h / s;

    const outW = mode === "FREE" ? Math.round(srcW) : 512;
    const outH = mode === "FREE" ? Math.round(srcH) : 512;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, outW);
    canvas.height = Math.max(1, outH);
    const ctx = canvas.getContext("2d");

    const image = new Image();
    image.onload = () => {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        image,
        srcX,
        srcY,
        srcW,
        srcH,
        0,
        0,
        canvas.width,
        canvas.height
      );
      onCropped?.(canvas.toDataURL("image/png"));
      onClose?.();
    };
    image.src = src;
  };

  const maskRadius = useMemo(
    () =>
      mode === "CIRCLE"
        ? "50%"
        : mode === "CORNER"
        ? cssVar("--radius-md", "12px")
        : mode === "SQUARE"
        ? "0"
        : null,
    [mode]
  );

  const Handle = ({ pos }) => (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        startDrag(pos, e);
      }}
      role="button"
      tabIndex={-1}
      aria-label={`Resize ${pos}`}
      style={{
        position: "absolute",
        width: 12,
        height: 12,
        [pos.includes("n") ? "top" : "bottom"]: -6,
        [pos.includes("w") ? "left" : "right"]: -6,
        background: "#fff",
        border: `1px solid ${TOKENS.border}`,
        borderRadius: 3,
        cursor:
          pos === "nw"
            ? "nwse-resize"
            : pos === "ne"
            ? "nesw-resize"
            : pos === "sw"
            ? "nesw-resize"
            : "nwse-resize",
        boxShadow: "0 0 0 1px rgba(0,0,0,.01)",
      }}
    />
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,.4)",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          // width: "min(92vw, 560px)",
          background: TOKENS.surface,
          color: TOKENS.text,
          border: `1px solid ${TOKENS.border}`,
          borderRadius: TOKENS.radiusLg,
          boxShadow: TOKENS.shadowLg,
          padding: TOKENS.spaceLg,
        }}
      >

        {!src ? (
          <div style={{ textAlign: "center", color: TOKENS.textMuted }}>
            Görsel seçilmedi.
          </div>
        ) : (
          <>
            {/* Viewport */}
            <div
              style={{
                position: "relative",
                width: VP,
                height: VP,
                overflow: "hidden",
                borderRadius: TOKENS.radiusMd,
                background: TOKENS.surfaceMuted,
                border: `1px solid ${TOKENS.border}`,
                userSelect: "none",
                touchAction: "none",
                marginInline: "auto",
              }}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerLeave={endDrag}
            >
              {/* base image */}
              <img
                src={src}
                alt="to-crop"
                onLoad={onImgLoad}
                draggable={false}
                style={{
                  position: "absolute",
                  left: imgRect.x,
                  top: imgRect.y,
                  width: imgRect.w,
                  height: imgRect.h,
                  objectFit: "cover",
                }}
              />

              {/* mask (except FREE) */}
              {maskRadius !== null && (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    boxShadow: "0 0 0 9999px rgba(0,0,0,.28)",
                    borderRadius: maskRadius,
                    outline: "1px solid rgba(255,255,255,.85)",
                    outlineOffset: -1,
                  }}
                />
              )}

              {/* crop rect */}
              <div
                role="button"
                aria-label="Move crop"
                style={{
                  position: "absolute",
                  left: crop.x,
                  top: crop.y,
                  width: crop.w,
                  height: crop.h,
                  border: "1.5px solid rgba(255,255,255,.95)",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,.22)",
                  borderRadius:
                    mode === "CIRCLE"
                      ? "50%"
                      : mode === "CORNER"
                      ? TOKENS.radiusMd
                      : 0,
                  cursor: "move",
                }}
                onPointerDown={(e) => startDrag("move", e)}
              >
                <Handle pos="nw" />
                <Handle pos="ne" />
                <Handle pos="sw" />
                <Handle pos="se" />
              </div>
            </div>

            {/* shape choices */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: TOKENS.spaceXs,
                paddingTop: TOKENS.spaceSm,
                marginBottom: TOKENS.spaceLg,
              }}
            >
              <Button
                size="lg"
                icon={SquareDashed}
                iconOnly={true}
                primaryColor={mode === "FREE" ? TOKENS.accent : TOKENS.textMuted}
                activeColor={TOKENS.accentHover}
                onClick={() => setMode("FREE")}
              />
              <Button
                size="lg"
                icon={Square}
                iconOnly={true}
                primaryColor={mode === "SQUARE" ? TOKENS.accent : TOKENS.textMuted}
                activeColor={TOKENS.accentHover}
                onClick={() => setMode("SQUARE")}
              />
              <Button
                size="lg"
                icon={Circle}
                iconOnly={true}
                primaryColor={mode === "CIRCLE" ? TOKENS.accent : TOKENS.textMuted}
                activeColor={TOKENS.accentHover}
                onClick={() => setMode("CIRCLE")}
              />
            </div>
          </>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: TOKENS.spaceLg,
          }}
        >
          <Button
            type="button"
            size="md"
            onClick={handleCrop}
            primaryColor={primaryColor}
          >
            بُرِش عکس
          </Button>
          <Button
            type="button"
            size="md"
            onClick={onClose}
            primaryColor={dangerColor}
          >
            لغو
          </Button>
        </div>
      </div>
    </div>
  );
}
