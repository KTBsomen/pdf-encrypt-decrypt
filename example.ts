import { encryptPDF, decryptPDF, PDFPermission } from './index';
import fs from 'fs';

// This file is for type-checking and examples only - it is not executed by tests.

const sample = fs.readFileSync('sample.pdf'); // sample.pdf exists in repo root for tests

// Example usage (type-checked)
const encrypted = encryptPDF(sample, 'userpw', 'ownerpw', [PDFPermission.PRINT, PDFPermission.COPY]);
const decrypted = decryptPDF(encrypted, 'userpw', '');

console.log('types OK', encrypted instanceof Buffer, decrypted instanceof Buffer);
