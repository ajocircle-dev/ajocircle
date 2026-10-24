/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // wagmi/walletconnect optional deps that are not used in the browser bundle
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};
export default nextConfig;
