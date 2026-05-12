import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = join(__dirname, '../../uploads/letters');
await fs.mkdir(uploadsDir, { recursive: true }).catch((err) => {
  console.warn('Failed to create uploads directory:', err.message);
});

export async function generateLetterPDF(htmlContent, letterMetadata) {
  try {
    // Extract text from HTML more carefully
    let textContent = htmlContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#\d+;/g, ' ')
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();

    // Limit text length for PDF
    if (textContent.length > 5000) {
      textContent = textContent.substring(0, 5000) + '...';
    }

    // Generate filename
    const timestamp = Date.now();
    const donorName = (letterMetadata.donorName || 'unknown')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .substring(0, 20); // Limit filename length
    const filename = `letter-${donorName}-${timestamp}.pdf`;
    const filepath = join(uploadsDir, filename);

    // Create PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: 'A4',
      bufferPages: true,
    });

    const stream = createWriteStream(filepath);

    return new Promise((resolve, reject) => {
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        reject(err);
      });

      doc.on('error', (err) => {
        console.error('PDF error:', err);
        reject(err);
      });

      doc.pipe(stream);

      try {
        // Add header
        doc.fontSize(18).font('Helvetica-Bold').text('Sombhabona', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('756 West Sewrapara, Mirpur, Dhaka', { align: 'center' });
        doc.fontSize(10).text('Phone: 01737243447 | Email: info@sombhabona.org', { align: 'center' });
        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);

        // Add date
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        doc.fontSize(10).text(`Date: ${today}`, { align: 'right' });
        doc.moveDown(1);

        // Add recipient
        doc.fontSize(10).text('To,');
        doc.fontSize(12).font('Helvetica-Bold').text(letterMetadata.donorName || 'Dear Donor');
        doc.moveDown(0.5);

        // Add subject
        doc.fontSize(11).font('Helvetica-Bold').text('Subject: Acknowledgment of Donation', { align: 'center' });
        doc.moveDown(1);

        // Add body text
        doc.fontSize(10).font('Helvetica');
        doc.text(textContent, {
          align: 'left',
          lineGap: 4,
          width: 495,
          ellipsis: true,
        });

        doc.moveDown(2);

        // Add signature section
        doc.fontSize(10).text('Yours sincerely,', { align: 'left' });
        doc.moveDown(3);
        doc.fontSize(11).font('Helvetica-Bold').text('(Saad Ibn Maruf)', { align: 'left' });
        doc.fontSize(10).font('Helvetica').text('Account and Admin', { align: 'left' });
        doc.text('Sombhabona', { align: 'left' });

        // Add metadata in footer
        doc.moveDown(2);
        doc.fontSize(8).fillColor('gray');
        doc.text(`Generated: ${new Date().toISOString()}`, {
          align: 'center',
        });

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          resolve({
            filename,
            filepath,
            url: `/api/v1/letters/pdf/${filename}`,
          });
        });
      } catch (error) {
        console.error('Error writing PDF:', error);
        doc.end();
        reject(error);
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
}

export async function getLetterPDFPath(filename) {
  try {
    const filepath = join(uploadsDir, filename);
    // Security check: ensure the file is within the uploads directory
    if (!filepath.startsWith(uploadsDir)) {
      throw new Error('Invalid file path');
    }

    // Check if file exists
    await fs.access(filepath);
    return filepath;
  } catch (error) {
    console.error('Error getting PDF path:', error);
    throw error;
  }
}

export function getUploadsDir() {
  return uploadsDir;
}
