import type { NextConfig } from "next";

const isExport = process.env.NEXT_PUBLIC_EXPORT === "true";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  ...(isExport ? {
    output: "export",
    images: {
      unoptimized: true,
    },
  } : {}),
};

export default nextConfig;
