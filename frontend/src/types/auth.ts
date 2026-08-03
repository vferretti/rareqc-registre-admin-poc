/** Authenticated user as returned by the BFF /api/auth/me endpoint. */
export interface AuthUser {
  sub: string;
  name: string;
  email: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  roles: string[];
}
