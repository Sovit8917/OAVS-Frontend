const API=window.OAVS_API_URL||"http://localhost:5000/api";
let state={topics:[],logs:[],revisions:[],pyqs:[],mocks:[],tasks:[]},restoreData=null;
const $=id=>document.getElementById(id),today=()=>new Date().toISOString().slice(0,10);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate=d=>d?new Date(d+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"";
function toast(s){let e=$("toast");e.textContent=s;e.classList.add("show");clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>e.classList.remove("show"),2500)}
async function api(path,opt={}){let r=await fetch(API+path,{...opt,headers:{"Content-Type":"application/json",...(opt.headers||{})}});let b=await r.json().catch(()=>({}));if(!r.ok)throw Error(b.message||"API request failed");return b}
async function load(){let x=await api("/data");state={topics:[],logs:[],revisions:[],pyqs:[],mocks:[],tasks:[],...x.data};$("connectionText").textContent="Connected";$("cloudStatus").textContent="Connected to MongoDB API";$("cloudDetail").textContent="Your records were loaded from the configured database.";document.querySelectorAll(".pulse").forEach(x=>x.classList.add("online"));render()}
async function saveAll(silent=false){let x=await api("/data",{method:"PUT",body:JSON.stringify(state)});state={...state,...x.data};if(!silent){render();toast("Saved to MongoDB Atlas")}else{renderDashboard();renderAnalytics()}}
async function add(col,obj){let x=await api("/data/"+col,{method:"POST",body:JSON.stringify(obj)});state={...state,...x.data};render();toast("Saved to MongoDB Atlas")}
async function del(col,id){await api(`/data/${col}/${id}`,{method:"DELETE"});await load();toast("Record deleted")}
function nav(tab){document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.id===tab));let labels={dashboard:"Overview",planner:"Study planner",syllabus:"Syllabus tracker",revision:"Revision centre",pyqs:"PYQ analysis",mocks:"Mock tests",analytics:"Analytics",logs:"Study journal",backup:"Backup & export"};$("pageName").textContent=labels[tab];$("heading").textContent=tab==="dashboard"?"Good to see you.":labels[tab];$("subheading").textContent=tab==="dashboard"?"A clear plan today builds a stronger result tomorrow.":"Keep your preparation organised and every record up to date."}
function groupTopics(){let g={};state.topics.forEach(t=>(g[t.section]??=[]).push(t));return g}
function done(t){return ["Revised","Completed"].includes(t.status)}
function renderDashboard(){let completed=state.topics.filter(done).length,pct=state.topics.length?Math.round(completed/state.topics.length*100):0,mins=state.logs.reduce((a,x)=>a+Number(x.minutes||0),0),pending=state.tasks.filter(t=>!t.completed).length,mockScores=state.mocks.map(x=>Number(x.score)),best=mockScores.length?Math.max(...mockScores):null;
$("mProgress").textContent=pct+"%";$("heroProgress").textContent=pct+"%";$("mProgressBar").style.width=pct+"%";$("mTopicCount").textContent=`${completed} of ${state.topics.length} topics revised/completed`;$("mHours").textContent=(mins/60).toFixed(1)+"h";$("mTasks").textContent=pending;$("mTaskCaption").textContent=`${state.tasks.filter(t=>t.date===today()&&!t.completed).length} pending today`;$("mBest").textContent=best===null?"—":best.toFixed(2);$("mMockCaption").textContent=`${state.mocks.length} mock tests recorded`;
$("dashSections").innerHTML=Object.entries(groupTopics()).map(([s,a])=>{let n=a.filter(done).length,p=Math.round(n/a.length*100);return `<div><div class="section-row"><b>${esc(s)}</b><span>${n}/${a.length} · ${p}%</span></div><div class="bar"><i style="width:${p}%"></i></div></div>`}).join("");
let todays=state.tasks.filter(t=>t.date===today()).sort((a,b)=>Number(a.completed)-Number(b.completed));$("todayTasks").innerHTML=todays.slice(0,5).map(t=>`<div class="task-item"><input class="check" type="checkbox" data-taskcheck="${t._id}" ${t.completed?"checked":""}><div class="task-copy"><b>${esc(t.title)}</b><small>${esc(t.subject)} · ${t.duration} min</small></div><span class="pill">${esc(t.priority)}</span></div>`).join("")||'<div class="empty">No tasks planned for today. Add one from the planner.</div>';
$("dashRevisions").innerHTML=state.revisions.slice().sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4).map(r=>`<div class="task-item"><div class="task-copy"><b>${esc(r.topic)}</b><small>${fmtDate(r.date)} · ${esc(r.round)}</small></div></div>`).join("")||'<div class="empty">No revision reminders yet.</div>';
$("recentLogs").innerHTML=state.logs.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,4).map(l=>`<div class="task-item"><div class="task-copy"><b>${esc(l.topic||l.subject)}</b><small>${fmtDate(l.date)} · ${esc(l.subject)} · ${l.minutes} min</small></div></div>`).join("")||'<div class="empty">Your recent study sessions will appear here.</div>';
document.querySelectorAll("[data-taskcheck]").forEach(x=>x.onchange=()=>toggleTask(x.dataset.taskcheck,x.checked))}
function renderPlanner(){let date=$("planDate").value||today(),filter=$("planFilter").value;let arr=state.tasks.filter(t=>(!date||t.date===date)&&(filter==="all"||(filter==="done"&&t.completed)||(filter==="pending"&&!t.completed)));let all=state.tasks.filter(t=>!date||t.date===date),doneCount=all.filter(t=>t.completed).length;$("planTotal").textContent=all.length;$("planMinutes").textContent=all.reduce((a,t)=>a+Number(t.duration||0),0)+"m";$("planDone").textContent=all.length?Math.round(doneCount/all.length*100)+"%":"0%";
$("taskRows").innerHTML=arr.map(t=>`<div class="task-item"><input class="check" type="checkbox" data-taskcheck="${t._id}" ${t.completed?"checked":""}><div class="task-copy"><b style="${t.completed?"text-decoration:line-through;opacity:.6":""}">${esc(t.title)}</b><small>${fmtDate(t.date)} · ${esc(t.subject)} · ${t.duration} min · ${esc(t.priority)} priority</small></div><div class="task-actions"><button class="tiny-btn" data-edit="${t._id}">Edit</button><button class="tiny-btn" data-delete="${t._id}">×</button></div></div>`).join("")||'<div class="empty">No tasks for this filter and date.</div>';
document.querySelectorAll("[data-taskcheck]").forEach(x=>x.onchange=()=>toggleTask(x.dataset.taskcheck,x.checked));document.querySelectorAll("[data-delete]").forEach(x=>x.onclick=()=>del("tasks",x.dataset.delete));document.querySelectorAll("[data-edit]").forEach(x=>x.onclick=()=>editTask(x.dataset.edit))}
async function toggleTask(id,v){let t=state.tasks.find(x=>x._id===id);if(t){t.completed=v;try{await saveAll()}catch(e){toast(e.message)}}}
function editTask(id){let t=state.tasks.find(x=>x._id===id);if(!t)return;let f=$("taskForm");Object.keys(t).forEach(k=>{if(f.elements[k])f.elements[k].value=t[k]});$("plannerFormTitle").textContent="Edit study task";nav("planner");window.scrollTo({top:0,behavior:"smooth"})}
const collapsedSections = new Set();

