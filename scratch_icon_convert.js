const fs = require('fs');
const pngToIco = require('png-to-ico').default;

const inputPath = 'assets/icon.png';
const outputPath = 'assets/icon.ico';

async function convert() {
  try {
    const buf = await pngToIco(inputPath);
    fs.writeFileSync(outputPath, buf);
    console.log(`Successfully created: ${outputPath}`);
  } catch (err) {
    console.error('Error during conversion:', err);
  }
}

convert();
