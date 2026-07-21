import PDFDocument from 'pdfkit';

export async function generateLetterPDF(htmlContent, letterMetadata) {
  let textContent = htmlContent
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (textContent.length > 5000) {
    textContent = textContent.substring(0, 5000) + '...';
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      doc.fontSize(18).font('Helvetica-Bold').text('Sombhabona', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('756 West Sewrapara, Mirpur, Dhaka', { align: 'center' });
      doc.fontSize(10).text('Phone: 01737243447 | Email: info@sombhabona.org', { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.fontSize(10).text(`Date: ${today}`, { align: 'right' });
      doc.moveDown(1);

      doc.fontSize(10).text('To,');
      doc.fontSize(12).font('Helvetica-Bold').text(letterMetadata.donorName || 'Dear Donor');
      doc.moveDown(0.5);

      doc.fontSize(11).font('Helvetica-Bold').text('Subject: Acknowledgment of Donation', { align: 'center' });
      doc.moveDown(1);

      doc.fontSize(10).font('Helvetica');
      doc.text(textContent, { align: 'left', lineGap: 4, width: 495 });

      doc.moveDown(2);
      doc.fontSize(10).text('Yours sincerely,', { align: 'left' });
      doc.moveDown(3);
      doc.fontSize(11).font('Helvetica-Bold').text('(Saad Ibn Maruf)', { align: 'left' });
      doc.fontSize(10).font('Helvetica').text('Account and Admin', { align: 'left' });
      doc.text('Sombhabona', { align: 'left' });

      doc.moveDown(2);
      doc.fontSize(8).fillColor('gray');
      doc.text(`Generated: ${new Date().toISOString()}`, { align: 'center' });

      doc.end();
    } catch (error) {
      doc.end();
      reject(error);
    }
  });
}
