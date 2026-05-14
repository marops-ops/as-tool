"use client";
import { Enhet } from "@/lib/types";

interface Props {
  enheter: Enhet[];
  segmentKey: string;
  page: number;
  pageSize: number;
  onClickEnhet?: (enhet: Enhet) => void;
}

const BADGE: Record<string, string> = {
  ENK: "bg-amber-100 text-amber-800",
  AS: "bg-emerald-100 text-emerald-800",
  ANS: "bg-emerald-100 text-emerald-800",
  DA: "bg-emerald-100 text-emerald-800",
  NUF: "bg-blue-100 text-blue-800",
};

export default function EnhetTable({ enheter, page, pageSize, onClickEnhet }: Props) {
  const start = page * pageSize;
  const slice = enheter.slice(start, start + pageSize);

  if (!slice.length) {
    return <div className="text-center py-12 text-gray-400 text-sm">Ingen treff</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm table-fixed">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-[28%]">Navn</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-[8%]">Form</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-[7%]">Ansatte</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-[18%]">Poststed</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-[15%]">Fylke</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide w-[24%]">Bransje</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          {slice.map((e, i) => (
            <tr
              key={i}
              onClick={() => onClickEnhet?.(e)}
              className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${onClickEnhet ? "cursor-pointer" : ""}`}
            >
              <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100 truncate font-medium" title={e.navn}>{e.navn}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${BADGE[e.form] ?? "bg-gray-100 text-gray-700"}`}>
                  {e.form}
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{e.ansatte !== "" ? e.ansatte : "—"}</td>
              <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 truncate">{e.postnummer} {e.poststed}</td>
              <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 truncate">{e.fylke || "—"}</td>
              <td className="px-4 py-2.5 text-gray-500 dark:text-gray-500 truncate text-xs">{e.kategori || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
