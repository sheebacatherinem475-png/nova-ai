# Contributing to Nova AI

Thank you for contributing! Please adhere to the following guidelines.

## Code Quality

### Backend (Python)
We use **Ruff** for all linting and formatting. 
1. Install requirements: `pip install -r backend/requirements.txt`
2. Format code: `ruff check --fix backend/`
3. Check code: `ruff check backend/`

### Frontend (TypeScript)
We use **ESLint** and **Prettier**.
1. Install dependencies: `cd frontend && npm install`
2. Format code: `npm run format`
3. Lint code: `npm run lint`

## Automated Testing

### Backend (Pytest)
We use `pytest` with `pytest-asyncio`. Tests use an in-memory SQLite database via the `conftest.py` setup.
1. Run tests:
   ```bash
   cd backend
   pytest
   ```

### Frontend (Jest)
We use `jest` and `@testing-library/react`.
1. Run tests:
   ```bash
   cd frontend
   npm run test
   ```

## Security
- Do not commit secrets.
- Our CI uses **TruffleHog** to scan for secrets on PRs. If it fails, you must revoke the secret immediately.
- Run `npm audit` and `pip-audit` locally to ensure no critical vulnerabilities are added.
