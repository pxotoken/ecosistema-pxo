import QRCode from 'qrcode';

/**
 * Render a QR code as a `data:image/png;base64,...` URI (400×400px).
 */
export async function generateQRBase64(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 400,
    type: 'image/png',
  });
}
