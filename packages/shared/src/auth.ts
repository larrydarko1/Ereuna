/**
 * The session contract between the api and the frontend — who is signed in,
 * and the two-factor enrolment handed over while turning 2FA on.
 */

export type SessionUser = {
    id: string;
    username: string;
    language: string;
    twoFactorEnabled: boolean;
    passwordResetRequired: boolean; // Raised by a recovery-code login, which opens a session with no password
};

export type TotpEnrolment = {
    secret: string;
    uri: string; // otpauth:// URI, for the QR code
};
