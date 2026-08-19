# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Bidently, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email security details to the repository maintainer(s)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and work with you to understand and address the issue.

## Security Best Practices

When deploying Bidently:

- **Never commit real API keys, passwords, or secrets** to the repository
- Use strong, randomly generated values for `AUTH_SECRET` (e.g., `openssl rand -base64 32`)
- Keep `DATABASE_URL` and `GEMINI_API_KEY` in environment variables only
- Use the Supabase Pooler connection string for production deployments
- Enable HTTPS/SSL for all production deployments
- Regularly update dependencies with `npm audit` and `npm update`
- Use environment-specific `.env` files and never commit them
- Enable two-factor authentication (TOTP) for high-privilege accounts
- Review OAuth redirect URIs to prevent authorization code theft

## Supported Versions

Security updates are provided for the latest release. Please ensure you're running the most recent version.

## Known Security Considerations

- Session tokens are signed with `AUTH_SECRET` using JOSE (JWE/JWS)
- Passwords are hashed with bcryptjs (salt rounds: 10)
- TOTP secrets are generated using Node's `crypto.randomBytes`
- OAuth state parameters use cryptographically secure random values
- Rate limiting is in-memory per serverless instance (best-effort)
- Database connections use connection pooling with configurable limits

For more details, see the authentication implementation in `lib/auth.ts` and `lib/session.ts`.
