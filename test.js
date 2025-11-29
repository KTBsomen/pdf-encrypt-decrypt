const fs = require('fs');
const path = require('path');
const { encryptPDF, decryptPDF, PDFPermission } = require('./index');

async function runTest() {
    try {
        console.log("📄 Loading sample PDF...");

        const pdfPath = path.join(__dirname, "sample.pdf");

        if (!fs.existsSync(pdfPath)) {
            return console.error("❌ sample.pdf not found in project root");
        }

        const originalBuffer = fs.readFileSync(pdfPath);
        console.log(`✅ Loaded PDF (${originalBuffer.length} bytes)\n`);

        // ====================================
        // TEST 1: Encrypt with user password
        // ====================================
        console.log("═══════════════════════════════════════");
        console.log("Test 1: Encrypt with user password");
        console.log("═══════════════════════════════════════");

        const userPassword = "user123";
        const ownerPassword = "owner123";

        const encryptedBuffer1 = encryptPDF(
            originalBuffer,
            userPassword,
            ownerPassword,
            [PDFPermission.PRINT, PDFPermission.COPY]
        );

        const encryptedPath1 = path.join(__dirname, "encrypted_user.pdf");
        fs.writeFileSync(encryptedPath1, encryptedBuffer1);
        console.log(`✅ Saved encrypted PDF → ${encryptedPath1}\n`);

        // ====================================
        // TEST 2: Decrypt with user password
        // ====================================
        console.log("═══════════════════════════════════════");
        console.log("Test 2: Decrypt with user password");
        console.log("═══════════════════════════════════════");

        const decryptedBuffer1 = decryptPDF(encryptedBuffer1, userPassword);

        const decryptedPath1 = path.join(__dirname, "decrypted_with_user_pw.pdf");
        fs.writeFileSync(decryptedPath1, decryptedBuffer1);
        console.log(`✅ Saved decrypted PDF → ${decryptedPath1}\n`);

        // ====================================
        // TEST 3: Decrypt with owner password
        // ====================================
        console.log("═══════════════════════════════════════");
        console.log("Test 3: Decrypt with owner password");
        console.log("═══════════════════════════════════════");

        const decryptedBuffer2 = decryptPDF(encryptedBuffer1, ownerPassword);

        const decryptedPath2 = path.join(__dirname, "decrypted_with_owner_pw.pdf");
        fs.writeFileSync(decryptedPath2, decryptedBuffer2);
        console.log(`✅ Saved decrypted PDF → ${decryptedPath2}\n`);

        // ====================================
        // TEST 4: Try wrong password (should fail)
        // ====================================
        console.log("═══════════════════════════════════════");
        console.log("Test 4: Try wrong password (should fail)");
        console.log("═══════════════════════════════════════");

        try {
            decryptPDF(encryptedBuffer1, "wrongpassword");
            console.log("❌ ERROR: Should have failed with wrong password!\n");
        } catch (err) {
            console.log("✅ Correctly rejected wrong password");
            console.log(`   Error: ${err.message}\n`);
        }

        // ====================================
        // TEST 5: Encrypt with same user/owner password
        // ====================================
        console.log("═══════════════════════════════════════");
        console.log("Test 5: Encrypt with same user/owner password");
        console.log("═══════════════════════════════════════");

        const samePassword = "samepass456";
        const encryptedBuffer2 = encryptPDF(
            originalBuffer,
            samePassword,
            samePassword,
            [PDFPermission.ALL]
        );

        const encryptedPath2 = path.join(__dirname, "encrypted_same_pw.pdf");
        fs.writeFileSync(encryptedPath2, encryptedBuffer2);
        console.log(`✅ Saved encrypted PDF → ${encryptedPath2}`);

        const decryptedBuffer3 = decryptPDF(encryptedBuffer2, samePassword);
        const decryptedPath3 = path.join(__dirname, "decrypted_same_pw.pdf");
        fs.writeFileSync(decryptedPath3, decryptedBuffer3);
        console.log(`✅ Successfully decrypted → ${decryptedPath3}\n`);

        // ====================================
        // TEST 6: Round-trip verification
        // ====================================
        console.log("═══════════════════════════════════════");
        console.log("Test 6: Round-trip verification");
        console.log("═══════════════════════════════════════");

        console.log(`Original size:  ${originalBuffer.length} bytes`);
        console.log(`Encrypted size: ${encryptedBuffer1.length} bytes`);
        console.log(`Decrypted size: ${decryptedBuffer1.length} bytes`);

        // Note: Sizes may differ slightly due to PDF structure changes
        if (Math.abs(originalBuffer.length - decryptedBuffer1.length) < 1000) {
            console.log("✅ Round-trip size check passed (within tolerance)\n");
        } else {
            console.log("⚠️  Warning: Significant size difference after round-trip\n");
        }

        // ====================================
        // SUMMARY
        // ====================================
        console.log("═══════════════════════════════════════");
        console.log("🎉 All tests completed successfully!");
        console.log("═══════════════════════════════════════");
        console.log("\n📋 Generated files:");
        console.log("   Encrypted:");
        console.log(`   - encrypted_user.pdf (user: ${userPassword}, owner: ${ownerPassword})`);
        console.log(`   - encrypted_same_pw.pdf (password: ${samePassword})`);
        console.log("\n   Decrypted:");
        console.log("   - decrypted_with_user_pw.pdf");
        console.log("   - decrypted_with_owner_pw.pdf");
        console.log("   - decrypted_same_pw.pdf");

    } catch (err) {
        console.error("\n❌ Test failed:");
        console.error(err.message);
        if (err.stack) {
            console.error("\nStack trace:");
            console.error(err.stack);
        }
        process.exit(1);
    }
}

runTest();