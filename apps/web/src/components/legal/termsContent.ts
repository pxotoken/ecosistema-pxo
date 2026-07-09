export interface TermsDocument {
  key: 'pxo' | 'finlatam';
  shortLabel: string;
  modalTitle: string;
  consentLine: string;
  body: string;
}

const placeholderBody = (party: string): string => `
PLACEHOLDER TERMS & CONDITIONS — ${party.toUpperCase()}

This document is a placeholder. The final terms and conditions for ${party} will replace this text before production launch.

1. Acceptance of Terms
By checking the corresponding box on the prior screen and clicking "Accept" at the bottom of this document, you confirm that you have read, understood, and agree to be bound by these terms in their entirety.

2. Eligibility
You represent and warrant that you are of legal age in your jurisdiction and that your use of the ${party} services does not violate any applicable law or regulation.

3. Services
${party} provides digital financial services as further described in the platform documentation. The scope, availability, and features of the services may change at the sole discretion of ${party}.

4. Risk Disclosure
Use of digital assets carries inherent risk including, without limitation, market volatility, regulatory change, technical failure, and counterparty risk. You acknowledge that you understand these risks and assume them in full.

5. Compliance and KYC
You agree to provide accurate identification and supporting documentation as required for the platform to satisfy its compliance obligations. ${party} may suspend or terminate access pending verification.

6. Prohibited Use
You agree not to use the services for any unlawful purpose, including but not limited to money laundering, sanctions evasion, terrorist financing, or fraud.

7. Data and Privacy
${party} processes personal data in accordance with its Privacy Policy. By accepting these terms you also acknowledge the Privacy Policy.

8. Modification of Terms
${party} reserves the right to modify these terms. Continued use of the services after a modification constitutes acceptance of the revised terms.

9. Limitation of Liability
To the maximum extent permitted by applicable law, ${party} shall not be liable for any indirect, incidental, consequential, special, or punitive damages arising out of or relating to use of the services.

10. Governing Law
These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which ${party} is incorporated.

11. Contact
Questions about these terms may be directed to the contact channels published on pxotoken.com.

— END OF PLACEHOLDER DOCUMENT —

The actual Terms & Conditions will be provided by legal counsel and inserted here prior to launch. The "Accept" button below will enable once you have scrolled to the end of the document.
`.trim();

export const TERMS_DOCUMENTS: TermsDocument[] = [
  {
    key: 'pxo',
    shortLabel: 'PXO',
    modalTitle: 'PXO Terms & Conditions',
    consentLine:
      'PXO — By checking this box I confirm I wish to create an account with PXO and that I have read the PXO terms of service and privacy policy and agree to them.',
    body: placeholderBody('PXO'),
  },
  {
    key: 'finlatam',
    shortLabel: 'FINLATAM',
    modalTitle: 'FINLATAM Terms & Conditions',
    consentLine:
      'FINLATAM — By checking this box I confirm I wish to create an account with FINLATAM and that I have read the FINLATAM terms of service and privacy policy and agree to them.',
    body: placeholderBody('FINLATAM'),
  },
];
