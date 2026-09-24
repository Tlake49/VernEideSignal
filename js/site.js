(function () {
  const content = window.SIGNAL_CONTENT;
  const menu = document.querySelector('.menu-button');
  const nav = document.querySelector('.site-nav');
  if (menu && nav) menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });

  const mobileCards = window.matchMedia('(max-width: 680px)');
  document.querySelectorAll('[data-game-href]').forEach(card => {
    const openGame = () => { window.location.href = new URL(card.dataset.gameHref, document.baseURI).href; };
    card.addEventListener('click', event => {
      if (!mobileCards.matches || event.target.closest('a,button')) return;
      openGame();
    });
    card.addEventListener('keydown', event => {
      if (!mobileCards.matches || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      openGame();
    });
  });

  const coverStage = document.querySelector('.cover-stage');
  if (coverStage && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let trackingReady = false;
    let trackingTimer = null;
    let frame = null;

    coverStage.addEventListener('pointerenter', e => {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      window.clearTimeout(trackingTimer);
      trackingTimer = window.setTimeout(() => {
        trackingReady = true;
        coverStage.classList.add('is-tracking');
      }, 280);
    });

    coverStage.addEventListener('pointermove', e => {
      if (!trackingReady || (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen')) return;
      const rect = coverStage.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - .5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - .5) * 2;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        coverStage.style.setProperty('--cover-shift-x', `${x * 9}px`);
        coverStage.style.setProperty('--cover-shift-y', `${y * 7}px`);
        coverStage.style.setProperty('--cover-tilt-x', `${y * -5}deg`);
        coverStage.style.setProperty('--cover-tilt-y', `${x * 7}deg`);
        coverStage.style.setProperty('--tab-shift-x', `${x * 14}px`);
        coverStage.style.setProperty('--tab-shift-y', `${y * 10}px`);
      });
    });

    coverStage.addEventListener('pointerleave', () => {
      window.clearTimeout(trackingTimer);
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      trackingReady = false;
      coverStage.classList.remove('is-tracking');
      ['--cover-shift-x','--cover-shift-y','--cover-tilt-x','--cover-tilt-y','--tab-shift-x','--tab-shift-y'].forEach(property => coverStage.style.removeProperty(property));
    });
  }

  const modal = document.getElementById('articleModal');
  const modalContent = document.getElementById('articleContent');
  let returnFocus = null;

  function articleCard(article) {
    return `<article class="article-card" tabindex="0" role="button" data-article="${article.id}" aria-label="Read ${article.title}">
      <img class="article-thumb" src="${article.image}" alt="" loading="lazy"><div class="article-card-copy"><span class="meta">${article.category}</span><h3>${article.title}</h3><p>${article.dek}</p><span class="read-more">Read story &nbsp;&rarr;</span></div>
    </article>`;
  }

  document.querySelectorAll('[data-article-grid]').forEach(grid => {
    const limit = Number(grid.dataset.limit || content.articles.length);
    grid.innerHTML = content.articles.slice(0, limit).map(articleCard).join('');
  });

  function openArticle(id, trigger) {
    const article = content.articles.find(item => item.id === id);
    if (!article || !modal) return;
    returnFocus = trigger;
    modalContent.innerHTML = `<div class="article-image article-image-${article.id}"><img src="${article.image}" alt="Featured image for ${article.title}"></div>
      <div class="article-copy"><span class="category">${article.category}</span><h2 id="articleTitle">${article.title}</h2><p class="dek">${article.dek}</p><div class="byline">${article.byline}</div><div class="body">${article.body.map(p => `<p>${p}</p>`).join('')}</div></div>`;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    history.replaceState(null,'',`#article=${id}`);
    modal.querySelector('.modal-close').focus();
  }

  function closeArticle() {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
    if (location.hash.startsWith('#article=')) history.replaceState(null,'',location.pathname + location.search);
    if (returnFocus) returnFocus.focus();
  }

  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-article]');
    if (trigger) openArticle(trigger.dataset.article, trigger);
    if (e.target.closest('[data-close-modal]')) closeArticle();
  });
  document.addEventListener('keydown', e => {
    const trigger = e.target.closest && e.target.closest('[data-article]');
    if (trigger && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openArticle(trigger.dataset.article, trigger); }
    if (e.key === 'Escape' && modal?.classList.contains('open')) closeArticle();
  });

  const requested = location.hash.match(/^#article=(.+)$/);
  if (requested) openArticle(requested[1], null);
})();
