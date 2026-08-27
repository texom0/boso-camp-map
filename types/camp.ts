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
  imageUrl: string;
  catchCopy: string;
  tags: string[];
  notes: CampNotes;
};

export function isPrivateCamp(camp: Pick<Campground, "type">) {
  return camp.type === "private";
}
