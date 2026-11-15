/**
 * レーダーの目盛りを模した小さなマーク。装飾ではなく、
 * 「無料枠を継続的に走査する」というこのサイトの役割を示す。
 */
export function RadarMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      className="radar-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="16"
        cy="16"
        r="13.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.35"
      />
      <circle
        cx="16"
        cy="16"
        r="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.22"
      />
      <circle
        cx="16"
        cy="16"
        r="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.55"
      />
      <path d="M16 16 L16 2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 16 L26.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="26.5" cy="9" r="2.4" fill="var(--signal)" />
      <path d="M22.6 4.9 A13.5 13.5 0 0 1 26.6 12.4 L16 16 Z" fill="var(--signal)" opacity="0.14" />
    </svg>
  );
}
