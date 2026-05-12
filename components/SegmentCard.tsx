"use client";
import { Segment } from "@/lib/types";

interface Props {
  segment: Segment;
  count: number | null;
  active: boolean;
  onClick: () => void;
}

export default function SegmentCard({ segment, count, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-xl border transition-all ${
        active
          ? "border-2 border-emerald-600"
          : "border border-gray-200 dark:border-gray-700 hover:border-gray-400"
      } bg-white dark:bg-gray-900`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: segment.color }}
        />
        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
          {segment.label}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{segment.desc}</p>
      <p className="text-xl font-medium text-gray-900 dark:text-gray-100">
        {count === null ? "—" : count.toLocaleString("nb-NO")}
      </p>
      <p className="text-xs text-gray-400">aktive enheter</p>
    </button>
  );
}
