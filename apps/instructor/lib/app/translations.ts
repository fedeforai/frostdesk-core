/**
 * Typed translation dictionary for instructor app (en, it).
 * Used by (app) area with useAppLocale() + getAppTranslations(locale).
 */

import type { AppLocale } from './AppLocaleContext';

export type AppTranslations = {
  common: {
    save: string;
    cancel: string;
    retry: string;
    loading: string;
    error: string;
    success: string;
    add: string;
    remove: string;
    login: string;
    signingOut: string;
    logout: string;
    signOut: string;
  };
  shell: {
    title: string;
    subtitle: string;
    profileLink: string;
    ariaProfile: string;
    openMenu: string;
    closeMenu: string;
    refund: string;
    privacy: string;
    terms: string;
    cookies: string;
    acceptableUse: string;
    langIt: string;
    langEn: string;
    ariaLangIt: string;
    ariaLangEn: string;
    nav: {
      today: string;
      todayDesc: string;
      dashboard: string;
      dashboardDesc: string;
      inbox: string;
      inboxDesc: string;
      lessons: string;
      lessonsDesc: string;
      proposals: string;
      proposalsDesc: string;
      conflicts: string;
      conflictsDesc: string;
      schedule: string;
      scheduleDesc: string;
      services: string;
      servicesDesc: string;
      meetingPoints: string;
      meetingPointsDesc: string;
      calendar: string;
      calendarDesc: string;
      clients: string;
      clientsDesc: string;
      profile: string;
      profileDesc: string;
      settings: string;
      settingsDesc: string;
      advanced: string;
      advancedDesc: string;
      sectionToday: string;
      sectionManage: string;
      sectionAccount: string;
      sectionSettings: string;
    };
  };
  profile: {
    title: string;
    configureHint: string;
    loading: string;
    retry: string;
    notAuthorized: string;
    loadError: string;
    tabIdentity: string;
    tabMarketing: string;
    tabOperations: string;
    fullName: string;
    displayName: string;
    displayNamePlaceholder: string;
    slug: string;
    slugReadOnly: string;
    baseResort: string;
    baseResortPlaceholder: string;
    otherLocations: string;
    otherLocationsHint: string;
    addLocation: string;
    removeLocation: string;
    locationPlaceholder: string;
    workingLanguage: string;
    selectLanguage: string;
    additionalLanguages: string;
    timezone: string;
    selectTimezone: string;
    timezoneOther: string;
    contactEmail: string;
    saveIdentity: string;
    saveMarketing: string;
    saveOperations: string;
    saving: string;
    shortBio: string;
    shortBioMax: string;
    extendedBio: string;
    teachingPhilosophy: string;
    targetAudience: string;
    uspTags: string;
    addTag: string;
    maxStudentsPrivate: string;
    maxStudentsGroup: string;
    minBookingDuration: string;
    sameDayBookingAllowed: string;
    advanceBookingHours: string;
    travelBufferMinutes: string;
    allIdentityRequired: string;
    removeTag: string;
  };
  today: {
    title: string;
    loading: string;
    dailyView: string;
    nextLesson: string;
    noLessonsToday: string;
    openBooking: string;
    inbox: string;
    todaysLessons: string;
    seeAllLessons: string;
    open: string;
    unpaid: string;
    unpaidCount: string;
    noUnpaid: string;
    seeUnpaid: string;
    proposals: string;
    proposalsCount: string;
    noProposals: string;
    seeProposals: string;
    failedToLoad: string;
  };
  dashboard: {
    title: string;
    sub: string;
    automationSwitch: string;
    on: string;
    off: string;
    startApiToConnect: string;
    apiConnected: string;
    apiDisconnected: string;
    checking: string;
    sessionExpired: string;
    retryAbove: string;
    loadingLiveData: string;
    noConversations: string;
    loading: string;
    businessIntelligence: string;
    revenue: string;
    paidBookings: string;
    avgBookingValue: string;
    completedLessons: string;
    completionRate: string;
    repeatCustomerRate: string;
    revenueTrend: string;
    bookingFunnel: string;
    created: string;
    confirmed: string;
    completed: string;
    cancelled: string;
    declined: string;
    conversionRate: string;
    cancellationRate: string;
    draftsGenerated: string;
    draftsUsed: string;
    draftsIgnored: string;
    draftUsageRate: string;
    draftKpisLoading: string;
    automationOn: string;
    automationOff: string;
    automationPauseHint: string;
    automationResumeHint: string;
    turnOn: string;
    turnOff: string;
    pauseAutomation: string;
    resumeAutomation: string;
    connected: string;
    disconnected: string;
    unavailable: string;
    notConnected: string;
    frostDeskSwitch: string;
    googleCalendar: string;
    notEnoughData: string;
    createTestBooking: string;
    openInbox: string;
    funnelSummary: string;
    conversation: string;
    openInInbox: string;
    lastMessage: string;
    selectConversation: string;
    automationIsOn: string;
    automationIsOff: string;
    failedToUpdate: string;
  };
  aiWhatsApp: {
    label: string;
    on: string;
    off: string;
    titleOn: string;
    titleOff: string;
    toastOn: string;
    toastOff: string;
    ariaLabel: string;
  };
};

