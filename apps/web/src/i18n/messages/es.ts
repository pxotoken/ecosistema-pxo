/**
 * Spanish catalogue — the reference locale. Its shape defines the `Messages`
 * type, so every other locale is checked against it at compile time.
 */
export const es = {
  nav: {
    individual: 'Individual',
    company: 'Empresa',
    about: 'Acerca de',
    openMenu: 'Abrir menú',
    language: 'Idioma',
    items: {
      buySell: {
        title: 'Compra y venta de PXO',
        sub: 'Convertí entre pesos y PXO al mejor tipo de cambio 24/7.',
      },
      account: {
        title: 'Cuenta en pesos digitales',
        sub: 'Administrá tus pesos digitales con seguridad institucional.',
      },
      spei: {
        title: 'Transferencias SPEI',
        sub: 'Enviá y recibí pesos desde cualquier banco. Sin comisiones, 24/7.',
      },
      dollars: {
        title: 'Dólares digitales',
        sub: 'Convertí tus pesos a dólares digitales en segundos, al mejor tipo de cambio.',
      },
    },
    about_items: {
      terms: 'Términos y condiciones',
      privacy: 'Política de privacidad',
      blog: 'Blog',
      help: 'Centro de ayuda',
    },
  },

  cta: {
    startNow: 'Empezar ahora',
    openAccount: 'Abrí tu cuenta',
    connecting: 'Conectando...',
  },

  hero: {
    titleLead: 'Tus pesos, ahora también',
    titleAccent: 'digitales.',
    sub: 'Convertí, enviá y recibí pesos MXN digitales en segundos desde una sola app.',
    trust: {
      backed: '✓ Respaldado 1:1 con MXN',
      audits: '✓ Auditorías mensuales',
      always: '✓ Disponible 24/7',
    },
  },

  stats: {
    usersNum: '+250M',
    usersLabel: 'usuarios ya usan monedas digitales en el mundo',
    backedNum: '1:1',
    backedLabel: 'PXO respaldado con MXN, siempre',
    speiNum: '24/7',
    speiLabel: 'Transferencias SPEI sin horario',
  },

  useCases: {
    label: 'Lo que hacemos',
    buy: { title: 'Compra', sub: 'MXN → PXO al instante' },
    sell: { title: 'Venta', sub: 'PXO → MXN a tu banco' },
    send: { title: 'Envío', sub: 'A cualquier wallet o dirección' },
    receive: { title: 'Recepción', sub: 'Desde otra wallet o vía SPEI' },
    supportedTokens: 'Tokens soportados',
    pxoCaption: 'Peso Digital · 1:1 MXN',
    usdtCaption: 'Tether USD',
    usdcCaption: 'USD Coin',
  },

  how: {
    tag: '¿Cómo funciona?',
    title: 'Tres pasos y ya estás adentro',
    sub: 'Sin conocimientos de cripto. Sin trámites complicados.',
    steps: {
      account: {
        title: 'Creá tu cuenta',
        sub: 'Registrate con tu email y verificá tu identidad en minutos.',
      },
      deposit: {
        title: 'Depositá vía SPEI',
        sub: 'Transferí desde cualquier banco mexicano. Sin comisiones, 24/7.',
      },
      use: {
        title: 'Usá tus PXO',
        sub: 'Comprá, vendé, enviá y recibí pesos digitales al instante.',
      },
    },
  },

  why: {
    tag: 'Por qué PXO Token',
    titleLead: '¿Por qué abrir una cuenta de',
    titleAccent: 'pesos digitales',
    titleTrail: '?',
    sub: 'Porque tu dinero puede vivir en una infraestructura financiera más moderna, global y flexible que el sistema tradicional.',
    benefits: {
      infrastructure: 'Infraestructura moderna',
      global: 'Uso global',
      compliance: 'Cumplimiento regulatorio',
      always: 'Convierte 24/7',
      custody: 'Fondos en custodia 1:1',
      audit: 'Auditoría mensual',
      pesos: '100% en pesos',
    },
  },

  spei: {
    titlePart1: 'Convertí tus',
    titleAccent1: 'pesos digitales',
    titlePart2: 'a',
    titleAccent2: 'pesos',
    titlePart3: 'y recibilos en tu banco en minutos.',
    features: {
      transfers: 'Transferencias vía SPEI.',
      always: 'Disponible 24/7',
      liquidity: 'Liquidez de nivel institucional',
    },
    walletAlt: 'Wallet PXO',
    tagReceived: 'Recibiste $12,450 PXO',
    tagSold: 'Vendiste 3,200 PXO → $3,200 MXN',
  },

  faq: {
    title: 'Preguntas Frecuentes',
    helpLink: 'Visitar la sección de ayuda ›',
    items: {
      what: {
        q: '¿Qué son los pesos digitales o PXO Token?',
        a: 'PXO Token es un peso digital mexicano: 1 PXO = 1 MXN, siempre. Funciona sobre Polygon, lo que significa que cada transacción es transparente y verificable públicamente. A diferencia de las stablecoins en dólares, PXO te permite ahorrar, pagar y transferir directamente en pesos, sin exponerte a la volatilidad del tipo de cambio.',
      },
      howToGet: {
        q: '¿Cómo puedo obtener PXO Token?',
        a: 'Es muy sencillo: accedé a PXO Token, creá tu cuenta en minutos y depositá desde cualquier banco mexicano vía SPEI. Tus pesos se convierten automáticamente en PXO y ya podés usarlos para pagar, enviar o cambiarlos a dólares digitales.',
      },
      usage: {
        q: '¿Para qué puedo usar mis pesos digitales?',
        a: 'Con PXO podés: depositar y retirar vía SPEI, transferir a otros usuarios sin comisión, convertir tus pesos a dólares digitales al mejor tipo de cambio, y pagar en la economía digital desde una sola app.',
      },
      safety: {
        q: '¿Mis fondos están seguros?',
        a: 'Sí. Cada PXO está respaldado 1:1 por un peso mexicano en custodia. Las reservas son auditadas mensualmente y publicadas públicamente. El smart contract opera sobre Polygon. Cumplimos con la regulación mexicana vigente (Ley Fintech, CNBV, Banxico).',
      },
    },
  },

  finalCta: {
    title: 'Empezar ahora',
    sub: 'Abrí tu cuenta en minutos. Sin saber de cripto.',
  },

  footer: {
    logoSub: 'Peso Digital Mexicano',
    tagline: 'El peso digital mexicano. Respaldado 1:1 por MXN. Auditado mensualmente.',
    colIndividual: 'Individual',
    colAbout: 'Acerca de',
    links: {
      home: 'Inicio',
      buySell: 'Compra y venta',
      account: 'Cuenta en pesos digitales',
      spei: 'Transferencias SPEI',
      dollars: 'Dólares digitales',
    },
    legal:
      'Los servicios de intermediación y administración para la compra, venta y almacenamiento de pesos digitales son ofrecidos por PXO TOKEN, empresa legalmente constituida bajo las leyes de los Estados Unidos Mexicanos. Las actividades vulnerables señaladas se realizan en cumplimiento con la Ley Federal de Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita y demás regulación mexicana aplicable. PXO Token no promueve servicios de asesoría financiera. Nuestra actividad se limita exclusivamente a la compra y venta de activos virtuales. No garantizamos rendimientos ni brindamos recomendaciones financieras. Cada usuario es responsable de sus propias decisiones y debe informarse adecuadamente antes de realizar cualquier operación.',
    legalCompany: 'PXO TOKEN',
  },

  legal: {
    viewerTitle: 'Términos y Condiciones',
    dashboardTitle: 'Legal',
    close: 'Cerrar',
    gateTitle: 'Antes de continuar',
    gateSubmit: 'Enviar',
    read: (label: string) => `Leer ${label}`,
    accept: 'Aceptar',
    disagree: 'No acepto',
    scrollHint: 'Desplazate hasta el final del documento para habilitar',
    consentLine: (party: string) =>
      `${party} — Al marcar esta casilla confirmo que deseo crear una cuenta con ${party} y que he leído y acepto sus términos de servicio y su política de privacidad.`,
    docTitle: (party: string) => `Términos y Condiciones de ${party}`,
  },
} as const;
