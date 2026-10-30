# Kambaz résumé bullets (individual build), verified 30 Oct 2026

Repos: `kambaz-next-js` (frontend, all 34 commits yours) and `kambaz-node-server-app` (API, yours).
Live: https://kambaz-next-js-navy-sigma.vercel.app (its homepage field; the bundle calls `kambaz-node-server-app-qh05.onrender.com`).

**Kambaz: Canvas-style Learning Management System** | Next.js, React, TypeScript, Redux Toolkit, Node.js, Express, MongoDB

- Built a Canvas-style LMS frontend in Next.js (App Router), React and TypeScript, with Redux Toolkit slices for the account, courses, modules and assignments, and edit controls shown only to faculty on the dashboard, modules and assignments pages.
- Built the REST API in Express and MongoDB (Mongoose) with schema, data-access and route layers for users, courses, modules, assignments and enrollments, and cookie-based sessions (express-session) for sign-up, sign-in, sign-out and profile.
- Connected the two through an axios client that sends session cookies, so students can enroll and unenroll and faculty can create, edit and delete courses, modules and assignments; deployed the frontend on Vercel and the API on Render.

## Evidence for each claim

| Claim | Where |
|---|---|
| Next.js App Router, React 19, TypeScript | `package.json` (next 15.5.3, react 19.1.0, typescript), `app/` routes, `.tsx` files, `tsconfig.json` |
| Redux Toolkit slices: account, courses, modules, assignments | `Account/reducer.ts`, `Courses/reducer.ts`, `Courses/[cid]/Modules/reducer.ts`, `Courses/[cid]/Assignments/reducer.ts`, `store.ts` |
| Faculty-only edit controls | `currentUser.role === "FACULTY"` in `Dashboard/page.tsx`, `Modules/page.tsx`, `Assignments/page.tsx` |
| Express + Mongoose, schema/DAO/routes per entity | `Kambaz/{Users,Courses,Modules,Assignments,Enrollments}/{schema,dao,routes}.js`, `package.json` (express 5, mongoose 9) |
| Session auth | `index.js` uses `express-session`; routes `POST /api/users/signup`, `/signin`, `/signout`, `/profile` |
| Enroll and unenroll | `POST` and `DELETE /api/courses/:courseId/enrollments`; client `enrollInCourse`, `unenrollFromCourse` |
| Faculty CRUD on courses, modules, assignments | client `createCourse/updateCourse/deleteCourse`, `createModuleForCourse/updateModule/deleteModule`, `createAssignmentForCourse/updateAssignment/deleteAssignment` |
| axios with cookies | `axios.create({ withCredentials: true })` in both clients |
| Vercel + Render | navy-sigma is the repo's homepage; its JS calls `kambaz-node-server-app-qh05.onrender.com` |

## Do not claim

- Tests: neither repo has any.
- JWT, RBAC on the server, Selenium: not in these repos. The API checks login, not roles.
- Quizzes: the Quizzes page is an empty placeholder in this build (quizzes were the team build).
- "Independently deployed": true for this build, so this is fine; just don't attach it to the team repo.

## Security note

`kambaz-node-server-app` committed its `.env` in four commits before you removed it (25 Oct 2026). The database string in it is a local `mongodb://` address with no password, so no database credentials leaked. But the `SESSION_SECRET` (27 characters) is public in the history. If the Render service still uses that value, change it in Render's environment settings: anyone with it could forge session cookies.
