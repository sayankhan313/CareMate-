import fs from "fs";
import path from "path";
import sharp from "sharp";

const RAW_DIR = path.join(
  process.cwd(),
  "uploads",
  "medicine-references",
  "raw"
);

const OUTPUT_DIR = path.join(
  process.cwd(),
  "uploads",
  "medicine-references"
);

const TARGET_SIZE = 800;

const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp"];

const resizeImages = async () => {
  if (!fs.existsSync(RAW_DIR)) {
    throw new Error(`Raw image folder not found: ${RAW_DIR}`);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = fs
    .readdirSync(RAW_DIR)
    .filter((file) =>
      allowedExtensions.includes(path.extname(file).toLowerCase())
    );

  if (files.length === 0) {
    console.log("No images found in raw folder.");
    return;
  }

  for (const file of files) {
    const inputPath = path.join(RAW_DIR, file);
    const outputName = `${path.parse(file).name}.png`;
    const outputPath = path.join(OUTPUT_DIR, outputName);

    await sharp(inputPath)
      .rotate()
      .resize(TARGET_SIZE, TARGET_SIZE, {
        fit: "contain",
        background: {
          r: 255,
          g: 255,
          b: 255,
          alpha: 1,
        },
      })
      .png({
        quality: 90,
        compressionLevel: 8,
      })
      .toFile(outputPath);

    console.log(`Processed: ${file} -> ${outputName}`);
  }

  console.log("Medicine reference images resized successfully.");
};

resizeImages().catch((error) => {
  console.error("Image resize failed:", error);
  process.exit(1);
});