const en: AppTranslations = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    retry: 'Retry',
    loading: 'Loading…',
    error: 'Error',
    success: 'Success',
    add: 'Add',
    remove: 'Remove',
    login: 'Login',
    signingOut: 'Signing out…',
    logout: 'Logout',
    signOut: 'Sign out',
  },
  shell: {
    title: 'FrostDesk',
    subtitle: 'Instructor',
    profileLink: 'Profile',
    ariaProfile: 'Go to profile',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    refund: 'Refund',
    privacy: 'Privacy',
    terms: 'Terms',
    cookies: 'Cookies',
    acceptableUse: 'Acceptable Use',
    langIt: 'IT',
    langEn: 'EN',
    ariaLangIt: 'Select Italian',
    ariaLangEn: 'Select English',
    nav: {
      today: 'Today',
      todayDesc: 'Daily control view',
      dashboard: 'Dashboard',
      dashboardDesc: 'KPIs and overview',
      inbox: 'Inbox',
      inboxDesc: 'Messages and requests',
      lessons: 'Lessons',
      lessonsDesc: 'Today and upcoming',
      proposals: 'Proposals',
      proposalsDesc: 'Review and send',
      conflicts: 'Conflicts',
      conflictsDesc: 'Resolve overlaps',
      schedule: 'Schedule',
      scheduleDesc: 'Set availability',
      services: 'Services',
      servicesDesc: 'What you offer',
      meetingPoints: 'Meeting points',
      meetingPointsDesc: 'Where to meet',
      calendar: 'Calendar',
      calendarDesc: 'Sync and connect',
      clients: 'Clients',
      clientsDesc: 'Notes and history',
      profile: 'Profile',
      profileDesc: 'Your details',
      settings: 'Settings',
      settingsDesc: 'Preferences',
      advanced: 'Advanced',
      advancedDesc: 'Technical and audit',
      sectionToday: 'TODAY',
      sectionManage: 'MANAGE',
      sectionAccount: 'ACCOUNT',
      sectionSettings: 'SETTINGS',
    },
  },
  profile: {
    title: 'Profile',
    configureHint: 'Configure your profile by filling in the fields below.',
    loading: 'Loading profile…',
    retry: 'Retry',
    notAuthorized: 'Not authorized. You do not have permission to access this page.',
    loadError: "Couldn't load profile. Check your connection and retry.",
    tabIdentity: 'Identity',
    tabMarketing: 'Marketing',
    tabOperations: 'Operations',
    fullName: 'Full Name *',
    displayName: 'Display name',
    displayNamePlaceholder: 'Optional; defaults to full name',
    slug: 'Slug',
    slugReadOnly: 'Read-only (managed by the system)',
    baseResort: 'Base Resort *',
    baseResortPlaceholder: 'E.g. Cervinia, Zermatt',
    otherLocations: 'Other locations where you can give lessons',
    otherLocationsHint: 'Add other locations (in addition to Base Resort) where you offer lessons.',
    addLocation: '+ Add location',
    removeLocation: 'Remove',
    locationPlaceholder: 'Location name',
    workingLanguage: 'Working Language *',
    selectLanguage: 'Select language',
    additionalLanguages: 'Additional languages',
    timezone: 'Timezone',
    selectTimezone: 'Select timezone',
    timezoneOther: 'Other (IANA)',
    contactEmail: 'Contact Email *',
    saveIdentity: 'Save Identity',
    saveMarketing: 'Save Marketing',
    saveOperations: 'Save Operations',
    saving: 'Saving...',
    shortBio: 'Short bio (max',
    shortBioMax: 'characters)',
    extendedBio: 'Extended bio',
    teachingPhilosophy: 'Teaching philosophy',
    targetAudience: 'Target audience',
    uspTags: 'USP tags',
    addTag: 'Add tag',
    maxStudentsPrivate: 'Max students (private)',
    maxStudentsGroup: 'Max students (group)',
    minBookingDuration: 'Min booking duration (minutes)',
    sameDayBookingAllowed: 'Same-day booking allowed',
    advanceBookingHours: 'Advance booking (hours)',
    travelBufferMinutes: 'Travel buffer (minutes)',
    allIdentityRequired: 'All identity fields are required',
    removeTag: 'Remove',
  },
  today: {
    title: 'Today',
    loading: 'Loading…',
    dailyView: 'Daily control view',
    nextLesson: 'Next lesson',
    noLessonsToday: 'No lessons today',
    openBooking: 'Open booking',
    inbox: 'Inbox',
    todaysLessons: "Today's lessons",
    seeAllLessons: 'See all today\'s lessons →',
    open: 'Open',
    unpaid: 'Unpaid',
    unpaidCount: 'Unpaid',
    noUnpaid: 'No unpaid bookings',
    seeUnpaid: 'See unpaid bookings →',
    proposals: 'Proposals',
    proposalsCount: 'Proposals to confirm',
    noProposals: 'No proposals pending',
    seeProposals: 'See proposals →',
    failedToLoad: 'Failed to load',
  },
  dashboard: {
    title: 'Dashboard',
    sub: 'Overview and automations',
    automationSwitch: 'Automation switch',
    on: 'ON',
    off: 'OFF',
    startApiToConnect: 'Start API to connect',
    apiConnected: 'API connected',
    apiDisconnected: 'API disconnected',
    checking: 'Checking…',
    sessionExpired: 'Session expired or not authenticated.',
    retryAbove: 'Retry above to load conversations.',
    loadingLiveData: 'Loading live data…',
    noConversations: 'No conversations yet',
    loading: 'Loading…',
    businessIntelligence: 'Business Intelligence',
    revenue: 'Revenue',
    paidBookings: 'Paid bookings',
    avgBookingValue: 'Avg booking value',
    completedLessons: 'Completed lessons',
    completionRate: 'Completion rate',
    repeatCustomerRate: 'Repeat customer rate',
    revenueTrend: 'Revenue trend',
    bookingFunnel: 'Booking funnel',
    created: 'Created',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    declined: 'Declined',
    conversionRate: 'Conversion rate',
    cancellationRate: 'Cancellation rate',
    draftsGenerated: 'Drafts generated',
    draftsUsed: 'Drafts used',
    draftsIgnored: 'Drafts ignored',
    draftUsageRate: 'Draft usage rate',
    draftKpisLoading: 'Loading draft KPIs…',
    automationOn: 'Automation is ON',
    automationOff: 'Automation is OFF',
    automationPauseHint: 'AI is handling requests. Click the button below to pause.',
    automationResumeHint: 'Automation is paused. Click the button below to resume.',
    turnOn: 'Turn ON',
    turnOff: 'Turn OFF',
    pauseAutomation: 'Pause automation',
    resumeAutomation: 'Resume automation',
    connected: 'Connected',
    disconnected: 'Disconnected',
    unavailable: 'Unavailable',
    notConnected: 'Not connected',
    frostDeskSwitch: 'FrostDesk switch',
    googleCalendar: 'Google Calendar',
    notEnoughData: 'Not enough data',
    createTestBooking: 'Create test booking',
    openInbox: 'Open Inbox',
    funnelSummary: 'Funnel Summary',
    conversation: 'Conversation',
    openInInbox: 'Open in Inbox',
    lastMessage: 'Last message',
    selectConversation: 'Select a conversation in Inbox',
    automationIsOn: 'Automation is ON',
    automationIsOff: 'Automation is OFF',
    failedToUpdate: 'Failed to update',
  },
  aiWhatsApp: {
    label: 'AI WhatsApp',
    on: 'ON',
    off: 'OFF',
    titleOn: 'AI WhatsApp is ON. Click to turn off.',
    titleOff: 'AI WhatsApp is OFF. Click to turn on.',
    toastOn: 'AI WhatsApp is ON',
    toastOff: 'AI WhatsApp is OFF',
    ariaLabel: 'AI WhatsApp automation',
  },
};