function updateSyllabusProgress() {
  let total = state.topics.length;
  let completed = state.topics.filter(done).length;
  let pct = total ? Math.round(completed / total * 100) : 0;
  if ($("sylProgressSummary")) $("sylProgressSummary").textContent = `${completed} of ${total} topics completed (${pct}%)`;
  if ($("sylOverallBar")) $("sylOverallBar").style.width = pct + "%";
}

function renderSyllabus() {
  updateSyllabusProgress();
  let q = ($("topicSearch") ? $("topicSearch").value : "").trim().toLowerCase();
  let g = groupTopics();
  let secKeys = Object.keys(g);

  let html = secKeys.map((s, secIdx) => {
    let allInSec = g[s];
    let items = allInSec.filter(t => !q || (t.topic + " " + t.section).toLowerCase().includes(q));
    if (!items.length) return "";

    let secCompleted = allInSec.filter(done).length;
    let isCollapsed = collapsedSections.has(s);

    let rows = items.map(t => {
      let i = state.topics.indexOf(t);
      let isDone = done(t);
      return `<label class="syl-check-item ${isDone ? 'completed' : ''}" data-topic-idx="${i}">
        <input type="checkbox" class="syl-checkbox" data-sylcheck="${i}" ${isDone ? 'checked' : ''}>
        <span class="syl-topic-label">${esc(t.topic)}</span>
      </label>`;
    }).join("");

    return `<div class="syl-section-block" data-sec-name="${esc(s)}">
      <div class="syl-section-header" data-toggle-sec="${esc(s)}">
        <span class="syl-section-chevron">${isCollapsed ? '▶' : '▼'}</span>
        <span class="syl-section-title-text">${secIdx + 1}. ${esc(s)}</span>
        <span class="syl-section-count">(${secCompleted}/${allInSec.length})</span>
      </div>
      <div class="syl-checklist-body" style="${isCollapsed ? 'display:none;' : ''}">
        ${rows}
      </div>
    </div>`;
  }).join("");

  $("syllabusCards").innerHTML = html || '<div class="empty">No matching syllabus topics.</div>';

  document.querySelectorAll("[data-toggle-sec]").forEach(header => {
    header.onclick = () => {
      let s = header.dataset.toggleSec;
      let block = header.closest(".syl-section-block");
      let body = block.querySelector(".syl-checklist-body");
      let chevron = header.querySelector(".syl-section-chevron");
      if (collapsedSections.has(s)) {
        collapsedSections.delete(s);
        body.style.display = "block";
        chevron.textContent = "▼";
      } else {
        collapsedSections.add(s);
        body.style.display = "none";
        chevron.textContent = "▶";
      }
    };
  });

  document.querySelectorAll("[data-sylcheck]").forEach(chk => {
    chk.onchange = async () => {
      let idx = Number(chk.dataset.sylcheck);
      let t = state.topics[idx];
      if (!t) return;

      let isChecked = chk.checked;
      t.status = isChecked ? "Completed" : "Not Started";

      let itemRow = chk.closest(".syl-check-item");
      if (itemRow) {
        itemRow.classList.toggle("completed", isChecked);
      }

      let secBlock = chk.closest(".syl-section-block");
      if (secBlock) {
        let secName = secBlock.dataset.secName;
        let allSecTopics = state.topics.filter(x => x.section === secName);
        let countEl = secBlock.querySelector(".syl-section-count");
        if (countEl) countEl.textContent = `(${allSecTopics.filter(done).length}/${allSecTopics.length})`;
      }

      updateSyllabusProgress();
      renderDashboard();
      renderAnalytics();

      try {
        await saveAll(true);
      } catch (err) {
        toast(err.message);
      }
    };
  });
}

