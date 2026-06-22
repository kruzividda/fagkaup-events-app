// iOS splash-skjáir (apple-touch-startup-image). Next.js hífir <link> upp í <head>.
const SPLASH: [number, number, number, string][] = [
  [375, 667, 2, "splash-750x1334.png"],
  [375, 812, 3, "splash-1125x2436.png"],
  [414, 896, 2, "splash-828x1792.png"],
  [414, 896, 3, "splash-1242x2688.png"],
  [390, 844, 3, "splash-1170x2532.png"],
  [428, 926, 3, "splash-1284x2778.png"],
  [393, 852, 3, "splash-1179x2556.png"],
  [430, 932, 3, "splash-1290x2796.png"],
];

export function AppleSplash() {
  return (
    <>
      {SPLASH.map(([w, h, r, file]) => (
        <link
          key={file}
          rel="apple-touch-startup-image"
          media={`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`}
          href={`/splash/${file}`}
        />
      ))}
    </>
  );
}
