"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import campsData from "@/camps.json";
import { isPrivateCamp, type Campground } from "@/types/camp";

const CampMap = dynamic(() => import("./CampMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[50vh] items-center justify-center bg-[#eef1ee] text-sm text-stone-500">
      地図を読み込み中…
    </div>
  ),
});

function normalizeCamps(data: unknown): Campground[] {
  if (!Array.isArray(data)) return [];

  return data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const lat = Number(raw.lat);
    const lng = Number(raw.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

    const tags = Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : [];

    return [
      {
        id: String(raw.id ?? `${lat},${lng}`),
        name: String(raw.name ?? "名称未設定"),
        type: raw.type === "private" ? "private" : "commercial",
        area: String(raw.area ?? ""),
        lat,
        lng,
        hpUrl: String(raw.hpUrl ?? ""),
        imageUrl: String(raw.imageUrl ?? ""),
        catchCopy: String(raw.catchCopy ?? ""),
        tags,
        notes:
          raw.notes && typeof raw.notes === "object"
            ? (raw.notes as Campground["notes"])
            : {},
      },
    ];
  });
}

const TAG_GROUPS: { id: string; title: string; tags: string[] }[] = [
  {
    id: "guest",
    title: "利用タイプ",
    tags: ["ペットOK", "ソロ向け", "ファミリー向け", "日帰りOK"],
  },
  {
    id: "location",
    title: "ロケーション",
    tags: ["海が見える", "竹林・林間", "川のそば", "高台・絶景", "星空がきれい"],
  },
  {
    id: "facility",
    title: "設備・環境",
    tags: [
      "水洗トイレ",
      "お風呂・温泉あり",
      "AC電源あり",
      "ゴミ捨て場あり",
      "オートキャンプ",
    ],
  },
  {
    id: "experience",
    title: "こだわり・体験",
    tags: [
      "直火OK",
      "ドラム缶風呂・五右衛門風呂",
      "サウナ",
      "ピザ窯",
      "川遊び・釣り",
      "プライベート感",
    ],
  },
];

function HeaderEmblem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="32" cy="32" r="29.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M32 11 51 50H13Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="miter"
      />
      <path
        fill="currentColor"
        d="M32 19 27.8 31.6 21.8 29q-1.6 5.2 1.6 10.2Q27.6 44 32 44.2q4.4-.2 8.6-5 3.2-5 1.6-10.2l-6 2.6Z"
      />
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
        d="M23.6 49.4 30.8 41.4M27.2 49.8 31.6 41.6M36.8 49.8 32.4 41.6M40.4 49.4 33.2 41.4"
      />
    </svg>
  );
}

function FilterCheck({
  checked,
  onChange,
  accentClass,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  accentClass?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-stone-200 bg-[#f6f7f5] px-3 py-2 transition-colors has-[:checked]:border-[#7d9a86] has-[:checked]:bg-[#eef3ef]">
      <input
        type="checkbox"
        className={`size-4 shrink-0 ${accentClass ?? "accent-[#4f6f5c]"}`}
        checked={checked}
        onChange={onChange}
      />
      {children}
    </label>
  );
}

export default function CampSearchApp() {
  const camps = useMemo(() => normalizeCamps(campsData), [campsData]);
  const [includeCommercial, setIncludeCommercial] = useState(true);
  const [includePrivate, setIncludePrivate] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const visibleCamps = useMemo(() => {
    return camps.filter((camp) => {
      const privateSite = isPrivateCamp(camp);
      if (privateSite && !includePrivate) return false;
      if (!privateSite && !includeCommercial) return false;
      if (selectedTags.length === 0) return true;
      return selectedTags.every((tag) => camp.tags.includes(tag));
    });
  }, [camps, selectedTags, includeCommercial, includePrivate]);

  const positionsKey = camps
    .map((camp) => `${camp.id}:${camp.lat},${camp.lng}`)
    .join("|");

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-[#f6f7f5] text-[#2f332e]">
      <header className="border-b border-white/15 bg-[linear-gradient(180deg,#1f4d3a_0%,#16382b_52%,#0c221a_100%)] px-4 py-2 md:px-6">
        <div className="flex items-center justify-center gap-2.5 md:gap-3">
          <HeaderEmblem className="size-7 shrink-0 text-white md:size-8" />
          <div className="min-w-0 text-center sm:text-left">
            <h1 className="font-latin text-[12px] font-light leading-none tracking-[0.38em] text-white md:text-[14px]">
              BOSO CAMP FINDER
            </h1>
            <p className="mt-1 truncate text-[10px] font-light tracking-[0.16em] text-white/75 md:text-[11px]">
              房総のこだわりキャンプ場が見つかるマップ検索
            </p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex max-h-[46vh] shrink-0 flex-col border-b border-stone-200 bg-white md:max-h-none md:w-80 md:border-b-0 md:border-r">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
            <section className="mb-4">
              <h2 className="mb-2 font-display text-sm font-medium tracking-[0.16em] text-stone-800">
                検索対象
              </h2>
              <div className="space-y-1.5">
                <FilterCheck
                  checked={includeCommercial}
                  onChange={() => setIncludeCommercial((value) => !value)}
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-stone-800">
                    <span className="size-2.5 rounded-full bg-[#4f6f5c]" />
                    商業キャンプ場
                  </span>
                </FilterCheck>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-amber-200 bg-[#fbf6ea] px-3 py-2 transition-colors has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-[#c47a22]"
                    checked={includePrivate}
                    onChange={() => setIncludePrivate((value) => !value)}
                  />
                  <span className="flex items-center gap-2 text-sm font-medium text-stone-800">
                    <span className="size-2.5 rounded-sm bg-[#c47a22]" />
                    個人貸し・お庭
                  </span>
                </label>
              </div>
            </section>

            <section>
              <h2 className="mb-1 font-display text-sm font-medium tracking-[0.16em] text-stone-800">
                条件で絞り込む
              </h2>
              <p className="mb-3 text-xs leading-relaxed text-stone-500">
                チェックした条件をすべて満たすキャンプ場だけが表示されます。
              </p>

              <div className="space-y-2">
                {TAG_GROUPS.map((group, index) => (
                  <details
                    key={group.id}
                    className="filter-accordion rounded-lg border border-stone-200 bg-[#f6f7f5]"
                    open={index === 0}
                  >
                    <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-stone-800">
                      {group.title}
                    </summary>
                    <ul className="space-y-1.5 border-t border-stone-200 px-2 py-2">
                      {group.tags.map((tag) => (
                        <li key={tag}>
                          <FilterCheck
                            checked={selectedTags.includes(tag)}
                            onChange={() => toggleTag(tag)}
                          >
                            <span className="text-sm text-stone-800">{tag}</span>
                          </FilterCheck>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <p className="shrink-0 border-t border-stone-200 px-4 py-3 text-sm text-stone-500 md:px-5">
            表示中{" "}
            <span className="font-semibold text-[#4f6f5c]">
              {visibleCamps.length}
            </span>{" "}
            / {camps.length} 件
          </p>
        </aside>

        <section className="relative min-h-[52vh] flex-1 md:min-h-0">
          <CampMap
            key={positionsKey}
            camps={visibleCamps}
            allCamps={camps}
          />
        </section>
      </div>
    </div>
  );
}
