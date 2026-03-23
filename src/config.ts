// import logoImage from './assets/logo-catedra.png';

export const SITE = {
  website: 'http://thin5g.es',
  author: 'CatedraThin5G',
  description: 'A lightweight, modern static website template for academic labs and scholars.',
  title: 'CatedraThin5G',
  ogImage: 'footer/GITPA.png',
  lightAndDarkMode: true,
  postPerPage: 3,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes

  // Lab Info
  labName: 'CatedraThin5G',
  university: 'Uniovi',
  logo: '/footer/logoCatedra.svg',
  avatar: '/footer/logoCatedra.svg',
  email: 'thin5g@uniovi.es',

  // Hero Section (Home Page) - Main content does not need to be translated for 8 languages by default
  hero: {
    title: 'Driving the 5G Future & Digital Innovation.',
    subtitle: 'The Open Laboratory for 5G Research, Education, and Technology Transfer in Asturias.',
    action: 'Discover Our Work', // Optional call to action text
    image: '/assets/gitpa.jpg', // Hero image path
  },

  // Navigation
  nav: [
    { text: 'Home', link: '/', key: 'home' },
    { text: 'About', link: '/about', key: 'about' },
    // { text: 'Research', link: '/research', key: 'research' },
    { text: 'Projects', link: '/projects', key: 'projects' },
    { text: 'Team', link: '/team', key: 'team' },
    { text: 'Events', link: '/events', key: 'events' },
    { text: 'Join Us', link: '/join', key: 'join' },
  ],

  // Custom Pages (Appended after 'Join Us')
  customPages: [] as { text: string; link: string; key: string }[],

  // i18n Config
  i18n: {
    enabled: true,
    defaultLocale: 'en',
  }
};

export const LOCALE = {
  lang: 'en', // html lang code. Set this empty and default will be "en"
  langTag: ['en-EN'], // BCP 47 Language Tags. Set this empty [] to use the environment default
} as const;

export const LOGO_IMAGE = {
  enable: true,
  svg: false,
  width: 216,
  height: 46,
};

export const SOCIALS = [
  {
    link: 'https://github.com/CatedraTHIN5G',
    active: true,
  },
  {
    link: 'https://www.linkedin.com/in/catedra-thin5g/?miniProfileUrn=urn%3Ali%3Afs_miniProfile%3AACoAADrrs8wBFMD6YwkTsoUJA2-el55eYCtVCPg',
    active: true,
  },
  {
    link: 'https://www.instagram.com/openlab5g/?hl=es',
    active: true,
  }
];

// Default language configuration
export const DEFAULT_LANG: 'zh' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru' = 'en'; 
