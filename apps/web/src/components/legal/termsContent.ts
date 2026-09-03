import { CATALOGUES } from '../../i18n/messages';
import type { Locale } from '../../i18n/types';

export interface TermsDocument {
  key: 'pxo' | 'finlatam';
  shortLabel: string;
  modalTitle: string;
  consentLine: string;
  body: string;
}

const PARTIES: Array<{ key: TermsDocument['key']; label: string }> = [
  { key: 'pxo', label: 'PXO' },
  { key: 'finlatam', label: 'FINLATAM' },
];

const placeholderBodyEn = (party: string): string => `
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

const placeholderBodyEs = (party: string): string => `
TÉRMINOS Y CONDICIONES DE MUESTRA — ${party.toUpperCase()}

Este documento es un marcador de posición. Los términos y condiciones definitivos de ${party} reemplazarán este texto antes del lanzamiento en producción.

1. Aceptación de los términos
Al marcar la casilla correspondiente en la pantalla anterior y hacer clic en "Aceptar" al final de este documento, confirmás que leíste, entendiste y aceptás obligarte por estos términos en su totalidad.

2. Elegibilidad
Declarás y garantizás que tenés la edad legal en tu jurisdicción y que tu uso de los servicios de ${party} no infringe ninguna ley ni regulación aplicable.

3. Servicios
${party} presta servicios financieros digitales según se describe en la documentación de la plataforma. El alcance, la disponibilidad y las funcionalidades de los servicios pueden cambiar a criterio exclusivo de ${party}.

4. Advertencia de riesgos
El uso de activos digitales conlleva riesgos inherentes, entre ellos y sin limitación: volatilidad del mercado, cambios regulatorios, fallas técnicas y riesgo de contraparte. Reconocés que comprendés estos riesgos y los asumís en su totalidad.

5. Cumplimiento y KYC
Aceptás proporcionar identificación y documentación de respaldo veraces, según lo requiera la plataforma para cumplir con sus obligaciones de cumplimiento normativo. ${party} puede suspender o dar de baja el acceso mientras se completa la verificación.

6. Uso prohibido
Aceptás no utilizar los servicios con fines ilícitos, incluidos, entre otros, el lavado de dinero, la evasión de sanciones, el financiamiento del terrorismo o el fraude.

7. Datos y privacidad
${party} trata los datos personales conforme a su Política de Privacidad. Al aceptar estos términos también reconocés la Política de Privacidad.

8. Modificación de los términos
${party} se reserva el derecho de modificar estos términos. El uso continuado de los servicios luego de una modificación constituye la aceptación de los términos revisados.

9. Limitación de responsabilidad
En la máxima medida permitida por la ley aplicable, ${party} no será responsable por daños indirectos, incidentales, consecuentes, especiales o punitivos que surjan del uso de los servicios o se relacionen con él.

10. Ley aplicable
Estos términos se rigen e interpretan conforme a las leyes de la jurisdicción en la que ${party} está constituida.

11. Contacto
Las consultas sobre estos términos pueden dirigirse a los canales de contacto publicados en pxotoken.com.

— FIN DEL DOCUMENTO DE MUESTRA —

Los Términos y Condiciones definitivos serán provistos por asesoría legal e insertados aquí antes del lanzamiento. El botón "Aceptar" se habilitará una vez que hayas desplazado el documento hasta el final.
`.trim();

const BODIES: Record<Locale, (party: string) => string> = {
  es: placeholderBodyEs,
  en: placeholderBodyEn,
};

/**
 * The legal documents in a given locale. Titles and consent lines come from the
 * message catalogue; the bodies live here because they are long-form copy.
 */
export const getTermsDocuments = (locale: Locale): TermsDocument[] => {
  const legal = CATALOGUES[locale].legal;
  return PARTIES.map(({ key, label }) => ({
    key,
    shortLabel: label,
    modalTitle: legal.docTitle(label),
    consentLine: legal.consentLine(label),
    body: BODIES[locale](label),
  }));
};
