/* Online Expense Management System - application logic (plain JavaScript).
   Data is kept in the browser's localStorage. */
(function(){
var KEY="oems-v2";
function pad(n){return String(n).padStart(2,"0")}
function today(){return new Date().toISOString().slice(0,10)}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function money(n){return "₹"+Number(n).toLocaleString("en-IN")}
function seed(){return{n:100,
 users:[],admins:[],
 
 cats:[{id:1,name:"Travel",desc:"Fuel, tickets, cabs"},{id:2,name:"Food",desc:"Meals and refreshments"},{id:3,name:"Office Supplies",desc:"Stationery and equipment"},{id:4,name:"Utilities",desc:"Internet, electricity, phone"}],
 exp:[],
 bud:[],
 rep:[]}}
var S;try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}
if(!S||!S.exp||typeof S.n!=="number")S=seed();

function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}

function sess(s){
 V.s=s;
 V.em='';
 try{
  if(s)localStorage.setItem(KEY+'-s',JSON.stringify(s));
  else localStorage.removeItem(KEY+'-s');
 }catch(e){}
}

function hash(pw,salt){
 var t=salt+pw;
 if(window.crypto&&crypto.subtle&&window.TextEncoder){
  return crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)).then(function(b){
   return Array.from(new Uint8Array(b)).map(function(x){return pad(x.toString(16))}).join('')
  });
 }
 var h=5381;
 for(var i=0;i<t.length;i++)h=((h<<5)+h+t.charCodeAt(i))>>>0;
 return Promise.resolve('d'+h);
}

var V={s:null,tab:'dash',mode:'login',role:'user',err:'',q:'',fs:''};
try{V.s=JSON.parse(localStorage.getItem(KEY+'-s'))}catch(e){}

function isAdmin(){return !!V.s&&V.s.role==='admin'}
function uid(){return isAdmin()||!V.s?0:V.s.id}
function uname(id){var u=S.users.filter(function(x){return x.id===id})[0];return u?u.name:"?"}
function cname(id){var c=S.cats.filter(function(x){return x.id===id})[0];return c?c.name:"?"}
function myExp(){return S.exp.filter(function(e){return isAdmin()||e.uid===uid()})}
function sum(a){return a.reduce(function(t,e){return t+e.amt},0)}
function spent(b){
 var p=b.year+"-"+pad(b.month);
 return sum(S.exp.filter(function(e){
  return e.uid===b.uid&&e.cid===b.cid&&e.date.indexOf(p)===0&&e.st!=="Rejected"
 }))
}
function meter(used,lim){
 var p=lim?used/lim*100:0;
 return '<div class="meter"><i class="'+(p>100?"x":p>=80?"w":"")+'" style="width:'+Math.min(p,100)+'%"></i></div>'
}
function catOpts(){
 return S.cats.map(function(c){
  return '<option value="'+c.id+'">'+esc(c.name)+"</option>"
 }).join("")
}

/* Small modal instead of prompt(), so approve/reject works even in environments where prompt() is blocked. */
function askRemarks(title,onOk){
 var old=document.getElementById("oems-remarks");
 if(old)old.remove();

 var el=document.createElement("div");
 el.id="oems-remarks";
 el.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px";

 el.innerHTML=
  '<div style="background:var(--card);color:var(--text);border:1px solid var(--line);border-radius:12px;padding:16px;max-width:360px;width:100%;box-sizing:border-box">' +
  '<h2 style="margin:0 0 10px">'+esc(title)+'</h2>' +
  '<label style="display:grid;gap:4px;font-size:13px;color:var(--muted)">Remarks<textarea rows="3" id="oems-remarks-input" style="width:100%;box-sizing:border-box;padding:9px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);font:inherit"></textarea></label>' +
  '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">' +
  '<button type="button" id="oems-remarks-cancel" class="s">Cancel</button>' +
  '<button type="button" id="oems-remarks-ok" class="b">Save</button>' +
  '</div></div>';

 document.body.appendChild(el);

 var input=el.querySelector("#oems-remarks-input");

 function close(rm){
  if(el.parentNode)el.remove();
  if(rm!==undefined)onOk(rm);
 }

 el.querySelector("#oems-remarks-cancel").addEventListener("click",function(){
  close(undefined);
 });

 el.querySelector("#oems-remarks-ok").addEventListener("click",function(){
  close(input.value.trim());
 });

 el.addEventListener("click",function(ev){
  if(ev.target===el)close(undefined);
 });

 if(input){
  input.focus();
  input.addEventListener("keydown",function(ev){
   if(ev.key==="Enter"&&!ev.shiftKey){
    ev.preventDefault();
    close(input.value.trim());
   }
  });
 }
}

