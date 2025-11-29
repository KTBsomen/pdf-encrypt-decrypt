package main

/*
#include <stdlib.h>
*/
import "C"

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"unsafe"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

type PDFPermission string

const (
	PermPrint    PDFPermission = "print"
	PermCopy     PDFPermission = "copy"
	PermModify   PDFPermission = "modify"
	PermAnnotate PDFPermission = "annotate"
	PermForms    PDFPermission = "forms"
	PermAssemble PDFPermission = "assemble"
	PermAll      PDFPermission = "all"
	PermDefault  PDFPermission = "default"
)

func buildPermissionMask(perms []string) model.PermissionFlags {
	var mask model.PermissionFlags = 0

	for _, p := range perms {
		switch PDFPermission(strings.ToLower(p)) {
		case PermPrint:
			mask |= model.PermissionPrintRev3
		case PermCopy:
			mask |= model.PermissionExtract
		case PermAnnotate:
			mask |= model.PermissionModAnnFillForm
		case PermForms:
			mask |= model.PermissionFillRev3
		case PermAssemble:
			mask |= model.PermissionAssembleRev3
		case PermAll:
			mask |= model.PermissionsAll
		case PermModify:
			mask |= model.PermissionModify
		case PermDefault:
			mask |= model.PermissionsNone

		}
	}

	return mask
}

// EncryptPDF encrypts a PDF buffer and returns the result as a base64 encoded C string.
//
//export EncryptPDF
func EncryptPDF(
	pdfBufferPtr *C.uchar, pdfBufferSize C.int,
	userPwStr *C.char, ownerPwStr *C.char, permissionsStr *C.char,
) *C.char {

	userPw := C.GoString(userPwStr)
	ownerPw := C.GoString(ownerPwStr)
	permissionsJSON := C.GoString(permissionsStr)
	var permissions []string
	json.Unmarshal([]byte(permissionsJSON), &permissions)

	// Convert C buffer pointer and size to Go byte slice
	pdfBytes := C.GoBytes(unsafe.Pointer(pdfBufferPtr), pdfBufferSize)
	r := bytes.NewReader(pdfBytes)
	buf := &bytes.Buffer{}

	// Configure pdfcpu encryption settings
	keyLength := 256
	conf := model.NewAESConfiguration(userPw, ownerPw, keyLength)

	// permissions is a []string decoded from JSON; only set custom permissions
	// when the slice is non-empty and not solely ["default"].
	setCustomPerms := false
	if len(permissions) > 0 {
		if len(permissions) == 1 && strings.ToLower(permissions[0]) == "default" {
			setCustomPerms = false
		} else {
			setCustomPerms = true
		}
	}

	if setCustomPerms {
		conf.Permissions = buildPermissionMask(permissions)
	}

	if err := api.Encrypt(r, buf, conf); err != nil {
		errMsg := fmt.Sprintf("Error encrypting PDF: %v", err)
		return C.CString(errMsg)
	}

	// Base64 encode the output binary buffer
	encodedOutput := buf.Bytes()
	encodedString := make([]byte, base64.StdEncoding.EncodedLen(len(encodedOutput)))
	base64.StdEncoding.Encode(encodedString, encodedOutput)

	return C.CString(string(encodedString))
}

// DecryptPDF decrypts a PDF buffer and returns the result as a base64 encoded C string.
// It tries the user password first, then the owner password if provided.
//
//export DecryptPDF
func DecryptPDF(
	pdfBufferPtr *C.uchar, pdfBufferSize C.int,
	passwordStr *C.char, ownerPwStr *C.char,
) *C.char {

	password := C.GoString(passwordStr)
	ownerPw := C.GoString(ownerPwStr)
	pdfBytes := C.GoBytes(unsafe.Pointer(pdfBufferPtr), pdfBufferSize)

	// Try with the provided password (could be user or owner password)
	r := bytes.NewReader(pdfBytes)
	buf := &bytes.Buffer{}
	conf := model.NewDefaultConfiguration()
	conf.UserPW = password
	conf.OwnerPW = password // Try as both

	err := api.Decrypt(r, buf, conf)

	// If first attempt fails and we have a separate owner password, try that
	if err != nil && ownerPw != "" && ownerPw != password {
		r = bytes.NewReader(pdfBytes)
		buf = &bytes.Buffer{}
		conf.UserPW = ownerPw
		conf.OwnerPW = ownerPw
		err = api.Decrypt(r, buf, conf)
	}

	// If still fails, return error
	if err != nil {
		errMsg := fmt.Sprintf("Error decrypting PDF: %v", err)
		return C.CString(errMsg)
	}

	// Base64 encode the output
	encodedOutput := buf.Bytes()
	encodedString := make([]byte, base64.StdEncoding.EncodedLen(len(encodedOutput)))
	base64.StdEncoding.Encode(encodedString, encodedOutput)

	return C.CString(string(encodedString))
}

func main() {}
