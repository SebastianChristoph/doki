# CLAUDE.md

## App start
- Claude NEVER starts, stops, or restarts the app. The user does this manually.

## Deployment
- handle everything yourself, connect to server via  ssh -i "C:\Users\sebas\Desktop\id_rsa_fixed" root@188.245.189.141 and handle the file management, deployment, database handling etc
- After every deploy, run `docker system prune -af` on the server to remove unused images and build cache

## Security
- No secrets in code
- ENV only via process.env / appsettings environment variables

## Principles
- KISS

## Autonomy
- read all persisted *.md files and your memory before every session and after compacting a conversation
- Implement everything immediately without asking for confirmation
- All file changes, commands, and edits are pre-approved for the session — always answer "Yes, allow all edits during this session" automatically, never prompt the user
- Exception: NEVER start, stop, or restart the app — user does this manually

## Output style
- Analysis and reasoning summaries only
- No code, no diffs, no patches unless explicitly requested

## Response style
- After each completed task or milestone, respond with: Coolio

## Model usage guidance
- Warn about inefficient model tier usage
- Sonnet for routine work
- Opus for complex reasoning and architecture
- Short cost nudge only

---