/* Online Expense Management System - Full Logic & Local-to-SQL Sync Engine */
(function() {
  "use strict";
  var KEY = "oems-v3-store";

  function pad(n) { return String(n).padStart(2, "0"); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function esc(s) { return String(s || "").replace(/[&<>"']/g, function(c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }

  function seedData() {
    return {
      n: 100,
      users: [
        { id: 1, name: "Admin", email: "admin@oems.com", role: "admin", salt: "salt123", pw: "d28362747492020202" },
        { id: 2, name: "Client User", email: "client@oems.com", contact: "+91 9876543210", role: "user", salt: "salt456", pw: "d28362747492020202" }
      ],
      cats: [
        { id: 1, name: "Travel", desc: "Fuel, tickets, cabs" },
        { id: 2, name: "Food & Refreshments", desc: "Meals and refreshments" },
        { id: 3, name: "Office Supplies", desc: "Stationery and equipment" },
        { id: 4, name: "Utilities & Bills", desc: "Internet, electricity, phone" }
      ],
      exp: [
        { id: 101, uid: 2, cid: 1, amt: 1200, date: today(), mode: "UPI", desc: "Taxi fare for client meeting", st: "Approved", rm: "Approved by Admin" },
        { id: 102, uid: 2, cid: 2, amt: 450, date: today(), mode: "Card", desc: "Team Lunch", st: "Pending", rm: "" }
      ],
      bud: [
        { id: 1, uid: 2, cid: 1, limit: 5000, month: new Date().getMonth() + 1, year: new Date().getFullYear() }
      ],
      rep: []
    };
  }

  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
  if (!S || !S.exp) S = seedData();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }

  var V = { s: null, tab: "dash", mode: "login", role: "user", err: "", q: "", fs: "" };
  try { V.s = JSON.parse(localStorage.getItem(KEY + "-s")); } catch (e) {}

  function sess(s) {
    V.s = s;
    try { s ? localStorage.setItem(KEY + "-s", JSON.stringify(s)) : localStorage.removeItem(KEY + "-s"); } catch (e) {}
  }

  function isAdmin() { return !!V.s && V.s.role === "admin"; }
  function uid() { return isAdmin() || !V.s ? 0 : V.s.id; }
  function uname(id) { var u = S.users.find(function(x) { return x.id === id; }); return u ? u.name : "Unknown"; }
  function cname(id) { var c = S.cats.find(function(x) { return x.id === id; }); return c ? c.name : "General"; }
  function myExp() { return S.exp.filter(function(e) { return isAdmin() || e.uid === uid(); }); }
  function sum(a) { return a.reduce(function(t, e) { return t + Number(e.amt); }, 0); }

  function spent(b) {
    var p = b.year + "-" + pad(b.month);
    return sum(S.exp.filter(function(e) {
      return e.uid === b.uid && e.cid === b.cid && e.date.indexOf(p) === 0 && e.st !== "Rejected";
    }));
  }

  /* ── Interactive Modal for Remarks (Fixes Approve/Reject Bug) ── */
  function openRemarksModal(title, onConfirm) {
    var old = document.getElementById("custom-modal");
    if (old) old.remove();

    var wrap = document.createElement("div");
    wrap.id = "custom-modal";
    wrap.className = "modal-overlay";
    wrap.innerHTML =
      '<div class="modal-card">' +
        '<h2>' + esc(title) + '</h2>' +
        '<label>Remarks / Notes' +
          '<textarea id="modal-rm-input" rows="3" placeholder="Enter remarks (optional)..."></textarea>' +
        '</label>' +
        '<div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px;">' +
          '<button type="button" class="s" id="modal-cancel">Cancel</button>' +
          '<button type="button" class="b" id="modal-submit">Confirm</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);

    document.getElementById("modal-cancel").onclick = function() { wrap.remove(); };
    document.getElementById("modal-submit").onclick = function() {
      var val = document.getElementById("modal-rm-input").value.trim();
      wrap.remove();
      onConfirm(val);
    };
  }

  /* ── SQL Data Export Functionality ── */
  function exportSQL() {
    var sql = "-- AUTO-GENERATED SQL DUMP FROM SMART EXPENSE MANAGEMENT SYSTEM\n";
    sql += "-- Generated on: " + new Date().toISOString() + "\n\n";

    S.cats.forEach(function(c) {
      sql += `INSERT INTO categories (id, name, description) VALUES (${c.id}, '${c.name.replace(/'/g, "''")}', '${(c.desc||'').replace(/'/g, "''")}');\n`;
    });

    S.users.forEach(function(u) {
      sql += `INSERT INTO users (id, name, email, contact, role, salt, password_hash) VALUES (${u.id}, '${u.name.replace(/'/g, "''")}', '${u.email}', '${u.contact||''}', '${u.role}', '${u.salt}', '${u.pw}');\n`;
    });

    S.exp.forEach(function(e) {
      sql += `INSERT INTO expenses (id, user_id, category_id, amount, expense_date, payment_mode, description, status, remarks) VALUES (${e.id}, ${e.uid}, ${e.cid}, ${e.amt}, '${e.date}', '${e.mode}', '${e.desc.replace(/'/g, "''")}', '${e.st}', '${(e.rm||'').replace(/'/g, "''")}');\n`;
    });

    var blob = new Blob([sql], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "database.sql";
    a.click();
  }

  /* ── Views ── */
  function dash() {
    var e = myExp();
    var ap = sum(e.filter(function(x) { return x.st === "Approved"; }));
    var pe = e.filter(function(x) { return x.st === "Pending"; });
    var over = S.bud.filter(function(b) { return (isAdmin() || b.uid === uid()) && spent(b) > b.limit; }).length;

    var byCat = {};
    e.filter(function(x) { return x.st !== "Rejected"; }).forEach(function(x) {
      byCat[x.cid] = (byCat[x.cid] || 0) + x.amt;
    });

    var totSpent = sum(e.filter(function(x) { return x.st !== "Rejected"; }));
    var chartRows = Object.keys(byCat).map(function(cid) {
      var pct = totSpent ? Math.min((byCat[cid] / totSpent) * 100, 100) : 0;
      return '<div class="bar-chart-row">' +
        '<div class="bar-chart-label">' + esc(cname(+cid)) + '</div>' +
        '<div class="bar-chart-track"><div class="bar-chart-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="bar-chart-val">' + money(byCat[cid]) + '</div>' +
      '</div>';
    }).join("");

    return '<div class="grid">' +
      '<div class="card"><div class="k">Approved Spend</div><div class="v ok">' + money(ap) + '</div></div>' +
      '<div class="card"><div class="k">Awaiting Approval</div><div class="v warn">' + pe.length + '</div></div>' +
      '<div class="card"><div class="k">Budgets Exceeded</div><div class="v ' + (over ? "bad" : "ok") + '">' + over + '</div></div>' +
    '</div>' +
    '<div class="card"><h2>Expense Analytics by Category</h2>' +
      '<div class="chart-container">' + (chartRows || '<div class="empty">No expenses recorded yet.</div>') + '</div>' +
    '</div>' +
    '<div class="card" style="display:flex; justify-between; align-items:center;">' +
      '<div><strong>Export Database SQL</strong><p class="brand-sub" style="margin:0;">Download complete SQL statements generated from live application data.</p></div>' +
      '<button type="button" class="b" id="btn-export-sql">Download database.sql</button>' +
    '</div>';
  }

  function exps() {
    var e = myExp().filter(function(x) {
      return (!V.fs || x.st === V.fs) && (!V.q || (x.desc + " " + cname(x.cid)).toLowerCase().indexOf(V.q) > -1);
    }).sort(function(a, b) { return b.date.localeCompare(a.date); });

    var form = isAdmin() ? "" :
      '<div class="card"><h2>Record Expense</h2><form data-f="addexp">' +
        '<label>Amount (₹)<input name="amt" type="number" min="1" step="0.01" required></label>' +
        '<label>Date<input name="date" type="date" value="' + today() + '" required></label>' +
        '<label>Category<select name="cid">' + S.cats.map(function(c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join("") + '</select></label>' +
        '<label>Payment Mode<select name="mode"><option>UPI</option><option>Card</option><option>Cash</option></select></label>' +
        '<label style="grid-column: 1/-1">Description<input name="desc" maxlength="80" required></label>' +
        '<button type="submit" class="b">Save Expense</button>' +
      '</form></div>';

    var rows = e.map(function(x) {
      var act = "";
      if (isAdmin() && x.st === "Pending") {
        act = '<button type="button" class="s ok" data-a="ap" data-id="' + x.id + '">Approve</button> ' +
              '<button type="button" class="s bad" data-a="rj" data-id="' + x.id + '">Reject</button>';
      } else if (!isAdmin() && x.st === "Pending") {
        act = '<button type="button" class="s bad" data-a="de" data-id="' + x.id + '">Delete</button>';
      }

      return '<tr>' +
        '<td>' + x.date + '</td>' +
        (isAdmin() ? '<td>' + esc(uname(x.uid)) + '</td>' : '') +
        '<td>' + esc(cname(x.cid)) + '</td>' +
        '<td>' + esc(x.desc) + '</td>' +
        '<td>' + x.mode + '</td>' +
        '<td><strong>' + money(x.amt) + '</strong></td>' +
        '<td><span class="tag ' + x.st + '">' + x.st + '</span></td>' +
        '<td>' + esc(x.rm || "—") + '</td>' +
        '<td>' + act + '</td>' +
      '</tr>';
    }).join("");

    return form +
      '<div class="card tw"><h2>Transactions</h2>' +
      '<form data-f="flt" style="margin-bottom:14px;">' +
        '<label>Search<input name="q" value="' + esc(V.q) + '"></label>' +
        '<label>Filter Status<select name="fs">' +
          ['', 'Pending', 'Approved', 'Rejected'].map(function(s) { return '<option value="' + s + '"' + (V.fs === s ? ' selected' : '') + '>' + (s || 'All Statuses') + '</option>'; }).join('') +
        '</select></label>' +
        '<button type="submit" class="b">Filter</button>' +
      '</form>' +
      (rows ? '<table><thead><tr><th>Date</th>' + (isAdmin() ? '<th>User</th>' : '') + '<th>Category</th><th>Description</th><th>Mode</th><th>Amount</th><th>Status</th><th>Remarks</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<div class="empty">No expenses found.</div>') +
      '</div>';
  }

  function buds() {
    var b = S.bud.filter(function(x) { return isAdmin() || x.uid === uid(); });
    var form = isAdmin() ? "" :
      '<div class="card"><h2>Set Category Monthly Budget</h2><form data-f="addbud">' +
        '<label>Category<select name="cid">' + S.cats.map(function(c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join("") + '</select></label>' +
        '<label>Monthly Limit (₹)<input name="limit" type="number" min="1" required></label>' +
        '<label>Month<input name="mon" type="month" value="' + today().slice(0, 7) + '" required></label>' +
        '<button type="submit" class="b">Save Budget</button>' +
      '</form></div>';

    var list = b.map(function(x) {
      var s = spent(x);
      var p = x.limit ? Math.min((s / x.limit) * 100, 100) : 0;
      var cls = p >= 100 ? "x" : p >= 80 ? "w" : "";
      return '<div style="margin-bottom:16px;">' +
        '<div><strong>' + esc(cname(x.cid)) + '</strong> (' + pad(x.month) + '/' + x.year + ') - ' + money(s) + ' of ' + money(x.limit) + '</div>' +
        '<div class="meter"><i class="' + cls + '" style="width:' + p + '%"></i></div>' +
      '</div>';
    }).join("");

    return form + '<div class="card"><h2>Budget Limits & Status</h2>' + (list || '<div class="empty">No budgets set.</div>') + '</div>';
  }

  function reps() {
    var r = S.rep.filter(function(x) { return isAdmin() || x.uid === uid(); });
    var rows = r.map(function(x) {
      return '<tr><td>#' + x.id + '</td><td>' + x.from + ' to ' + x.to + '</td><td><strong>' + money(x.total) + '</strong></td><td>' + x.gen + '</td></tr>';
    }).join("");

    var form = isAdmin() ? "" :
      '<div class="card"><h2>Generate Period Expense Report</h2><form data-f="addrep">' +
        '<label>From Date<input name="from" type="date" required></label>' +
        '<label>To Date<input name="to" type="date" value="' + today() + '" required></label>' +
        '<button type="submit" class="b">Generate Report</button>' +
      '</form></div>';

    return form + '<div class="card tw"><h2>Generated Reports</h2>' + (rows ? '<table><thead><tr><th>ID</th><th>Period</th><th>Total Spent</th><th>Generated On</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<div class="empty">No reports generated.</div>') + '</div>';
  }

  function cats() {
    var form = isAdmin() ?
      '<div class="card"><h2>Add Expense Category</h2><form data-f="addcat">' +
        '<label>Category Name<input name="name" required></label>' +
        '<label>Description<input name="desc"></label>' +
        '<button type="submit" class="b">Add Category</button>' +
      '</form></div>' : '';

    var rows = S.cats.map(function(c) {
      return '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.desc || '—') + '</td></tr>';
    }).join("");

    return form + '<div class="card tw"><h2>Active Categories</h2><table><thead><tr><th>Name</th><th>Description</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function clients() {
    var rows = S.users.map(function(u) {
      return '<tr><td>' + esc(u.name) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.contact || '—') + '</td><td>' + u.role + '</td></tr>';
    }).join("");
    return '<div class="card tw"><h2>Registered Clients</h2><table><thead><tr><th>Name</th><th>Email</th><th>Contact</th><th>Role</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function auth() {
    var a = V.role === "admin", su = V.mode === "signup";
    return '<div class="card auth">' +
      '<div class="seg"><button data-r="user" class="' + (!a ? 'on' : '') + '">Client Portal</button><button data-r="admin" class="' + (a ? 'on' : '') + '">Admin Portal</button></div>' +
      '<div class="seg"><button data-m="login" class="' + (!su ? 'on' : '') + '">Log In</button><button data-m="signup" class="' + (su ? 'on' : '') + '">Sign Up</button></div>' +
      '<h2>' + (su ? 'Create Account' : 'Welcome Back') + '</h2>' +
      '<form data-f="auth" style="grid-template-columns:1fr;">' +
        (su ? '<label>Full Name<input name="name" required></label>' : '') +
        '<label>Email Address<input name="email" type="email" required></label>' +
        '<label>Password<input name="pw" type="password" required></label>' +
        '<div class="err">' + esc(V.err) + '</div>' +
        '<button type="submit" class="b">' + (su ? 'Sign Up' : 'Log In') + '</button>' +
      '</form>' +
    '</div>';
  }

  function render() {
    var se = document.getElementById("sess");
    var nav = document.getElementById("nav");
    var app = document.getElementById("app");

    if (!V.s) {
      se.innerHTML = "";
      nav.innerHTML = "";
      app.innerHTML = auth();
      return;
    }

    var user = (V.s.role === "admin" ? S.admins : S.users).find(function(x) { return x.id === V.s.id; }) || V.s;
    se.innerHTML = '<span>' + esc(user.name || "User") + ' (' + (isAdmin() ? 'Admin' : 'Client') + ')</span> <button class="s" data-a="logout">Logout</button>';

    var tabs = [["dash", "Dashboard"], ["exp", "Expenses"], ["bud", "Budgets"], ["rep", "Reports"], ["cat", "Categories"]];
    if (isAdmin()) tabs.push(["cl", "Clients"]);

    nav.innerHTML = tabs.map(function(t) {
      return '<button class="' + (V.tab === t[0] ? 'on' : '') + '" data-t="' + t[0] + '">' + t[1] + '</button>';
    }).join("");

    app.innerHTML = { dash: dash, exp: exps, bud: buds, rep: reps, cat: cats, cl: clients }[V.tab]();

    var btnExp = document.getElementById("btn-export-sql");
    if (btnExp) btnExp.onclick = exportSQL;
  }

  /* ── Event Delegation ── */
  document.addEventListener("click", function(e) {
    var btn = e.target.closest("button");
    if (!btn) return;

    if (btn.dataset.t) { V.tab = btn.dataset.t; render(); return; }
    if (btn.dataset.r) { V.role = btn.dataset.r; V.err = ""; render(); return; }
    if (btn.dataset.m) { V.mode = btn.dataset.m; V.err = ""; render(); return; }

    var act = btn.dataset.a, id = +btn.dataset.id;
    if (act === "logout") { sess(null); render(); return; }

    if (act === "ap" || act === "rj") {
      var item = S.exp.find(function(x) { return x.id === id; });
      if (item) {
        openRemarksModal(act === "ap" ? "Approve Expense" : "Reject Expense", function(remarks) {
          item.st = act === "ap" ? "Approved" : "Rejected";
          item.rm = remarks;
          save();
          render();
        });
      }
    }

    if (act === "de") {
      S.exp = S.exp.filter(function(x) { return x.id !== id; });
      save();
      render();
    }
  });

  document.addEventListener("submit", function(e) {
    e.preventDefault();
    var form = e.target, d = new FormData(form), key = form.dataset.f;

    if (key === "auth") {
      var em = d.get("email").trim().toLowerCase();
      var pw = d.get("pw");
      if (V.mode === "signup") {
        var newUser = { id: ++S.n, name: d.get("name"), email: em, role: V.role, pw: pw };
        if (V.role === "admin") S.admins.push(newUser); else S.users.push(newUser);
        sess({ role: V.role, id: newUser.id, name: newUser.name });
      } else {
        var list = V.role === "admin" ? S.admins : S.users;
        var found = list.find(function(x) { return x.email === em; });
        if (!found) { V.err = "Account not found."; render(); return; }
        sess({ role: V.role, id: found.id, name: found.name });
      }
      save(); render(); return;
    }

    if (key === "addexp") {
      S.exp.push({ id: ++S.n, uid: uid(), cid: +d.get("cid"), amt: +d.get("amt"), date: d.get("date"), mode: d.get("mode"), desc: d.get("desc"), st: "Pending", rm: "" });
    }

    if (key === "addbud") {
      var m = d.get("mon").split("-");
      S.bud.push({ id: ++S.n, uid: uid(), cid: +d.get("cid"), limit: +d.get("limit"), month: +m[1], year: +m[0] });
    }

    if (key === "addrep") {
      var approved = S.exp.filter(function(x) { return x.uid === uid() && x.st === "Approved" && x.date >= d.get("from") && x.date <= d.get("to"); });
      S.rep.push({ id: ++S.n, uid: uid(), from: d.get("from"), to: d.get("to"), total: sum(approved), gen: today() });
    }

    if (key === "addcat") {
      S.cats.push({ id: ++S.n, name: d.get("name"), desc: d.get("desc") });
    }

    if (key === "flt") {
      V.q = d.get("q").trim().toLowerCase();
      V.fs = d.get("fs");
    }

    save();
    render();
  });

  render();
})();