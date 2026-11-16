ONLINE EXPENSE MANAGEMENT SYSTEM - HTML / CSS / JavaScript

Files
  index.html  page structure
  style.css   styling (light and dark mode)
  script.js   all application logic

How to run
  Keep the three files in one folder and open index.html in any browser. No server needed.

How to use
  1. Choose Admin > Sign up and create the admin account (name, email, password).
  2. Admin can add clients in the Clients tab, or clients can sign up themselves (Client > Sign up).
  3. Clients record, edit and delete expenses, set monthly budgets and generate reports.
  4. Admin approves or rejects expenses with remarks, manages categories and clients.

Tables from the report (User, Admin, Category, Expense, Budget, Report) are stored as lists in localStorage under the key "oems-v2". Passwords are stored salted and hashed.
