import { redirect } from 'next/navigation';

// Setup page has moved to the Integration tab inside the project page
export default function SetupRedirect({ params }: { params: { id: string } }) {
  redirect(`/projects/${params.id}?tab=integration`);
}
