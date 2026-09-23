(async function () {
  const ANSWERS = ['DRIVE','DREAM','ROADS','HONDA','ACURA','MOTOR','SHIFT','SPEED','WHEEL','TRUCK','CRUISE','RALLY','BRAKE','ROUTE','GEARS','READY','OWNER','LOCAL','SERVE','HEART'];
  const dateKey = new Date().toLocaleDateString('en-CA');
  const dayNumber = Math.floor((new Date(dateKey+'T00:00:00') - new Date('2026-01-01T00:00:00')) / 86400000);
  const answer = ANSWERS[((dayNumber % ANSWERS.length) + ANSWERS.length) % ANSWERS.length];
  const storeKey = `signal-verdle:${dateKey}`;
  let state = JSON.parse(localStorage.getItem(storeKey) || '{"guesses":[],"current":"","done":false}');
  let valid = new Set(ANSWERS);
  try { const text = await fetch('./valid-words.txt').then(r=>r.text()); text.split(/\s+/).forEach(w=>valid.add(w.toUpperCase())); } catch (_) {}
  const keyboard = document.getElementById('keyboard');
  const message = document.getElementById('message');
  const share = document.getElementById('shareBtn');
  const statuses = {};

  function save(){ localStorage.setItem(storeKey,JSON.stringify(state)); }
  function score(word){
    const result=Array(5).fill('absent'), pool=answer.split('');
    word.split('').forEach((c,i)=>{if(c===answer[i]){result[i]='correct';pool[i]=null;}});
    word.split('').forEach((c,i)=>{if(result[i]==='correct')return;const j=pool.indexOf(c);if(j>=0){result[i]='present';pool[j]=null;}});
    return result;
  }
  function paint(){
    for(let r=0;r<6;r++) for(let c=0;c<5;c++){
      const tile=document.getElementById(`tile-${r}-${c}`); tile.textContent=''; tile.className='tile';
      const word=state.guesses[r] || (r===state.guesses.length?state.current:'');
      if(word[c]) { tile.textContent=word[c]; tile.classList.add('filled'); }
      if(state.guesses[r]) score(word).forEach((s,i)=>{if(i===c)tile.classList.add(s);});
    }
    Object.entries(statuses).forEach(([key,val])=>{const b=keyboard.querySelector(`[data-key="${key}"]`);if(b)b.className=`key ${val}`;});
    state.guesses.forEach(word=>score(word).forEach((s,i)=>{
      const rank={absent:1,present:2,correct:3}; if(!statuses[word[i]]||rank[s]>rank[statuses[word[i]]])statuses[word[i]]=s;
    }));
    share.style.display=state.done?'inline-flex':'none';
  }
  function note(text){message.textContent=text;setTimeout(()=>{if(message.textContent===text)message.textContent='';},2200);}
  function enter(){
    if(state.done)return; if(state.current.length<5)return note('Not enough letters'); if(!valid.has(state.current))return note('Not in word list');
    state.guesses.push(state.current); const won=state.current===answer; state.current='';
    if(won){state.done=true;note(`Solved in ${state.guesses.length}!`);} else if(state.guesses.length===6){state.done=true;note(`Today’s word was ${answer}`);} save();paint();
  }
  function input(key){
    if(key==='ENTER')return enter(); if(key==='BACKSPACE'){state.current=state.current.slice(0,-1);save();paint();return;}
    if(/^[A-Z]$/.test(key)&&!state.done&&state.current.length<5){state.current+=key;save();paint();}
  }
  ['QWERTYUIOP','ASDFGHJKL','ZXCVBNM'].forEach((row,ri)=>{
    const line=document.createElement('div');line.className='key-row';
    if(ri===2){const b=document.createElement('button');b.className='key wide';b.textContent='Enter';b.dataset.key='ENTER';line.append(b);}
    [...row].forEach(k=>{const b=document.createElement('button');b.className='key';b.textContent=k;b.dataset.key=k;line.append(b);});
    if(ri===2){const b=document.createElement('button');b.className='key wide';b.textContent='⌫';b.dataset.key='BACKSPACE';line.append(b);}
    keyboard.append(line);
  });
  keyboard.addEventListener('click',e=>{const b=e.target.closest('[data-key]');if(b)input(b.dataset.key);});
  document.addEventListener('keydown',e=>{const k=e.key.toUpperCase();if(k==='BACKSPACE'||k==='ENTER'||/^[A-Z]$/.test(k))input(k);});
  const modal=document.getElementById('helpModal');
  function toggleHelp(show){modal.classList.toggle('hidden',!show);modal.setAttribute('aria-hidden',String(!show));}
  document.getElementById('helpBtn').onclick=()=>toggleHelp(true); document.getElementById('closeHelpBtn').onclick=()=>toggleHelp(false); document.getElementById('modalBackdrop').onclick=()=>toggleHelp(false);
  document.getElementById('themeToggle').onclick=()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;localStorage.setItem('verdleTheme',next);};
  share.onclick=async()=>{const rows=state.guesses.map(w=>score(w).map(s=>s==='correct'?'🟦':s==='present'?'🟨':'⬛').join('')).join('\n');const text=`VERDLE ${dateKey} ${state.guesses.length}/6\n${rows}`;try{await navigator.clipboard.writeText(text);note('Results copied!');}catch(_){note(text);}};
  paint();
})();
