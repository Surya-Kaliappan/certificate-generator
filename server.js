const express = require('express');
const PDFDocument = require('pdfkit');
const JSZip = require('jszip');
const nodemailer = require('nodemailer');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
app.use(express.json({ limit: '100mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: 'uploads/' });

let backgroundImagePath = null;
const emailStatus = new Map();

// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL, // Replace with email
    pass: process.env.PASS // Replace with app-specific password
  }
});

// Helper function to collect PDF buffer
async function collectBuffer(doc) {
  return new Promise((resolve) => {
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}

// Helper function to replace placeholders
function replacePlaceholders(text, student) {
  let result = text;
  Object.keys(student).forEach(key => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), student[key] || '');
  });
  return result;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to list available fonts
app.get('/fonts', async (req, res) => {
  try {
    const fontsDir = path.join(__dirname, 'fonts','normal');
    const files = await fs.readdir(fontsDir);
    const fonts = files.filter(f => f.endsWith('.ttf')).map(f => f.replace('.ttf', ''));
    res.json(fonts);
  } catch (err) {
    console.error('Error reading fonts:', err);
    res.status(500).send('Error reading fonts');
  }
});

app.get('/font/:fontName', (req, res) => {
  const fontName = req.params.fontName;
  const fontPath = path.join(__dirname, 'fonts', 'normal', `${fontName}.ttf`);
  res.sendFile(fontPath, { headers: { 'Content-Type': 'font/ttf' } }, (err) => {
    if (err) res.status(404).send('Font not found');
  });
});

// Handle background image upload
app.post('/upload-background', upload.single('background'), async (req, res) => {
  try {
    if (req.file) {
      backgroundImagePath = req.file.path;
      res.json({ imageId: req.file.filename });
    } else {
      res.status(400).send('No file uploaded');
    }
  } catch (err) {
    console.error('Error uploading background:', err);
    res.status(500).send('Error uploading background');
  }
});

// Delete background image
app.post('/delete-background', express.json(), async (req, res) => {
  const { imageId } = req.body;
  console.log(imageId);
  if (!imageId) {
    return res.status(400).json({ error: 'Image ID required' });
  }
  const filePath = path.join(__dirname, 'uploads', imageId);
  try {
    await fs.unlink(filePath);
    res.json({ message: 'Image deleted' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'Image not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete image' });
    }
  }
});

// Generate PDFs and send emails
app.post('/generate-pdfs', async (req, res) => {
  try {
    const { batchId, sendEmails, paragraph, emailSubject, emailBody, canvas, students } = req.body;
    emailStatus.set(batchId, { status: 'pending', emailCount: 0, total: students.length });
    const zip = new JSZip();
    let pdfCount = 0;

    // Phase 1: Generate all PDFs and create ZIP
    for (const student of students) {
      const doc = new PDFDocument({
        size: [canvas.width, canvas.height]
      });

      if (backgroundImagePath) {
        doc.image(backgroundImagePath, 0, 0, { width: canvas.width, height: canvas.height });
      }

      const settings = student.settings;
      const text = replacePlaceholders(paragraph, student.data);
      const fontPath = path.join(__dirname, 'fonts','normal', `${settings.fontFamily}.ttf`);
      console.log(fontPath);
      let fontFile = settings.fontFamily;

      try {
        await fs.access(fontPath);
      } catch {
        console.warn(`Font ${settings.fontFamily} not found, falling back to Times New Roman`);
        fontFile = 'Times New Roman';
      }

      const weight = settings.bold ? '-Bold' : '';
      const style = settings.italic ? '-Italic' : '';
      let fontVariant = path.join(__dirname, 'fonts','normal',`${fontFile}.ttf`);
      if(weight!='' && style!=''){
        fontVariant = path.join(__dirname, 'fonts', `${fontFile}${weight}${style}.ttf`);
      }

      try {
        await fs.access(fontVariant);
        doc.font(fontVariant);
      } catch {
        try {
          await fs.access(fontPath);
          doc.font(fontPath);
        } catch {
          console.warn(`Font variant ${fontVariant} not found, using Times-Roman`);
          doc.font('Times-Roman');
        }
      }

      doc.fontSize(settings.fontSize)
         .fillColor(settings.fontColor)
         .text(text, settings.rect.x, settings.rect.y, {
           width: settings.rect.width,
           height: settings.rect.height,
           align: settings.textAlign,
           lineGap: 2
         });

      doc.end();
      const pdfBuffer = await collectBuffer(doc);
      zip.file(student.fileName, pdfBuffer);
      pdfCount++;
    }

    // Generate ZIP file
    const zipContent = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const zipBase64 = zipContent.toString('base64');

    // Phase 2: Send emails after ZIP is generated
    let emailCount = 0;
    if (sendEmails) {
      for (const student of students) {
        const subject = replacePlaceholders(emailSubject, student.data);
        const body = replacePlaceholders(emailBody, student.data);
        const pdfBuffer = await zip.file(student.fileName).async('nodebuffer');
        const mailOptions = {
          from: 'your-email@gmail.com',
          to: student.email,
          subject: subject,
          text: body,
          attachments: [
            {
              filename: student.fileName,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log(`Email sent to ${student.email} with ${student.fileName}: ${pdfBuffer.length} bytes`);
          emailCount++;
          emailStatus.set(batchId, {
            status: 'pending',
            emailCount,
            total: students.length
          });
        } catch (err) {
          console.error(`Error sending email to ${student.email}:`, err);
          emailStatus.set(batchId, { status: 'error', emailCount, total: students.length });
          break;
        }
      }
    }

    // Update final status
    emailStatus.set(batchId, {
      status: sendEmails && emailCount === students.length ? 'complete' : sendEmails ? 'pending' : 'complete',
      emailCount,
      total: students.length
    });

    res.json({ zipBlob: zipBase64, pdfCount, emailCount });
  } catch (err) {
    console.error('Error generating PDFs:', err);
    emailStatus.set(batchId, { status: 'error', emailCount: 0, total: students.length });
    res.status(500).send('Error generating PDFs');
  }
});

// Endpoint to check email status
app.get('/email-status', (req, res) => {
  const batchId = req.query.batchId;
  const status = emailStatus.get(batchId) || { status: 'error', emailCount: 0, total: 0 };
  res.json(status);
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});