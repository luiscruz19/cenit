import { NextResponse } from 'next/server';
import { TOKEN_COOKIE } from '@/lib/api';

const WEB_URL = process.env.WEB_URL || 'http://localhost:4100';

export async function POST() {
    const response = NextResponse.redirect(`${WEB_URL}/login`, { status: 303 });
    response.cookies.set(TOKEN_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
    return response;
}