const it: AppTranslations = {
  common: {
    save: 'Salva',
    cancel: 'Annulla',
    retry: 'Riprova',
    loading: 'Caricamento…',
    error: 'Errore',
    success: 'Successo',
    add: 'Aggiungi',
    remove: 'Rimuovi',
    login: 'Accedi',
    signingOut: 'Uscita…',
    logout: 'Esci',
    signOut: 'Esci',
  },
  shell: {
    title: 'FrostDesk',
    subtitle: 'Istruttore',
    profileLink: 'Profilo',
    ariaProfile: 'Vai al profilo',
    openMenu: 'Apri menu',
    closeMenu: 'Chiudi menu',
    refund: 'Rimborsi',
    privacy: 'Privacy',
    terms: 'Termini',
    cookies: 'Cookie',
    acceptableUse: 'Uso accettabile',
    langIt: 'IT',
    langEn: 'EN',
    ariaLangIt: 'Seleziona italiano',
    ariaLangEn: 'Seleziona inglese',
    nav: {
      today: 'Oggi',
      todayDesc: 'Vista giornaliera',
      dashboard: 'Dashboard',
      dashboardDesc: 'KPI e panoramica',
      inbox: 'Inbox',
      inboxDesc: 'Messaggi e richieste',
      lessons: 'Lezioni',
      lessonsDesc: 'Oggi e prossime',
      proposals: 'Proposte',
      proposalsDesc: 'Rivedi e invia',
      conflicts: 'Conflitti',
      conflictsDesc: 'Risolvi sovrapposizioni',
      schedule: 'Disponibilità',
      scheduleDesc: 'Imposta orari',
      services: 'Servizi',
      servicesDesc: 'Cosa offri',
      meetingPoints: 'Punti di ritrovo',
      meetingPointsDesc: 'Dove incontrare',
      calendar: 'Calendario',
      calendarDesc: 'Sincronizza e connetti',
      clients: 'Clienti',
      clientsDesc: 'Note e storico',
      profile: 'Profilo',
      profileDesc: 'I tuoi dati',
      settings: 'Impostazioni',
      settingsDesc: 'Preferenze',
      advanced: 'Avanzate',
      advancedDesc: 'Tecnico e audit',
      sectionToday: 'OGGI',
      sectionManage: 'GESTIONE',
      sectionAccount: 'ACCOUNT',
      sectionSettings: 'IMPOSTAZIONI',
    },
  },
  profile: {
    title: 'Profilo',
    configureHint: 'Configura il tuo profilo compilando i campi sotto.',
    loading: 'Caricamento profilo…',
    retry: 'Riprova',
    notAuthorized: 'Non autorizzato. Non hai i permessi per accedere a questa pagina.',
    loadError: 'Impossibile caricare il profilo. Controlla la connessione e riprova.',
    tabIdentity: 'Identità',
    tabMarketing: 'Marketing',
    tabOperations: 'Operativo',
    fullName: 'Nome completo *',
    displayName: 'Nome visualizzato',
    displayNamePlaceholder: 'Opzionale; di default il nome completo',
    slug: 'Slug',
    slugReadOnly: 'Solo lettura (gestito dal sistema)',
    baseResort: 'Località principale *',
    baseResortPlaceholder: 'Es. Cervinia, Zermatt',
    otherLocations: 'Altre località dove insegni',
    otherLocationsHint: 'Aggiungi altre località (oltre alla principale) dove offri lezioni.',
    addLocation: '+ Aggiungi località',
    removeLocation: 'Rimuovi',
    locationPlaceholder: 'Nome località',
    workingLanguage: 'Lingua di lavoro *',
    selectLanguage: 'Seleziona lingua',
    additionalLanguages: 'Lingue aggiuntive',
    timezone: 'Fuso orario',
    selectTimezone: 'Seleziona fuso orario',
    timezoneOther: 'Altro (IANA)',
    contactEmail: 'Email di contatto *',
    saveIdentity: 'Salva identità',
    saveMarketing: 'Salva marketing',
    saveOperations: 'Salva operativo',
    saving: 'Salvataggio...',
    shortBio: 'Bio breve (max',
    shortBioMax: 'caratteri)',
    extendedBio: 'Bio estesa',
    teachingPhilosophy: 'Filosofia di insegnamento',
    targetAudience: 'Pubblico target',
    uspTags: 'Tag USP',
    addTag: 'Aggiungi tag',
    maxStudentsPrivate: 'Max allievi (privato)',
    maxStudentsGroup: 'Max allievi (gruppo)',
    minBookingDuration: 'Durata minima prenotazione (minuti)',
    sameDayBookingAllowed: 'Prenotazione stesso giorno consentita',
    advanceBookingHours: 'Prenotazione in anticipo (ore)',
    travelBufferMinutes: 'Buffer spostamento (minuti)',
    allIdentityRequired: 'Tutti i campi identità sono obbligatori',
    removeTag: 'Rimuovi',
  },
  today: {
    title: 'Oggi',
    loading: 'Caricamento…',
    dailyView: 'Vista giornaliera',
    nextLesson: 'Prossima lezione',
    noLessonsToday: 'Nessuna lezione oggi',
    openBooking: 'Apri prenotazione',
    inbox: 'Inbox',
    todaysLessons: 'Lezioni di oggi',
    seeAllLessons: 'Vedi tutte le lezioni di oggi →',
    open: 'Apri',
    unpaid: 'Non pagata',
    unpaidCount: 'Non pagate',
    noUnpaid: 'Nessuna prenotazione non pagata',
    seeUnpaid: 'Vedi prenotazioni non pagate →',
    proposals: 'Proposte',
    proposalsCount: 'Proposte da confermare',
    noProposals: 'Nessuna proposta in attesa',
    seeProposals: 'Vedi proposte →',
    failedToLoad: 'Caricamento fallito',
  },
  dashboard: {
    title: 'Dashboard',
    sub: 'Panoramica e automazioni',
    automationSwitch: 'Interruttore automazioni',
    on: 'ON',
    off: 'OFF',
    startApiToConnect: 'Avvia API per connettere',
    apiConnected: 'API connessa',
    apiDisconnected: 'API disconnessa',
    checking: 'Verifica…',
    sessionExpired: 'Sessione scaduta o non autenticato.',
    retryAbove: 'Riprova sopra per caricare le conversazioni.',
    loadingLiveData: 'Caricamento dati in tempo reale…',
    noConversations: 'Nessuna conversazione',
    loading: 'Caricamento…',
    businessIntelligence: 'Business Intelligence',
    revenue: 'Fatturato',
    paidBookings: 'Prenotazioni pagate',
    avgBookingValue: 'Valore medio prenotazione',
    completedLessons: 'Lezioni completate',
    completionRate: 'Tasso completamento',
    repeatCustomerRate: 'Tasso clienti ripetuti',
    revenueTrend: 'Andamento fatturato',
    bookingFunnel: 'Funnel prenotazioni',
    created: 'Create',
    confirmed: 'Confermate',
    completed: 'Completate',
    cancelled: 'Annullate',
    declined: 'Rifiutate',
    conversionRate: 'Tasso conversione',
    cancellationRate: 'Tasso annullamenti',
    draftsGenerated: 'Bozze generate',
    draftsUsed: 'Bozze usate',
    draftsIgnored: 'Bozze ignorate',
    draftUsageRate: 'Tasso uso bozze',
    draftKpisLoading: 'Caricamento KPI bozze…',
    automationOn: 'Automazione attiva',
    automationOff: 'Automazione sospesa',
    automationPauseHint: 'L\'AI gestisce le richieste. Clicca il pulsante sotto per sospendere.',
    automationResumeHint: 'Automazione sospesa. Clicca il pulsante sotto per riattivare.',
    turnOn: 'Attiva',
    turnOff: 'Disattiva',
    pauseAutomation: 'Sospendi automazione',
    resumeAutomation: 'Riprendi automazione',
    connected: 'Connesso',
    disconnected: 'Disconnesso',
    unavailable: 'Non disponibile',
    notConnected: 'Non connesso',
    frostDeskSwitch: 'Switch FrostDesk',
    googleCalendar: 'Google Calendar',
    notEnoughData: 'Dati insufficienti',
    createTestBooking: 'Crea prenotazione test',
    openInbox: 'Apri Inbox',
    funnelSummary: 'Riepilogo funnel',
    conversation: 'Conversazione',
    openInInbox: 'Apri in Inbox',
    lastMessage: 'Ultimo messaggio',
    selectConversation: 'Seleziona una conversazione in Inbox',
    automationIsOn: 'AI WhatsApp attivo',
    automationIsOff: 'AI WhatsApp disattivo',
    failedToUpdate: 'Aggiornamento fallito',
  },
  aiWhatsApp: {
    label: 'AI WhatsApp',
    on: 'ON',
    off: 'OFF',
    titleOn: 'AI WhatsApp attivo. Clicca per disattivare.',
    titleOff: 'AI WhatsApp disattivo. Clicca per attivare.',
    toastOn: 'AI WhatsApp attivo',
    toastOff: 'AI WhatsApp disattivo',
    ariaLabel: 'Automazione AI WhatsApp',
  },
};

const translations: Record<AppLocale, AppTranslations> = { en, it };

export function getAppTranslations(locale: AppLocale): AppTranslations {
  return translations[locale] ?? en;
}
