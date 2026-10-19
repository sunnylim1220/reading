'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cfg=window.READING_CONFIG||{};
const configured=cfg.supabaseUrl?.startsWith('https://')&&!cfg.supabaseUrl.includes('YOUR_PROJECT')&&cfg.supabaseAnonKey&&!cfg.supabaseAnonKey.includes('YOUR_');
const sb=configured&&window.supabase?.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let user=null;
function msg(message,kind=''){const n=$('message');if(n){n.textContent=message;n.className='notice '+kind;n.classList.remove('hidden');}}
function hideMsg(){if($('message'))$('message').classList.add('hidden');}
function errorText(e){return e?.message||String(e||'알 수 없는 오류');}
async function initAuth(afterLogin){
 if(!sb){msg('config.js에 Supabase URL과 publishable/anon key를 입력하세요.','error');return;}
 const {data,error}=await sb.auth.getUser();if(error&&error.name!=='AuthSessionMissingError')msg(errorText(error),'error');
 user=data?.user||null;setAuthUI();if(user)await afterLogin();
 sb.auth.onAuthStateChange((_event,session)=>{const newId=session?.user?.id||null;if(newId===(user?.id||null))return;user=session?.user||null;setAuthUI();if(user){setTimeout(()=>afterLogin(),0);}else{$('app')?.classList.add('hidden');}});
}
function setAuthUI(){ $('login')?.classList.toggle('hidden',!!user);$('app')?.classList.toggle('hidden',!user);if($('account'))$('account').textContent=user?.email||'';}
async function signIn(){hideMsg();const email=$('email').value.trim(),password=$('password').value;if(!email||!password){msg('이메일과 비밀번호를 입력하세요.','error');return;}const {error}=await sb.auth.signInWithPassword({email,password});if(error)msg('로그인 실패: '+errorText(error),'error');}
async function signOut(){await sb.auth.signOut();location.reload();}
async function fetchRows(){const {data,error}=await sb.from('reading_passages').select('*').order('updated_at',{ascending:false});if(error)throw error;return data||[];}
async function saveRow(payload){const {data,error}=await sb.from('reading_passages').upsert(payload,{onConflict:'id'}).select().single();if(error)throw error;return data;}
async function removeRow(id){const {error}=await sb.from('reading_passages').delete().eq('id',id);if(error)throw error;}
function normalizeQuestion(q,i){return {number:i+1,prompt:String(q?.prompt||''),choices:Array.isArray(q?.choices)?q.choices.map(x=>String(x||'')):['','','',''],answer:String(q?.answer||''),tip:String(q?.tip||'')};}
function qView(q,notes=false){let choices=(q.choices||[]).map((v,i)=>({v,i})).filter(o=>o.v.trim());let insertion=choices.length===1;return `<section class="question"><h3>Q${q.number}</h3>${q.prompt?`<div style="white-space:pre-wrap">${esc(q.prompt)}</div>`:''}${choices.map(o=>`<div class="choice">${insertion?'':(o.i+1)+'. '}${esc(o.v)}</div>`).join('')}${notes?`<p><b>정답: ${esc(q.answer||'미입력')}</b></p>${q.tip?`<div class="tip">${esc(q.tip)}</div>`:''}`:''}</section>`;}
function safeTitle(r){return esc(r.title||'제목 없음');}
