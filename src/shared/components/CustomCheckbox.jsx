import React from "react";
import "../styles/checkbox/CustomCheckbox.css";

function CustomCheckbox(props) {
  const {
    value,              // boolean: açık / kapalı
    onChange,

    onIcon,
    offIcon,

    onLabel,
    offLabel,

    onDescription,
    offDescription,

    variant = "icon",   // "icon" | "label" | "detailed"
    tone = "primary",   // renk tonu
    disabled = false,

    className = "",
    name,
    id,
    ariaLabel,
  } = props;

  const isOn = !!value;
  const IconComponent = isOn ? onIcon : offIcon;
  const stateLabel = isOn ? onLabel : offLabel;
  const stateDescription = isOn ? onDescription : offDescription;

  let rootClass = "statetoggle";
  rootClass += isOn ? " statetoggle--on" : " statetoggle--off";
  rootClass += ` statetoggle--tone-${tone}`;
  if (disabled) rootClass += " statetoggle--disabled";
  if (className) rootClass += ` ${className}`;

  const hasVisibleText =
    (variant === "label" || variant === "detailed") && (onLabel || offLabel);

  const handleToggle = () => {
    if (disabled) return;
    if (typeof onChange === "function") {
      onChange(!isOn);
    }
  };

  return (
    <button
      type="button"
      name={name}
      id={id}
      className={rootClass}
      onClick={handleToggle}
      disabled={disabled}
      aria-pressed={isOn}
      aria-label={!hasVisibleText ? ariaLabel : undefined}
    >
      <div className="statetoggle__track">
        <div className="statetoggle__circle">
          {IconComponent && (
            <IconComponent
              size={18}
              strokeWidth={2}
              className="statetoggle__icon"
            />
          )}
        </div>
      </div>

      {(variant === "label" || variant === "detailed") && stateLabel && (
        <span className="statetoggle__label">
          {stateLabel}
        </span>
      )}

      {variant === "detailed" && stateDescription && (
        <span className="statetoggle__description">
          {stateDescription}
        </span>
      )}
    </button>
  );
}

export default CustomCheckbox;
