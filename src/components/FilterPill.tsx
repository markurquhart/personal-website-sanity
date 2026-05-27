type FilterPillProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
};

export function FilterPill({ active, onClick, label, count }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-full border px-[14px] py-[6px] text-[13px] font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#333] ${
        active
          ? "border-[#333] bg-[#333] text-white"
          : "border-[#ddd] bg-white text-[#666] hover:border-[#333] hover:text-[#333]"
      }`}
    >
      <span className="flex items-center gap-2">
        <span>{label}</span>
        <span
          className={`rounded-full px-2 py-[2px] text-[11px] leading-none ${
            active
              ? "bg-white/20 text-white"
              : "bg-[#f4f3ef] text-[#888]"
          }`}
        >
          {count}
        </span>
      </span>
    </button>
  );
}
