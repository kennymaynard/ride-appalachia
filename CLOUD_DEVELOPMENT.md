# Appalachia Offroad Cloud Development

GitHub Codespaces is the primary development and Docker build environment for this repository.
Render remains the production host.

## Service record

| Purpose | Service | Status |
| --- | --- | --- |
| Cloud development | GitHub Codespaces | Primary |
| Docker builds and automated verification | GitHub Codespaces | Primary |
| Source control and pull requests | GitHub | Primary |
| Production deployment and hosting | Render | Primary |

The Codespace configuration is version-controlled in `.devcontainer/devcontainer.json`. A
Codespace should be created from the branch being developed, stopped when work is finished, and
recreated from the repository when a clean environment is needed. Codespaces are development
environments and are not the production host or the permanent home of production data.

## Create the cloud workspace

1. Open the repository on GitHub.
2. Select **Code**, then **Codespaces**.
3. Select **Create codespace on the current branch**.
4. Wait for the development container and Docker service to become ready.

The repository requests four CPU cores, 8 GB of memory, and 32 GB of storage. GitHub may ask
you to select an available machine type or configure a spending limit.

## Start the complete application

From the Codespaces terminal:

```bash
docker compose up --build -d
docker ps
```

Open the forwarded port named **Appalachia Offroad website**. The API health check is available
on forwarded port 8000 at `/health`.

## Run verification

```bash
docker compose exec backend python -m compileall -q app alembic/versions
docker compose exec frontend npm run typecheck
docker compose build
```

## Secrets

Do not commit production credentials or copy the local `.env` file into Git. Add development-only
values under GitHub **Settings → Codespaces → Secrets** and restrict each secret to this repository.
Production secrets remain in Render.

## Save cloud storage

Stop the Codespace when work is finished. Delete obsolete Codespaces from GitHub when they are no
longer needed. Docker images, volumes, and build cache inside a deleted Codespace are also removed.

## Local cleanup

Do not delete local Docker data until the branch has been pushed and the Codespace build succeeds.
After verification, local Docker containers, images, volumes, and build cache can be removed to
recover disk space. That cleanup is destructive to the local development database.
