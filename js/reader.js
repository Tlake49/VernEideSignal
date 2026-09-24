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
  const issueSelect = document.getElementById('issueSelect');
  const viewToggle = document.getElementById('readerViewToggle');
  if (!list) return;
  const availableIssues = list.dataset.currentOnly === 'true' ? content.issues.slice(0, 1) : content.issues;
  const mobileReader = window.matchMedia('(max-width: 680px)');
  let issue = availableIssues[0], pageNumber = 1, flipping = false, drag = null, mobileSpread = false;

  list.innerHTML = availableIssues.map((item,i) => `<button class="issue-choice${i===0?' active':''}" data-issue="${item.id}"><strong>${item.title}</strong><span>${item.pages} pages · ${item.kicker}</span></button>`).join('');
  if (issueSelect) issueSelect.innerHTML = availableIssues.map(item => `<option value="${item.id}">${item.title}</option>`).join('');

  function isMobileSingle() {
    return mobileReader.matches && !mobileSpread;
  }

  function normalizeSpreadPage() {
    if (pageNumber > 1 && pageNumber % 2 !== 0) pageNumber -= 1;
  }

  function render() {
    const isCover = pageNumber === 1;
    const isLastSingle = pageNumber === issue.pages;
    const singleMobile = isMobileSingle();
    book.classList.toggle('mobile-single', singleMobile);
    book.classList.toggle('mobile-spread', mobileReader.matches && mobileSpread);
    book.classList.toggle('cover', isCover || singleMobile);
    book.classList.toggle('single-last', !singleMobile && isLastSingle);
    leftPage.src = `assets/pages/${issue.id}/page-${pageNumber}.jpg`;
    leftPage.alt = `${issue.title}, page ${pageNumber}`;
    const rightNumber = pageNumber + 1;
    if (!singleMobile && !isCover && !isLastSingle && rightNumber <= issue.pages) {
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
    count.textContent = singleMobile ? `${isCover ? 'Cover · ' : ''}Page ${pageNumber} of ${issue.pages}` : isCover ? `Cover · Page 1 of ${issue.pages}` : rightNumber <= issue.pages ? `Pages ${pageNumber}–${rightNumber} of ${issue.pages}` : `Back cover · Page ${pageNumber} of ${issue.pages}`;
    note.textContent = issue.note;
    download.href = issue.pdf;
    prev.disabled = pageNumber === 1;
    next.disabled = pageNumber >= issue.pages;
    if (issueSelect) issueSelect.value = issue.id;
    if (viewToggle) {
      viewToggle.textContent = mobileSpread ? 'View single page' : 'View full spread';
      viewToggle.setAttribute('aria-pressed', String(mobileSpread));
    }
  }
  function targetPage(direction) {
    const target = isMobileSingle()
      ? pageNumber + direction
      : direction > 0 ? (pageNumber === 1 ? 2 : pageNumber + 2) : (pageNumber <= 2 ? 1 : pageNumber - 2);
    return target >= 1 && target <= issue.pages ? target : null;
  }
  function turn(direction) {
    if (flipping) return;
    const target = targetPage(direction);
    if (target === null) return;
    flipping = true;
    if (pageNumber === 1) book.classList.add('from-cover');
    book.classList.add(direction > 0 ? 'flipping-next' : 'flipping-prev');
    setTimeout(() => { pageNumber = target; render(); }, 285);
    setTimeout(() => { book.classList.remove('flipping-next','flipping-prev','from-cover'); flipping = false; }, 580);
  }
  list.addEventListener('click', e => {
    const button = e.target.closest('[data-issue]'); if (!button) return;
    resetDrag();
    issue = availableIssues.find(i => i.id === button.dataset.issue); pageNumber = 1;
    list.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === button)); render();
  });
  if (issueSelect) issueSelect.addEventListener('change', () => {
    resetDrag();
    issue = availableIssues.find(item => item.id === issueSelect.value) || availableIssues[0];
    pageNumber = 1;
    list.querySelectorAll('button').forEach(button => button.classList.toggle('active', button.dataset.issue === issue.id));
    render();
  });
  if (viewToggle) viewToggle.addEventListener('click', () => {
    resetDrag();
    mobileSpread = !mobileSpread;
    if (mobileSpread) normalizeSpreadPage();
    render();
  });
  const handleReaderBreakpoint = () => {
    resetDrag();
    if (!isMobileSingle()) normalizeSpreadPage();
    render();
  };
  if (mobileReader.addEventListener) mobileReader.addEventListener('change', handleReaderBreakpoint);
  else mobileReader.addListener(handleReaderBreakpoint);
  prev.addEventListener('click', () => turn(-1)); next.addEventListener('click', () => turn(1));
  document.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') turn(-1); if (e.key === 'ArrowRight') turn(1); });

  function resetDrag() {
    book.classList.remove('dragging','drag-next','drag-prev','settling');
    book.style.removeProperty('--page-rotation');
    book.style.removeProperty('--page-brightness');
    drag = null;
  }

  function settleDrag(commit) {
    if (!drag || !drag.direction) { resetDrag(); return; }
    const direction = drag.direction;
    const target = targetPage(direction);
    if (target === null) { resetDrag(); return; }
    flipping = true;
    book.classList.add('settling');
    book.style.setProperty('--page-rotation', `${commit ? (direction > 0 ? -92 : 92) : 0}deg`);
    book.style.setProperty('--page-brightness', commit ? '.7' : '1');
    window.setTimeout(() => {
      if (commit) pageNumber = target;
      resetDrag();
      render();
      flipping = false;
    }, 210);
  }

  book.addEventListener('dragstart', e => e.preventDefault());
  book.addEventListener('pointerdown', e => {
    if (flipping || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastTime: performance.now(),
      velocity: 0,
      direction: 0,
      progress: 0
    };
    book.setPointerCapture(e.pointerId);
    book.classList.add('dragging');
  });
  book.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.direction && Math.abs(dx) < 5) return;
    if (!drag.direction && Math.abs(dy) > Math.abs(dx)) return;

    const direction = dx < 0 ? 1 : -1;
    if (targetPage(direction) === null) {
      book.classList.remove('drag-next','drag-prev');
      book.style.setProperty('--page-rotation','0deg');
      drag.direction = 0;
      drag.progress = 0;
      return;
    }

    e.preventDefault();
    drag.direction = direction;
    book.classList.toggle('drag-next', direction > 0);
    book.classList.toggle('drag-prev', direction < 0);
    const width = Math.max(book.getBoundingClientRect().width * .55, 1);
    drag.progress = Math.min(Math.abs(dx) / width, 1);
    const rotation = drag.progress * 88 * (direction > 0 ? -1 : 1);
    book.style.setProperty('--page-rotation', `${rotation}deg`);
    book.style.setProperty('--page-brightness', String(1 - drag.progress * .3));

    const now = performance.now();
    const elapsed = Math.max(now - drag.lastTime, 1);
    drag.velocity = (e.clientX - drag.lastX) / elapsed;
    drag.lastX = e.clientX;
    drag.lastTime = now;
  });
  book.addEventListener('pointerup', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const velocityTowardTurn = drag.direction > 0 ? -drag.velocity : drag.velocity;
    const commit = drag.progress >= .24 || (drag.progress >= .06 && velocityTowardTurn > .5);
    settleDrag(commit);
  });
  book.addEventListener('pointercancel', () => settleDrag(false));
  render();
})();
