import { ui, defaultLang } from './ui';
import { withBase } from '../utils/urls';

export function getLangFromUrl(url: URL) {
  const basePath = withBase('/');
  const pathname = url.pathname.startsWith(basePath)
    ? url.pathname.slice(basePath.length)
    : url.pathname.slice(1);
  const [lang] = pathname.split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof typeof ui[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  }
}
