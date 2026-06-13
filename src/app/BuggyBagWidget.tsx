'use client';
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

export default function BuggyBagWidget() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    if (!new URLSearchParams(window.location.search).has('bb')) return;
    initialized.current = true;

    import('buggy-bag-widget').then(({ BuggyBag }) => {
      const div = document.createElement('div');
      div.setAttribute('data-buggy-bag-portal', 'true');
      document.body.appendChild(div);
      const root = createRoot(div);
      root.render(
        <BuggyBag
          apiEndpoint="http://localhost:3000/api/bugs/submit"
          apiKey="c9986a66-5eb5-437b-b091-04612460a274"
          portalUrl="http://localhost:3000"
        />
      );
    });
  }, []);

  return null;
}