var TABS=[["dash","Dashboard"],["exp","Expenses"],["bud","Budgets"],["rep","Reports"],["cat","Categories"],["cl","Clients"]];

function dash(){
 var e=myExp(),
 ap=sum(e.filter(function(x){return x.st==="Approved"})),
 pe=e.filter(function(x){return x.st==="Pending"});

 var by={};
 e.filter(function(x){return x.st!=="Rejected"}).forEach(function(x){
  by[x.cid]=(by[x.cid]||0)+x.amt;
 });

 var tot=sum(e.filter(function(x){return x.st!=="Rejected"})),
 rows=Object.keys(by).map(function(k){
  return '<div>'+esc(cname(+k))+' <b>'+money(by[k])+'</b>'+meter(by[k],tot)+'</div>'
 }).join("");

 var over=S.bud.filter(function(b){
  return(isAdmin()||b.uid===uid())&&spent(b)>b.limit
 }).length;

 return '<div class="grid">' +
 '<div class="card"><div class="k">Approved spend</div><div class="v">'+money(ap)+'</div></div>' +
 '<div class="card"><div class="k">Awaiting approval</div><div class="v">'+pe.length+'</div></div>' +
 '<div class="card"><div class="k">Budgets exceeded</div><div class="v" style="color:'+(over?"var(--bad)":"var(--ok)")+'">'+over+'</div></div>' +
 '</div>' +
 '<div class="card"><h2>Spend by category</h2>'+(rows||'<div class="empty">No expenses yet.</div>')+'</div>'
}

