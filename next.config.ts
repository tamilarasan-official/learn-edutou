import type { NextConfig } from "next";

/**
 * admin.edutou.in: the content admin for edutou.in.
 * A client-side dashboard that talks to the Edutou API (NEXT_PUBLIC_API_URL).
 */
const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
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
