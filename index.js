// ============================================
// index.js - Using Koffi
// ============================================
const koffi = require('koffi');
const path = require('path');

const PDFPermission = {
    PRINT: "print",
    COPY: "copy",
    ANNOTATE: "annotate",
    MODIFY: "modify",
    FORMS: "forms",
    ASSEMBLE: "assemble",
    ALL: "all",
    DEFAULT: "default"
};

function getLibraryPath() {
    const platform = process.platform;
    const arch = process.arch;

    let libName;
    if (platform === 'linux' && arch === 'x64') {
        libName = 'pdfencrypt_linux.so';
    } else if (platform === 'darwin') {
        libName = arch === 'arm64' ? 'pdfencrypt_darwin_arm64.dylib' : 'pdfencrypt_darwin_x64.dylib';
    } else if (platform === 'win32' && arch === 'x64') {
        libName = 'pdfencrypt_win_x64.dll';
    } else {
        throw new Error(`Unsupported platform/architecture: ${platform}/${arch}`);
    }

    return path.resolve(__dirname, 'lib', libName);
}

// Load the library
const libraryPath = getLibraryPath();
const lib = koffi.load(libraryPath);

// Define the function signatures
// char* EncryptPDF(unsigned char* pdfBufferPtr, int pdfBufferSize, char* userPw, char* ownerPw, char* permissions)
const EncryptPDF = lib.func('char *EncryptPDF(unsigned char *pdfBufferPtr, int pdfBufferSize, char *userPw, char *ownerPw, char *permissions)');

// char* DecryptPDF(unsigned char* pdfBufferPtr, int pdfBufferSize, char* password, char* ownerPw)
const DecryptPDF = lib.func('char *DecryptPDF(unsigned char *pdfBufferPtr, int pdfBufferSize, char *password, char *ownerPw)');

/**
 * Encrypts a PDF buffer using the Go shared library via Koffi.
 * @param {Buffer} pdfBuffer The PDF content as a Node.js Buffer.
 * @param {string} userPassword Password for opening/viewing the document.
 * @param {string} [ownerPassword=userPassword] Master password for modifying security settings.
 * @param {Array<string>} [permissions=[PDFPermission.DEFAULT]] Array of permission keys.
 * @returns {Buffer} The encrypted PDF as a Node.js Buffer.
 * @throws {Error} If the encryption fails.
 */
function encryptPDF(pdfBuffer, userPassword, ownerPassword = userPassword, permissions = [PDFPermission.DEFAULT]) {
    const permissionsJSON = JSON.stringify(permissions);

    console.log('PDF buffer size:', pdfBuffer.length);
    console.log('Permissions:', permissionsJSON);

    try {
        // Call the Go function
        // Koffi automatically handles Buffer -> unsigned char* conversion
        const encodedOutput = EncryptPDF(
            pdfBuffer,
            pdfBuffer.length,
            userPassword,
            ownerPassword,
            permissionsJSON
        );

        if (!encodedOutput) {
            throw new Error('Encryption returned null');
        }

        // Check if the output is an error message
        if (encodedOutput.startsWith("Error")) {
            throw new Error(encodedOutput);
        }

        // Convert base64 string back to Buffer
        const encryptedBuffer = Buffer.from(encodedOutput, 'base64');

        console.log('✅ Encryption successful');
        console.log('📦 Output buffer length:', encryptedBuffer.length);

        return encryptedBuffer;

    } catch (err) {
        console.error('❌ Encryption failed:', err);
        throw err;
    }
}

/**
 * Decrypts a PDF buffer using the Go shared library via Koffi.
 * @param {Buffer} pdfBuffer The encrypted PDF content as a Node.js Buffer.
 * @param {string} password The password to decrypt the PDF (can be user or owner password).
 * @param {string} [ownerPassword=''] Optional owner password if different from user password.
 * @returns {Buffer} The decrypted PDF as a Node.js Buffer.
 * @throws {Error} If the decryption fails.
 */
function decryptPDF(pdfBuffer, password, ownerPassword = '') {
    console.log('PDF buffer size:', pdfBuffer.length);
    console.log('Attempting decryption...');

    try {
        // Call the Go function
        const encodedOutput = DecryptPDF(
            pdfBuffer,
            pdfBuffer.length,
            password,
            ownerPassword
        );

        if (!encodedOutput) {
            throw new Error('Decryption returned null');
        }

        // Check if the output is an error message
        if (encodedOutput.startsWith("Error")) {
            throw new Error(encodedOutput);
        }

        // Convert base64 string back to Buffer
        const decryptedBuffer = Buffer.from(encodedOutput, 'base64');

        console.log('✅ Decryption successful');
        console.log('📦 Output buffer length:', decryptedBuffer.length);

        return decryptedBuffer;

    } catch (err) {
        console.error('❌ Decryption failed:', err);
        throw err;
    }
}

module.exports = {
    encryptPDF,
    decryptPDF,
    PDFPermission
};


// ============================================
// package.json - Update your dependencies
// ============================================
/*
{
  "name": "encrypt_pdf",
  "version": "1.0.0",
  "description": "PDF encryption using Go shared library",
  "main": "index.js",
  "scripts": {
    "test": "node test.js"
  },
  "dependencies": {
    "koffi": "^2.9.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
*/


// ============================================
// Installation Instructions
// ============================================
/*

1. First, remove the old ffi-rs package:
   npm uninstall ffi-rs

2. Install koffi:
   npm install koffi

3. Make sure your Go DLL is built correctly:
   cd src
   go build -buildmode=c-shared -o ../lib/pdfencrypt_win_x64.dll main.go
   cd ..

4. Run the test:
   node test.js

*/