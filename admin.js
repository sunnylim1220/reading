'use strict';
let rows=[],current=null,dirty=false,selectedCategory="";
const emptyRow=()=>({id:crypto.randomUUID(),title:'',category:selectedCategory,passage:'',questions:[],_new:true});
function markDirty(){dirty=true;$('status').textContent='저장되지 않은 변경사항';}
function collect(){if(!current)return;current.title=$('title').value;current.passage=$('passage').value;current.questions=[...$('questions').querySelectorAll('.question-editor')].map((el,i)=>normalizeQuestion({prompt:el.querySelector('.prompt').value,choices:[...el.querySelectorAll('.choice-input')].map(x=>x.value),answer:el.querySelector('.answer').value,tip:el.querySelector('.tip-input').value},i));}
function questionEditor(q,i){
 const el=document.createElement('div');el.className='question-editor';
 el.innerHTML=`<div class="row question-head"><span class="question-number">문제 ${i+1}</span><span class="grow"></span><button type="button" class="remove-question danger">삭제</button></div>
 <label class="compact-field">문제 문장<textarea class="prompt" rows="2"></textarea></label>
 <div class="choices">${['A)','B)','C)','D)'].map(letter=>`<label class="choice-line"><span>${letter}</span><textarea class="choice-input" rows="1"></textarea></label>`).join('')}</div>
 <div class="row answer-tip"><label class="field compact-field">정답<input class="wide answer"></label><label class="field compact-field">팁<textarea class="tip-input" rows="2"></textarea></label></div>`;
 el.querySelector('.prompt').value=q.prompt||'';
 el.querySelectorAll('.choice-input').forEach((e,j)=>e.value=q.choices?.[j]||'');
 el.querySelector('.answer').value=q.answer||'';el.querySelector('.tip-input').value=q.tip||'';
 el.querySelector('.remove-question').onclick=()=>{el.remove();renumber();markDirty();};
 el.addEventListener('input',markDirty);return el;
}
function renumber(){[...$('questions').children].forEach((e,i)=>e.querySelector('.question-number').textContent='문제 '+(i+1));}
function renderEditor(){if(!current){$('title').value='';$('passage').value='';$('questions').replaceChildren();$('status').textContent='분류를 선택하고 새 지문을 추가하세요.';return;}$('title').value=current.title||'';$('passage').value=current.passage||'';$('questions').replaceChildren(...(current.questions||[]).map((q,i)=>questionEditor(q,i)));$('status').textContent=dirty?'저장되지 않은 변경사항':'저장됨';}
function categoryNames(){return [...new Set(rows.map(r=>r.category||'미분류').concat(selectedCategory||'미분류'))].sort((a,b)=>a.localeCompare(b,'ko'));}
function renderList(){
 const cats=categoryNames();
 $('categories').innerHTML=cats.map(c=>`<button class="category-item ${selectedCategory===c?'active':''}" data-category="${esc(c)}">${esc(c)} <span class="category-count">${rows.filter(r=>(r.category||'미분류')===c).length}</span></button>`).join('');
 $('categories').querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>chooseCategory(b.dataset.category));
 const list=rows.filter(r=>(r.category||'미분류')===selectedCategory);
 if(current?._new&&current.category===selectedCategory&&!list.some(x=>x.id===current.id))list.unshift(current);
 $('items').innerHTML=list.map(x=>`<button class="item ${current?.id===x.id?'active':''}" data-id="${esc(x.id)}"><span>${safeTitle(x)}</span><span class="muted">${(x.questions||[]).length}문제</span></button>`).join('');
 $('items').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>selectRow(b.dataset.id));
}
function chooseCategory(cat){
 if(dirty&&!confirm('저장하지 않은 변경사항을 버릴까요?'))return;
 selectedCategory=cat;current=rows.find(r=>(r.category||'미분류')===cat)||null;dirty=false;
 renderList();renderEditor();
}
function selectRow(id){if(dirty&&!confirm('저장하지 않은 변경사항을 버릴까요?'))return;current=rows.find(x=>x.id===id)||(current?._new&&current.id===id?current:null);selectedCategory=current?.category||'미분류';dirty=false;renderList();renderEditor();}
async function reload(){try{const keep=current?.id;rows=await fetchRows();current=rows.find(x=>x.id===keep)||rows.find(x=>(x.category||'미분류')===selectedCategory)||rows[0]||null;if(current)selectedCategory=current.category||'미분류';dirty=false;renderList();renderEditor();}catch(e){msg('자료 불러오기 실패: '+errorText(e),'error');}}
$('new').onclick=()=>{if(dirty&&!confirm('저장하지 않은 변경사항을 버릴까요?'))return;if(!selectedCategory||selectedCategory==='미분류')selectedCategory='미분류';current=emptyRow();dirty=true;renderList();renderEditor();};
$('addQuestion').onclick=()=>{$('questions').append(questionEditor(normalizeQuestion({},0),$('questions').children.length));markDirty();};
$('newCategory').onclick=()=>{if(dirty&&!confirm('저장하지 않은 변경사항을 버릴까요?'))return;const name=prompt('새 분류 이름을 입력하세요.');if(!name||!name.trim())return;selectedCategory=name.trim();current=null;dirty=false;renderList();renderEditor();};
$('renameCategory').onclick=async()=>{if(!selectedCategory)return;if(dirty){msg('먼저 현재 지문을 저장하세요.','error');return;}const before=selectedCategory;const after=prompt('분류 이름 변경',before);if(!after||!after.trim()||after.trim()===before)return;const name=after.trim();if(categoryNames().includes(name)){msg('이미 존재하는 분류입니다.','error');return;}const affected=rows.filter(r=>(r.category||'미분류')===before);try{for(const r of affected){await saveRow({id:r.id,owner_id:user.id,title:r.title,category:name,passage:r.passage,questions:r.questions,updated_at:new Date().toISOString()});}selectedCategory=name;await reload();msg('분류 이름을 변경했습니다.','success');}catch(e){msg('분류 변경 실패: '+errorText(e),'error');}};
$('save').onclick=async()=>{if(!user)return;collect();if(!current.title.trim()){msg('제목을 입력하세요.','error');return;}const b=$('save');b.disabled=true;try{const payload={id:current.id,owner_id:user.id,title:current.title,category:current.category,passage:current.passage,questions:current.questions,updated_at:new Date().toISOString()};const saved=await saveRow(payload);current=saved;dirty=false;await reload();msg('저장 완료. 다른 기기에도 반영됩니다.','success');}catch(e){msg('저장 실패: '+errorText(e),'error');}finally{b.disabled=false;}};
$('delete').onclick=async()=>{if(!current)return;if(!confirm('이 지문을 영구 삭제할까요?'))return;try{if(!current._new)await removeRow(current.id);current=null;dirty=false;await reload();msg('삭제 완료','success');}catch(e){msg('삭제 실패: '+errorText(e),'error');}};
$('refresh').onclick=()=>{if(!dirty||confirm('저장하지 않은 변경사항을 버릴까요?')){dirty=false;reload();}};
['title','passage'].forEach(id=>$(id).addEventListener('input',markDirty));
$('signin').onclick=signIn;$('password').onkeydown=e=>{if(e.key==='Enter')signIn();};$('logout').onclick=signOut;
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
initAuth(async()=>{$('logout').classList.remove('hidden');await reload();});
