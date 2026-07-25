# Nova AI

Nova AI is an advanced agentic platform combining Chat, RAG, Vision, Data Analysis, and Voice capabilities.

## Architecture
- **Backend:** FastAPI, PostgreSQL, SQLAlchemy, Alembic, Pandas
- **Frontend:** Next.js (React), Tailwind CSS, Recharts
- **Infrastructure:** Docker, GitHub Actions, Vercel, Render

## Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.10+ (for local backend dev)
- PostgreSQL (if not using Docker)

### Running Locally with Docker
1. Create a `.env` in `backend/` based on `backend/.env.example`
2. Start the stack:
   ```bash
   docker-compose up --build
   ```
3. Access the application at `http://localhost:3000`

## CI/CD and Testing
Nova AI uses GitHub Actions for continuous integration and continuous deployment.

### Automated Pipelines
- **Backend CI:** Runs Pytest, Ruff (linting), pip-audit (dependencies), and Trivy (Docker security).
- **Frontend CI:** Runs ESLint, TypeScript compilation, Jest, npm audit, and Trivy.
- **Security:** TruffleHog scans the repository for leaked secrets.

### Running Tests Locally
See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed instructions on running tests and linters locally.
