import getRouterBasename from '@/lib/router';
import App from 'App';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecoilValue } from 'recoil';

import {
  useApi,
  useAuth,
  useChatInteract,
  useConfig
} from '@chainlit/react-client';

import { userEnvState } from 'state/user';

export default function AppWrapper() {
  const [translationLoaded, setTranslationLoaded] = useState(false);
  const { isAuthenticated, isReady } = useAuth();
  const { language: configuredLanguage } = useConfig();
  const { i18n } = useTranslation();
  const { windowMessage } = useChatInteract();
  const userEnv = useRecoilValue(userEnvState);

  const languageInUse = useMemo(
    () =>
      resolveLanguage(
        userEnv.inevery_language,
        configuredLanguage,
        navigator.language
      ),
    [configuredLanguage, userEnv.inevery_language]
  );

  function handleChangeLanguage(languageBundle: any): void {
    i18n.addResourceBundle(languageInUse, 'translation', languageBundle, true, true);
    i18n.changeLanguage(languageInUse);
  }

  const { data: translations } = useApi<any>(
    `/project/translations?language=${languageInUse}`
  );

  useEffect(() => {
    setTranslationLoaded(false);
  }, [languageInUse]);

  useEffect(() => {
    if (!translations) return;
    handleChangeLanguage(translations.translation);
    setTranslationLoaded(true);
  }, [translations]);

  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      windowMessage(event.data);
    };
    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [windowMessage]);

  if (!translationLoaded) return null;

  if (
    isReady &&
    !isAuthenticated &&
    window.location.pathname !== getRouterBasename() + '/login' &&
    window.location.pathname !== getRouterBasename() + '/login/callback'
  ) {
    window.location.href = getRouterBasename() + '/login';
  }
  return <App />;
}

function resolveLanguage(
  userLanguage: string | undefined,
  configuredLanguage: string | undefined,
  browserLanguage: string
) {
  const explicit = normalizeLanguage(userLanguage);
  if (explicit) return explicit;
  const browser = normalizeLanguage(browserLanguage);
  if (browser) return browser;
  return normalizeLanguage(configuredLanguage) || 'en-US';
}

function normalizeLanguage(value: string | undefined) {
  const normalized = (value || '').replace('_', '-');
  if (normalized === 'zh-CN' || normalized.toLowerCase().startsWith('zh')) {
    return 'zh-CN';
  }
  if (normalized === 'en-US' || normalized.toLowerCase().startsWith('en')) {
    return 'en-US';
  }
  return undefined;
}
