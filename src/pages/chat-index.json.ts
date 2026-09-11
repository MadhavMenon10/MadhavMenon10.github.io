/* ===========================================================================
   /chat-index.json — the Ask widget's knowledge base, prerendered.

   Served as a static file rather than inlined into every page: the index is a
   few tens of kilobytes and most visitors never open the widget, so it's
   fetched on first use instead of being paid for on every page load.
=========================================================================== */

import type { APIRoute } from 'astro';
import { buildIndex } from '../lib/chat/knowledge';

export const GET: APIRoute = async () => {
  const chunks = await buildIndex();

  return new Response(JSON.stringify({ chunks }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Rebuilt on every deploy, and the filename never changes — so let it be
      // cached briefly but always revalidated.
      'Cache-Control': 'public, max-age=300, must-revalidate',
    },
  });
};
