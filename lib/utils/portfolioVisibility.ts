export const PORTFOLIO_VISIBILITY_STORAGE_KEY = 'coincap-hide-portfolio-value';
const PORTFOLIO_VISIBILITY_EVENT = 'coincap:portfolio-visibility';

export const getPortfolioVisibility = (): boolean => {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(PORTFOLIO_VISIBILITY_STORAGE_KEY) !== '1';
};

export const setPortfolioVisibility = (isVisible: boolean) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PORTFOLIO_VISIBILITY_STORAGE_KEY, isVisible ? '0' : '1');
  window.dispatchEvent(new CustomEvent(PORTFOLIO_VISIBILITY_EVENT, { detail: { isVisible } }));
};

export const subscribePortfolioVisibility = (callback: (isVisible: boolean) => void) => {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = () => {
    callback(getPortfolioVisibility());
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PORTFOLIO_VISIBILITY_STORAGE_KEY) {
      callback(getPortfolioVisibility());
    }
  };

  window.addEventListener(PORTFOLIO_VISIBILITY_EVENT, handleCustom as EventListener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(PORTFOLIO_VISIBILITY_EVENT, handleCustom as EventListener);
    window.removeEventListener('storage', handleStorage);
  };
};
