import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
  }

  const clientId = process.env.UPSTOX_API_KEY;
  const clientSecret = process.env.UPSTOX_API_SECRET;
  const redirectUri = process.env.UPSTOX_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
     return NextResponse.json({ error: 'Missing Upstox credentials in environment variables' }, { status: 500 });
  }

  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://api.upstox.com/v2/login/authorization/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
       console.error('Upstox token error:', tokenData);
       return NextResponse.json({ error: 'Failed to retrieve access token' }, { status: tokenResponse.status });
    }
    
    // In a real application, you would save this access_token securely to a database linked to the user's session.
    // For this prototype, we'll return it as a JSON response so you can copy it for testing.
    return NextResponse.json({ 
        message: "Successfully authenticated with Upstox!",
        access_token: tokenData.access_token 
    });

  } catch (error) {
    console.error('Error during token exchange:', error);
    return NextResponse.json({ error: 'Internal Server Error during token exchange' }, { status: 500 });
  }
}