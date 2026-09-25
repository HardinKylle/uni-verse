import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The new fragment-ref scroll handler in 16.3.0-preview.6 calls
    // `scrollIntoView` on an instance that lacks it in Firefox production
    // builds ("g(...).scrollIntoView is not a function" on navigation).
    // Revisit when upgrading off the preview.
    appNewScrollHandler: false,
  },
};

export default nextConfig;
