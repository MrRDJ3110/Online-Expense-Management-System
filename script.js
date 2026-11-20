/* QUANTUM FIN-HUD ENGINE v4.5 - Comprehensive Single-Page Application */
(function() {
  "use strict";

  var STORE_KEY = "QUANTUM_FINANCE_STATE_V45";

  // Initial Seed Data Engine
  function getSeedData() {
    return {
      user: { id: 101, name: "Netrunner Operator", email: "operator@quantum.io", role: "admin", currency: "USD", theme: "cyberpunk" },
      accounts: [
        { id: 1, name: "Main Cyber Vault", type: "Bank", balance: 48500.00, number: "**** 8892" },
        { id: 2, name: "Crypto Quantum Wallet", type: "Wallet", balance: 12400.50, number: "0x7F...3B9" },
        { id: 3, name: "Matrix Credit Card", type: "Credit Card", balance: -1250.00, number: "**** 4102" },
        { id: 4, name: "Emergency Stash", type: "Savings", balance: 25000.00, number: "EMG-SAFE" }
      ],
      categories: [
        { id: 1, name: "Cybertech & Software", type: "expense", color: "#00f3ff" },
        { id: 2, name: "Energy & Utilities", type: "expense", color: "#ff0055" },
        { id: 3, name: "Nutritional Supplies", type: "expense", color: "#ffb700" },
        { id: 4, name: "Base Operations", type: "expense", color: "#00ff66" },
        { id: 5, name: "Neural Payroll", type: "income", color: "#a855f7" },
        { id: 6, name: "Quantum Investments", type: "income", color: "#00ffcc" }
      ],
      transactions: [
        { id: 501, accountId: 1, categoryId: 5, type: "income", amount: 8500.00, date: new Date().toISOString().slice(0, 10), mode: "Bank Transfer", desc: "Monthly Neural Payroll Salary", status: "Approved", remarks: "Verified" },
        { id: 502, accountId: 1, categoryId: 1, type: "expense", amount: 299.00, date: new Date().toISOString().slice(0, 10), mode: "Card", desc: "Cloud Quantum Server Unit", status: "Approved", remarks: "Recurring" },
        { id: 503, accountId: 2, categoryId: 3, type: "expense", amount: 145.50, date: new Date().toISOString().slice(0, 10), mode: "Crypto", desc: "Hydroponic Supplies", status: "Approved", remarks: "" },
        { id: 504, accountId: 3, categoryId: 2, type: "expense", amount: 320.00, date: new Date().toISOString().slice(0, 10), mode: "Card", desc: "Plasma Grid Utilities", status: "Pending", remarks: "Reviewing" }
      ],
      budgets: [
        { id: 1, categoryId: 1, limit: 1000.00, period: "monthly" },
        { id: 2, categoryId: 3, limit: 500.00, period: "monthly" }
      ],
      goals: [
        { id: 1, name: "Orbital Space Habitat Unit", target: 100000.00, current: 35400.00, date: "2026-12-31" },
        { id: 2, name: "Emergency Core Stash", target: 30000.00, current: 25000.00, date: "2025-09-30" }
      ],
      loans: [
        { id: 1, title: "Hover-Carrier Auto Loan", principal: 45000.00, remaining: 18200.00, rate: 4.5, emi: 850.00 }
      ]
    };
  }

  // Load / Persist State
  var S;
  try { S = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { S = null; }
  if (!S || !S.transactions) S = getSeedData();

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {}
    updateTopMetrics();
  }

  // Currency Formatter
  function money(val) {
    var cur = S.user.currency || "USD";
    var sym = { USD: "$", EUR: "€", INR: "₹", GBP: "£", BTC: "₿" }[cur] || "$";
    return sym + Number(val || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function(c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function cname(id) { var c = S.categories.find(function(x) { return x.id === id; }); return c ? c.name : "General"; }
  function aname(id) { var a = S.accounts.find(function(x) { return x.id === id; }); return a ? a.name : "Vault"; }

  // Navigation Setup
  var TABS = [
    { id: "dash", label: "HUD DASHBOARD" },
    { id: "tx", label: "TRANSACTIONS" },
    { id: "accounts", label: "ACCOUNTS & VAULTS" },
    { id: "budgets", label: "BUDGETS & GOALS" },
    { id: "tools", label: "EMI & LOANS" },
    { id: "reports", label: "ANALYTICS & EXPORTS" }
  ];
  var activeTab = "dash";

  function renderNav() {
    var navEl = document.getElementById("main-nav");
    navEl.innerHTML = TABS.map(function(t) {
      return '<button class="' + (activeTab === t.id ? 'active' : '') + '" data-t="' + t.id + '">' + t.label + '</button>';
    }).join("");
  }

  document.getElementById("main-nav").addEventListener("click", function(e) {
    if (e.target.dataset.t) {
      activeTab = e.target.dataset.t;
      renderNav();
      renderApp();
    }
  });

  // Top Bar Metrics Update
  function updateTopMetrics() {
    var totalBalance = S.accounts.reduce(function(tot, a) { return tot + Number(a.balance); }, 0);
    document.getElementById("hud-net-worth").textContent = money(totalBalance);
    document.getElementById("cur-select").value = S.user.currency || "USD";
  }

  document.getElementById("cur-select").addEventListener("change", function(e) {
    S.user.currency = e.target.value;
    save();
    renderApp();
  });

  // Theme Toggle
  document.getElementById("theme-btn").addEventListener("click", function() {
    var cur = document.documentElement.getAttribute("data-theme");
    var next = cur === "light" ? "cyberpunk" : "light";
    document.documentElement.setAttribute("data-theme", next);
  });

  // AI Drawer Handlers
  var aiDrawer = document.getElementById("ai-drawer");
  document.getElementById("ai-toggle-btn").addEventListener("click", function() { aiDrawer.classList.toggle("open"); });
  document.getElementById("close-ai-btn").addEventListener("click", function() { aiDrawer.classList.remove("open"); });

  document.getElementById("ai-send").addEventListener("click", function() {
    var input = document.getElementById("ai-input");
    var q = input.value.trim();
    if (!q) return;
    addAiMessage(q, "user");
    input.value = "";
    setTimeout(function() { respondAi(q); }, 500);
  });

  function addAiMessage(txt, type) {
    var box = document.getElementById("ai-messages");
    var div = document.createElement("div");
    div.className = "msg " + type;
    div.textContent = txt;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }

  function respondAi(q) {
    var query = q.toLowerCase();
    var resp = "Neural Assistant processing query...";
    if (query.indexOf("predict") > -1) {
      var expTot = S.transactions.filter(function(x) { return x.type === "expense"; }).reduce(function(t, x) { return t + x.amount; }, 0);
      resp = "Based on trend analysis, predicted next month expenses will be approximately " + money(expTot * 1.05) + " (+5%).";
    } else if (query.indexOf("anomaly") > -1) {
      resp = "No critical spending anomalies detected. All transactions are within 1.5 sigma variance.";
    } else if (query.indexOf("budget") > -1) {
      resp = "Smart Budget Recommendation: Reduce 'Cybertech' by 10% and allocate " + money(250) + " to your Savings Goal.";
    } else {
      resp = "Operator, system analyzed your financial HUD. Net balance stability index is at 94.8%.";
    }
    addAiMessage(resp, "bot");
  }

  document.querySelector(".ai-chips").addEventListener("click", function(e) {
    if (e.target.dataset.q) {
      var q = e.target.textContent;
      addAiMessage(q, "user");
      setTimeout(function() { respondAi(q); }, 400);
    }
  });

  // Modal Dialog System
  function showModal(title, htmlContent, onConfirm) {
    var modalBg = document.getElementById("hud-modal");
    modalBg.innerHTML =
      '<div class="modal-card">' +
        '<h3 style="color:var(--cyan); font-family:var(--font-hud); margin-top:0;">' + esc(title) + '</h3>' +
        '<div>' + htmlContent + '</div>' +
        '<div style="display:flex; justify-content:flex-end; gap:10px; margin-top:16px;">' +
          '<button class="hud-btn" id="modal-cancel">CANCEL</button>' +
          '<button class="hud-btn pink" id="modal-ok">CONFIRM</button>' +
        '</div>' +
      '</div>';
    modalBg.classList.add("active");

    document.getElementById("modal-cancel").onclick = function() { modalBg.classList.remove("active"); };
    document.getElementById("modal-ok").onclick = function() {
      if (onConfirm) onConfirm();
      modalBg.classList.remove("active");
    };
  }

  // ── VIEWS ──

  // 1. Dashboard View
  function renderDashboard() {
    var totalInc = S.transactions.filter(function(x) { return x.type === "income"; }).reduce(function(t, x) { return t + x.amount; }, 0);
    var totalExp = S.transactions.filter(function(x) { return x.type === "expense"; }).reduce(function(t, x) { return t + x.amount; }, 0);
    var pendingCount = S.transactions.filter(function(x) { return x.status === "Pending"; }).length;

    var catSpending = {};
    S.transactions.filter(function(x) { return x.type === "expense"; }).forEach(function(x) {
      catSpending[x.categoryId] = (catSpending[x.categoryId] || 0) + x.amount;
    });

    var chartBars = Object.keys(catSpending).map(function(cid) {
      var pct = totalExp ? Math.min((catSpending[cid] / totalExp) * 100, 100) : 0;
      return '<div style="margin-bottom:10px;">' +
        '<div style="display:flex; justify-content:space-between; font-size:12px; font-family:var(--font-mono); margin-bottom:2px;">' +
          '<span>' + esc(cname(+cid)) + '</span><span>' + money(catSpending[cid]) + ' (' + pct.toFixed(1) + '%)</span>' +
        '</div>' +
        '<div class="meter-track"><div class="meter-fill" style="width:' + pct + '%"></div></div>' +
      '</div>';
    }).join("");

    return '<div class="hud-grid">' +
      '<div class="hud-card"><div class="stat-pill"><span class="lbl">TOTAL INCOME</span></div><div class="stat-val green">' + money(totalInc) + '</div></div>' +
      '<div class="hud-card pink"><div class="stat-pill"><span class="lbl">TOTAL EXPENSES</span></div><div class="stat-val pink">' + money(totalExp) + '</div></div>' +
      '<div class="hud-card"><div class="stat-pill"><span class="lbl">PENDING APPROVALS</span></div><div class="stat-val amber">' + pendingCount + '</div></div>' +
    '</div>' +
    '<div class="hud-grid" style="grid-template-columns: 2fr 1fr;">' +
      '<div class="hud-card">' +
        '<h3>EXPENSE DISTRIBUTION BY CATEGORY</h3>' +
        (chartBars || '<div style="color:var(--text-muted);">No expenses recorded yet.</div>') +
      '</div>' +
      '<div class="hud-card pink">' +
        '<h3>SAVINGS GOALS PROGRESS</h3>' +
        S.goals.map(function(g) {
          var pct = Math.min((g.current / g.target) * 100, 100);
          return '<div style="margin-bottom:14px;">' +
            '<div style="display:flex; justify-content:space-between; font-size:12px; font-family:var(--font-mono);">' +
              '<span>' + esc(g.name) + '</span><span>' + money(g.current) + ' / ' + money(g.target) + '</span>' +
            '</div>' +
            '<div class="meter-track"><div class="meter-fill" style="width:' + pct + '%; background:var(--green); box-shadow:0 0 8px var(--green);"></div></div>' +
          '</div>';
        }).join("") +
      '</div>' +
    '</div>';
  }

  // 2. Transactions View
  function renderTransactions() {
    var formHtml =
      '<div class="hud-card" style="margin-bottom:20px;">' +
        '<h3>RECORD TRANSACTION</h3>' +
        '<form id="tx-form" class="hud-form">' +
          '<div class="form-group"><label>TYPE</label><select name="type" class="hud-input"><option value="expense">Expense</option><option value="income">Income</option></select></div>' +
          '<div class="form-group"><label>AMOUNT</label><input name="amount" type="number" step="0.01" required class="hud-input" placeholder="0.00"></div>' +
          '<div class="form-group"><label>CATEGORY</label><select name="categoryId" class="hud-input">' + S.categories.map(function(c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join("") + '</select></div>' +
          '<div class="form-group"><label>ACCOUNT</label><select name="accountId" class="hud-input">' + S.accounts.map(function(a) { return '<option value="' + a.id + '">' + esc(a.name) + '</option>'; }).join("") + '</select></div>' +
          '<div class="form-group"><label>DATE</label><input name="date" type="date" value="' + new Date().toISOString().slice(0, 10) + '" required class="hud-input"></div>' +
          '<div class="form-group"><label>PAYMENT MODE</label><select name="mode" class="hud-input"><option>Card</option><option>UPI</option><option>Crypto</option><option>Cash</option></select></div>' +
          '<div class="form-group full"><label>DESCRIPTION</label><input name="desc" required placeholder="Transaction description..." class="hud-input"></div>' +
          '<div class="form-group"><button type="submit" class="hud-btn">ADD TRANSACTION</button></div>' +
        '</form>' +
      '</div>';

    var rows = S.transactions.map(function(x) {
      var act = '';
      if (S.user.role === "admin" && x.status === "Pending") {
        act = '<button class="hud-btn green" data-act="ap" data-id="' + x.id + '">Approve</button> ' +
              '<button class="hud-btn pink" data-act="rj" data-id="' + x.id + '">Reject</button>';
      } else {
        act = '<button class="hud-btn pink" data-act="del" data-id="' + x.id + '">Delete</button>';
      }

      return '<tr>' +
        '<td>' + x.date + '</td>' +
        '<td><span class="' + (x.type === "income" ? "green" : "pink") + '">' + x.type.toUpperCase() + '</span></td>' +
        '<td>' + esc(cname(x.categoryId)) + '</td>' +
        '<td>' + esc(aname(x.accountId)) + '</td>' +
        '<td>' + esc(x.desc) + '</td>' +
        '<td><strong class="cyan">' + money(x.amount) + '</strong></td>' +
        '<td><span class="badge ' + x.status + '">' + x.status + '</span></td>' +
        '<td>' + act + '</td>' +
      '</tr>';
    }).join("");

    return formHtml +
      '<div class="hud-card tw"><h3>TRANSACTION LOGS</h3>' +
      (rows ? '<table class="hud-table"><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Account</th><th>Description</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>' + rows + '</tbody></table>' : '<div style="color:var(--text-muted);">No records found.</div>') +
      '</div>';
  }

  // 3. Accounts & Vaults View
  function renderAccounts() {
    var cards = S.accounts.map(function(a) {
      return '<div class="hud-card">' +
        '<h3>' + esc(a.name) + ' <span class="badge Approved">' + a.type + '</span></h3>' +
        '<div style="font-family:var(--font-mono); font-size:12px; color:var(--text-muted);">' + esc(a.number) + '</div>' +
        '<div class="stat-val cyan" style="margin-top:12px;">' + money(a.balance) + '</div>' +
      '</div>';
    }).join("");

    return '<div class="hud-grid">' + cards + '</div>';
  }

  // 4. Budgets & Goals View
  function renderBudgets() {
    var items = S.budgets.map(function(b) {
      var spent = S.transactions.filter(function(x) { return x.categoryId === b.categoryId && x.type === "expense"; }).reduce(function(t, x) { return t + x.amount; }, 0);
      var pct = Math.min((spent / b.limit) * 100, 100);
      var cls = pct >= 100 ? "x" : pct >= 80 ? "w" : "";
      return '<div class="hud-card" style="margin-bottom:14px;">' +
        '<div style="display:flex; justify-content:space-between;">' +
          '<strong>' + esc(cname(b.categoryId)) + '</strong>' +
          '<span class="cyan">' + money(spent) + ' / ' + money(b.limit) + '</span>' +
        '</div>' +
        '<div class="meter-track"><div class="meter-fill ' + cls + '" style="width:' + pct + '%"></div></div>' +
      '</div>';
    }).join("");

    return '<h3>CATEGORY BUDGET LIMITS</h3>' + (items || '<div style="color:var(--text-muted);">No budgets defined.</div>');
  }

  // 5. EMI & Tools View
  function renderTools() {
    return '<div class="hud-card">' +
      '<h3>EMI & LOAN CALCULATOR</h3>' +
      '<div class="hud-form">' +
        '<div class="form-group"><label>PRINCIPAL AMOUNT ($)</label><input id="emi-p" type="number" value="20000" class="hud-input"></div>' +
        '<div class="form-group"><label>ANNUAL INTEREST RATE (%)</label><input id="emi-r" type="number" value="7.5" step="0.1" class="hud-input"></div>' +
        '<div class="form-group"><label>TENURE (MONTHS)</label><input id="emi-n" type="number" value="36" class="hud-input"></div>' +
        '<div class="form-group"><button type="button" id="calc-emi-btn" class="hud-btn">CALCULATE EMI</button></div>' +
      '</div>' +
      '<div id="emi-result" style="margin-top:20px; font-family:var(--font-hud); font-size:24px;" class="cyan"></div>' +
    '</div>';
  }

  // 6. Analytics & Exports View
  function renderReports() {
    return '<div class="hud-card">' +
      '<h3>DATA EXPORT & BACKUP ENGINE</h3>' +
      '<p style="color:var(--text-muted);">Export your financial ledger to SQL database format, CSV, or trigger data backups.</p>' +
      '<div style="display:flex; gap:12px; margin-top:16px;">' +
        '<button class="hud-btn" id="export-sql-btn">EXPORT DATABASE.SQL</button>' +
        '<button class="hud-btn green" id="export-csv-btn">EXPORT CSV</button>' +
      '</div>' +
    '</div>';
  }

  // Master Render Engine
  function renderApp() {
    renderNav();
    updateTopMetrics();
    var root = document.getElementById("app-root");

    if (activeTab === "dash") root.innerHTML = renderDashboard();
    else if (activeTab === "tx") root.innerHTML = renderTransactions();
    else if (activeTab === "accounts") root.innerHTML = renderAccounts();
    else if (activeTab === "budgets") root.innerHTML = renderBudgets();
    else if (activeTab === "tools") root.innerHTML = renderTools();
    else if (activeTab === "reports") root.innerHTML = renderReports();

    bindEvents();
  }

  // Event Handlers Setup
  function bindEvents() {
    // Transaction Form Submit
    var txForm = document.getElementById("tx-form");
    if (txForm) {
      txForm.onsubmit = function(e) {
        e.preventDefault();
        var d = new FormData(txForm);
        var newTx = {
          id: ++S.transactions.length + 500,
          accountId: +d.get("accountId"),
          categoryId: +d.get("categoryId"),
          type: d.get("type"),
          amount: +d.get("amount"),
          date: d.get("date"),
          mode: d.get("mode"),
          desc: d.get("desc"),
          status: "Approved",
          remarks: ""
        };

        // Adjust Account Balance
        var acc = S.accounts.find(function(a) { return a.id === newTx.accountId; });
        if (acc) {
          if (newTx.type === "income") acc.balance += newTx.amount;
          else acc.balance -= newTx.amount;
        }

        S.transactions.unshift(newTx);
        save();
        renderApp();
      };
    }

    // Transaction Actions (Approve, Reject, Delete)
    document.querySelectorAll("[data-act]").forEach(function(btn) {
      btn.onclick = function() {
        var act = btn.dataset.act;
        var id = +btn.dataset.id;
        var item = S.transactions.find(function(x) { return x.id === id; });

        if (act === "del") {
          S.transactions = S.transactions.filter(function(x) { return x.id !== id; });
        } else if (act === "ap" || act === "rj") {
          showModal(act === "ap" ? "APPROVE TRANSACTION" : "REJECT TRANSACTION",
            '<label style="font-family:var(--font-mono); font-size:12px;">REMARKS<input id="rm-input" class="hud-input" style="width:100%; margin-top:6px;" placeholder="Optional notes..."></label>',
            function() {
              item.status = act === "ap" ? "Approved" : "Rejected";
              item.remarks = document.getElementById("rm-input").value;
              save();
              renderApp();
            }
          );
          return;
        }
        save();
        renderApp();
      };
    });

    // EMI Calculator Logic
    var emiBtn = document.getElementById("calc-emi-btn");
    if (emiBtn) {
      emiBtn.onclick = function() {
        var p = +document.getElementById("emi-p").value;
        var r = (+document.getElementById("emi-r").value) / 12 / 100;
        var n = +document.getElementById("emi-n").value;
        var emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        document.getElementById("emi-result").textContent = "ESTIMATED MONTHLY EMI: " + money(emi);
      };
    }

    // Export SQL Handler
    var sqlBtn = document.getElementById("export-sql-btn");
    if (sqlBtn) {
      sqlBtn.onclick = function() {
        var sql = "-- QUANTUM FIN-HUD DATABASE DUMP\n\n";
        S.transactions.forEach(function(x) {
          sql += `INSERT INTO transactions (id, account_id, category_id, type, amount, transaction_date, description, status) VALUES (${x.id}, ${x.accountId}, ${x.categoryId}, '${x.type}', ${x.amount}, '${x.date}', '${x.desc.replace(/'/g, "''")}', '${x.status}');\n`;
        });
        downloadFile(sql, "database.sql", "text/plain");
      };
    }

    // Export CSV Handler
    var csvBtn = document.getElementById("export-csv-btn");
    if (csvBtn) {
      csvBtn.onclick = function() {
        var csv = "ID,Date,Type,Amount,Description,Status\n";
        S.transactions.forEach(function(x) {
          csv += `${x.id},${x.date},${x.type},${x.amount},"${x.desc}",${x.status}\n`;
        });
        downloadFile(csv, "transactions.csv", "text/csv");
      };
    }
  }

  function downloadFile(content, fileName, mimeType) {
    var blob = new Blob([content], { type: mimeType });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
  }

  // Initial Boot
  renderApp();
})();
