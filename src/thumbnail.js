const sharp = require('sharp');

async function generateThumbnail(inputBuffer) {
  return sharp(inputBuffer)
    .resize(300, 300, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toBuffer();
}

module.exports = { generateThumbnail };
