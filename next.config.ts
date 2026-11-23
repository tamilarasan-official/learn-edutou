import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * "/" is the registration landing page (src/app/page.tsx).
   * The full Framer site copied from ../edutou-2026 is kept untouched at
   * public/site.html and is reachable at /site.html.
   */
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
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
