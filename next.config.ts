import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Draait alleen lokaal; geen telemetrie-pagina's of externe beelden nodig.
  poweredByHeader: false,
};

export default nextConfig;
