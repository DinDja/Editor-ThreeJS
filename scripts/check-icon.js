const fs = require('fs');
const svg = fs.readFileSync('public/Icon.svg', 'utf-8');
const match = svg.match(/xlink:href="data:image\/png;base64,([^"]+)"/);
const png = Buffer.from(match[1], 'base64');
console.log('Embedded PNG size:', png.length, 'bytes');
console.log('Dimensions:', png.readUInt32BE(16), 'x', png.readUInt32BE(20));