function exps(){
 var e=myExp().filter(function(x){
  return(!V.fs||x.st===V.fs)&&
        (!V.q||(x.desc+' '+cname(x.cid)).toLowerCase().indexOf(V.q)>-1)
 }).sort(function(a,b){return b.date.localeCompare(a.date)});

 var f=isAdmin()
 ?'<p class="note">Admins review and approve or reject expenses submitted by users.</p>'
 :'<div class="card"><h2>Record an expense</h2><form data-f="addexp">' +
   '<label>Amount (₹)<input name="amt" type="number" min="1" step="0.01" required></label>' +
   '<label>Date<input name="date" type="date" value="'+today()+'" required></label>' +
   '<label>Category<select name="cid">'+catOpts()+'</select></label>' +
   '<label>Payment mode<select name="mode"><option>UPI</option><option>Card</option><option>Cash</option></select></label>' +
   '<label>Description<input name="desc" maxlength="80" required></label>' +
   '<button type="submit" class="b">Add expense</button>' +
  '</form></div>';

 var r=e.map(function(x){
  var a=
   isAdmin()&&x.st==="Pending"
   ?'<button type="button" class="s ok" data-a="ap" data-id="'+x.id+'">Approve</button> ' +
     '<button type="button" class="s bad" data-a="rj" data-id="'+x.id+'">Reject</button>'
   :(!isAdmin()&&x.st==="Pending"
     ?'<button type="button" class="s" data-a="ed" data-id="'+x.id+'">Edit</button> ' +
       '<button type="button" class="s bad" data-a="de" data-id="'+x.id+'">Delete</button>'
     :""
    );

  return "<tr><td>"+x.date+"</td>" +
   (isAdmin()?"<td>"+esc(uname(x.uid))+"</td>":"") +
   "<td>"+esc(cname(x.cid))+"</td>" +
   "<td>"+esc(x.desc)+"</td>" +
   "<td>"+x.mode+"</td>" +
   "<td>"+money(x.amt)+'</td>' +
   '<td><span class="tag '+x.st+'">'+x.st+"</span></td>" +
   "<td>"+esc(x.rm||"")+"</td>" +
   "<td>"+a+"</td></tr>";
 }).join("");

 return f+
 '<div class="card tw"><h2>'+(isAdmin()?"All expenses":"My expenses")+'</h2>' +
 '<form data-f="flt" style="margin-bottom:10px">' +
  '<label>Search<input name="q" value="'+esc(V.q)+'"></label>' +
  '<label>Status<select name="fs">' +
   ['','Pending','Approved','Rejected'].map(function(s){
    return '<option value="'+s+'"'+(V.fs===s?' selected':'')+'>'+(s||'All')+'</option>'
   }).join('') +
  '</select></label>' +
  '<button type="submit" class="b">Filter</button>' +
 '</form>' +
 (r
  ?"<table><tr><th>Date</th>"+(isAdmin()?"<th>User</th>":"")+"<th>Category</th><th>Description</th><th>Mode</th><th>Amount</th><th>Status</th><th>Remarks</th><th></th></tr>"+r+"</table>"
  :'<div class="empty">No expenses recorded.</div>') +
 "</div>"
}

function buds(){
 var b=S.bud.filter(function(x){return isAdmin()||x.uid===uid()});

 var f=isAdmin()
 ?""
 :'<div class="card"><h2>Set a monthly budget</h2><form data-f="addbud">' +
   '<label>Category<select name="cid">'+catOpts()+'</select></label>' +
   '<label>Monthly limit (₹)<input name="limit" type="number" min="1" required></label>' +
   '<label>Month<input name="mon" type="month" value="'+today().slice(0,7)+'" required></label>' +
   '<button type="submit" class="b">Save budget</button>' +
  '</form></div>';

 var r=b.map(function(x){
  var s=spent(x);
  return '<div style="margin-bottom:14px">' +
   (isAdmin()?esc(uname(x.uid))+" · ":"") +
   "<b>"+esc(cname(x.cid))+"</b> · "+pad(x.month)+"/"+x.year +
   ' <span class="note">'+money(s)+" of "+money(x.limit)+"</span>" +
   (s>x.limit?' <span class="tag Rejected">Limit exceeded</span>':s>=x.limit*.8?' <span class="tag Pending">Near limit</span>':"") +
   meter(s,x.limit) +
   (isAdmin()?"":'<button type="button" class="s bad" data-a="db" data-id="'+x.id+'">Remove</button>') +
  "</div>";
 }).join("");

 return f+
 '<div class="card"><h2>Budget tracking</h2>'+(r||'<div class="empty">No budgets set.</div>')+"</div>"
}

function reps(){
 var r=S.rep.filter(function(x){return isAdmin()||x.uid===uid()});

 var f=isAdmin()
 ?""
 :'<div class="card"><h2>Generate a report</h2><form data-f="addrep">' +
   '<label>From<input name="from" type="date" value="'+today().slice(0,8)+'01" required></label>' +
   '<label>To<input name="to" type="date" value="'+today()+'" required></label>' +
   '<button type="submit" class="b">Generate</button>' +
  '</form></div>';

 var rows=r.slice().reverse().map(function(x){
  return "<tr><td>#"+x.id+"</td>" +
   (isAdmin()?"<td>"+esc(uname(x.uid))+"</td>":"") +
   "<td>"+x.from+" → "+x.to+"</td>" +
   "<td>"+money(x.total)+"</td>" +
   "<td>"+Object.keys(x.by||{}).map(function(k){
    return esc(cname(+k))+" "+money(x.by[k]);
   }).join(", ")+"</td>" +
   "<td>"+x.gen+"</td></tr>";
 }).join("");

 return f+
 '<div class="card tw"><h2>Generated reports</h2>' +
 (rows
  ?"<table><tr><th>ID</th>"+(isAdmin()?"<th>User</th>":"")+"<th>Period</th><th>Total</th><th>By category</th><th>Generated</th></tr>"+rows+"</table>"
  :'<div class="empty">No reports yet.</div>') +
 "</div>"
}

