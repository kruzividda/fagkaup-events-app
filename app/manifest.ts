import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fagkaup Events",
    short_name: "Fagkaup",
    description: "Viðburðakerfi Fagkaupa",
    start_url: "/",
    display: "standalone",
    background_color: "#0B121C",
    theme_color: "#0B121C",
    icons: [
      // TODO: bættu við /public/icon-192.png og /icon-512.png
    ],
  };
}
