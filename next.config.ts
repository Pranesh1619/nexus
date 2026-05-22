import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost:3000",
    "*.ngrok-free.app",
    "*.ngrok.io",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "*.ngrok-free.app",
        "*.ngrok.io",
      ],
    },
  },
};

export default nextConfig;
