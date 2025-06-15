// utils/pdfImageExtract.js
// const pdfPoppler = require('pdf-poppler');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function extractImagesFromPdf(pdfPath) {
  // Temporarily disabled due to Linux compatibility issues with pdf-poppler
  throw new Error('PDF image extraction is temporarily disabled on Linux systems');
  
  /* const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfimg-'));
  try {
    const options = {
      format: 'png',
      out_dir: outputDir,
      out_prefix: 'page',
      page: null
    };
    // Use the library correctly!
    await pdfPoppler.convert(pdfPath, options);

    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.png'))
      .map(f => path.join(outputDir, f))
      .sort((a, b) => {
        const aNum = Number((a.match(/page-(\d+)\.png$/) || [])[1] || 0);
        const bNum = Number((b.match(/page-(\d+)\.png$/) || [])[1] || 0);
        return aNum - bNum;
      });
    return files;
  } catch (e) {
    throw new Error(`PDF to image extraction failed: ${e.message}`);
  } */
}

module.exports = { extractImagesFromPdf };