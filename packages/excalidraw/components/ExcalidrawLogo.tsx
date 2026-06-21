import "./ExcalidrawLogo.scss";

type LogoSize = "xs" | "small" | "normal" | "large" | "custom" | "mobile";

interface LogoProps {
  size?: LogoSize;
  withText?: boolean;
  style?: React.CSSProperties;
  isNotLink?: boolean;
}

export const ExcalidrawLogo = ({
  style,
  size = "small",
  withText,
}: LogoProps) => {
  return (
    <div className={`ExcalidrawLogo is-${size}`} style={style}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="ExcalidrawLogo-icon"
      >
        <rect width="40" height="40" rx="10" fill="#6965d6" />
        <path
          d="M10 28L16 14L22 22L26 18L30 28H10Z"
          fill="white"
          fillOpacity="0.9"
        />
        <circle cx="27" cy="13" r="3" fill="white" fillOpacity="0.7" />
      </svg>
      {withText && (
        <svg
          viewBox="0 0 160 32"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          className="ExcalidrawLogo-text"
        >
          <text
            x="0"
            y="24"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="700"
            fontSize="22"
            fill="currentColor"
            letterSpacing="-0.5"
          >
            Draw
          </text>
        </svg>
      )}
    </div>
  );
};
