'use client';

import dynamic from 'next/dynamic';

const BuggyBag = dynamic(
  () => import('buggy-bag-widget').then((m) => m.BuggyBag),
  { ssr: false }
);

export default function BuggyBagWrapper() {
  return (
    <BuggyBag
      apiEndpoint="https://buggy-bag.vercel.app/api/bugs/submit"
      apiKey="1f6c33a2-15d8-458c-b8a3-f7b5d55a0e21"
      portalUrl="https://buggy-bag.vercel.app"
    />
  );
}
