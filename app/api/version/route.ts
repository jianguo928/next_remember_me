import { execSync } from "node:child_process";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const commitTime = execSync("git log -1 --format=%ci", {
      encoding: "utf-8",
      cwd: process.cwd(),
    }).trim();
    if (commitTime) {
      return NextResponse.json({ commitTime });
    }
  } catch {
    // 无 .git 或非 git 环境
  }
  const baked = process.env.NEXT_PUBLIC_LAST_COMMIT_TIME?.trim();
  if (baked) {
    return NextResponse.json({ commitTime: baked });
  }
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (sha) {
    return NextResponse.json({ commitTime: sha.slice(0, 7) });
  }
  return NextResponse.json({ commitTime: null });
}
