'use strict';
let rows=[],current=null,dirty=false,book='미분류',chapter='기본 목차';
const booksExtra=new Set(),chaptersExtra=new Set();
const emptyRow=()=>({id:crypto.randomUUID(),title:'',category:categoryKey(book,chapter),passage:'',questions:[],_new:true});
function markDirty(){dirty=true;}
function collect(){if(!current)return;current.title=$('title').value;current.passage=$('passage').value;current.category=categoryKey(book,chapter);current.questions=[...$('questions').querySelectorAll('.question-editor')].map((el,i)=>normalizeQuestion({prompt:el.querySelector('.prompt').value,choices:[...el.querySelectorAll('.choice-line')].map(x=>x.querySelector('.choice-input')?.value||''),answer:el.querySelector('.answer').value,tip:el.querySelector('.tip-input').value},i));}
function questionEditor(q,i){
 const el=document.createElement('div');el.className='question-editor';
 el.innerHTML=`<div class="question-row"><span class="question-number">${i+1}.</span><textarea class="prompt" rows="1" aria-label="${i+1}번 문제"></textarea><button type="button" class="remove-question danger" title="문제 삭제">×</button></div>
 <div class="choices">${['A)','B)','C)','D)'].map((letter,j)=>`<label class="choice-line" data-choice="${j}"><span>${letter}</span><textarea class="choice-input" rows="1" aria-label="${letter} 선지"></textarea><button type="button" class="remove-choice" title="${letter} 선지 제거" aria-label="${letter} 선지 제거">×</button></label>`).join('')}</div>
 <div class="answer-tip"><label class="answer-line"><span>✓</span><textarea class="answer" rows="1" aria-label="정답"></textarea></label><label class="tip-line"><span>ⓘ</span><textarea class="tip-input" rows="1" aria-label="팁"></textarea></label></div>`;
 el.querySelector('.prompt').value=q.prompt||'';el.querySelectorAll('.choice-input').forEach((e,j)=>{e.value=q.choices?.[j]||'';if(q.choices?.length && j>=q.choices.length)e.closest('.choice-line').classList.add('choice-removed');});el.querySelector('.answer').value=q.answer||'';el.querySelector('.tip-input').value=q.tip||'';
 el.querySelectorAll('.remove-choice').forEach(b=>b.onclick=()=>{const line=b.closest('.choice-line');line.querySelector('.choice-input').value='';line.classList.add('choice-removed');markDirty();});el.querySelectorAll('.choice-input').forEach(t=>t.addEventListener('input',()=>{if(t.value.trim())t.closest('.choice-line').classList.remove('choice-removed');}));setupAutoHeight(el);el.querySelector('.remove-question').onclick=()=>{el.remove();renumber();markDirty();};el.addEventListener('input',markDirty);return el;
}
// Resize textareas to their complete wrapped content, including after pane reflow.
let autoHeightFrame=0;
function resizeText(t){
 if(!t.isConnected || t.getClientRects().length===0)return;
 // Explicit height reset allows scrollHeight to reflect both growth and shrinkage.
 t.style.setProperty('height','auto','important');
 const computed=getComputedStyle(t);
 const minHeight=Math.max(30,parseFloat(computed.minHeight)||0);
 const required=Math.max(minHeight,Math.ceil(t.scrollHeight)+2);
 t.style.setProperty('height',required+'px','important');
}
function resizeAllText(){
 document.querySelectorAll('.admin-v18 .question-editor textarea.prompt,.admin-v18 .question-editor textarea.choice-input').forEach(resizeText);
}
function queueResizeAll(){
 cancelAnimationFrame(autoHeightFrame);
 autoHeightFrame=requestAnimationFrame(()=>{resizeAllText();requestAnimationFrame(resizeAllText);});
}
function setupAutoHeight(root){
 root.querySelectorAll('textarea.prompt,textarea.choice-input').forEach(t=>{
  if(t.dataset.autoHeight!=='1'){
   t.dataset.autoHeight='1';
   t.addEventListener('input',()=>resizeText(t));
  }
 });
 queueResizeAll();
}
window.addEventListener('resize',queueResizeAll);
window.addEventListener('orientationchange',queueResizeAll);
if(document.fonts?.ready)document.fonts.ready.then(queueResizeAll);
if('ResizeObserver' in window){
 const ro=new ResizeObserver(queueResizeAll);
 const observe=()=>{
  const host=document.querySelector('.admin-questions-col');
  const layout=document.querySelector('.admin-two-pane');
  if(host)ro.observe(host);
  if(layout)ro.observe(layout);
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe);else observe();
}

