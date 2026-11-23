import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * "/" is the registration landing page (src/app/page.tsx).
   * The full Framer site copied from ../edutou-2026 is kept untouched at
   * public/site.html and is reachable at /site.html.
   */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
