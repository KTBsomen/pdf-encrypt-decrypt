/// <reference types="node" />
// Type definitions for encrypt_pdf
// Project: https://github.com/KTBsomen/encrypt_pdf
// Definitions by: Somen <https://github.com/KTBsomen>

/**
 * PDF permission keys as used by the native library.
 */
export type PDFPermissionKey =
    | 'print'
    | 'copy'
    | 'annotate'
    | 'modify'
    | 'forms'
    | 'assemble'
    | 'all'
    | 'default';

/**
 * A typed mapping of permission names to permission values.
 */
export const PDFPermission: {
    readonly PRINT: 'print';
    readonly COPY: 'copy';
    readonly ANNOTATE: 'annotate';
    readonly MODIFY: 'modify';
    readonly FORMS: 'forms';
    readonly ASSEMBLE: 'assemble';
    readonly ALL: 'all';
    readonly DEFAULT: 'default';
};

/**
 * Encrypts a PDF buffer.
 * @param pdfBuffer The PDF to encrypt.
 * @param userPassword Password to open the PDF.
 * @param ownerPassword (optional) Owner password used for modifying permissions. If omitted, uses userPassword.
 * @param permissions (optional) Array of permission keys; defaults to [PDFPermission.DEFAULT].
 * @returns The encrypted PDF as a Buffer.
 */
export function encryptPDF(
    pdfBuffer: Buffer,
    userPassword: string,
    ownerPassword?: string,
    permissions?: PDFPermissionKey[]
): Buffer;

/**
 * Decrypts a PDF buffer.
 * @param pdfBuffer The encrypted PDF to decrypt.
 * @param password Password (user or owner) used to decrypt the PDF.
 * @param ownerPassword (optional) Owner password when different from user password.
 * @returns The decrypted PDF as a Buffer.
 */
export function decryptPDF(
    pdfBuffer: Buffer,
    password: string,
    ownerPassword?: string
): Buffer;

/**
 * Default export contains the three members for CommonJS consumers:
 * const { encryptPDF, decryptPDF, PDFPermission } = require('./index');
 */
declare const _default: {
    encryptPDF: typeof encryptPDF;
    decryptPDF: typeof decryptPDF;
    PDFPermission: typeof PDFPermission;
};

export default _default;
