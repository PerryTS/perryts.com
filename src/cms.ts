// SDK + site config for the perry.land customer frontend.
import { createClient } from '@skelpo/cms-client';
import type { SkSite } from '@skelpo/site-kit';

export const cms = createClient({
  url: process.env.CMS_URL ?? 'http://127.0.0.1:3137',
  cache: 'auto',
});

export const site: SkSite = {
  name: 'Perry',
  url: process.env.SITE_URL ?? 'http://127.0.0.1:4200',
  defaultLocale: 'en',
  locales: ['en'],
  twitterHandle: '@perry_ts',
  organizationSchema: {
    '@type': 'Organization',
    name: 'Perry',
    url: process.env.SITE_URL ?? 'http://127.0.0.1:4200',
  },
};
