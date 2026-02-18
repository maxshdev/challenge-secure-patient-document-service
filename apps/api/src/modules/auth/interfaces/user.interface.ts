/**
 * Simulated user roles for the Secure Patient Document Service.
 * Authentication is handled externally — user is injected per request.
 */
export type UserRole = 'admin' | 'doctor' | 'patient';

/**
 * Decoded user object available in every authenticated request.
 * In production, this comes from a decoded JWT token.
 * For this challenge, it is simulated via request headers.
 */
export interface RequestUser {
    id: string;
    role: UserRole;
}
