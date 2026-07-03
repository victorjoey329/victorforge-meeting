const $ = (s) => document.querySelector(s);
const tabs = document.querySelectorAll('.tabs button');
const panels = {record: $('#recordPanel'), upload: $('#uploadPanel'), paste: $('#pastePanel')};
const transcript = $('#transcript');
let recorder, stream, timerId, startedAt = 0, elapsed = 0, chunks = [], recognition;

function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
function setTab(name){tabs.forEach(b=>b.classList.toggle('selected',b.dataset.tab===name));Object.entries(panels).forEach(([k,p])=>p.classList.toggle('panel-active',k===name))}
tabs.forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
function format(sec){return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}
function updateTextState(){const n=transcript.value.replace(/\s/g,'').length;$('#wordCount').textContent=`${n} 字`;$('.transcript-card').classList.toggle('has-text',transcript.value.trim().length>0)}
transcript.addEventListener('input',updateTextState);

function startSpeechRecognition(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('当前浏览器不支持实时语音识别，录音仍会保留');return}recognition=new SR();recognition.lang='zh-CN';recognition.continuous=true;recognition.interimResults=true;let finalText=transcript.value;recognition.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal) finalText+=(finalText?'\n':'')+t;else interim+=t}transcript.value=finalText+(interim?'\n'+interim:'');updateTextState()};recognition.onerror=()=>{};try{recognition.start()}catch{}}

async function startRecording(){try{stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>e.data.size&&chunks.push(e.data);recorder.onstop=saveAudio;recorder.start(1000);startedAt=Date.now();elapsed=0;timerId=setInterval(()=>{$('#timer').textContent=format(Math.floor((Date.now()-startedAt)/1000)+elapsed)},500);$('.record-card').classList.add('recording');$('#stateText').textContent='录音中';$('#recordHint').textContent='正在边录边转写，可随时暂停或结束';$('#pauseButton').disabled=false;$('#stopButton').disabled=false;$('#recordButton').disabled=true;startSpeechRecognition()}catch(e){toast('无法使用麦克风，请检查浏览器权限')}}
function pauseRecording(){if(recorder.state==='recording'){recorder.pause();recognition?.stop();elapsed+=Math.floor((Date.now()-startedAt)/1000);clearInterval(timerId);$('#pauseButton').textContent='继续';$('#stateText').textContent='已暂停'}else{recorder.resume();startedAt=Date.now();timerId=setInterval(()=>{$('#timer').textContent=format(Math.floor((Date.now()-startedAt)/1000)+elapsed)},500);$('#pauseButton').textContent='暂停';$('#stateText').textContent='录音中';startSpeechRecognition()}}
function stopRecording(){clearInterval(timerId);recognition?.stop();recorder.stop();stream.getTracks().forEach(t=>t.stop());$('.record-card').classList.remove('recording');$('#stateText').textContent='录音完成';$('#recordHint').textContent='录音已保存在当前浏览器，可编辑文字稿后保存会议';$('#pauseButton').disabled=true;$('#stopButton').disabled=true;$('#recordButton').disabled=false}
function saveAudio(){const blob=new Blob(chunks,{type:recorder.mimeType});const reader=new FileReader();reader.onload=()=>localStorage.setItem('vf-last-audio',reader.result);reader.readAsDataURL(blob)}
$('#recordButton').addEventListener('click',startRecording);$('#pauseButton').addEventListener('click',pauseRecording);$('#stopButton').addEventListener('click',stopRecording);
$('#usePaste').addEventListener('click',()=>{transcript.value=$('#pasteText').value;updateTextState();setTab('record');toast('文字已放入会议稿')});
$('#audioFile').addEventListener('change',e=>{if(e.target.files[0])toast(`已选择：${e.target.files[0].name}`)});
$('#saveButton').addEventListener('click',()=>{const now=new Date();const item={id:Date.now(),title:$('#title').value||`${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} 会议`,project:$('#project').value,text:transcript.value,createdAt:now.toISOString()};const items=JSON.parse(localStorage.getItem('vf-meetings')||'[]');items.unshift(item);localStorage.setItem('vf-meetings',JSON.stringify(items));$('#saveStatus').textContent=`已保存 · ${now.toLocaleTimeString()}`;toast('会议已保存')});
$('#clearButton').addEventListener('click',()=>{if(confirm('确定清空当前会议内容？')){transcript.value='';$('#title').value='';$('#timer').textContent='00:00';updateTextState()}});
