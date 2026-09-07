export type CampType = "private" | "commercial";

export type CampNotes = {
  pet?: string;
  fire?: string;
  sauna?: string;
  facility?: string;
  price?: string;
};

export type Campground = {
  id: string;
  name: string;
  type: CampType;
  area: string;
  lat: number;
  lng: number;
  hpUrl: string;
  reservationUrl?: string;
  catchCopy: string;
  tags: string[];
  notes: CampNotes;
};

export function isPrivateCamp(camp: Pick<Campground, "type">) {
  return camp.type === "private";
}

/** 庭キャンプ eneca のみポップアップ写真を出す（部分一致はしない） */
export function isEnecaCamp(camp: Pick<Campground, "id" | "name">) {
  const id = camp.id.trim().toLowerCase();
  const name = camp.name.trim();
  return (
    id === "eneca" ||
    name === "庭キャンプ eneca" ||
    name === "保護猫スペース eneca"
  );
}
