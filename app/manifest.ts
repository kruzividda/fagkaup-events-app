import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fagkaup Events",
    short_name: "Fagkaup",
    description: "Viðburðakerfi Fagkaupa",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B121C",
    theme_color: "#0B121C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Innritun (dyr)", short_name: "Dyr", url: "/door" },
      { name: "Bar", short_name: "Bar", url: "/bar" },
    ],
  };
}
