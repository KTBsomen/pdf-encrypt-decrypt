# PDF Encryption/Decryption Library

A high-performance Node.js library for encrypting and decrypting PDF files using a Go-based native library. This library uses FFI (Foreign Function Interface) to call compiled Go functions from Node.js, providing the speed of Go with the convenience of JavaScript.

## 📚 Table of Contents

- [Understanding PDF Security](#understanding-pdf-security)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Building the Native Library](#building-the-native-library)
- [Usage Examples](#usage-examples)
- [API Reference](#api-reference)
- [Technical Deep Dive](#technical-deep-dive)

---

## 🔐 Understanding PDF Security

### What are User and Owner Passwords?

PDF security uses **two different types of passwords**, each serving a distinct purpose:

#### 1. **User Password** (Document Open Password)
- **Purpose**: Controls who can **VIEW** the document
- **What it does**: When set, users must enter this password to open and read the PDF
- **Analogy**: Like a lock on your front door - you need the key to get in
- **Example Use Case**: Sharing a confidential report where you want to control who can read it

#### 2. **Owner Password** (Permissions Password / Master Password)
- **Purpose**: Controls who can **MODIFY** security settings and permissions
- **What it does**: Allows changing restrictions (printing, copying, editing, etc.)
- **Analogy**: Like having the master key to a building - you can change the locks and rules
- **Example Use Case**: A company wants employees to read a document (with user password) but only managers can remove restrictions (with owner password)

### Important Notes:

- **Both passwords can be the same**: For simple use cases, you can use identical passwords
- **User password can view**: Anyone with the user password can open and view the PDF
- **Owner password can do everything**: The owner password can both view AND modify security settings
- **Owner password is more powerful**: If you only know the owner password, you can still open the PDF

---

### What are PDF Permissions?

Permissions control **what actions users can perform** on an encrypted PDF. Even if someone can open the PDF (with user password), permissions restrict what they can do with it.

#### Available Permissions:

| Permission | Code | What It Allows |
|-----------|------|----------------|
| **Print** | `PDFPermission.PRINT` | Print the document at low resolution |
| **High-Res Print** | `PDFPermission.HI_RES_PRINT` | Print at high resolution (professional quality) |
| **Copy** | `PDFPermission.COPY` | Copy text and graphics from the document |
| **Modify** | `PDFPermission.MODIFY` | Edit the document content |
| **Annotate** | `PDFPermission.ANNOTATE` | Add comments, highlights, and annotations |
| **Fill Forms** | `PDFPermission.FORMS` | Fill in form fields |
| **Assemble** | `PDFPermission.ASSEMBLE` | Insert, delete, or rotate pages |
| **Accessibility** | `PDFPermission.ACCESSIBILITY` | Extract text for screen readers (accessibility tools) |
| **All** | `PDFPermission.ALL` | Grant all permissions |
| **Default** | `PDFPermission.DEFAULT` | No permissions (most restrictive) |

#### Real-World Examples:

**Example 1: Confidential Report**
```javascript
// Allow viewing and printing only - no copying or editing
encryptPDF(pdfBuffer, "read2024", "admin2024", [
    PDFPermission.PRINT
]);
```

**Example 2: Form Template**
```javascript
// Allow filling forms but no editing of the form structure
encryptPDF(pdfBuffer, "user123", "admin123", [
    PDFPermission.FORMS
]);
```

**Example 3: Read-Only Document**
```javascript
// Allow viewing only - no printing, copying, or editing
encryptPDF(pdfBuffer, "view123", "master123", [
    PDFPermission.DEFAULT  // No permissions
]);
```

**Example 4: Full Access**
```javascript
// Allow everything
encryptPDF(pdfBuffer, "pass123", "pass123", [
    PDFPermission.ALL
]);
```

---

## 🔧 How It Works

### Architecture Overview

```
┌─────────────────┐
│   Node.js App   │
│  (JavaScript)   │
└────────┬────────┘
         │ Uses Koffi FFI
         ▼
┌─────────────────┐
│  Native Library │
│   (Go/C-shared) │
│  - Compiled DLL │
│  - Fast & Safe  │
└────────┬────────┘
         │ Uses pdfcpu
         ▼
┌─────────────────┐
│  PDF Processing │
│   (Encryption)  │
└─────────────────┘
```

### The Process Flow

#### **Encryption Process:**

1. **JavaScript Layer (Node.js)**:
   - User provides: PDF buffer, passwords, permissions
   - Converts permission array to JSON string
   - Calls Go function via Koffi FFI

2. **FFI Bridge (Koffi)**:
   - Converts JavaScript Buffer → C pointer (`unsigned char*`)
   - Converts JavaScript strings → C strings (`char*`)
   - Marshals data types between JavaScript and C

3. **Go Layer (Native)**:
   - Receives C pointers and converts to Go types
   - Uses `pdfcpu` library to apply AES-256 encryption
   - Sets user password, owner password, and permissions
   - Generates encrypted PDF in memory

4. **Return Path**:
   - Go encodes encrypted PDF as Base64 string
   - Returns C string to JavaScript
   - JavaScript decodes Base64 → Buffer
   - Returns Buffer to user

#### **Decryption Process:**

1. **JavaScript Layer**:
   - User provides encrypted PDF buffer and password(s)
   - Calls Go decrypt function via FFI

2. **Go Layer**:
   - Tries provided password (could be user OR owner password)
   - If first password fails, tries second password
   - Uses `pdfcpu` to decrypt with AES-256
   - Returns decrypted PDF as Base64

3. **Return Path**:
   - JavaScript converts Base64 → Buffer
   - Returns decrypted PDF to user

---

## 📦 Installation

### Prerequisites

- **Node.js** (v14 or higher)
- **Go** (v1.19 or higher) - only needed for building
- **GCC** (for cross-compilation to Windows from Linux/WSL)

### Install Node Dependencies

```bash
npm install koffi
```

### Project Structure

```
encrypt_pdf/
├── lib/
│   ├── pdfencrypt_win_x64.dll    # Windows library
│   ├── pdfencrypt_linux.so       # Linux library
│   └── pdfencrypt_darwin_*.dylib # macOS library (optional)
├── src/
│   ├── main.go                   # Go source code
│   ├── go.mod
│   └── go.sum
├── index.js                      # JavaScript wrapper
├── test.js                       # Test file
├── package.json
└── README.md
```

---

## 🏗️ Building the Native Library

The Go code must be compiled into a shared library (DLL for Windows, SO for Linux, DYLIB for macOS) that Node.js can load.

### Step 1: Initialize Go Module (First Time Only)

```bash
cd src
go mod init encrypt_pdf
go get github.com/pdfcpu/pdfcpu/pkg/api
go get github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model
```

### Step 2: Build for Your Platform

#### **For Windows (from Windows or Linux/WSL):**

If you're on **Linux/WSL** and want to build for Windows:

```bash
cd src
sudo CGO_ENABLED=1 GOOS=windows GOARCH=amd64 CC=x86_64-w64-mingw32-gcc \
  go build -buildmode=c-shared -o ../lib/pdfencrypt_win_x64.dll main.go
```

If you're on **Windows** directly:

```bash
cd src
go build -buildmode=c-shared -o ../lib/pdfencrypt_win_x64.dll main.go
```

#### **For Linux:**

```bash
cd src
CGO_ENABLED=1 GOOS=linux GOARCH=amd64 \
  go build -buildmode=c-shared -o ../lib/pdfencrypt_linux.so main.go
```

#### **For macOS (Intel):**

```bash
cd src
CGO_ENABLED=1 GOOS=darwin GOARCH=amd64 \
  go build -buildmode=c-shared -o ../lib/pdfencrypt_darwin_x64.dylib main.go
```

#### **For macOS (Apple Silicon/M1/M2):**

```bash
cd src
CGO_ENABLED=1 GOOS=darwin GOARCH=arm64 \
  go build -buildmode=c-shared -o ../lib/pdfencrypt_darwin_arm64.dylib main.go
```

### Understanding the Build Command

Let's break down what each part does:

```bash
sudo CGO_ENABLED=1 GOOS=windows GOARCH=amd64 CC=x86_64-w64-mingw32-gcc go build -buildmode=c-shared -o ../lib/pdfencrypt_win_x64.dll main.go
```

- **`sudo`**: Run with elevated privileges (needed for some cross-compilation setups)
- **`CGO_ENABLED=1`**: Enable C interop (required for creating C-compatible shared libraries)
- **`GOOS=windows`**: Target operating system (windows, linux, darwin)
- **`GOARCH=amd64`**: Target architecture (amd64 = 64-bit x86)
- **`CC=x86_64-w64-mingw32-gcc`**: C compiler for cross-compilation (only needed for Windows from Linux)
- **`-buildmode=c-shared`**: Build as a C-compatible shared library
- **`-o ../lib/pdfencrypt_win_x64.dll`**: Output file path
- **`main.go`**: Source file to compile

---

## 🚀 Usage Examples

### Example 1: Basic Encryption

```javascript
const fs = require('fs');
const { encryptPDF, PDFPermission } = require('./index');

// Read your PDF file
const pdfBuffer = fs.readFileSync('document.pdf');

// Encrypt with password protection and limited permissions
const encryptedPDF = encryptPDF(
    pdfBuffer,
    'userPassword123',      // User must enter this to open
    'ownerPassword456',     // Owner can modify security settings
    [PDFPermission.PRINT, PDFPermission.COPY]  // Allow print & copy only
);

// Save the encrypted PDF
fs.writeFileSync('document_encrypted.pdf', encryptedPDF);
console.log('✅ PDF encrypted successfully!');
```

### Example 2: Maximum Security (View-Only)

```javascript
const { encryptPDF, PDFPermission } = require('./index');

// Create a view-only PDF - no printing, copying, or editing
const encryptedPDF = encryptPDF(
    pdfBuffer,
    'secretview',
    'adminsecret',
    [PDFPermission.DEFAULT]  // No permissions at all
);
```

### Example 3: Form with User Input Allowed

```javascript
const { encryptPDF, PDFPermission } = require('./index');

// Allow users to fill forms but not modify the form itself
const encryptedPDF = encryptPDF(
    pdfBuffer,
    'fillform2024',
    'admin2024',
    [PDFPermission.FORMS]
);
```

### Example 4: Decrypt a Protected PDF

```javascript
const { decryptPDF } = require('./index');

// Read the encrypted PDF
const encryptedBuffer = fs.readFileSync('encrypted.pdf');

// Decrypt with user password
const decryptedPDF = decryptPDF(encryptedBuffer, 'userPassword123');

// Or decrypt with owner password
const decryptedPDF2 = decryptPDF(encryptedBuffer, 'ownerPassword456');

// Save the decrypted PDF
fs.writeFileSync('decrypted.pdf', decryptedPDF);
console.log('✅ PDF decrypted successfully!');
```

### Example 5: Round-Trip (Encrypt Then Decrypt)

```javascript
const fs = require('fs');
const { encryptPDF, decryptPDF, PDFPermission } = require('./index');

// Read original PDF
const originalPDF = fs.readFileSync('original.pdf');

// Encrypt it
const encryptedPDF = encryptPDF(
    originalPDF,
    'mypassword',
    'mypassword',
    [PDFPermission.ALL]
);

fs.writeFileSync('encrypted.pdf', encryptedPDF);

// Decrypt it back
const decryptedPDF = decryptPDF(encryptedPDF, 'mypassword');

fs.writeFileSync('decrypted.pdf', decryptedPDF);

console.log('Original size:', originalPDF.length);
console.log('Encrypted size:', encryptedPDF.length);
console.log('Decrypted size:', decryptedPDF.length);
```

### Example 6: Error Handling

```javascript
const { encryptPDF, decryptPDF } = require('./index');

try {
    // Try to decrypt with wrong password
    const decryptedPDF = decryptPDF(encryptedBuffer, 'wrongpassword');
} catch (error) {
    console.error('Decryption failed:', error.message);
    // Output: "Error decrypting PDF: ..."
}
```

---

## 📖 API Reference

### `encryptPDF(pdfBuffer, userPassword, ownerPassword, permissions)`

Encrypts a PDF buffer with password protection and permissions.

**Parameters:**
- `pdfBuffer` (Buffer): The PDF file as a Node.js Buffer
- `userPassword` (String): Password required to open the PDF
- `ownerPassword` (String, optional): Password to modify security settings (defaults to userPassword)
- `permissions` (Array, optional): Array of permission constants (defaults to `[PDFPermission.DEFAULT]`)

**Returns:** Buffer - The encrypted PDF as a Buffer

**Example:**
```javascript
const encrypted = encryptPDF(
    pdfBuffer, 
    'user123', 
    'owner123', 
    [PDFPermission.PRINT]
);
```

---

### `decryptPDF(pdfBuffer, password, ownerPassword)`

Decrypts an encrypted PDF buffer.

**Parameters:**
- `pdfBuffer` (Buffer): The encrypted PDF as a Buffer
- `password` (String): Password to decrypt (can be user or owner password)
- `ownerPassword` (String, optional): Alternative owner password to try if first fails

**Returns:** Buffer - The decrypted PDF as a Buffer

**Example:**
```javascript
const decrypted = decryptPDF(encryptedBuffer, 'user123');
```

---

### `PDFPermission` Object

Available permission constants:

```javascript
PDFPermission.PRINT          // Low-resolution printing
PDFPermission.HI_RES_PRINT   // High-resolution printing
PDFPermission.COPY           // Copy text and graphics
PDFPermission.MODIFY         // Modify document content
PDFPermission.ANNOTATE       // Add annotations
PDFPermission.FORMS          // Fill form fields
PDFPermission.ASSEMBLE       // Assemble document (insert/delete pages)
PDFPermission.ACCESSIBILITY  // Extract for accessibility
PDFPermission.ALL            // All permissions
PDFPermission.DEFAULT        // No permissions
```

---

## 🔬 Technical Deep Dive

### How the Go Code Works

#### The Encryption Function (`EncryptPDF`)

```go
//export EncryptPDF
func EncryptPDF(
    pdfBufferPtr *C.uchar, pdfBufferSize C.int,
    userPwStr *C.char, ownerPwStr *C.char, permissionsStr *C.char,
) *C.char
```

**Step-by-Step Process:**

1. **Receive C Parameters:**
   ```go
   userPw := C.GoString(userPwStr)        // Convert C string → Go string
   ownerPw := C.GoString(ownerPwStr)
   permissionsJSON := C.GoString(permissionsStr)
   ```

2. **Parse Permissions:**
   ```go
   var permissions []string
   json.Unmarshal([]byte(permissionsJSON), &permissions)
   ```

3. **Convert Buffer:**
   ```go
   pdfBytes := C.GoBytes(unsafe.Pointer(pdfBufferPtr), pdfBufferSize)
   r := bytes.NewReader(pdfBytes)  // Create reader from bytes
   buf := &bytes.Buffer{}           // Create output buffer
   ```

4. **Configure Encryption:**
   ```go
   conf := model.NewAESConfiguration(userPw, ownerPw, 256)  // AES-256
   conf.Permissions = buildPermissionMask(permissions)
   ```

5. **Encrypt:**
   ```go
   api.Encrypt(r, buf, conf)  // pdfcpu does the encryption
   ```

6. **Encode and Return:**
   ```go
   encodedString := base64.StdEncoding.EncodeToString(buf.Bytes())
   return C.CString(encodedString)  // Convert Go string → C string
   ```

#### The Permission Mask Builder

```go
func buildPermissionMask(perms []string) model.PermissionFlags {
    var mask model.PermissionFlags = 0
    
    for _, p := range perms {
        switch PDFPermission(strings.ToLower(p)) {
        case PermPrint:
            mask |= model.PermissionPrintRev3  // Bitwise OR
        case PermCopy:
            mask |= model.PermissionExtract
        // ... more cases
        }
    }
    
    return mask
}
```

**What's happening:**
- Permissions in PDF are stored as **bit flags** (a single integer where each bit represents a permission)
- We start with `mask = 0` (no permissions)
- For each requested permission, we use bitwise OR (`|=`) to "turn on" that bit
- Example: `0b00000000 | 0b00000001 = 0b00000001` (print enabled)

---

### How the Node.js Code Works

#### The FFI Bridge (Koffi)

```javascript
const koffi = require('koffi');
const lib = koffi.load(libraryPath);

// Define the C function signature
const EncryptPDF = lib.func(
    'char *EncryptPDF(unsigned char *pdfBufferPtr, int pdfBufferSize, char *userPw, char *ownerPw, char *permissions)'
);
```

**What Koffi does:**
1. Loads the compiled shared library (DLL/SO)
2. Finds the `EncryptPDF` function in the library
3. Creates a JavaScript function that automatically:
   - Converts JS Buffer → C `unsigned char*`
   - Converts JS String → C `char*`
   - Converts JS Number → C `int`
   - Calls the native function
   - Converts C `char*` → JS String

#### The JavaScript Wrapper

```javascript
function encryptPDF(pdfBuffer, userPassword, ownerPassword, permissions) {
    // 1. Convert permissions to JSON
    const permissionsJSON = JSON.stringify(permissions);
    
    // 2. Call native function (Koffi handles type conversion)
    const encodedOutput = EncryptPDF(
        pdfBuffer,           // Buffer → unsigned char*
        pdfBuffer.length,    // Number → int
        userPassword,        // String → char*
        ownerPassword,       // String → char*
        permissionsJSON      // String → char*
    );
    
    // 3. Decode Base64 → Buffer
    return Buffer.from(encodedOutput, 'base64');
}
```

---

### Memory Management

**Important:** Memory is automatically managed!

- **Go side:** `C.CString()` allocates C memory, but Go's garbage collector handles it
- **JavaScript side:** Koffi automatically copies returned strings before Go frees them
- **No memory leaks:** Both Go and JavaScript clean up their own memory

---

## 🧪 Running Tests

```bash
node test.js
```

Expected output:
```
📄 Loading sample PDF...
✅ Loaded PDF (3284124 bytes)

═══════════════════════════════════════
Test 1: Encrypt with user password
═══════════════════════════════════════
PDF buffer size: 3284124
Permissions: ["print","copy"]
✅ Encryption successful
📦 Output buffer length: 3284567
✅ Saved encrypted PDF → encrypted_user.pdf

[... more tests ...]

🎉 All tests completed successfully!
```

---

## ❓ FAQ

### Q: What encryption algorithm is used?
**A:** AES-256 (Advanced Encryption Standard with 256-bit keys) - the same encryption used by banks and governments.

### Q: Can I use the same password for user and owner?
**A:** Yes! Just pass the same password for both parameters.

### Q: What happens if I forget the owner password?
**A:** The owner password is needed to change security settings. If lost, you'll need PDF recovery tools (which may or may not work depending on the encryption strength).

### Q: Are permissions enforceable?
**A:** Permissions are enforced by PDF readers (Adobe Acrobat, browsers, etc.). However, determined users with specialized tools might bypass them. Use strong passwords for critical documents.

### Q: Can I encrypt already-encrypted PDFs?
**A:** You must decrypt first, then re-encrypt with new settings.

---

## 📝 License

MIT License - Feel free to use in your projects!

---

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

---

## 🐛 Troubleshooting

### "Library not found" error
- Make sure you've built the library for your platform
- Check that the DLL/SO file exists in the `lib/` directory
- Verify the file path in `getLibraryPath()`

### "Encryption returned null"
- Check that your Go library is built correctly
- Verify the function is exported with `//export EncryptPDF`
- Test the DLL with a simple C program first

### Build errors on Windows
- Install MinGW-w64 for cross-compilation
- Make sure `x86_64-w64-mingw32-gcc` is in your PATH

---

**Made with ❤️ using Go and Node.js**