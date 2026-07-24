const missions = [
  {id:1,title:"DOT Inspection",icon:"🛂",desc:"Responder preguntas e instrucciones de un oficial.",listening:88,speaking:84,phrases:["Can you please turn off your truck?","Can you step out of the truck?","Can I see your permit book?","Yes, sir. Here you go."]},
  {id:2,title:"Weigh Station",icon:"⚖️",desc:"Comprender indicaciones dentro de una estación de pesaje.",listening:82,speaking:79,phrases:["Please pull into the inspection station.","Show me your hours of service.","Are you carrying hazardous material?"]},
  {id:3,title:"Traffic Signs",icon:"🚧",desc:"Reconocer señalamientos esenciales para vehículos comerciales.",listening:86,speaking:75,phrases:["Low clearance ahead.","Right lane ends ahead.","No trucks beyond this point.","Road work ahead."]},
  {id:4,title:"Weather Alert",icon:"🌧️",desc:"Comprender advertencias relacionadas con el clima.",listening:80,speaking:76,phrases:["Heavy rains flooded the street.","Watch for ice on the bridge.","The streets are covered with snow."]},
  {id:5,title:"Pickup & Delivery",icon:"📦",desc:"Seguir instrucciones de carga, entrega, hook y drop.",listening:84,speaking:81,phrases:["Please drop the trailer at dock 17.","Here is your pickup number.","Please hook the trailer from dock 17."]},
  {id:6,title:"Road Service",icon:"🛠️",desc:"Reportar una falla y solicitar apoyo en carretera.",listening:78,speaking:74,phrases:["I have a flat tire.","I contacted road service.","My truck needs assistance."]}
];

const lesson = {
  missionId:1,
  title:"DOT Inspection",
  situation:"Un oficial del DOT detiene la unidad y te da instrucciones.",
  instructionAudio:"assets/audio/dot-inspection/turn-off-your-truck.mp3",
  instruction:"Can you please turn off your truck?",
  instructionFragments:["Can you please","turn off","your truck","Can you please turn off your truck?"],
  instructionMeaning:"Apague la unidad, por favor.",
  instructionOptions:["Muéstreme su licencia.","Apague la unidad, por favor.","Tome la siguiente salida."],

  responsePrompt:"Can I see your permit book?",
  responseMeaning:"¿Puedo ver su carpeta de permisos?",
  response:"Yes, sir. Here you go.",
  responseFragments:["Yes, sir","Here you go","Yes, sir. Here you go."],
  responseSupport:[
    {label:"Yes, sir",help:"Sí, señor. Respuesta respetuosa para confirmar."},
    {label:"Here you go",help:"Aquí tiene. Se usa al entregar un documento u objeto."}
  ],

  secondPrompt:"Can you step out of the truck?",
  secondResponse:"Yes, I can."
};

const defaultState = {
  completed:[],
  currentMission:1,
  miles:0,
  minutes:0,
  attempts:0,
  speakingScores:[],
  listeningScores:[],
  practiced:[],
  streak:1,
  grades:{},
  teacherNotes:"",
  missionTimes:{},
  lastPractice:new Date().toISOString()
};

let state = loadState();
let lessonStep = 0;
let recognition = null;
let currentExpected = "";
let audioEnabled = true;

