import { generateQRBase64 } from '../lib/qrGenerator.js';

export class QRService {
  async generateQR(eip681Uri: string): Promise<string> {
    return generateQRBase64(eip681Uri);
  }
}
