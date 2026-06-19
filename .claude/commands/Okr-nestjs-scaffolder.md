---
description: Scaffold a production-ready NestJS project or feature module — folder structure, entities, DTOs, services, controllers, guards, and config files.
argument-hint: <project name or feature description>
---

Activate the **Okr-nestjs-scaffolder** skill to generate a clean, production-ready NestJS structure for:

$ARGUMENTS

Follow the skill's generation workflow in order:
1. Show the complete folder and file tree first
2. Generate core files (`main.ts`, `app.module.ts`, database module, exception filter, response interceptor)
3. Generate feature module files (entity → DTOs → service → controller → module file)
4. Generate config files (`package.json` with `lint`/`lint:check`/`format` scripts, `.env.example`, `tsconfig.json`, `.eslintrc.js` with `eslint-plugin-security` + prettier, `.eslintignore`, `.prettierrc`)
5. Run `npm run lint:check` and resolve violations — for new scaffolds AND edits to existing projects (add an ESLint config first if the project lacks one)
6. Run the production-ready checklist before delivering

Enforce all naming conventions, module boundaries, and code standards defined in the skill.