function renderRevisions(){$("revisionRows").innerHTML=state.revisions.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(r=>`<div class="task-item"><div class="task-copy"><b>${esc(r.topic)}</b><small>${fmtDate(r.date)} · ${esc(r.round)} ${r.note?"· "+esc(r.note):""}</small></div><button class="tiny-btn" data-delete="${r._id}">Done / remove</button></div>`).join("")||'<div class="empty">No revision reminders saved.</div>';document.querySelectorAll("[data-delete]").forEach(x=>x.onclick=()=>del("revisions",x.dataset.delete))}
function renderPyqs(){let map={};state.pyqs.forEach(p=>map[p.topic]=(map[p.topic]||0)+Number(p.count));let max=Math.max(1,...Object.values(map));$("frequency").innerHTML=Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([t,n])=>`<div class="frequency-row"><b>${esc(t)}</b><div class="bar"><i style="width:${n/max*100}%"></i></div><span>${n}</span></div>`).join("")||'<div class="empty">Add PYQ records to see topic frequency.</div>';$("pyqRows").innerHTML=state.pyqs.slice().reverse().map(p=>`<tr><td>${esc(p.year)}</td><td>${esc(p.topic)}</td><td>${p.count}</td><td>${esc(p.difficulty)}</td><td>${esc(p.kind)}</td><td><button class="tiny-btn" data-pyqdel="${p._id}">Delete</button></td></tr>`).join("")||'<tr><td colspan="6">No records saved.</td></tr>';document.querySelectorAll("[data-pyqdel]").forEach(x=>x.onclick=()=>del("pyqs",x.dataset.pyqdel))}
function renderMocks(){let scores=state.mocks.map(m=>Number(m.score));$("bestScore").textContent=scores.length?Math.max(...scores).toFixed(2):"—";$("avgScore").textContent=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2):"—";let accuracy=state.mocks.length?state.mocks.reduce((a,m)=>a+Number(m.correct)/Math.max(1,Number(m.correct)+Number(m.wrong)),0)/state.mocks.length*100:0;$("avgAccuracy").textContent=state.mocks.length?accuracy.toFixed(1)+"%":"—";$("mockHistory").innerHTML=state.mocks.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(m=>`<div class="mock-history"><span><b>${esc(m.name)}</b><br><small>${fmtDate(m.date)} · ${m.time} min</small></span><b>${Number(m.score).toFixed(2)} / 200</b><button class="tiny-btn" data-mockdel="${m._id}">×</button></div>`).join("")||'<div class="empty">No mock tests recorded yet.</div>';document.querySelectorAll("[data-mockdel]").forEach(x=>x.onclick=()=>del("mocks",x.dataset.mockdel))}
function renderAnalytics(){let mins=state.logs.reduce((a,x)=>a+Number(x.minutes),0);$("aSessions").textContent=state.logs.length;$("aAverage").textContent=state.logs.length?Math.round(mins/state.logs.length)+"m":"0m";$("aPyqs").textContent=state.pyqs.reduce((a,x)=>a+Number(x.count),0);$("aTasks").textContent=state.tasks.length?Math.round(state.tasks.filter(t=>t.completed).length/state.tasks.length*100)+"%":"0%";
let sums={};state.logs.forEach(l=>sums[l.subject]=(sums[l.subject]||0)+Number(l.minutes));let max=Math.max(1,...Object.values(sums));let html=Object.entries(sums).sort((a,b)=>b[1]-a[1]).map(([s,n])=>`<div class="section-row"><b>${esc(s)}</b><span>${(n/60).toFixed(1)}h</span></div><div class="bar" style="margin:5px 0 12px"><i style="width:${n/max*100}%"></i></div>`).join("")||'<div class="empty">No study time recorded.</div>';$("subjectTime").innerHTML=html;$("subjectTimeLog").innerHTML=html;
$("analyticsSections").innerHTML=Object.entries(groupTopics()).map(([s,a])=>{let n=a.filter(done).length;return `<div class="section-row"><b>${esc(s)}</b><span>${Math.round(n/a.length*100)}%</span></div><div class="bar" style="margin:5px 0 12px"><i style="width:${n/a.length*100}%"></i></div>`}).join("");
let days=Array.from({length:7},(_,i)=>{let d=new Date();d.setDate(d.getDate()-(6-i));let key=d.toISOString().slice(0,10);return {key,label:d.toLocaleDateString("en-IN",{weekday:"short"}),mins:state.logs.filter(l=>l.date===key).reduce((a,l)=>a+Number(l.minutes),0)}}),peak=Math.max(1,...days.map(d=>d.mins));$("weeklyChart").innerHTML=days.map(d=>`<div class="week-col"><b>${d.mins?d.mins+"m":"—"}</b><div class="week-bar-wrap"><div class="week-bar" style="height:${Math.max(3,d.mins/peak*100)}%"></div></div><small>${d.label}</small></div>`).join("")}
function renderLogs(){$("logRows").innerHTML=state.logs.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(l=>`<div class="task-item"><div class="task-copy"><b>${esc(l.topic||l.subject)}</b><small>${fmtDate(l.date)} · ${esc(l.subject)} · ${l.minutes} min ${l.note?"· "+esc(l.note):""}</small></div><button class="tiny-btn" data-logdel="${l._id}">Delete</button></div>`).join("")||'<div class="empty">No study sessions logged yet.</div>';document.querySelectorAll("[data-logdel]").forEach(x=>x.onclick=()=>del("logs",x.dataset.logdel))}
function render(){renderDashboard();renderPlanner();renderSyllabus();renderRevisions();renderPyqs();renderMocks();renderAnalytics();renderLogs()}
function formObj(f){return Object.fromEntries(new FormData(f))}
$("nav").addEventListener("click",e=>{let b=e.target.closest("[data-tab]");if(b)nav(b.dataset.tab)});document.querySelectorAll("[data-goto]").forEach(b=>b.onclick=()=>nav(b.dataset.goto));
$("todayLabel").textContent=new Date().toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
$("taskForm").elements.date.value=today();$("planDate").value=today();$("revisionForm").elements.date.value=today();$("logForm").elements.date.value=today();
$("taskForm").onsubmit=async e=>{e.preventDefault();let f=e.target,x=formObj(f),id=x.id;delete x.id;x.duration=Number(x.duration);if(id){let t=state.tasks.find(t=>t._id===id);Object.assign(t,x);await saveAll()}else await add("tasks",x);f.reset();f.elements.date.value=today();$("plannerFormTitle").textContent="Build your study plan"};
$("quickAdd").onclick=()=>{$("quickTaskForm").elements.date.value=today();$("taskDialog").showModal()};$("closeDialog").onclick=()=>$("taskDialog").close();
$("quickTaskForm").onsubmit=async e=>{e.preventDefault();let x=formObj(e.target);x.duration=Number(x.duration);await add("tasks",x);e.target.reset();$("taskDialog").close()};
$("planDate").onchange=renderPlanner;$("planFilter").onchange=renderPlanner;
if($("topicSearch"))$("topicSearch").oninput=renderSyllabus;
if($("toggleAllSections"))$("toggleAllSections").onclick=()=>{let all=Object.keys(groupTopics());if(collapsedSections.size>=all.length){collapsedSections.clear();$("toggleAllSections").textContent="Collapse all"}else{all.forEach(s=>collapsedSections.add(s));$("toggleAllSections").textContent="Expand all"}renderSyllabus()};
$("revisionForm").onsubmit=async e=>{e.preventDefault();await add("revisions",formObj(e.target));e.target.reset();e.target.elements.date.value=today()};
$("pyqForm").onsubmit=async e=>{e.preventDefault();let x=formObj(e.target);x.count=Number(x.count);await add("pyqs",x);e.target.reset()};
$("mockForm").onsubmit=async e=>{e.preventDefault();let x=formObj(e.target);["correct","wrong","blank","time"].forEach(k=>x[k]=Number(x[k]));if(x.correct+x.wrong+x.blank>200)return toast("Correct + incorrect + unattempted cannot exceed 200");x.score=x.correct-x.wrong*.25;await add("mocks",x);e.target.reset()};
$("logForm").onsubmit=async e=>{e.preventDefault();let x=formObj(e.target);x.minutes=Number(x.minutes);await add("logs",x);e.target.reset();e.target.elements.date.value=today()};
$("refreshBtn").onclick=async()=>{try{await load();toast("Synced with MongoDB")}catch(e){toast(e.message)}};
$("themeBtn").onclick=()=>document.body.classList.toggle("dark");
$("exportJson").onclick=()=>{let blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),data:state},null,2)],{type:"application/json"});download(blob,"oavs-study-hub-backup-"+today()+".json")};
function download(blob,name){let a=document.createElement("a"),u=URL.createObjectURL(blob);a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}
$("exportCsv").onclick=()=>{let files={topics:state.topics,study_logs:state.logs,revisions:state.revisions,pyqs:state.pyqs,mocks:state.mocks,tasks:state.tasks};Object.entries(files).forEach(([name,rows])=>{if(!rows.length)return;let keys=[...new Set(rows.flatMap(Object.keys))],csv=[keys.join(","),...rows.map(r=>keys.map(k=>'"'+String(r[k]??"").replace(/"/g,'""')+'"').join(","))].join("\\n");download(new Blob([csv],{type:"text/csv"}),name+".csv")})};
$("importJson").onchange=async e=>{let file=e.target.files[0];if(!file)return;try{let j=JSON.parse(await file.text());restoreData=j.data||j;if(!restoreData.topics||!restoreData.logs)throw Error("This does not look like an OAVS Study Hub backup");$("restoreName").textContent=file.name+" selected";$("restoreBtn").disabled=false}catch(err){restoreData=null;$("restoreName").textContent=err.message;$("restoreBtn").disabled=true}};
$("restoreBtn").onclick=async()=>{if(!restoreData||!confirm("This replaces the current MongoDB study records. Continue?"))return;try{state={topics:[],logs:[],revisions:[],pyqs:[],mocks:[],tasks:[],...restoreData};await saveAll();toast("Backup restored")}catch(e){toast(e.message)}};
(async()=>{try{await load()}catch(e){$("connectionText").textContent="Offline";$("cloudStatus").textContent="Backend connection failed";$("cloudDetail").textContent=e.message;toast("Could not connect: "+e.message)}})();