# Certificate Generator

This is a web-based application that allows you to automatically generate personalized certificates in bulk. You can upload student data from an Excel file, customize the certificate design, and even email the generated certificates directly to the recipients. This tool is perfect for educators, event organizers, and anyone who needs to create and distribute a large number of certificates efficiently.

---

## Features

* **Certificate Generation**: Create hundreds of certificates in minutes by uploading an XLSX or XLS file with student data.
* **Customizable Design**:
    * Upload a custom background image for your certificates.
    * Adjust the text content, font size, font family, color, and alignment.
    * Apply bold and italic styling to the text.
    * Use placeholders like `{Name}` and `{Course}` to personalize each certificate.
* **Live Preview**: See your design changes in real-time on a canvas element.
* **Interactive Editing**: Drag and resize the text box directly on the certificate preview to get the perfect placement.
* **Overflow Detection**: The application automatically detects if the text overflows the designated area and provides a list of affected certificates so you can easily fix them.
* **Email Integration**:
    * Optionally send the generated PDF certificates as email attachments.
    * Customize the email subject and body with personalized placeholders.
* **Batch Processing**: The application processes certificates in batches to handle large datasets efficiently.
* **Download as ZIP**: All generated certificates can be downloaded as a single ZIP file for easy storage and distribution.
* **Responsive Design**: The interface is designed to work on both desktop and mobile devices.

---

## Technologies Used

### Backend

* **Node.js**: A JavaScript runtime environment for executing server-side code.
* **Express**: A minimal and flexible Node.js web application framework.
* **PDFKit**: A PDF generation library for Node.js.
* **JSZip**: A library for creating, reading, and editing .zip files.
* **Nodemailer**: A module for Node.js applications to allow easy email sending.
* **Multer**: A node.js middleware for handling `multipart/form-data`, which is primarily used for uploading files.
* **Dotenv**: A zero-dependency module that loads environment variables from a `.env` file into `process.env`.
* **CORS**: A node.js package for providing a Connect/Express middleware that can be used to enable CORS with various options.

### Frontend

* **HTML5**: The standard markup language for creating web pages.
* **CSS3**: A stylesheet language used for describing the presentation of a document written in a markup language like HTML.
* **JavaScript (ES6+)**: A programming language that conforms to the ECMAScript specification.
* **XLSX**: A library for reading and writing Excel spreadsheets.

---

## Getting Started

To get a local copy up and running follow these simple steps.

### Prerequisites

You need to have Node.js and npm (Node Package Manager) installed on your machine.

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/Surya-Kaliappan/certificate-generator
    ```
2.  Install NPM packages
    ```sh
    npm install
    ```
3.  Create a `.env` file in the root directory and add your email credentials:
    ```
    EMAIL=your-email@gmail.com
    PASS=your-app-specific-password
    ```
    **Note**: You'll need to generate an app-specific password for your Gmail account if you have 2-factor authentication enabled.

### Running the Application

Start the server with the following command:

```sh
npm start
```

The application will be running at http://localhost:3000.

---

## Usage

1. **Upload Student Data:**
    * Click on "Upload Student Data (XLSX)" to upload your Excel file. The file must contain `Name` and `Email` columns.
2. **Upload Background Image:** 
    * Click on "Upload Background Image" to upload a background for your certificate.
3. **Customize Design:**
    * In the "Certificate Paragraph" field, enter the certificate text. Use placeholders like `{ColumnName}` to insert data from your Excel file (e.g., `{Name}`, `{Course}`).
    * Use the controls under "Certificate Design" to adjust alignment, font size, family, and color.
    * On the canvas, click and drag the text box to reposition it. Use the corner handles to resize it.
4. **Configure Email (Optional):**
    * Enable the "Send emails with certificates" checkbox.
    * Customize the email's subject and body, using placeholders for personalization.
5. **Generate Certificates:**
    * Click the Execute button. The application will verify the layout for all certificates and flag any with text overflow issues in the "Overflow Certificates" list.
    * Select any overflowing certificates from the list and adjust their settings until the issue is resolved.
    * Once all overflows are fixed, the Generate button will become active. Click it to begin processing.
6. **Download & Send:**
    * The application will generate the certificates in batches, and a ZIP file for each batch will be downloaded automatically.
    * If emailing is enabled, the certificates will be sent to the corresponding recipients in the background.

---

## File Structure


```
certificate-generator/
├── fonts/
│   ├── normal/
│   │   ├── ... (font files)
│   ├── ... (font style files)
├── public/
│   ├── index.html
│   ├── script.js
│   └── style.css
├── uploads/
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── server.js
```

* `server.js`: The main backend file that handles API requests, PDF generation, and email sending.
* `package.json`: Contains metadata about the project and its dependencies.
* `public/`: Contains the frontend files.
* `index.html`: The main HTML file for the application.
* `script.js`: The JavaScript file that handles the frontend logic.
* `style.css`: The CSS file for styling the application.
* `fonts/`: Contains the font files used in the application.
* `uploads/`: A temporary directory for storing uploaded background images.
* `.env`: A file for storing environment variables (not included in the repository).

--- 

## Future Improvements

* **More Template Options:** Add a variety of pre-designed certificate templates to choose from.
* **Save and Load Projects:** Allow users to save their certificate designs and data so they can come back and edit them later.
* **Support for More File Formats:** Add support for other spreadsheet formats like CSV.
* **Advanced Text Editing:** Add more text editing options like line spacing, character spacing, and different font weights.
* **Real-time Collaboration:** Allow multiple users to collaborate on a certificate design in real-time.
* **Analytics:** Track the number of certificates generated and emails sent.
