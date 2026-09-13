export function SunAvatar({ color = "#EE9D5C", size = 34 }: { color?: string; size?: number }) {
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 40 40">
        {rays.map((deg) => (
          <rect
            key={deg}
            x="19"
            y="1"
            width="2"
            height="9"
            rx="1"
            fill={color}
            transform={`rotate(${deg} 20 20)`}
          />
        ))}
        <circle cx="20" cy="20" r="9" fill={color} />
      </svg>
    </div>
  );
}
