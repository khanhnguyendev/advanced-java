import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const handler = createMiddleware(routing);

export default handler;
export { handler as proxy };

export const config = {
  matcher: ['/', '/((?!(?:en|vi|zh)(?:/|$)|_next|api|.*\\..*).+)'],
};
