import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server actions default to a 1 MB body. The edit-profile action
    // submits the avatar twice on one save — the downscaled display copy
    // plus the untouched original archive, each bounded to 2 MB in the
    // action itself — so the limit must fit both plus the form fields,
    // while staying under Vercel's 4.5 MB platform request cap.
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
