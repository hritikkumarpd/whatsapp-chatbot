# Security Policy

## Supported Versions

Security fixes are applied to the latest main branch and the latest published release.

## Reporting a Vulnerability

Please do **not** publish credentials, WhatsApp session files, access tokens, Gemini API keys, or a working exploit in a public issue.

For a security report, use GitHub's private security advisory/reporting mechanism when available. Include:

- affected commit or release
- deployment mode (local, VPS, Docker, reverse proxy, Termux)
- impact
- reproducible steps
- relevant logs with secrets removed

If a secret may have been exposed, rotate it immediately and invalidate the affected deployment.

## Production Security Requirements

- Put remote dashboards behind HTTPS.
- Keep server/auth/ and server/config.json private and backed up securely.
- Never enable WABOT_ALLOW_ANY_ORIGIN=true on a public production deployment.
- Use a dedicated unprivileged OS user for systemd deployments.
- Keep the dashboard behind the access token.
- Do not put tokens or API keys in URLs.
- Keep dependencies updated and run npm audit.
- Do not expose port 4000 directly when Nginx/Cloudflare can provide TLS and an access-control boundary.

## WhatsApp Session Safety

This project uses the unofficial Baileys WhatsApp Web protocol. Users are responsible for complying with WhatsApp's terms and for protecting the linked account. Do not use the project for unsolicited bulk messaging or spam.
