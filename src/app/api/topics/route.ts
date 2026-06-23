import { NextResponse } from "next/server";
import { genres } from "@/core/utils";

export async function GET() {
  return NextResponse.json(genres);
}
