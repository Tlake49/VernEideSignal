(function () {
  const content = window.SIGNAL_CONTENT;
  const list = document.getElementById('issueList');
  const leftPage = document.getElementById('readerPageLeft');
  const rightPage = document.getElementById('readerPageRight');
  const book = document.getElementById('book');
  const title = document.getElementById('readerTitle');
  const subtitle = document.getElementById('readerSubtitle');
  const count = document.getElementById('pageCount');
  const note = document.getElementById('issueNote');
  const download = document.getElementById('issueDownload');
  const prev = document.getElementById('prevPage');
  const next = document.getElementById('nextPage');
  if (!list) return;
  const availableIssues = list.dataset.currentOnly === 'true' ? content.issues.slice(0, 1) : content.issues;
  let issue = availableIssues[0], pageNumber = 1, flipping = false;

  list.innerHTML = availableIssues.map((item,i) => `<button class="issue-choice${i===0?' active':''}" data-issue="${item.id}"><strong>${item.title}</strong><span>${item.pages} pages · ${item.kicker}</span></button>`).join('');

  function render() {
    const isCover = pageNumber === 1;
    const isLastSingle = pageNumber === issue.pages;
    book.classList.toggle('cover', isCover);
    book.classList.toggle('single-last', isLastSingle);
    leftPage.src = `assets/pages/${issue.id}/page-${pageNumber}.jpg`;
    leftPage.alt = `${issue.title}, page ${pageNumber}`;
    const rightNumber = pageNumber + 1;
    if (!isCover && !isLastSingle && rightNumber <= issue.pages) {
      rightPage.src = `assets/pages/${issue.id}/page-${rightNumber}.jpg`;
      rightPage.alt = `${issue.title}, page ${rightNumber}`;
      rightPage.hidden = false;
    } else {
      rightPage.removeAttribute('src');
      rightPage.alt = '';
      rightPage.hidden = true;
    }
    title.textContent = issue.title;
    subtitle.textContent = issue.kicker;
    count.textContent = isCover ? `Cover · Page 1 of ${issue.pages}` : rightNumber <= issue.pages ? `Pages ${pageNumber}–${rightNumber} of ${issue.pages}` : `Back cover · Page ${pageNumber} of ${issue.pages}`;
    note.textContent = issue.note;
    download.href = issue.pdf;
    prev.disabled = pageNumber === 1;
    next.disabled = pageNumber >= issue.pages;
  }
  function turn(direction) {
    if (flipping) return;
    const target = direction > 0 ? (pageNumber === 1 ? 2 : pageNumber + 2) : (pageNumber <= 2 ? 1 : pageNumber - 2);
    if (target < 1 || target > issue.pages) return;
    flipping = true;
    if (pageNumber === 1) book.classList.add('from-cover');
    book.classList.add(direction > 0 ? 'flipping-next' : 'flipping-prev');
    setTimeout(() => { pageNumber = target; render(); }, 285);
    setTimeout(() => { book.classList.remove('flipping-next','flipping-prev','from-cover'); flipping = false; }, 580);
  }
  list.addEventListener('click', e => {
    const button = e.target.closest('[data-issue]'); if (!button) return;
    issue = availableIssues.find(i => i.id === button.dataset.issue); pageNumber = 1;
    list.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === button)); render();
  });
  prev.addEventListener('click', () => turn(-1)); next.addEventListener('click', () => turn(1));
  document.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') turn(-1); if (e.key === 'ArrowRight') turn(1); });
  let startX = null;
  book.addEventListener('pointerdown',e => startX=e.clientX);
  book.addEventListener('pointerup',e => { if(startX===null)return; const d=e.clientX-startX; if(Math.abs(d)>45)turn(d<0?1:-1); startX=null; });
  render();
})();