function renumber(){[...$('questions').children].forEach((e,i)=>e.querySelector('.question-number').textContent=(i+1)+'.');}

function allBooks(){return [...new Set(['미분류',...rows.map(r=>categoryParts(r.category)[0]),...booksExtra])].sort((a,b)=>a.localeCompare(b,'ko'));}
function allChapters(b){return [...new Set([...(b==='미분류'?['기본 목차']:[]),...rows.filter(r=>categoryParts(r.category)[0]===b).map(r=>categoryParts(r.category)[1]),...[...chaptersExtra].filter(x=>x.startsWith(b+' / ')).map(x=>categoryParts(x)[1])])].sort((a,b)=>a.localeCompare(b,'ko'));}
function scoped(){return rows.filter(r=>{const p=categoryParts(r.category);return p[0]===book&&p[1]===chapter;});}
function checkDirty(){return !dirty||confirm('저장하지 않은 변경사항을 버릴까요?');}
function closeMenus(){document.querySelectorAll('.picker-menu').forEach(e=>e.classList.add('hidden'));}
function menu(id,items,selected,select,add,del){const e=$(id);e.replaceChildren();items.forEach(v=>{const row=document.createElement('div');row.className='menu-row';const b=document.createElement('button');b.textContent=v;b.className=v===selected?'active':'';b.onclick=()=>{closeMenus();select(v);};row.append(b);if(del&&v!=='미분류'){const d=document.createElement('button');d.textContent='×';d.title='삭제 (지문은 미분류로 이동)';d.onclick=()=>{closeMenus();del(v);};row.append(d);}e.append(row);});const plus=document.createElement('button');plus.className='menu-add';plus.textContent='＋ 추가';plus.onclick=()=>{closeMenus();add();};e.append(plus);}
function renderNav(){const books=allBooks();if(!books.includes(book))book='미분류';const chapters=allChapters(book);if(!chapters.includes(chapter))chapter=chapters[0]||'기본 목차';$('bookPick').textContent=book+' ▾';$('chapterPick').textContent=chapter+' ▾';$('titlePick').textContent=current?.title||'제목 선택 ▾';$('titlePick').textContent+=(current?.title?' ▾':'');
 menu('bookMenu',books,book,v=>{if(!checkDirty())return;book=v;chapter=allChapters(v)[0]||'기본 목차';current=scoped()[0]||null;dirty=false;render();},addBook,deleteBook);
 menu('chapterMenu',chapters,chapter,v=>{if(!checkDirty())return;chapter=v;current=scoped()[0]||null;dirty=false;render();},addChapter,deleteChapter);
 menu('titleMenu',scoped().map(r=>r.title||'제목 없음'),current?.title||'',v=>{if(!checkDirty())return;current=scoped().find(r=>(r.title||'제목 없음')===v)||null;dirty=false;render();},createNew,null);
}
function renderTree(){const root=$('tree');root.replaceChildren();allBooks().forEach(b=>{const det=document.createElement('details');det.open=b===book;const summary=document.createElement('summary');summary.textContent=b;det.append(summary);allChapters(b).forEach(c=>{const child=document.createElement('details');child.open=b===book&&c===chapter;const cs=document.createElement('summary');cs.textContent=c;child.append(cs);rows.filter(r=>{const p=categoryParts(r.category);return p[0]===b&&p[1]===c;}).forEach(r=>{const btn=document.createElement('button');btn.textContent=r.title||'제목 없음';btn.className='tree-title'+(r.id===current?.id?' active':'');btn.onclick=()=>{if(!checkDirty())return;book=b;chapter=c;current=r;dirty=false;render();};child.append(btn);});det.append(child);});root.append(det);});}
function render(){renderNav();renderTree();$('editorContent').classList.toggle('hidden',!current);if(!current)return;$('title').value=current.title||'';$('passage').value=current.passage||'';$('questions').replaceChildren(...(current.questions||[]).map(questionEditor));requestAnimationFrame(()=>{document.querySelectorAll('.question-editor').forEach(setupAutoHeight);queueResizeAll();});}
async function reload(){try{const id=current?.id;rows=await fetchRows();current=rows.find(r=>r.id===id)||scoped()[0]||rows[0]||null;if(current){[book,chapter]=categoryParts(current.category);}dirty=false;render();}catch(e){msg('자료 불러오기 실패: '+errorText(e),'error');}}
function createNew(){if(!checkDirty())return;current=emptyRow();dirty=true;render();}
function addBook(){const v=prompt('새 교재 이름');if(!v?.trim())return;booksExtra.add(v.trim());book=v.trim();chapter='기본 목차';chaptersExtra.add(categoryKey(book,chapter));current=null;dirty=false;render();}
function addChapter(){const v=prompt('새 목차 이름');if(!v?.trim())return;chapter=v.trim();chaptersExtra.add(categoryKey(book,chapter));current=null;dirty=false;render();}
async function reassign(affected,to,success){if(dirty){msg('먼저 현재 지문을 저장하세요.','error');return;}try{for(const r of affected){await saveRow({id:r.id,owner_id:user.id,title:r.title,category:to(r),passage:r.passage,questions:r.questions,updated_at:new Date().toISOString()});}await reload();msg(success,'success');}catch(e){msg('분류 변경 실패: '+errorText(e),'error');}}
async function renameBook(){if(book==='미분류')return msg('미분류 교재는 이름을 변경할 수 없습니다.','error');const old=book,v=prompt('교재 이름 변경',old)?.trim();if(!v||v===old)return;booksExtra.delete(old);booksExtra.add(v);for(const c of [...chaptersExtra])if(categoryParts(c)[0]===old){chaptersExtra.delete(c);chaptersExtra.add(categoryKey(v,categoryParts(c)[1]));}book=v;await reassign(rows.filter(r=>categoryParts(r.category)[0]===old),r=>categoryKey(v,categoryParts(r.category)[1]),'교재 이름 변경 완료');render();}
async function renameChapter(){const old=chapter,v=prompt('목차 이름 변경',old)?.trim();if(!v||v===old)return;chaptersExtra.delete(categoryKey(book,old));chaptersExtra.add(categoryKey(book,v));chapter=v;await reassign(rows.filter(r=>r.category===categoryKey(book,old)),()=>categoryKey(book,v),'목차 이름 변경 완료');render();}
async function deleteBook(v){if(!confirm('교재를 삭제할까요? 포함된 지문은 미분류로 이동하며 삭제되지 않습니다.'))return;booksExtra.delete(v);for(const c of [...chaptersExtra])if(categoryParts(c)[0]===v)chaptersExtra.delete(c);book='미분류';chapter='기본 목차';await reassign(rows.filter(r=>categoryParts(r.category)[0]===v),()=>categoryKey('미분류','기본 목차'),'교재 삭제 완료: 지문은 미분류로 이동');render();}
async function deleteChapter(v){if(!confirm('목차를 삭제할까요? 포함된 지문은 미분류로 이동하며 삭제되지 않습니다.'))return;const b=book;chaptersExtra.delete(categoryKey(b,v));book='미분류';chapter='기본 목차';await reassign(rows.filter(r=>r.category===categoryKey(b,v)),()=>categoryKey('미분류','기본 목차'),'목차 삭제 완료: 지문은 미분류로 이동');render();}
['book','chapter','title'].forEach(name=>{$(name+'Pick').onclick=e=>{e.stopPropagation();const el=$(name+'Menu'),was=el.classList.contains('hidden');closeMenus();if(was)el.classList.remove('hidden');};});document.addEventListener('click',e=>{if(!e.target.closest('.selector-wrap'))closeMenus();});
$('bookRename').onclick=renameBook;$('chapterRename').onclick=renameChapter;$('new').onclick=createNew;
$('addQuestion').onclick=()=>{if(!current)return;$('questions').append(questionEditor(normalizeQuestion({},0),$('questions').children.length));markDirty();};
$('save').onclick=async()=>{if(!user||!current)return;collect();if(!current.title.trim())return msg('제목을 입력하세요.','error');const btn=$('save');btn.disabled=true;try{current=await saveRow({id:current.id,owner_id:user.id,title:current.title,category:current.category,passage:current.passage,questions:current.questions,updated_at:new Date().toISOString()});dirty=false;await reload();msg('저장 완료','success');}catch(e){msg('저장 실패: '+errorText(e),'error');}finally{btn.disabled=false;}};
$('delete').onclick=async()=>{if(!current||!confirm('현재 지문을 영구 삭제할까요?'))return;try{if(!current._new)await removeRow(current.id);current=null;dirty=false;await reload();msg('삭제 완료','success');}catch(e){msg('삭제 실패: '+errorText(e),'error');}};
$('refresh').onclick=()=>{if(checkDirty())reload();};['title','passage'].forEach(id=>$(id).addEventListener('input',markDirty));
$('signin').onclick=signIn;$('password').onkeydown=e=>{if(e.key==='Enter')signIn();};$('logout').onclick=signOut;
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
initAuth(async()=>{$('logout').classList.remove('hidden');await reload();});