function loadState(){
  try{return {...defaultState,...JSON.parse(localStorage.getItem("eorState")||"{}")}}catch{return {...defaultState}}
}
function saveState(){localStorage.setItem("eorState",JSON.stringify(state));renderAll()}
function avg(arr){return arr.length?Math.round(arr.reduce((a,b)=>a+b,0)/arr.length):0}
function showToast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function setView(name){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById("view-"+name).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  const titles={home:["DRIVER TRAINING","Panel del operador"],route:["LEARNING ROUTE","Mi ruta profesional"],practice:["ACTIVE MISSION","Práctica guiada"],review:["SPACED PRACTICE","Repaso"],driver:["DRIVER PERFORMANCE","Driver Card"],teacher:["SCHOOL MONITORING","Panel docente"]};
  document.getElementById("viewEyebrow").textContent=titles[name][0];
  document.getElementById("viewTitle").textContent=titles[name][1];
  if(name==="practice") renderLesson();
  if(innerWidth<1050) document.getElementById("sidebar").classList.remove("open");
}
function renderAll(){
  const pron=avg(state.speakingScores), listen=avg(state.listeningScores), progress=Math.round(state.completed.length/missions.length*100);
  document.getElementById("heroProgressBar").style.width=progress+"%";
  document.getElementById("heroProgressText").textContent=progress+"% completado";
  document.getElementById("dailyMinutes").textContent=state.minutes;
  document.getElementById("dailyRing").style.background=`conic-gradient(var(--accent) ${Math.min(state.minutes/15*360,360)}deg,#e6edf4 0deg)`;
  document.getElementById("milesStat").textContent=state.miles;
  document.getElementById("pronStat").textContent=pron+"%";
  document.getElementById("listenStat").textContent=listen+"%";
  document.getElementById("streakStat").textContent=state.streak;
  document.getElementById("routeMiles").textContent=state.miles;
  document.getElementById("licenseBar").style.width=Math.min(state.completed.length/3*100,100)+"%";

  document.getElementById("cardHours").textContent=(state.minutes/60).toFixed(1);
  document.getElementById("cardMiles").textContent=state.miles;
  document.getElementById("cardPhrases").textContent=state.practiced.length;
  document.getElementById("metricPron").textContent=pron+"%";
  document.getElementById("metricListen").textContent=listen+"%";
  document.getElementById("metricPronBar").style.width=pron+"%";
  document.getElementById("metricListenBar").style.width=listen+"%";

  renderHomeMissions(); renderRoadmap(); renderReview(); renderBadges(); renderTeacher();
}
function renderHomeMissions(){
  document.getElementById("homeMissionRow").innerHTML=missions.slice(0,3).map(m=>`
    <article class="mission-card">
      <div class="mission-cover"><strong>${m.title}</strong><span>${m.icon}</span></div>
      <div class="mission-body"><h3>${state.completed.includes(m.id)?"Completada":"Misión "+m.id}</h3><p>${m.desc}</p>
      <div class="mission-meta"><span>${m.phrases.length} expresiones</span><span>${state.completed.includes(m.id)?"✓ Finalizada":"8–10 min"}</span></div></div>
    </article>`).join("");
}
function renderRoadmap(){
  const next=missions.find(m=>!state.completed.includes(m.id))||missions[missions.length-1];
  document.getElementById("nextStopTitle").textContent=next.title;
  document.getElementById("nextStopText").textContent=next.desc;
  document.getElementById("roadmap").innerHTML=missions.map(m=>{
    const completed=state.completed.includes(m.id), current=m.id===next.id;
    return `<div class="route-stop ${completed?"completed":current?"current":""}">
      <div class="stop-node">${completed?"✓":m.icon}</div>
      <div class="stop-content"><h3>${m.title}</h3><p>${m.desc}</p>${current?'<button class="secondary-btn start-mission">Comenzar</button>':""}</div>
    </div>`;
  }).join("");
  document.querySelectorAll(".start-mission").forEach(b=>b.onclick=()=>setView("practice"));
}
function renderReview(){
  const phrases=state.practiced.length?state.practiced:missions.flatMap(m=>m.phrases).slice(0,6);
  document.getElementById("reviewCount").textContent=phrases.length+" expresiones";
  document.getElementById("reviewGrid").innerHTML=phrases.map((p,i)=>`<article class="review-card"><p class="eyebrow">REPASO ${i+1}</p><h3>${p}</h3><p>Escucha y repite la expresión completa.</p><button class="secondary-btn review-audio" data-phrase="${encodeURIComponent(p)}">🔊 Escuchar</button></article>`).join("");
  document.querySelectorAll(".review-audio").forEach(b=>b.onclick=()=>speak(decodeURIComponent(b.dataset.phrase)));
}
function renderBadges(){
  const data=[["🛂","DOT Ready",state.completed.includes(1)],["⚖️","Scale Station",state.completed.includes(2)],["🚧","Road Signs",state.completed.includes(3)],["🔥","Practice Streak",state.streak>=7]];
  document.getElementById("badgeGrid").innerHTML=data.map(([i,t,u])=>`<article class="badge-item ${u?"":"locked"}"><div class="badge-icon">${i}</div><h3>${t}</h3><small>${u?"Obtenida":"Bloqueada"}</small></article>`).join("");
}
function renderTeacher(){
  const pron=avg(state.speakingScores),listen=avg(state.listeningScores),general=Math.round((pron+listen)/2)||0;
  document.getElementById("teacherAverage").textContent=general+"%";
  document.getElementById("teacherHours").textContent=(state.minutes/60).toFixed(1)+" h";
  document.getElementById("teacherCompleted").textContent=state.completed.length+"/"+missions.length;
  document.getElementById("teacherLast").textContent=new Date(state.lastPractice).toLocaleDateString("es-MX");
  const q=(document.getElementById("teacherSearch")?.value||"").toLowerCase();
  document.getElementById("teacherTable").innerHTML=missions.filter(m=>m.title.toLowerCase().includes(q)).map(m=>{
    const done=state.completed.includes(m.id),grade=state.grades[m.id]?.value??"—";
    return `<tr><td><strong>${m.title}</strong></td><td><span class="status ${done?"done":"pending"}">${done?"Completada":"Pendiente"}</span></td><td>${done?m.listening+"%":"—"}</td><td>${done?m.speaking+"%":"—"}</td><td>${done?state.attempts:"—"}</td><td>${state.missionTimes[m.id]||0} min</td><td>${grade}</td></tr>`;
  }).join("");
  document.getElementById("teacherNotes").value=state.teacherNotes||"";
  document.getElementById("gradeMission").innerHTML=missions.map(m=>`<option value="${m.id}">${m.title}</option>`).join("");
}
function renderLesson(){
  const stage=document.getElementById("lessonStage");
  document.getElementById("lessonProgressBar").style.width=((lessonStep+1)/7*100)+"%";
  document.getElementById("lessonStepLabel").textContent=`Paso ${lessonStep+1} de 7`;

  if(lessonStep===0) stage.innerHTML=`<article class="lesson-card">
    <div class="lesson-scene">
      <div>
        <p class="eyebrow light">MISIÓN 01 · EXPERIENCIA AUTODIDACTA</p>
        <h2>${lesson.title}</h2>
        <p>${lesson.situation}</p>
      </div>
      <div class="scene-art">🛂🚛</div>
    </div>
    <div class="lesson-body">
      <div class="learning-guide">
        <strong>En esta misión aprenderás a:</strong>
        <span>1. Comprender una instrucción del oficial.</span>
        <span>2. Pronunciar la instrucción por partes.</span>
        <span>3. Aprender la respuesta adecuada.</span>
        <span>4. Practicar la respuesta antes de usarla en una simulación.</span>
      </div>
      <button class="primary-btn full" id="nextLesson">Comenzar misión</button>
    </div>
  </article>`;

  if(lessonStep===1) stage.innerHTML=`<article class="lesson-card">
    <div class="lesson-body center">
      <p class="eyebrow">1 · ESCUCHA Y COMPRENDE</p>
      <h2>Escucha la instrucción completa</h2>
      <p class="lesson-help">Puedes reproducirla todas las veces que necesites.</p>
      <button class="audio-btn" id="mainAudio">▶</button>
      <button class="transcript-toggle" id="showTranscript">Ver apoyo escrito</button>
      <div class="transcript-box" id="transcriptBox">
        <strong>${lesson.instruction}</strong>
        <span>${lesson.instructionMeaning}</span>
      </div>
      <div><button class="primary-btn" id="nextLesson" style="margin-top:28px">Ya la escuché</button></div>
    </div>
  </article>`;

  if(lessonStep===2) stage.innerHTML=`<article class="lesson-card">
    <div class="lesson-body center">
      <p class="eyebrow">2 · COMPRUEBA LO QUE ENTENDISTE</p>
      <h2>¿Qué indicó el oficial?</h2>
      <button class="audio-btn" id="mainAudio">▶</button>
      <div class="options">${lesson.instructionOptions.map(o=>`<button class="option" data-correct="${o===lesson.instructionMeaning}">${o}</button>`).join("")}</div>
      <div class="feedback" id="feedback"></div>
      <button class="primary-btn" id="nextLesson" style="display:none">Continuar</button>
    </div>
  </article>`;

  if(lessonStep===3) stage.innerHTML=`<article class="lesson-card">
    <div class="lesson-body">
      <p class="eyebrow">3 · PRACTICA LA INSTRUCCIÓN</p>
      <h2>Repite por fragmentos</h2>
      <p class="lesson-help">Escucha cada parte. Después toca el micrófono y repite.</p>
      <div class="fragment-list">${lesson.instructionFragments.map(f=>`<div class="fragment">
        <strong>${f}</strong>
        <button class="mini-btn frag-audio" data-text="${encodeURIComponent(f)}">🔊</button>
        <button class="mini-btn frag-mic" data-text="${encodeURIComponent(f)}">🎙</button>
      </div>`).join("")}</div>
      <div class="feedback" id="feedback"></div>
      <button class="primary-btn full" id="nextLesson">Aprender la respuesta</button>
    </div>
  </article>`;

  if(lessonStep===4) stage.innerHTML=`<article class="lesson-card">
    <div class="lesson-body">
      <p class="eyebrow">4 · APRENDE QUÉ RESPONDER</p>
      <h2>El oficial pide tu carpeta de permisos</h2>
      <div class="conversation-study">
        <div class="speech officer">
          <small>DOT OFFICER</small>
          <strong>${lesson.responsePrompt}</strong>
          <span>${lesson.responseMeaning}</span>
          <button class="mini-btn prompt-audio">🔊</button>
        </div>
        <div class="speech driver">
          <small>YOUR RESPONSE</small>
          <strong>${lesson.response}</strong>
          <button class="mini-btn response-audio">🔊</button>
        </div>
      </div>
      <div class="response-explainer">
        ${lesson.responseSupport.map(x=>`<div><strong>${x.label}</strong><span>${x.help}</span></div>`).join("")}
      </div>
      <div class="tip-box"><strong>Consejo:</strong> usa esta respuesta cuando entregues una licencia, permiso, documento o identificación.</div>
      <button class="primary-btn full" id="nextLesson">Practicar esta respuesta</button>
    </div>
  </article>`;

  if(lessonStep===5) stage.innerHTML=`<article class="lesson-card">
    <div class="lesson-body">
      <p class="eyebrow">5 · PRACTICA ANTES DE LA SIMULACIÓN</p>
      <h2>Repite la respuesta por partes</h2>
      <p class="lesson-help">Primero escucha. Luego repite. La simulación aparecerá después de esta práctica.</p>
      <div class="fragment-list">${lesson.responseFragments.map(f=>`<div class="fragment">
        <strong>${f}</strong>
        <button class="mini-btn frag-audio" data-text="${encodeURIComponent(f)}">🔊</button>
        <button class="mini-btn frag-mic" data-text="${encodeURIComponent(f)}">🎙</button>
      </div>`).join("")}</div>
      <div class="practice-complete">
        <button class="audio-btn" id="responseModel">▶</button>
        <div>
          <strong>${lesson.response}</strong>
          <span>Escucha la respuesta completa y después grábate.</span>
        </div>
        <button class="mic-btn compact" id="responseMic">🎙</button>
      </div>
      <div class="feedback" id="feedback"></div>
      <button class="primary-btn full" id="nextLesson">Ir a la simulación</button>
    </div>
  </article>`;

  if(lessonStep===6) stage.innerHTML=`<article class="lesson-card">
    <div class="lesson-scene">
      <div><p class="eyebrow light">6 · SIMULACIÓN LABORAL</p><h2>Responde al oficial</h2><p>Ya escuchaste, comprendiste y practicaste esta respuesta.</p></div>
      <div class="scene-art">🛂</div>
    </div>
    <div class="lesson-body center">
      <div class="simulation-bubble">
        <small>DOT OFFICER</small>
        <div class="big-phrase">${lesson.responsePrompt}</div>
        <button class="mini-btn" id="simAudio">🔊</button>
      </div>
      <div class="self-study-reminder">
        <span>Respuesta practicada:</span>
        <strong>${lesson.response}</strong>
        <button class="text-btn" id="hearAnswerAgain">Escuchar respuesta otra vez</button>
      </div>
      <p>Cuando estés listo, toca el micrófono y responde.</p>
      <button class="mic-btn" id="simMic">🎙</button>
      <div class="listening" id="listening">Escuchando...</div>
      <div class="feedback" id="feedback"></div>
      <button class="primary-btn" id="finishLesson" style="display:none">Finalizar misión</button>
    </div>
  </article>`;

  bindLessonEvents();
}
function bindLessonEvents(){
  const mainAudio=document.getElementById("mainAudio");
  if(mainAudio) mainAudio.onclick=()=>playModel(lesson.instruction,mainAudio);
  const showTranscript=document.getElementById("showTranscript");
  if(showTranscript) showTranscript.onclick=()=>document.getElementById("transcriptBox").classList.toggle("show");
  const promptAudio=document.querySelector(".prompt-audio");
  if(promptAudio) promptAudio.onclick=()=>speak(lesson.responsePrompt);
  const responseAudio=document.querySelector(".response-audio");
  if(responseAudio) responseAudio.onclick=()=>speak(lesson.response);
  const responseModel=document.getElementById("responseModel");
  if(responseModel) responseModel.onclick=()=>playModel(lesson.response,responseModel);
  const responseMic=document.getElementById("responseMic");
  if(responseMic) responseMic.onclick=()=>startRecognition(lesson.response,false);
  const hearAnswerAgain=document.getElementById("hearAnswerAgain");
  if(hearAnswerAgain) hearAnswerAgain.onclick=()=>speak(lesson.response);

  const next=document.getElementById("nextLesson");
  if(next) next.onclick=()=>{lessonStep=Math.min(lessonStep+1,6);renderLesson()};
  document.querySelectorAll(".option").forEach(o=>o.onclick=()=>{
    document.querySelectorAll(".option").forEach(x=>x.disabled=true);
    const ok=o.dataset.correct==="true"; o.classList.add(ok?"correct":"soft-wrong");
    const f=document.getElementById("feedback");f.className="feedback show "+(ok?"good":"retry");f.textContent=ok?"¡Muy bien! Comprendiste la instrucción.":"Buen intento. La instrucción significa: “Apague la unidad, por favor.”";
    state.listeningScores.push(ok?95:72);state.minutes+=2;state.lastPractice=new Date().toISOString();saveState();
    document.getElementById("nextLesson").style.display="inline-block";
  });
  document.querySelectorAll(".frag-audio").forEach(b=>b.onclick=()=>speak(decodeURIComponent(b.dataset.text)));
  document.querySelectorAll(".frag-mic").forEach(b=>b.onclick=()=>startRecognition(decodeURIComponent(b.dataset.text),true));
  const fullMic=document.getElementById("fullMic"); if(fullMic) fullMic.onclick=()=>startRecognition(lesson.instruction,false);
  const simAudio=document.getElementById("simAudio"); if(simAudio) simAudio.onclick=()=>speak(lesson.responsePrompt);
  const simMic=document.getElementById("simMic"); if(simMic) simMic.onclick=()=>startRecognition(lesson.response,false,true);
  const finish=document.getElementById("finishLesson"); if(finish) finish.onclick=completeLesson;
}
function playModel(text,btn){
  btn?.classList.add("playing");
  const source = text===lesson.instruction ? lesson.instructionAudio : ""; const audio=new Audio(source);
  audio.onended=()=>btn?.classList.remove("playing");
  audio.onerror=()=>{btn?.classList.remove("playing");speak(text);showToast("Audio de demostración. Sustituye el MP3 en assets/audio.")};
  audio.play().catch(()=>{btn?.classList.remove("playing");speak(text)});
}
function speak(text){
  if(!audioEnabled)return;
  const u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=.82;speechSynthesis.cancel();speechSynthesis.speak(u);
}
function similarity(a,b){
  const clean=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g,"").split(/\s+/).filter(Boolean);
  const A=clean(a),B=clean(b);const hit=A.filter(w=>B.includes(w)).length;return hit/Math.max(B.length,1);
}
function startRecognition(expected,fragment=false,simulation=false){
  currentExpected=expected;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const feedback=document.getElementById("feedback");
  if(!SR){feedback.className="feedback show retry";feedback.textContent="Tu navegador no permite reconocimiento de voz. Puedes escuchar y repetir libremente.";return}
  recognition=new SR();recognition.lang="en-US";recognition.interimResults=false;recognition.maxAlternatives=3;
  const listening=document.getElementById("listening");if(listening)listening.classList.add("active");
  recognition.onresult=e=>{
    const said=e.results[0][0].transcript;const score=Math.round(similarity(said,expected)*100);
    state.attempts++;state.speakingScores.push(Math.max(score,55));state.minutes+=2;state.lastPractice=new Date().toISOString();
    if(!state.practiced.includes(expected))state.practiced.push(expected);
    saveState();
    feedback.className="feedback show "+(score>=60?"good":"retry");
    feedback.innerHTML=score>=60?`¡Muy bien! Tu respuesta fue comprendida.<br><small>Escuchamos: “${said}”</small>`:`Buen intento. Escucha nuevamente y marca con claridad: <strong>${expected}</strong>`;
    if(simulation&&score>=45)document.getElementById("finishLesson").style.display="inline-block";
    if(!fragment&&!simulation&&score>=45)document.getElementById("nextLesson").style.display="inline-block";
  };
  recognition.onerror=()=>{feedback.className="feedback show retry";feedback.textContent="No pudimos escuchar con claridad. Puedes intentarlo nuevamente.";if(listening)listening.classList.remove("active")};
  recognition.onend=()=>{if(listening)listening.classList.remove("active")};
  recognition.start();
}
function completeLesson(){
  if(!state.completed.includes(1))state.completed.push(1);
  state.miles+=150;state.minutes+=3;state.missionTimes[1]=(state.missionTimes[1]||0)+10;
  state.currentMission=2;state.lastPractice=new Date().toISOString();saveState();
  const stage=document.getElementById("lessonStage");
  stage.innerHTML=`<article class="lesson-card"><div class="lesson-body center"><div style="font-size:70px">🏁</div><p class="eyebrow">MISIÓN COMPLETADA</p><h2>Excelente trabajo, operador</h2><p>Completaste una inspección DOT en inglés.</p><div class="result-grid"><div><strong>+150</strong><small>Millas</small></div><div><strong>${avg(state.speakingScores)}%</strong><small>Pronunciación</small></div><div><strong>${avg(state.listeningScores)}%</strong><small>Listening</small></div></div><button class="primary-btn" id="goHome">Volver al panel</button></div></article>`;
  document.getElementById("goHome").onclick=()=>{lessonStep=0;setView("home")};
}
function exportCSV(){
  const rows=[["Misión","Estado","Listening","Speaking","Intentos","Tiempo","Calificación"]];
  missions.forEach(m=>rows.push([m.title,state.completed.includes(m.id)?"Completada":"Pendiente",state.completed.includes(m.id)?m.listening:"",state.completed.includes(m.id)?m.speaking:"",state.completed.includes(m.id)?state.attempts:"",state.missionTimes[m.id]||0,state.grades[m.id]?.value||""]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="english-on-the-road-reporte.csv";a.click();URL.revokeObjectURL(a.href)
}
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>setView(b.dataset.view));
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>setView(b.dataset.go));
document.getElementById("continueBtn").onclick=()=>setView("practice");
document.getElementById("startNextBtn").onclick=()=>setView("practice");
document.getElementById("exitLessonBtn").onclick=()=>setView("home");
document.getElementById("menuBtn").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
document.getElementById("volumeBtn").onclick=e=>{audioEnabled=!audioEnabled;e.currentTarget.textContent=audioEnabled?"🔊":"🔇"};
document.getElementById("roleSelect").onchange=e=>{document.body.classList.toggle("teacher-mode",e.target.value==="teacher");if(e.target.value==="teacher")setView("teacher");else setView("home")};
document.getElementById("resetBtn").onclick=()=>{if(confirm("¿Restablecer todos los datos de esta demostración?")){localStorage.removeItem("eorState");state={...defaultState};lessonStep=0;renderAll();setView("home")}};
document.getElementById("exportBtn").onclick=exportCSV;
document.getElementById("teacherSearch").oninput=renderTeacher;
document.getElementById("saveNotesBtn").onclick=()=>{state.teacherNotes=document.getElementById("teacherNotes").value;saveState();showToast("Observaciones guardadas")};
document.getElementById("gradeBtn").onclick=()=>document.getElementById("gradeModal").classList.add("show");
document.getElementById("closeGradeModal").onclick=()=>document.getElementById("gradeModal").classList.remove("show");
document.getElementById("saveGradeBtn").onclick=()=>{
  const id=Number(document.getElementById("gradeMission").value),value=Math.max(0,Math.min(100,Number(document.getElementById("gradeValue").value)||0));
  state.grades[id]={value,comment:document.getElementById("gradeComment").value,date:new Date().toISOString()};saveState();
  document.getElementById("gradeModal").classList.remove("show");showToast("Calificación registrada");
};
renderAll();
