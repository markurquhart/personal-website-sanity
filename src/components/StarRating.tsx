// Half-star aware rating display. Accepts 0–5 with 0.5 increments.

export function StarRating({
  value,
  size = 16,
  className,
}: {
  value?: number | null;
  size?: number;
  className?: string;
}) {
  if (value == null) return null;
  const v = Math.max(0, Math.min(5, value));
  return (
    <div
      className={`inline-flex items-center gap-[2px] ${className || ""}`}
      aria-label={`Rating: ${v} out of 5`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, v - i));
        return <Star key={i} fill={fill} size={size} />;
      })}
    </div>
  );
}

function Star({ fill, size }: { fill: number; size: number }) {
  const id = `star-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className="flex-shrink-0"
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset={`${fill * 100}%`} stopColor="#c0392b" />
          <stop offset={`${fill * 100}%`} stopColor="#e5e5e5" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.92 5.92 6.54.95-4.73 4.61 1.12 6.51L12 17.27l-5.85 3.22 1.12-6.51-4.73-4.61 6.54-.95L12 2.5z"
        fill={`url(#${id})`}
        stroke="#c0392b"
        strokeWidth="0.6"
      />
    </svg>
  );
}
