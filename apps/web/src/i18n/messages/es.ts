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
        sub: 'Convierte entre pesos y PXO al mejor tipo de cambio 24/7.',
      },
      account: {
        title: 'Cuenta en pesos digitales',
        sub: 'Administra tus pesos digitales con seguridad institucional.',
      },
      spei: {
        title: 'Transferencias SPEI',
        sub: 'Envía y recibe pesos desde cualquier banco. Sin comisiones, 24/7.',
      },
      dollars: {
        title: 'Dólares digitales',
        sub: 'Convierte tus pesos a dólares digitales en segundos, al mejor tipo de cambio.',
      },
    },
    about_items: {
      terms: 'Términos y condiciones',
      privacy: 'Política de privacidad',
      help: 'Centro de ayuda',
    },
  },

  cta: {
    startNow: 'Empezar ahora',
    openAccount: 'Iniciar Sesión',
    connecting: 'Conectando...',
  },

  hero: {
    titleLead: 'Tus pesos, ahora también',
    titleAccent: 'digitales.',
    sub: 'Convierte, envía y recibe pesos MXN digitales en segundos desde una sola app.',
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
        title: 'Crea tu cuenta',
        sub: 'Regístrate con tu email y verifica tu identidad en minutos.',
      },
      deposit: {
        title: 'Deposita vía SPEI',
        sub: 'Transfiere desde cualquier banco mexicano. Sin comisiones, 24/7.',
      },
      use: {
        title: 'Usa tus PXO',
        sub: 'Compra, vende, envía y recibe pesos digitales al instante.',
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
    titlePart1: 'Convierte tus',
    titleAccent1: 'pesos digitales',
    titlePart2: 'a',
    titleAccent2: 'pesos',
    titlePart3: 'y recíbelos en tu banco en minutos.',
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
        a: 'Es muy sencillo: accede a PXO Token, crea tu cuenta en minutos y deposita desde cualquier banco mexicano vía SPEI. Tus pesos se convierten automáticamente en PXO y ya los puedes usar para pagar, enviar o cambiarlos a dólares digitales.',
      },
      usage: {
        q: '¿Para qué puedo usar mis pesos digitales?',
        a: 'Con PXO puedes: depositar y retirar vía SPEI, transferir a otros usuarios sin comisión, convertir tus pesos a dólares digitales al mejor tipo de cambio, y pagar en la economía digital desde una sola app.',
      },
      safety: {
        q: '¿Mis fondos están seguros?',
        a: 'Sí. Cada PXO está respaldado 1:1 por un peso mexicano en custodia. Las reservas son auditadas mensualmente y publicadas públicamente. El smart contract opera sobre Polygon. Cumplimos con la regulación mexicana vigente (Ley Fintech, CNBV, Banxico).',
      },
    },
  },

  finalCta: {
    title: 'Empezar ahora',
    sub: 'Inicia sesión o crea tu cuenta en minutos. Sin saber de cripto.',
  },

  footer: {
    logoSub: 'Peso Digital Mexicano',
    tagline: 'El peso digital mexicano. Respaldado 1:1 con MXN. Auditado mensualmente.',
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
      'Los servicios de intermediación y administración para la compra, venta y almacenamiento de pesos digitales son ofrecidos por PXO TOKEN, empresa legalmente constituida bajo las leyes de los Estados Unidos Mexicanos. Las actividades vulnerables señaladas se realizan en cumplimiento con la Ley Federal de Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita y demás regulación mexicana aplicable. PXO Token no promueve servicios de asesoría financiera. Nuestra actividad se limita exclusivamente a la compra y venta de activos virtuales. No garantizamos rendimientos ni brindamos recomendaciones financieras. Cada usuario es responsable de sus propias decisiones y debe informarse antes de realizar cualquier operación.',
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
    scrollHint: 'Desplázate hasta el final del documento para habilitar',
    consentLine: (party: string) =>
      `${party} — Al marcar esta casilla confirmo que deseo crear una cuenta con ${party} y que he leído y acepto sus términos de servicio y su política de privacidad.`,
    docTitle: (party: string) => `Términos y Condiciones de ${party}`,
  },
  /**
   * October 2026 landing (see docs/looks/landing_last_version.html). The design
   * shipped both locales inline; they live here so the ES/EN buttons in the
   * landing nav drive the same LocaleContext as the rest of the app.
   */
  landingV4: {
    nav: { products: 'Productos', how: 'Cómo funciona', benefits: 'Beneficios', trust: 'Transparencia' },
    openAccount: 'Abre tu cuenta',
    hero: {
      eyebrow: 'El peso mexicano digital',
      line1: 'Tus pesos,',
      line2: 'ahora también digitales.',
      lead: 'Compra, envía y cambia pesos digitales en segundos. Todo en un sólo lugar.',
      cta: 'Crea tu cuenta',
      cta2: 'Conoce PXO',
    },
    chips: { always: 'Siempre', send: 'Envía en segundos', swap: 'Cambia cuando quieras', hours: 'Sin horarios bancarios' },
    marquee: { buy: 'Compra', send: 'Envía', swap: 'Cambia', parity: '1 PXO = 1 MXN', always: '24/7', borderless: 'Sin fronteras', tokens: 'USDT · USDC' },
    products: {
      eyebrow: 'Productos',
      heading: 'Compra, transfiere y cambia PXO desde tu celular.',
      soon: 'Próximamente',
      buy: { title: 'Compra', text: 'Compra PXO con una transferencia. 1 PXO siempre vale 1 peso.' },
      transfer: { title: 'Transfiere', text: 'Envía PXO a cualquier parte del mundo, 24/7.' },
      exchange: { title: 'Cambio', text: 'Cambia PXO por USDT o USDC cuando quieras.' },
      payLink: { title: 'Link de pago', text: 'Podrás cobrar en PXO en cualquier parte del mundo.' },
    },
    screens: {
      account: { title: 'Mi cuenta', balance: 'Saldo', buy: 'Comprar', send: 'Enviar', swap: 'Cambiar', txBuy: 'Compra por transferencia', txSend: 'Envío', txSwap: 'Cambio a USDT' },
      swap: { title: 'Cambiar', pay: 'Pagas', get: 'Recibes aprox.', note: 'Sin horarios bancarios', action: 'Cambiar ahora' },
      send: { title: 'Enviar', ok: 'Enviado con éxito', timeLabel: 'Tiempo', timeValue: 'Segundos', action: 'Listo' },
      payLink: { title: 'Link de pago', ok: 'Cobro recibido', conceptLabel: 'Concepto', conceptValue: 'Pedido 1042', fromLabel: 'Desde', fromValue: 'Madrid, ES', action: 'Crear link de pago' },
    },
    how: {
      eyebrow: 'Cómo funciona',
      heading: 'Empieza en tres pasos.',
      s1: 'Crea tu cuenta', s1p: 'Regístrate en minutos desde tu celular.',
      s2: 'Envía MXN', s2p: 'Realiza una transferencia desde tu banco.',
      s3: 'Compra PXO', s3p: 'Tus pesos digitales, listos para usar.',
    },
    parity: { eyebrow: 'Así de simple', unit: '1 MXN', text: 'Respaldado 1 a 1 con pesos mexicanos.', convIn: 'Tienes (MXN)', convOut: 'Recibes (PXO)' },
    benefits: {
      eyebrow: 'Beneficios PXO',
      heading: 'Usa PXO y recibe beneficios',
      text: 'Un programa de beneficios para quienes mantienen y usan PXO.',
      s1: 'Mantén PXO', s2: 'Paga y envía', s3: 'Cambia a dólares digitales', s4: 'Recibe beneficios',
    },
    trust: { backing: 'Respaldo en pesos', hours: 'Opera sin horarios' },
    cta: { eyebrow: 'Empieza hoy', heading: '¿Listo para usar PXO sin fronteras?', text: 'Crea tu cuenta en minutos.' },
    footer: {
      menu: 'Menú',
      legal: 'Legal',
      privacy: 'Aviso de privacidad',
      terms: 'Términos y condiciones',
      disclaimer: 'PXO es una marca de PXO Token Company. Nada de lo contenido en este sitio debe interpretarse como asesoramiento de inversión. Los activos digitales implican riesgos. Los productos marcados como “Próximamente” aún no están disponibles. PXO no presta servicios en jurisdicciones donde la legislación aplicable lo impida.',
      rights: 'Todos los derechos reservados.',
    },
  },
} as const;
