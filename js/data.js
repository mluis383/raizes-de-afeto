/* ==========================================================================
   RAÍZES DE AFETO - DADOS BASE / FALLBACKS
   ========================================================================== */

// Fallback de segurança: usado apenas se o Supabase estiver indisponível.
// Mantido vazio de propósito — o site NUNCA deve fingir ter dados reais.
// Isso evita "ReferenceError" em supabase-service.js / supabase-client.js / admin.js
// quando o Supabase não responde, sem inventar conteúdo falso.
window.defaultSiteData = window.defaultSiteData || {
  collections: [],
  portfolio_items: [],
  categories: [],
  media_library: [],
  content_titles: [],
  budget_requests: [],
  requests: [],
  settings: {}
};

// Compatibilidade com nomes usados em outros arquivos legados do projeto
window.RAIZES_DATA = window.RAIZES_DATA || window.defaultSiteData;
window.siteData = window.siteData || window.defaultSiteData;

// Formatação de valores monetários
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'Sob consulta';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(parseFloat(value));
}

// Animações de entrada no Scroll
// IMPORTANTE: toda página que usa a classe "animate-on-scroll" precisa
// carregar este arquivo (data.js), senão o conteúdo permanece com
// opacity:0 (definido no CSS) para sempre, porque a classe "is-visible"
// nunca é adicionada.
document.addEventListener('DOMContentLoaded', () => {
  const animatedEls = document.querySelectorAll('.animate-on-scroll');
  if (!animatedEls.length) return;

  // Se o navegador não suportar IntersectionObserver, revela tudo direto
  // para o conteúdo nunca ficar invisível por causa de uma animação.
  if (!('IntersectionObserver' in window)) {
    animatedEls.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animatedEls.forEach(el => observer.observe(el));

  // Rede de segurança: se por qualquer motivo (CSS ainda carregando, erro
  // de layout, elemento fora da viewport, etc.) o elemento nunca disparar
  // o observer, garante que ele apareça mesmo assim após um curto período.
  setTimeout(() => {
    animatedEls.forEach(el => el.classList.add('is-visible'));
  }, 2500);
});
