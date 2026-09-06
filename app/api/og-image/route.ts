import { NextResponse } from "next/server";

type MicrolinkImage = {
  url?: string;
};

type MicrolinkResponse = {
  status?: string;
  data?: {
    image?: MicrolinkImage | MicrolinkImage[] | null;
    logo?: MicrolinkImage | null;
  };
};

function firstImageUrl(value: MicrolinkImage | MicrolinkImage[] | null | undefined) {
  if (!value) return "";
  if (Array.isArray(value)) return value.find((item) => item?.url)?.url ?? "";
  return value.url ?? "";
}

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url")?.trim() ?? "";
  if (!/^https?:\/\//i.test(target)) {
    return NextResponse.json({ imageUrl: null }, { status: 400 });
  }

  try {
    const endpoint = new URL("https://api.microlink.io/");
    endpoint.searchParams.set("url", target);

    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return NextResponse.json({ imageUrl: null }, { status: 200 });
    }

    const payload = (await response.json()) as MicrolinkResponse;
    const imageUrl =
      firstImageUrl(payload.data?.image) || firstImageUrl(payload.data?.logo) || null;

    return NextResponse.json(
      { imageUrl },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch {
    return NextResponse.json({ imageUrl: null }, { status: 200 });
  }
}
