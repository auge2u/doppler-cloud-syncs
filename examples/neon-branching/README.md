# Neon Database Branching Example

This example demonstrates using Neon database branching with dcs for isolated development environments.

## Prerequisites

- [Doppler CLI](https://docs.doppler.com/docs/cli) installed and authenticated
- [Neon API key](https://neon.tech/docs/manage/api-keys)
- A Doppler project with secrets configured

## Setup

1. **Set your Neon API key:**

   ```bash
   export NEON_API_KEY=your-neon-api-key
   ```

2. **Provision a new Neon project:**

   ```bash
   dcs provision neon --project-name my-app
   ```

   This creates a Neon project and syncs the connection string to Doppler.

3. **Update dcs.yaml with your project ID:**

   The `dcs provision neon` command will output your project ID. Update the config accordingly.

## Usage

### Branch Management

```bash
# List all branches
dcs neon branch list

# Create a feature branch (forked from main)
dcs neon branch create feature-auth

# Create branch from specific parent
dcs neon branch create hotfix --parent staging

# Switch dev environment to feature branch
dcs neon branch switch feature-auth -c dev

# Reset branch to parent state (discards all changes)
dcs neon branch reset feature-auth

# Delete branch when done
dcs neon branch delete feature-auth
```

### Migrations

```bash
# Run migrations on dev environment
dcs neon migrate

# Run on production
dcs neon migrate -c prod

# Preview migrations without running
dcs neon migrate --dry-run
```

### Status

```bash
# Show project status with branch info
dcs neon status
```

## Workflow

### Feature Development

1. **Create feature branch:**
   ```bash
   dcs neon branch create feature-auth
   dcs neon branch switch feature-auth -c dev
   ```

2. **Develop and test:**
   ```bash
   dcs run -- npm start
   ```

3. **Run migrations:**
   ```bash
   dcs neon migrate
   ```

4. **Reset if needed:**
   ```bash
   dcs neon branch reset feature-auth
   ```

5. **Clean up:**
   ```bash
   dcs neon branch delete feature-auth
   ```

### Environment Mapping

Configure branch mapping in dcs.yaml for automatic environment selection:

```yaml
platforms:
  neon:
    project_id: your-project-id
    branch_mapping:
      dev: dev-branch
      staging: staging-branch
      prod: main
```

## File Structure

```
neon-branching/
├── dcs.yaml           # DCS configuration with Neon
├── migrations/        # SQL migration files
│   ├── 001_init.sql
│   └── 002_users.sql
└── README.md
```
