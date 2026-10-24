// Fully static export: deployable to Cloudflare Pages or GitHub Pages.
// Set NEXT_PUBLIC_BASE_PATH (e.g. "/ajocircle") when hosting under a sub-path such as GitHub Pages.
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  webpack: (config) => {
    // wagmi/walletconnect optional deps that are not used in the browser bundle
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};
export default nextConfig;
