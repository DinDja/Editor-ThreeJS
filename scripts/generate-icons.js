const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function main() {
  const svgPath = path.join(__dirname, '..', 'public', 'Icon.svg');
  const pngPath = path.join(__dirname, '..', 'public', 'icon.png');
  const icoPath = path.join(__dirname, '..', 'public', 'icon.ico');

  // Generate 256x256 PNG from SVG
  const pngBuffer = await sharp(svgPath).resize(256, 256).png().toBuffer();
  fs.writeFileSync(pngPath, pngBuffer);
  console.log('Generated icon.png');

  // Generate 32x32 PNG for favicon
  await sharp(svgPath).resize(32, 32).png().toFile(path.join(__dirname, '..', 'public', 'favicon.png'));
  console.log('Generated favicon.png');

  // Generate .ico from multiple size PNG buffers
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = await Promise.all(
    sizes.map(s => sharp(svgPath).resize(s, s).png().toBuffer())
  );
  const icoBuffer = await toIco(pngBuffers);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('Generated icon.ico');
}

main().catch(console.error);
