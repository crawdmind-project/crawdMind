# CrowdMind authentication UI

HTML, CSS, and vanilla JavaScript frontend matching the CrowdMind designs.

Run from this folder:

```bash
npm start
```

Open http://localhost:5173/login.html or http://localhost:5173/register.html.
No npm install is needed: the local preview server uses built-in Node modules.

Includes responsive layouts, accessible field labels and error messages,
password visibility toggles, email/password confirmation validation, navigation
between pages, and informational dialogs. No backend requests are sent, no
form details are stored, and no accounts or login sessions are created.
Remember me is a UI control only until authentication is integrated.

The teammate's authentication backend can be connected in auth-ui.js later.
Never store passwords in browser storage.

## Files

| File | Purpose |
| --- | --- |
| login.html | Sign-in form with email, password, and Remember me |
| register.html | Registration form with name, email, password, and confirmation |
| styles.css | Shared CrowdMind styling and responsive layout |
| auth-ui.js | Form validation, password visibility, and informational dialogs |
| server.js | Local frontend preview server using Node's built-in modules |
| package.json | npm start and npm run dev commands |

## Getting started from the repository root

```bash
cd frontend
npm start
```

Keep the terminal open while viewing the pages. If port 5173 is already in use,
stop the previous frontend server or choose another FRONTEND_PORT.
The frontend preview server is separate from the backend server.

## Manual checks

1. Submit an empty login form and check that the field errors appear.
2. Enter a valid email and a password; submission shows a preview message.
3. Use Sign up to open the registration page.
4. Check that short passwords, mismatched passwords, and an unchecked
   agreement box prevent successful form validation.
5. Use the eye buttons to show and hide the password fields.
6. Check the Forgot password, Terms of Service, and Privacy Policy dialogs.
7. Open the pages on narrow and wide screens.

## Backend integration

This change contains frontend files only and does not change the teammate's
backend. The UI currently does not call the registration or login API.
Submitting a valid form must continue to show the preview message until the
teammate's API is connected.

Before connecting the API, agree on the request fields, response format,
session handling, and error messages with the teammate. Replace the preview
submission logic in auth-ui.js with those agreed API calls. Remember me,
password recovery, and the policy documents are not implemented services.
