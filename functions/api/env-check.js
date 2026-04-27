import { CORS, json, handleOptions } from './_utils.js';

export const onRequestOptions = handleOptions;

export const onRequestGet = async ({ env }) => {
  return json({
    PLATFORM: 'Cloudflare Pages',
    HAS_FAL_KEY: env.FAL_KEY ? 'YES' : 'NO',
    HAS_ANTHROPIC: env.ANTHROPIC_API_KEY ? 'YES' : 'NO',
    HAS_GOOGLE_SA: env.GOOGLE_SA_JSON ? 'YES' : 'NO',
  });
};
