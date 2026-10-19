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
 if(!sb){msg('Supabase 연결 설정 또는 라이브러리를 확인하세요.','error');return;}
 try{
  const {data,error}=await sb.auth.getSession();
  if(error)msg('세션 확인 실패: '+errorText(error),'error');
  user=data?.session?.user||null;setAuthUI();if(user)await afterLogin();
 }catch(e){msg('초기 연결 실패: '+errorText(e),'error');}
 sb.auth.onAuthStateChange((_event,session)=>{
  const next=session?.user||null;if(next?.id===(user?.id||null))return;
  user=next;setAuthUI();
  if(user) setTimeout(()=>Promise.resolve(afterLogin()).catch(e=>msg('자료 로드 실패: '+errorText(e),'error')),0);
  else $('app')?.classList.add('hidden');
 });
}
function setAuthUI(){ $('login')?.classList.toggle('hidden',!!user);$('app')?.classList.toggle('hidden',!user);if($('account'))$('account').textContent=user?.email||'';}
async function signIn(){
 hideMsg();const email=$('email').value.trim(),password=$('password').value;
 if(!email||!password){msg('이메일과 비밀번호를 입력하세요.','error');return;}
 if(!sb){msg('Supabase 연결이 초기화되지 않았습니다.','error');return;}
 const btn=$('signin');btn.disabled=true;btn.textContent='로그인 중...';
 try{
  const result=await Promise.race([sb.auth.signInWithPassword({email,password}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('서버 응답 지연: 네트워크 또는 Supabase 연결을 확인하세요.')),12000))]);
  if(result.error)throw result.error;
  if(result.data?.user){user=result.data.user;setAuthUI();}
 }catch(e){msg('로그인 실패: '+errorText(e),'error');}
 finally{btn.disabled=false;btn.textContent='로그인';}
}
async function signOut(){await sb.auth.signOut();location.reload();}
async function fetchRows(){const {data,error}=await sb.from('reading_passages').select('*').order('updated_at',{ascending:false});if(error)throw error;return data||[];}
async function saveRow(payload){const {data,error}=await sb.from('reading_passages').upsert(payload,{onConflict:'id'}).select().single();if(error)throw error;return data;}
async function removeRow(id){const {error}=await sb.from('reading_passages').delete().eq('id',id);if(error)throw error;}
function normalizeQuestion(q,i){return {number:i+1,prompt:String(q?.prompt||''),choices:Array.isArray(q?.choices)?q.choices.map(x=>String(x||'')):['','','',''],answer:String(q?.answer||''),tip:String(q?.tip||'')};}
function categoryParts(category){const raw=String(category||'').trim();const parts=raw.split(' / ');return parts.length>1?[parts[0]||'미분류',parts.slice(1).join(' / ')||'기본 목차']:[raw||'미분류','기본 목차'];}
function categoryKey(book,chapter){return `${book.trim()} / ${chapter.trim()}`;}
function qView(q,notes=false){let choices=(q.choices||[]).map((v,i)=>({v,i})).filter(o=>o.v.trim());let insertion=choices.length===1;return `<section class="question"><div class="question-prompt">${q.number}. ${esc(q.prompt||'')}</div>${choices.map(o=>`<div class="choice">${insertion?'':String.fromCharCode(65+o.i)+') '}${esc(o.v)}</div>`).join('')}${notes?`<p>정답: ${esc(q.answer||'미입력')}</p>${q.tip?`<div class="tip">${esc(q.tip)}</div>`:''}`:''}</section>`;}
function safeTitle(r){return esc(r.title||'제목 없음');}
