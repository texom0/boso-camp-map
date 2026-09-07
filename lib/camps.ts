import { type Campground, type CampNotes } from "@/types/camp";

function toAbsoluteHttpUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "#") return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return "";
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

/** スプレッドシート語彙を既存フィルタータグへ寄せる */
const FILTER_TAG_MAP: Record<string, string> = {
  オートサイト: "オートキャンプ",
  オートキャンプ: "オートキャンプ",
  ファミリー: "ファミリー向け",
  ファミリー向け: "ファミリー向け",
  ソロ: "ソロ向け",
  ソロ向け: "ソロ向け",
  ペット連れ: "ペットOK",
  ペットOK: "ペットOK",
  デイキャンプ: "日帰りOK",
  日帰りOK: "日帰りOK",
  川沿い: "川のそば",
  川のそば: "川のそば",
  川遊び: "川遊び・釣り",
  釣り: "川遊び・釣り",
  "川遊び・釣り": "川遊び・釣り",
  林間: "竹林・林間",
  森林: "竹林・林間",
  松林: "竹林・林間",
  "竹林・林間": "竹林・林間",
  高台: "高台・絶景",
  "高台・絶景": "高台・絶景",
  景色が良い: "高台・絶景",
  海辺: "海が見える",
  海沿い: "海が見える",
  "ディープシー view": "海が見える",
  夕日が見える: "海が見える",
  海が見える: "海が見える",
  湖畔: "川のそば",
  水洗トイレ: "水洗トイレ",
  "お風呂・シャワー": "お風呂・温泉あり",
  "お風呂・温泉あり": "お風呂・温泉あり",
  シャワー: "お風呂・温泉あり",
  ゴミ捨て場あり: "ゴミ捨て場あり",
  AC電源あり: "AC電源あり",
};

function tagsFromMaster(raw: Record<string, unknown>): string[] {
  const collected = [
    ...stringList(raw.tags),
    ...stringList(raw.siteType),
    ...stringList(raw.useType),
    ...stringList(raw.location),
    ...stringList(raw.facilities),
    ...stringList(raw.experiences),
  ];

  const petNote = String(raw.petNote ?? "");
  if (petNote && !petNote.includes("不可") && /ペット\s*(可|OK|同伴)/.test(petNote)) {
    collected.push("ペットOK");
  }

  const fireNote = String(raw.bonfireNote ?? "");
  if (/直火OK|直火可/.test(fireNote) && !/直火禁止|直火不可|直火厳禁/.test(fireNote)) {
    collected.push("直火OK");
  }

  const mapped = new Set<string>();
  for (const item of collected) {
    const tag = FILTER_TAG_MAP[item] ?? FILTER_TAG_MAP[item.replace(/\s+/g, "")];
    if (tag) mapped.add(tag);
  }
  return [...mapped];
}

function notesFromMaster(raw: Record<string, unknown>): CampNotes {
  if (raw.notes && typeof raw.notes === "object") {
    return raw.notes as CampNotes;
  }

  const notes: CampNotes = {};
  const pet = String(raw.petNote ?? "").trim();
  const fire = String(raw.bonfireNote ?? "").trim();
  const facility = String(raw.facilityNote ?? "").trim();
  if (pet) notes.pet = pet;
  if (fire) notes.fire = fire;
  if (facility) notes.facility = facility;
  return notes;
}

export function normalizeCamps(data: unknown): Campground[] {
  if (!Array.isArray(data)) return [];

  return data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const lat = Number(raw.lat);
    const lng = Number(raw.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

    const hpUrl = toAbsoluteHttpUrl(raw.hpUrl ?? raw.url);
    const reservationUrl = toAbsoluteHttpUrl(raw.reservationUrl);
    const tags = tagsFromMaster(raw);

    return [
      {
        id: String(raw.id ?? `${lat},${lng}`),
        name: String(raw.name ?? "名称未設定"),
        type: raw.type === "private" ? "private" : "commercial",
        area: String(raw.area ?? ""),
        lat,
        lng,
        hpUrl,
        reservationUrl: reservationUrl || undefined,
        catchCopy: String(raw.catchCopy ?? raw.catchphrase ?? ""),
        tags,
        notes: notesFromMaster(raw),
      },
    ];
  });
}
