# AGENT.md - Spotcheck Rails App

## Commands (Docker Compose Development)
**IMPORTANT**: All Rails commands must be prefixed with `docker compose run web` since this is a Docker Compose development environment.

- **Build/Test**: `docker compose run web bundle exec rails test` (single test: `docker compose run web bundle exec rails test test/path/to/test.rb`)
- **Lint**: `docker compose run web bundle exec rubocop` (autofix: `docker compose run web bundle exec rubocop -a`)
- **Dev Server**: `docker compose up` (starts web + db services) or `docker compose run web bin/rails server`
- **Console**: `docker compose run web bin/rails console`
- **Migrations**: `docker compose run web rails db:migrate` (create: `docker compose run web rails g migration MigrationName`)
- **Assets**: `docker compose run web bin/rails tailwindcss:watch`
- **Any Rails command**: `docker compose run web <rails-command>` (e.g., `docker compose run web rails routes`)

## Architecture
- **Rails 8** app for YSWS (You Ship, We Ship) project quality assurance/spot-checking
- **PostgreSQL** database with multi-database setup (primary, cache, cable)
- **Airtable integration** for data storage via API
- **Slack OAuth** authentication with AuthorizedUser model
- **GoodJob** for background jobs
- **Tailwind CSS** for styling

## Key Models & Structure
- `Ysws::SpotCheck` - Individual project reviews (green/yellow/red assessments)
- `Ysws::SpotCheckSession` - Batch review sessions with filtering/sampling
- `Ysws::ApprovedProject` - Projects needing review
- `AuthorizedUser` - Slack-based user authorization
- Controllers in `app/controllers/ysws/` namespace

## Code Style (.cursorrules + .rubocop.yml)
- **Rails 8** conventions with Omakase Ruby styling (rubocop-rails-omakase)
- **Prefix all CLI commands** with `docker compose run web` for consistency
- **Use `rails g`** for migrations instead of manual creation
- **Snake_case** for variables, methods, files
- **Module namespacing** with `Ysws::` prefix for core models
- **Validation presence** for required fields, conditional validations
- **Foreign keys** explicitly defined with class_name and primary_key
- **Self-documenting code** with clear method names and minimal comments
