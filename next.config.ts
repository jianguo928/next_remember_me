import type { NextConfig } from "next";
import { execSync } from "node:child_process";

function readGitCommitTime(): string {
  try {
    return execSync("git log -1 --format=%ci", { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_LAST_COMMIT_TIME: readGitCommitTime(),
  },
};

export default nextConfig;