function cats(){
 var f=isAdmin()
 ?'<div class="card"><h2>Add a category</h2><form data-f="addcat">' +
   '<label>Name<input name="name" required maxlength="30"></label>' +
   '<label>Description<input name="desc" maxlength="60"></label>' +
   '<button type="submit" class="b">Add category</button>' +
  '</form></div>'
 :'<p class="note">Only the admin can add or remove categories.</p>';

 var r=S.cats.map(function(c){
  return "<tr><td>"+esc(c.name)+"</td><td>"+esc(c.desc||"")+"</td>" +
   "<td>"+(isAdmin()?'<button type="button" class="s bad" data-a="dc" data-id="'+c.id+'">Remove</button>':"")+"</td></tr>";
 }).join("");

 return f+
 '<div class="card tw"><h2>Categories</h2>' +
 '<table><tr><th>Name</th><th>Description</th><th></th></tr>'+r+"</table></div>"
}

function render(){
 var cur=null;

 if(V.s){
  cur=(V.s.role==='admin'?S.admins:S.users).filter(function(x){return x.id===V.s.id})[0];
  if(!cur)sess(null);
 }

 var se=document.getElementById('sess');

 if(!V.s){
  se.innerHTML='';
  document.getElementById('nav').innerHTML='';
  document.getElementById('app').innerHTML=auth();
  return;
 }

 if(V.tab==='cl'&&!isAdmin())V.tab='dash';

 se.innerHTML='<span class="note">'+esc(cur.name)+' · '+(isAdmin()?'Admin':'Client')+'</span>' +
  '<button type="button" class="s" data-a="out">Log out</button>';

 document.getElementById("nav").innerHTML=TABS
 .filter(function(t){return t[0]!=='cl'||isAdmin()})
 .map(function(t){
  return '<button type="button" class="'+(V.tab===t[0]?"on":"")+'" data-t="'+t[0]+'">'+t[1]+"</button>"
 }).join("");

 document.getElementById("app").innerHTML={dash:dash,exp:exps,bud:buds,rep:reps,cat:cats,cl:clients}[V.tab]()
}

function auth(){
 var a=V.role==='admin',su=V.mode==='signup';
 return '<div class="card auth">' +
 '<div class="seg">' +
  '<button type="button" data-r="user" class="'+(!a?'on':'')+'">Client</button>' +
  '<button type="button" data-r="admin" class="'+(a?'on':'')+'">Admin</button>' +
 '</div>' +
 '<div class="seg">' +
  '<button type="button" data-m="login" class="'+(!su?'on':'')+'">Log in</button>' +
  '<button type="button" data-m="signup" class="'+(su?'on':'')+'">Sign up</button>' +
 '</div>' +
 '<h2>'+(su?'Create '+(a?'admin':'client')+' account':(a?'Admin':'Client')+' log in')+'</h2>' +
 '<form data-f="auth" style="grid-template-columns:1fr">' +
  (su?'<label>Full name<input name="name" required maxlength="40"></label>':'') +
  '<label>Email<input name="email" type="email" required autocomplete="username" value="'+esc(V.em||'')+'"></label>' +
  (su&&!a?'<label>Contact number<input name="contact" inputmode="tel" maxlength="15"></label>':'') +
  '<label>Password<input name="pw" type="password" required minlength="6" autocomplete="'+(su?'new-password':'current-password')+'"></label>' +
  (su?'<label>Confirm password<input name="pw2" type="password" required minlength="6" autocomplete="new-password"></label>':'') +
  '<div class="err">'+esc(V.err)+'</div>' +
  '<button type="submit" class="b">'+(su?'Create account':'Log in')+'</button>' +
 '</form></div>'
}

