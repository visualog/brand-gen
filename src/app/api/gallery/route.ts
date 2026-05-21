import { NextResponse } from "next/server";
import { readGalleryStore, writeGalleryStore } from "@/lib/gallery-store";

export async function GET() {
  try {
    const data = await readGalleryStore();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Gallery read error:", error);
    const message = error instanceof Error ? error.message : "갤러리 데이터를 읽지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const data = await writeGalleryStore(payload);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Gallery write error:", error);
    const message = error instanceof Error ? error.message : "갤러리 데이터를 저장하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
