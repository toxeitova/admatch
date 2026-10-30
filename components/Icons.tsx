// Иконки (inline SVG, без зависимостей).
type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  viewBox: "0 0 24 24",
};

export const IconCheck = ({ className = "h-4 w-4" }: P) => (
  <svg {...base} className={className}><path d="M20 6 9 17l-5-5" /></svg>
);
export const IconBadgeCheck = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}>
    <path d="M12 2 14.4 4.2l3.2-.4.9 3.1 2.9 1.5-1.2 3 1.2 3-2.9 1.5-.9 3.1-3.2-.4L12 22l-2.4-2.2-3.2.4-.9-3.1-2.9-1.5 1.2-3-1.2-3 2.9-1.5.9-3.1 3.2.4Z" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </svg>
);
export const IconPin = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
export const IconTag = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>
);
export const IconHandshake = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1 1 0 1 1-3-3l2.8-2.8a5.8 5.8 0 0 1 7.1-.9l.5.3a2 2 0 0 0 1.4.3L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" /></svg>
);
export const IconSearch = ({ className = "h-6 w-6" }: P) => (
  <svg {...base} className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const IconArrowRight = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
);
export const IconClose = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);
export const IconCopy = ({ className = "h-5 w-5" }: P) => (
  <svg {...base} className={className}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
export const IconExternal = ({ className = "h-4 w-4" }: P) => (
  <svg {...base} className={className}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
);
export const IconChevron = ({ className = "h-4 w-4" }: P) => (
  <svg {...base} className={className}><path d="m6 9 6 6 6-6" /></svg>
);
