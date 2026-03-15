/**
 * Typed translation dictionary for landing (en, it, fr, de).
 * RALPH-safe: pure data, no side effects.
 */

export const SUPPORTED_LANGS = ["en", "it", "fr", "de"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const DEFAULT_LANG: Lang = "en";

export function isValidLang(s: string): s is Lang {
  return SUPPORTED_LANGS.includes(s as Lang);
}

export function getLang(langParam: string | undefined): Lang {
  if (langParam && isValidLang(langParam)) return langParam;
  return DEFAULT_LANG;
}

export type Translations = {
  nav: {
    login: string;
    waitlist: string;
    deposit: string;
  };
  hero: {
    variantA: string;
    variantB: string;
    subline: string;
    cta: string;
    ctaSecondary: string;
  };
  problem: {
    title: string;
    item1: string;
    item2: string;
    item3: string;
  };
  solution: {
    title: string;
    card1Title: string;
    card1Desc: string;
    card2Title: string;
    card2Desc: string;
    card3Title: string;
    card3Desc: string;
  };
  howItWorks: {
    title: string;
    step1: string;
    step1Desc: string;
    step2: string;
    step2Desc: string;
    step3: string;
    step3Desc: string;
  };
  containerScroll: {
    title: string;
  };
  valueStack: {
    title: string;
    item1: string;
    item2: string;
    item3: string;
    item4: string;
  };
  faq: {
    title: string;
    q1: string;
    a1: string;
    q2: string;
    a2: string;
    q3: string;
    a3: string;
  };
  cta: {
    title: string;
    sub: string;
    button: string;
  };
  waitlist: {
    title: string;
    sub: string;
    name: string;
    email: string;
    phone: string;
    resort: string;
    instructorType: string;
    languages: string;
    experience: string;
    highSeasonWeeks: string;
    consent: string;
    submit: string;
    submitting: string;
  };
  deposit: {
    title: string;
    sub: string;
    button: string;
    price: string;
  };
  login: {
    title: string;
    sub: string;
    email: string;
    sendLink: string;
    sending: string;
  };
  thankYou: {
    title: string;
    message: string;
  };
  depositSuccess: {
    title: string;
    message: string;
  };
  depositCancel: {
    title: string;
    message: string;
  };
  onboarding: {
    gateMessage: string;
  };
  meta: {
    title: string;
    description: string;
  };
};

const translations: Record<Lang, Translations> = {
  en: {
    nav: { login: "Log in", waitlist: "Join waitlist", deposit: "Reserve spot" },
    hero: {
      variantA: "Fill your calendar. Eliminate admin. Stay in control.",
      variantB: "Stop losing bookings. Automate your operations.",
      subline: "AI-powered operations for ski & diving instructors.",
      cta: "Join the waitlist",
      ctaSecondary: "Reserve your spot",
    },
    problem: {
      title: "The problem",
      item1: "Back-and-forth messages eat your time.",
      item2: "Manual booking and reminders don't scale.",
      item3: "You lose students when you're slow to reply.",
    },
    solution: {
      title: "One platform. Less admin. More students.",
      card1Title: "Smart inbox",
      card1Desc: "One place for messages, AI drafts, and quick replies.",
      card2Title: "Booking & reminders",
      card2Desc: "Automate confirmations and no-shows.",
      card3Title: "Your calendar, full",
      card3Desc: "Fewer gaps, more control over your schedule.",
    },
    howItWorks: {
      title: "How it works",
      step1: "Join the waitlist",
      step1Desc: "Tell us about your resort and experience.",
      step2: "Get early access",
      step2Desc: "We onboard instructors in small batches.",
      step3: "Go live",
      step3Desc: "Connect WhatsApp, calendar, and start saving time.",
    },
    containerScroll: {
      title: "See it in action",
    },
    valueStack: {
      title: "What you get",
      item1: "WhatsApp integration",
      item2: "AI reply suggestions",
      item3: "Booking automation",
      item4: "Calendar sync",
    },
    faq: {
      title: "FAQ",
      q1: "Who is FrostDesk for?",
      a1: "Ski and diving instructors who want to fill their calendar and cut admin time.",
      q2: "Is there a free trial?",
      a2: "Early access is limited. Join the waitlist to be invited.",
      q3: "What does the deposit do?",
      a3: "A refundable €99 deposit reserves your onboarding slot and prioritizes you.",
    },
    cta: {
      title: "Ready to take back your time?",
      sub: "Join hundreds of instructors on the waitlist.",
      button: "Join waitlist",
    },
    waitlist: {
      title: "Join the waitlist",
      sub: "We'll notify you when we open your region.",
      name: "Name",
      email: "Email",
      phone: "Phone",
      resort: "Resort / area",
      instructorType: "Instructor type",
      languages: "Languages you teach in",
      experience: "Years of experience",
      highSeasonWeeks: "Typical high-season weeks per year",
      consent: "I agree to be contacted about FrostDesk and product updates.",
      submit: "Submit",
      submitting: "Submitting…",
    },
    deposit: {
      title: "Secure Early Access",
      sub: "Reserve your onboarding slot with a refundable €99 deposit.",
      button: "Reserve My Spot",
      price: "€99",
    },
    login: {
      title: "Log in",
      sub: "We'll send you a magic link to sign in.",
      email: "Email",
      sendLink: "Send magic link",
      sending: "Sending…",
    },
    thankYou: {
      title: "You're on the list",
      message: "We'll be in touch when we're ready for your region.",
    },
    depositSuccess: {
      title: "You're in",
      message: "Your spot is reserved. We'll contact you for onboarding.",
    },
    depositCancel: {
      title: "No problem",
      message: "You can reserve your spot anytime from the landing page.",
    },
    onboarding: {
      gateMessage: "You need to join the waitlist or complete your deposit to access onboarding.",
    },
    meta: {
      title: "FrostDesk — Fill your calendar. Eliminate admin.",
      description: "AI-powered operations for ski and diving instructors. Join the waitlist.",
    },
  },
  it: {
    nav: { login: "Accedi", waitlist: "Waitlist", deposit: "Prenota posto" },
    hero: {
      variantA: "Riempi il calendario. Elimina l'amministrazione. Resta in controllo.",
      variantB: "Basta perdere prenotazioni. Automatizza le tue operazioni.",
      subline: "Operazioni basate su AI per maestri di sci e istruttori sub.",
      cta: "Iscriviti alla waitlist",
      ctaSecondary: "Prenota il tuo posto",
    },
    problem: {
      title: "Il problema",
      item1: "Messaggi avanti e indietro ti rubano tempo.",
      item2: "Prenotazioni e promemoria manuali non scalano.",
      item3: "Perdi allievi quando rispondi in ritardo.",
    },
    solution: {
      title: "Una piattaforma. Meno burocrazia. Più allievi.",
      card1Title: "Inbox intelligente",
      card1Desc: "Un unico posto per messaggi, bozze AI e risposte rapide.",
      card2Title: "Prenotazioni e promemoria",
      card2Desc: "Automatizza conferme e no-show.",
      card3Title: "Calendario pieno",
      card3Desc: "Meno buchi, più controllo sulla tua agenda.",
    },
    howItWorks: {
      title: "Come funziona",
      step1: "Iscriviti alla waitlist",
      step1Desc: "Raccontaci resort ed esperienza.",
      step2: "Ottieni accesso anticipato",
      step2Desc: "Onboardiamo gli istruttori a piccoli gruppi.",
      step3: "Vai live",
      step3Desc: "Collega WhatsApp, calendario e inizia a risparmiare tempo.",
    },
    containerScroll: {
      title: "Vedilo in azione",
    },
    valueStack: {
      title: "Cosa ottieni",
      item1: "Integrazione WhatsApp",
      item2: "Suggerimenti risposta AI",
      item3: "Automazione prenotazioni",
      item4: "Sincronizzazione calendario",
    },
    faq: {
      title: "FAQ",
      q1: "Per chi è FrostDesk?",
      a1: "Maestri di sci e istruttori sub che vogliono riempire il calendario e tagliare l'amministrazione.",
      q2: "C'è una prova gratuita?",
      a2: "L'accesso anticipato è limitato. Iscriviti alla waitlist per essere invitato.",
      q3: "A cosa serve il deposito?",
      a3: "Un deposito rimborsabile di €99 riserva il tuo slot di onboarding e ti dà priorità.",
    },
    cta: {
      title: "Pronto a riprenderti il tempo?",
      sub: "Unisciti a centinaia di istruttori in waitlist.",
      button: "Iscriviti alla waitlist",
    },
    waitlist: {
      title: "Iscriviti alla waitlist",
      sub: "Ti avviseremo quando apriamo la tua zona.",
      name: "Nome",
      email: "Email",
      phone: "Telefono",
      resort: "Località / zona",
      instructorType: "Tipo di istruttore",
      languages: "Lingue in cui insegni",
      experience: "Anni di esperienza",
      highSeasonWeeks: "Settimane tipiche di alta stagione all'anno",
      consent: "Acconsento a essere contattato su FrostDesk e aggiornamenti prodotto.",
      submit: "Invia",
      submitting: "Invio…",
    },
    deposit: {
      title: "Accesso anticipato garantito",
      sub: "Riserva il tuo slot di onboarding con un deposito rimborsabile di €99.",
      button: "Riserva il mio posto",
      price: "€99",
    },
    login: {
      title: "Accedi",
      sub: "Ti invieremo un magic link per accedere.",
      email: "Email",
      sendLink: "Invia magic link",
      sending: "Invio…",
    },
    thankYou: {
      title: "Sei in lista",
      message: "Ti contatteremo quando saremo pronti per la tua zona.",
    },
    depositSuccess: {
      title: "Sei dentro",
      message: "Il tuo posto è riservato. Ti contatteremo per l'onboarding.",
    },
    depositCancel: {
      title: "Nessun problema",
      message: "Puoi riservare il posto in qualsiasi momento dalla landing.",
    },
    onboarding: {
      gateMessage: "Devi iscriverti alla waitlist o completare il deposito per accedere all'onboarding.",
    },
    meta: {
      title: "FrostDesk — Riempi il calendario. Elimina l'amministrazione.",
      description: "Operazioni basate su AI per maestri di sci e istruttori. Iscriviti alla waitlist.",
    },
  },
  fr: {
    nav: { login: "Connexion", waitlist: "Liste d'attente", deposit: "Réserver" },
    hero: {
      variantA: "Remplissez votre calendrier. Éliminez l'admin. Gardez le contrôle.",
      variantB: "Arrêtez de perdre des réservations. Automatisez vos opérations.",
      subline: "Opérations pilotées par l'IA pour moniteurs de ski et de plongée.",
      cta: "Rejoindre la liste",
      ctaSecondary: "Réserver ma place",
    },
    problem: {
      title: "Le problème",
      item1: "Les allers-retours de messages mangent votre temps.",
      item2: "Réservations et rappels manuels ne passent pas à l'échelle.",
      item3: "Vous perdez des élèves quand vous répondez trop tard.",
    },
    solution: {
      title: "Une plateforme. Moins d'admin. Plus d'élèves.",
      card1Title: "Boîte de réception intelligente",
      card1Desc: "Un seul endroit pour messages, brouillons IA et réponses rapides.",
      card2Title: "Réservations et rappels",
      card2Desc: "Automatisez confirmations et no-show.",
      card3Title: "Votre calendrier, rempli",
      card3Desc: "Moins de trous, plus de contrôle sur votre planning.",
    },
    howItWorks: {
      title: "Comment ça marche",
      step1: "Rejoignez la liste",
      step1Desc: "Parlez-nous de votre station et de votre expérience.",
      step2: "Accès anticipé",
      step2Desc: "On embarque les moniteurs par petits lots.",
      step3: "Passez en prod",
      step3Desc: "Connectez WhatsApp, calendrier et gagnez du temps.",
    },
    containerScroll: {
      title: "Voir en action",
    },
    valueStack: {
      title: "Ce que vous obtenez",
      item1: "Intégration WhatsApp",
      item2: "Suggestions de réponses IA",
      item3: "Automatisation des réservations",
      item4: "Sync calendrier",
    },
    faq: {
      title: "FAQ",
      q1: "Pour qui est FrostDesk ?",
      a1: "Moniteurs de ski et de plongée qui veulent remplir leur calendrier et réduire l'admin.",
      q2: "Y a-t-il un essai gratuit ?",
      a2: "L'accès anticipé est limité. Rejoignez la liste pour être invité.",
      q3: "À quoi sert le dépôt ?",
      a3: "Un dépôt remboursable de 99 € réserve votre créneau d'onboarding et vous priorise.",
    },
    cta: {
      title: "Prêt à reprendre le contrôle de votre temps ?",
      sub: "Rejoignez des centaines de moniteurs sur la liste.",
      button: "Rejoindre la liste",
    },
    waitlist: {
      title: "Rejoindre la liste",
      sub: "Nous vous préviendrons quand nous ouvrons votre région.",
      name: "Nom",
      email: "Email",
      phone: "Téléphone",
      resort: "Station / zone",
      instructorType: "Type de moniteur",
      languages: "Langues d'enseignement",
      experience: "Années d'expérience",
      highSeasonWeeks: "Semaines haute saison par an",
      consent: "J'accepte d'être contacté concernant FrostDesk et les mises à jour.",
      submit: "Envoyer",
      submitting: "Envoi…",
    },
    deposit: {
      title: "Accès anticipé sécurisé",
      sub: "Réservez votre créneau d'onboarding avec un dépôt remboursable de 99 €.",
      button: "Réserver ma place",
      price: "99 €",
    },
    login: {
      title: "Connexion",
      sub: "Nous vous enverrons un lien magique pour vous connecter.",
      email: "Email",
      sendLink: "Envoyer le lien",
      sending: "Envoi…",
    },
    thankYou: {
      title: "Vous êtes sur la liste",
      message: "Nous vous contacterons quand nous serons prêts pour votre région.",
    },
    depositSuccess: {
      title: "C'est fait",
      message: "Votre place est réservée. Nous vous contacterons pour l'onboarding.",
    },
    depositCancel: {
      title: "Pas de souci",
      message: "Vous pouvez réserver votre place à tout moment depuis la page d'accueil.",
    },
    onboarding: {
      gateMessage: "Rejoignez la liste ou complétez le dépôt pour accéder à l'onboarding.",
    },
    meta: {
      title: "FrostDesk — Remplissez votre calendrier. Éliminez l'admin.",
      description: "Opérations pilotées par l'IA pour moniteurs. Rejoignez la liste.",
    },
  },
  de: {
    nav: { login: "Anmelden", waitlist: "Warteliste", deposit: "Platz sichern" },
    hero: {
      variantA: "Kalender füllen. Verwaltung reduzieren. Alles unter Kontrolle.",
      variantB: "Keine verlorenen Buchungen mehr. Abläufe automatisieren.",
      subline: "KI-gestützte Abläufe für Ski- und Tauchlehrer.",
      cta: "Zur Warteliste",
      ctaSecondary: "Platz sichern",
    },
    problem: {
      title: "Das Problem",
      item1: "Hin und her schreiben kostet Zeit.",
      item2: "Manuelle Buchungen und Erinnerungen skalieren nicht.",
      item3: "Du verlierst Schüler, wenn du zu spät antwortest.",
    },
    solution: {
      title: "Eine Plattform. Weniger Verwaltung. Mehr Schüler.",
      card1Title: "Smartes Postfach",
      card1Desc: "Ein Ort für Nachrichten, KI-Entwürfe und schnelle Antworten.",
      card2Title: "Buchung & Erinnerungen",
      card2Desc: "Bestätigungen und No-Shows automatisieren.",
      card3Title: "Voller Kalender",
      card3Desc: "Weniger Lücken, mehr Kontrolle über deinen Plan.",
    },
    howItWorks: {
      title: "So funktioniert's",
      step1: "Zur Warteliste",
      step1Desc: "Erzähl uns von deinem Gebiet und deiner Erfahrung.",
      step2: "Frühzugang",
      step2Desc: "Wir onboarden Tauchlehrer in kleinen Gruppen.",
      step3: "Live gehen",
      step3Desc: "WhatsApp und Kalender verbinden, Zeit sparen.",
    },
    containerScroll: {
      title: "In Aktion sehen",
    },
    valueStack: {
      title: "Was du bekommst",
      item1: "WhatsApp-Anbindung",
      item2: "KI-Antwortvorschläge",
      item3: "Buchungsautomation",
      item4: "Kalender-Sync",
    },
    faq: {
      title: "FAQ",
      q1: "Für wen ist FrostDesk?",
      a1: "Ski- und Tauchlehrer, die ihren Kalender füllen und Verwaltung reduzieren wollen.",
      q2: "Gibt es eine kostenlose Testversion?",
      a2: "Frühzugang ist begrenzt. Melde dich auf der Warteliste an.",
      q3: "Wofür ist die Anzahlung?",
      a3: "Eine erstattungsfähige Anzahlung von 99 € sichert deinen Onboarding-Slot.",
    },
    cta: {
      title: "Bereit, deine Zeit zurückzugewinnen?",
      sub: "Hunderte Tauchlehrer sind schon auf der Warteliste.",
      button: "Zur Warteliste",
    },
    waitlist: {
      title: "Zur Warteliste",
      sub: "Wir melden uns, wenn wir deine Region öffnen.",
      name: "Name",
      email: "E-Mail",
      phone: "Telefon",
      resort: "Ort / Gebiet",
      instructorType: "Art des Lehrers",
      languages: "Unterrichtssprachen",
      experience: "Jahre Erfahrung",
      highSeasonWeeks: "Hochsaison-Wochen pro Jahr",
      consent: "Ich bin einverstanden, zu FrostDesk und Updates kontaktiert zu werden.",
      submit: "Absenden",
      submitting: "Wird gesendet…",
    },
    deposit: {
      title: "Frühzugang sichern",
      sub: "Sichere dir deinen Onboarding-Slot mit einer erstattungsfähigen Anzahlung von 99 €.",
      button: "Platz sichern",
      price: "99 €",
    },
    login: {
      title: "Anmelden",
      sub: "Wir schicken dir einen Magic-Link zum Einloggen.",
      email: "E-Mail",
      sendLink: "Magic-Link senden",
      sending: "Wird gesendet…",
    },
    thankYou: {
      title: "Du bist auf der Liste",
      message: "Wir melden uns, wenn wir deine Region öffnen.",
    },
    depositSuccess: {
      title: "Dabei",
      message: "Dein Platz ist reserviert. Wir melden uns zum Onboarding.",
    },
    depositCancel: {
      title: "Kein Problem",
      message: "Du kannst jederzeit von der Landing-Seite aus einen Platz sichern.",
    },
    onboarding: {
      gateMessage: "Melde dich auf der Warteliste an oder zahle die Anzahlung, um Onboarding zu nutzen.",
    },
    meta: {
      title: "FrostDesk — Kalender füllen. Verwaltung reduzieren.",
      description: "KI-gestützte Abläufe für Ski- und Tauchlehrer. Zur Warteliste.",
    },
  },
};

export function getTranslations(lang: Lang): Translations {
  return translations[lang];
}
