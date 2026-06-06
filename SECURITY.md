# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | ✅ Yes    |

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub Issues.**

Instead, send a private email to: **enyilu831@gmail.com**

Include the following in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- (Optional) Suggested fix

You will receive a response within **72 hours**. If the issue is confirmed, we will release a fix as soon as possible.

## Security Notes

- `backend/settings.json` contains your LLM API keys and is excluded from version control via `.gitignore`. **Never commit this file.**
- CodeInsight runs entirely locally. No code or analysis data is sent to any server other than your configured LLM provider.
- The GitHub clone feature (`/api/clone`) runs `git clone` on your machine. Only clone repositories you trust.