function doAuth(d){
 var a=V.role==='admin',
 su=V.mode==='signup',
 em=d.get('email').trim().toLowerCase(),
 pw=d.get('pw'),
 list=a?S.admins:S.users,
 ac=list.filter(function(x){return x.email===em})[0];

 function fail(m){V.err=m;V.em=em;render()}

 if(su){
  if(ac)return fail('An account with this email already exists.');
  if(pw!==d.get('pw2'))return fail('The passwords don’t match.');

  var salt=Math.random().toString(36).slice(2);
  hash(pw,salt).then(function(h){
   var n={id:++S.n,name:d.get('name').trim(),email:em,salt:salt,pw:h};
   if(!a)n.contact=(d.get('contact')||'').trim();
   list.push(n);
   save();
   V.err='';
   sess({role:a?'admin':'user',id:n.id});
   render();
  });
  return;
 }

 if(!ac)return fail('No '+(a?'admin':'client')+' account found for this email.');

 hash(pw,ac.salt).then(function(h){
  if(h!==ac.pw)return fail('Incorrect password.');
  V.err='';
  sess({role:a?'admin':'user',id:ac.id});
  render();
 })
}

function addClient(d){
 var em=d.get('email').trim().toLowerCase();
 if(S.users.some(function(x){return x.email===em})){
  alert('A client with this email already exists.');
  return;
 }

 var salt=Math.random().toString(36).slice(2);
 hash(d.get('pw'),salt).then(function(h){
  S.users.push({
   id:++S.n,
   name:d.get('name').trim(),
   email:em,
   contact:(d.get('contact')||'').trim(),
   salt:salt,
   pw:h
  });
  save();
  render();
 })
}

function clients(){
 var r=S.users.map(function(u){
  var n=S.exp.filter(function(x){return x.uid===u.id}).length;
  return '<tr><td>'+esc(u.name)+'</td><td>'+esc(u.email)+'</td><td>'+esc(u.contact||'')+'</td><td>'+n+'</td>' +
  '<td><button type="button" class="s bad" data-a="du" data-id="'+u.id+'">Remove</button></td></tr>'
 }).join('');

 return '<div class="card"><h2>Add a client</h2><form data-f="addcl">' +
 '<label>Full name<input name="name" required maxlength="40"></label>' +
 '<label>Email<input name="email" type="email" required></label>' +
 '<label>Contact number<input name="contact" inputmode="tel" maxlength="15"></label>' +
 '<label>Password for the client<input name="pw" type="password" minlength="6" required autocomplete="new-password"></label>' +
 '<button type="submit" class="b">Add client</button>' +
 '</form></div>' +
 '<div class="card tw"><h2>Clients</h2>' +
 (r
  ?'<table><tr><th>Name</th><th>Email</th><th>Contact</th><th>Expenses</th><th></th></tr>'+r+'</table>'
  :'<div class="empty">No clients yet. Add one above, or clients can sign up themselves.</div>') +
 '</div>'
}

