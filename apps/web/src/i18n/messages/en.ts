import type { Messages } from './schema';

/**
 * English catalogue. Typed as `Messages`, so a key missing here (or one that no
 * longer exists in the Spanish reference) fails the build.
 */
export const en: Messages = {
  nav: {
    individual: 'Individual',
    company: 'Business',
    about: 'About',
    openMenu: 'Open menu',
    language: 'Language',
    items: {
      buySell: {
        title: 'Buy and sell PXO',
        sub: 'Convert between pesos and PXO at the best rate, 24/7.',
      },
      account: {
        title: 'Digital peso account',
        sub: 'Manage your digital pesos with institutional-grade security.',
      },
      spei: {
        title: 'SPEI transfers',
        sub: 'Send and receive pesos from any bank. No fees, 24/7.',
      },
      dollars: {
        title: 'Digital dollars',
        sub: 'Convert your pesos to digital dollars in seconds, at the best rate.',
      },
    },
    about_items: {
      terms: 'Terms and conditions',
      privacy: 'Privacy policy',
      blog: 'Blog',
      help: 'Help center',
    },
  },

  cta: {
    startNow: 'Get started',
    openAccount: 'Open your account',
    connecting: 'Connecting...',
  },

  hero: {
    titleLead: 'Your pesos, now also',
    titleAccent: 'digital.',
    sub: 'Convert, send and receive digital MXN in seconds from a single app.',
    trust: {
      backed: '✓ Backed 1:1 by MXN',
      audits: '✓ Monthly audits',
      always: '✓ Available 24/7',
    },
  },

  stats: {
    usersNum: '+250M',
    usersLabel: 'people already use digital currencies worldwide',
    backedNum: '1:1',
    backedLabel: 'PXO backed by MXN, always',
    speiNum: '24/7',
    speiLabel: 'SPEI transfers with no cut-off times',
  },

  useCases: {
    label: 'What we do',
    buy: { title: 'Buy', sub: 'MXN → PXO instantly' },
    sell: { title: 'Sell', sub: 'PXO → MXN to your bank' },
    send: { title: 'Send', sub: 'To any wallet or address' },
    receive: { title: 'Receive', sub: 'From another wallet or via SPEI' },
    supportedTokens: 'Supported tokens',
    pxoCaption: 'Digital Peso · 1:1 MXN',
    usdtCaption: 'Tether USD',
    usdcCaption: 'USD Coin',
  },

  how: {
    tag: 'How does it work?',
    title: 'Three steps and you are in',
    sub: 'No crypto knowledge needed. No complicated paperwork.',
    steps: {
      account: {
        title: 'Create your account',
        sub: 'Sign up with your email and verify your identity in minutes.',
      },
      deposit: {
        title: 'Deposit via SPEI',
        sub: 'Transfer from any Mexican bank. No fees, 24/7.',
      },
      use: {
        title: 'Use your PXO',
        sub: 'Buy, sell, send and receive digital pesos instantly.',
      },
    },
  },

  why: {
    tag: 'Why PXO Token',
    titleLead: 'Why open a',
    titleAccent: 'digital peso',
    titleTrail: ' account?',
    sub: 'Because your money can live on a financial infrastructure that is more modern, global and flexible than the traditional system.',
    benefits: {
      infrastructure: 'Modern infrastructure',
      global: 'Global use',
      compliance: 'Regulatory compliance',
      always: 'Convert 24/7',
      custody: 'Funds in 1:1 custody',
      audit: 'Monthly audit',
      pesos: '100% in pesos',
    },
  },

  spei: {
    titlePart1: 'Convert your',
    titleAccent1: 'digital pesos',
    titlePart2: 'to',
    titleAccent2: 'pesos',
    titlePart3: 'and receive them in your bank in minutes.',
    features: {
      transfers: 'Transfers via SPEI.',
      always: 'Available 24/7',
      liquidity: 'Institutional-grade liquidity',
    },
    walletAlt: 'PXO Wallet',
    tagReceived: 'You received $12,450 PXO',
    tagSold: 'You sold 3,200 PXO → $3,200 MXN',
  },

  faq: {
    title: 'Frequently Asked Questions',
    helpLink: 'Visit the help center ›',
    items: {
      what: {
        q: 'What are digital pesos or PXO Token?',
        a: 'PXO Token is a Mexican digital peso: 1 PXO = 1 MXN, always. It runs on BNB Smart Chain (BSC), which means every transaction is transparent and publicly verifiable. Unlike dollar stablecoins, PXO lets you save, pay and transfer directly in pesos, without exposure to exchange-rate volatility.',
      },
      howToGet: {
        q: 'How can I get PXO Token?',
        a: 'It is simple: go to PXO Token, create your account in minutes and deposit from any Mexican bank via SPEI. Your pesos are automatically converted into PXO and you can use them to pay, send, or exchange for digital dollars.',
      },
      usage: {
        q: 'What can I use my digital pesos for?',
        a: 'With PXO you can: deposit and withdraw via SPEI, transfer to other users with no fee, convert your pesos to digital dollars at the best rate, and pay across the digital economy from a single app.',
      },
      safety: {
        q: 'Are my funds safe?',
        a: 'Yes. Every PXO is backed 1:1 by a Mexican peso held in custody. Reserves are audited monthly and published publicly. The smart contract runs on Polygon. We comply with applicable Mexican regulation (Ley Fintech, CNBV, Banxico).',
      },
    },
  },

  finalCta: {
    title: 'Get started',
    sub: 'Open your account in minutes. No crypto knowledge required.',
  },

  footer: {
    logoSub: 'Mexican Digital Peso',
    tagline: 'The Mexican digital peso. Backed 1:1 by MXN. Audited monthly.',
    colIndividual: 'Individual',
    colAbout: 'About',
    links: {
      home: 'Home',
      buySell: 'Buy and sell',
      account: 'Digital peso account',
      spei: 'SPEI transfers',
      dollars: 'Digital dollars',
    },
    legal:
      'Intermediation and administration services for the purchase, sale and custody of digital pesos are provided by PXO TOKEN, a company duly incorporated under the laws of the United Mexican States. The vulnerable activities identified are carried out in compliance with the Federal Law for the Prevention and Identification of Operations with Resources of Illicit Origin and other applicable Mexican regulation. PXO Token does not promote financial advisory services. Our activity is limited exclusively to the purchase and sale of virtual assets. We do not guarantee returns nor provide financial recommendations. Each user is responsible for their own decisions and must inform themselves adequately before carrying out any operation.',
    legalCompany: 'PXO TOKEN',
  },

  legal: {
    viewerTitle: 'Terms & Conditions',
    dashboardTitle: 'Legal',
    close: 'Close',
    gateTitle: 'Before you continue',
    gateSubmit: 'Submit',
    read: (label: string) => `Read ${label}`,
    accept: 'Accept',
    disagree: 'Disagree',
    scrollHint: 'Scroll to the end of the document to enable',
    consentLine: (party: string) =>
      `${party} — By checking this box I confirm I wish to create an account with ${party} and that I have read the ${party} terms of service and privacy policy and agree to them.`,
    docTitle: (party: string) => `${party} Terms & Conditions`,
  },
};
