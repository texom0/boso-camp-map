import { type Campground, type CampNotes, type CampType } from "@/types/camp";

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

/** 千葉県（房総）として扱う矩形。この範囲外をエリア外とみなす */
const CHIBA_LAT_MIN = 34.8;
const CHIBA_LAT_MAX = 36.0;
const CHIBA_LNG_MIN = 139.7;
const CHIBA_LNG_MAX = 140.9;

/**
 * 房総・千葉の陸域をやや海側に膨らませた簡易ポリゴン [lat, lng]。
 * 海岸のキャンプ場は内側、東京湾・太平洋の沖は外側になる。
 */
const CHIBA_LAND_RING: readonly [number, number][] = [
  [35.92, 139.85],
  [35.92, 140.55],
  [35.85, 140.86],
  [35.7, 140.88],
  [35.55, 140.52],
  [35.4, 140.42],
  [35.25, 140.42],
  [35.12, 140.32],
  [35.0, 140.15],
  [34.88, 139.95],
  [34.88, 139.78],
  [35.0, 139.76],
  [35.15, 139.78],
  [35.28, 139.76],
  [35.38, 139.85],
  [35.48, 139.88],
  [35.58, 140.0],
  [35.7, 139.92],
  [35.85, 139.85],
];

function isInsideChibaBounds(lat: number, lng: number) {
  return (
    lat >= CHIBA_LAT_MIN &&
    lat <= CHIBA_LAT_MAX &&
    lng >= CHIBA_LNG_MIN &&
    lng <= CHIBA_LNG_MAX
  );
}

/** レイキャスティング（lng=x, lat=y） */
function isInsideLandRing(lat: number, lng: number) {
  let inside = false;
  const ring = CHIBA_LAND_RING;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i];
    const [latJ, lngJ] = ring[j];
    const crosses = lngI > lng !== lngJ > lng;
    if (!crosses) continue;
    const intersectLat = ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (lat < intersectLat) inside = !inside;
  }
  return inside;
}

function isClearlyAtSea(lat: number, lng: number) {
  if (!isInsideChibaBounds(lat, lng)) return false;
  return !isInsideLandRing(lat, lng);
}

function campCoordLabel(camp: Pick<Campground, "id" | "name" | "lat" | "lng">) {
  return `${camp.name} (${camp.id}) lat=${camp.lat}, lng=${camp.lng}`;
}

/** 千葉県エリア外・明らかに海上の座標をコンソールエラーとして出す */
export function warnInvalidCampCoordinates(camps: Campground[]) {
  for (const camp of camps) {
    if (!isInsideChibaBounds(camp.lat, camp.lng)) {
      console.error(
        `[camp-coords] 千葉県エリア外です（lat 34.8〜36.0 / lng 139.7〜140.9 の範囲外）: ${campCoordLabel(camp)}`,
      );
    }
    if (isClearlyAtSea(camp.lat, camp.lng)) {
      console.error(`[camp-coords] 明らかに海上に位置しています: ${campCoordLabel(camp)}`);
    }
  }
}

export function normalizeCamps(data: unknown): Campground[] {
  if (!Array.isArray(data)) return [];

  const camps = data.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    const lat = Number(raw.lat);
    const lng = Number(raw.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.error(
        `[camp-coords] 座標が不正です: ${String(raw.name ?? "名称未設定")} (${String(raw.id ?? "?")}) lat=${String(raw.lat)}, lng=${String(raw.lng)}`,
      );
      return [];
    }

    const hpUrl = toAbsoluteHttpUrl(raw.hpUrl ?? raw.url);
    const reservationUrl = toAbsoluteHttpUrl(raw.reservationUrl);
    const tags = tagsFromMaster(raw);
    const type: CampType = raw.type === "private" ? "private" : "commercial";

    return [
      {
        id: String(raw.id ?? `${lat},${lng}`),
        name: String(raw.name ?? "名称未設定"),
        type,
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

  warnInvalidCampCoordinates(camps);
  return camps;
}