document.addEventListener("click",function(e){
 var t=e.target.closest("button");
 if(!t)return;

 if(t.dataset.t){
  V.tab=t.dataset.t;
  render();
  return;
 }

 if(t.dataset.r){
  V.role=t.dataset.r;
  V.err='';
  render();
  return;
 }

 if(t.dataset.m){
  V.mode=t.dataset.m;
  V.err='';
  render();
  return;
 }

 var a=t.dataset.a;
 var id=+t.dataset.id;
 if(!a)return;

 if(a==='out'){
  sess(null);
  V.tab='dash';
  V.err='';
  render();
  return;
 }

 function ex(){return S.exp.filter(function(x){return x.id===id})[0]}

 /* FIXED: approve/reject now uses the modal instead of prompt() */
 if(a==="ap"||a==="rj"){
  if(!isAdmin())return;

  var x=ex();
  if(!x||x.st!=="Pending")return;

  askRemarks(
   a==="ap"?"Approve expense":"Reject expense",
   function(rm){
    x.st=a==="ap"?"Approved":"Rejected";
    x.rm=rm;
    save();
    render();
   }
  );
  return;
 }

 if(a==="ed"){
  var y=ex();
  if(!y)return;
  var na=prompt("Amount (₹)",y.amt);
  if(na===null)return;
  var nd=prompt("Description",y.desc);
  if(nd===null)return;
  if(+na>0)y.amt=+na;
  if(nd.trim())y.desc=nd.trim();
 }
 else if(a==="de"){
  S.exp=S.exp.filter(function(x){return x.id!==id});
 }
 else if(a==="db"){
  S.bud=S.bud.filter(function(x){return x.id!==id});
 }
 else if(a==="du"){
  if(!confirm('Remove this client and all their expenses, budgets and reports?'))return;
  S.users=S.users.filter(function(x){return x.id!==id});
  S.exp=S.exp.filter(function(x){return x.uid!==id});
  S.bud=S.bud.filter(function(x){return x.uid!==id});
  S.rep=S.rep.filter(function(x){return x.uid!==id});
 }
 else if(a==="dc"){
  if(S.exp.some(function(x){return x.cid===id})||S.bud.some(function(x){return x.cid===id})){
   alert("This category is in use by expenses or budgets, so it can’t be removed.");
   return;
  }
  S.cats=S.cats.filter(function(x){return x.id!==id});
 }

 save();
 render();
});

document.addEventListener("submit",function(e){
 e.preventDefault();
 var f=e.target;
 var d=new FormData(f);
 var k=f.dataset.f;

 if(k==='auth'){doAuth(d);return}
 if(k==='flt'){
  V.q=d.get('q').trim().toLowerCase();
  V.fs=d.get('fs');
  render();
  return;
 }
 if(k==='addcl'){addClient(d);return}

 if(k==="addexp"){
  S.exp.push({
   id:++S.n,
   uid:uid(),
   cid:+d.get("cid"),
   amt:+d.get("amt"),
   date:d.get("date"),
   desc:d.get("desc").trim(),
   mode:d.get("mode"),
   st:"Pending"
  });
 }

 if(k==="addbud"){
  var m=d.get("mon").split("-");
  S.bud=S.bud.filter(function(b){
   return!(b.uid===uid()&&b.cid===+d.get("cid")&&b.year===+m[0]&&b.month===+m[1]);
  });
  S.bud.push({
   id:++S.n,
   uid:uid(),
   cid:+d.get("cid"),
   limit:+d.get("limit"),
   month:+m[1],
   year:+m[0]
  });
 }

 if(k==="addrep"){
  var fr=d.get("from"),to=d.get("to");
  if(fr>to){
   alert("The start date must be before the end date.");
   return;
  }

  var L=S.exp.filter(function(x){
   return x.uid===uid()&&x.st==="Approved"&&x.date>=fr&&x.date<=to;
  }),by={};

  L.forEach(function(x){
   by[x.cid]=(by[x.cid]||0)+x.amt;
  });

  S.rep.push({
   id:++S.n,
   uid:uid(),
   from:fr,
   to:to,
   gen:today(),
   total:sum(L),
   by:by
  });
 }

 if(k==="addcat"){
  S.cats.push({
   id:++S.n,
   name:d.get("name").trim(),
   desc:d.get("desc").trim()
  });
 }

 save();
 render();
});

render();
})();