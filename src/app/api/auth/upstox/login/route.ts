import { redirect } from 'next/navigation';

export async function GET() {
  const clientId = process.env.UPSTOX_API_KEY;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response('Missing Upstox environment variables', { status: 500 });
  }

  // Generate a random state parameter for security
  const state = Math.random().toString(36).substring(7);

  // Construct the Upstox authorization URL
  const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;

  // Redirect the user to the Upstox login page
  redirect(authUrl);
}