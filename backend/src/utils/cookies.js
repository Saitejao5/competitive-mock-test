const REFRESH_TOKEN_DAYS = Number.parseInt(process.env.JWT_REFRESH_DAYS, 10) || 7;

export const refreshCookieName = 'refreshToken';

export function refreshCookieOptions() {
  const production = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: production,
    sameSite: production ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
  };
}

export function setRefreshCookie(res, token) {
  res.cookie(refreshCookieName, token, refreshCookieOptions());
}

export function clearRefreshCookie(res) {
  res.clearCookie(refreshCookieName, { ...refreshCookieOptions(), maxAge: undefined });
}

