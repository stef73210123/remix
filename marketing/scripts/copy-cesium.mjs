import { cpSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const cesiumSource = join(root, "node_modules/cesium/Build/Cesium");
const cesiumDest = join(root, "public/cesium");

if (!existsSync(cesiumSource)) {
  console.log("Cesium source not found, skipping copy.");
  process.exit(0);
}

mkdirSync(cesiumDest, { recursive: true });

const folders = ["Workers", "Assets", "Widgets", "ThirdParty"];
for (const folder of folders) {
  const src = join(cesiumSource, folder);
  const dest = join(cesiumDest, folder);
  if (existsSync(src)) {
    cpSync(src, dest, { recursive: true });
    console.log(`Copied ${folder}`);
  }
}

console.log("Cesium static assets copied to public/cesium/");
