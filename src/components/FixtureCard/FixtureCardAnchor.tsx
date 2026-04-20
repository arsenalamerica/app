'use client';

import { useEffect } from 'react';

// Scrolls the element with the given id into view on mount. Rendered as a
// sibling of the <Card> so the anchor id stays on the real card element and
// DOM structure is unchanged — only the effect lives in the client boundary.
export function FixtureCardAnchor({ targetId }: { targetId: string }) {
  useEffect(() => {
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [targetId]);
  return null;
}
