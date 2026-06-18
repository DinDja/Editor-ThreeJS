const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

function extractEmbeddedPng(svgPath) {
  const svg = fs.readFileSync(svgPath, 'utf-8');
  const match = svg.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
  if (!match) throw new Error('No embedded PNG found in SVG');
  return Buffer.from(match[1], 'base64');
}

async function main() {
  const embeddedPng = extractEmbeddedPng(path.join(__dirname, '..', 'public', 'Icon.svg'));
  const pngPath = path.join(__dirname, '..', 'public', 'icon.png');
  const icoPath = path.join(__dirname, '..', 'public', 'icon.ico');

  // Generate 256x256 PNG from embedded image
  const pngBuffer = await sharp(embeddedPng).resize(256, 256).png().toBuffer();
  fs.writeFileSync(pngPath, pngBuffer);
  console.log('Generated icon.png (' + pngBuffer.length + ' bytes)');

  // Generate 32x32 PNG for favicon
  const faviconPng = await sharp(embeddedPng).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.png'), faviconPng);
  console.log('Generated favicon.png (' + faviconPng.length + ' bytes)');

  // Generate .ico from multiple sizes
  const sizes = [16, 32, 48, 64, 128, 256];
  const pngBuffers = await Promise.all(
    sizes.map(s => sharp(embeddedPng).resize(s, s).png().toBuffer())
  );
  const icoBuffer = await toIco(pngBuffers);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('Generated icon.ico (' + icoBuffer.length + ' bytes)');
}

main().catch(console.error);
