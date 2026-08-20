/* ==========================================================================
   RAÍZES DE AFETO - SCRIPTS PRINCIPAIS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileMenu();
  loadPageData();
  initLightbox();
  initFloatingWhatsApp();
});

function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

function initMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-menu');

  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', !expanded);
    nav.classList.toggle('active');
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

async function loadPageData() {
  if (typeof fetchSettings !== 'function') return;
  const settings = await fetchSettings();

  // Atualizar hero dinamicamente caso o elemento exista
  const heroTitle = document.getElementById('hero-title');
  if (heroTitle && settings.hero_title) heroTitle.textContent = settings.hero_title;

  const heroDesc = document.getElementById('hero-desc');
  if (heroDesc && settings.hero_description) heroDesc.textContent = settings.hero_description;

  // Atualizar links dinâmicos do rodapé
  const instaLinks = document.querySelectorAll('.instagram-dynamic-link');
  instaLinks.forEach(l => l.href = settings.instagram_url || 'https://www.instagram.com/raizesdeafeto.br/');

  const currentYearSpan = document.getElementById('current-year');
  if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();
}

function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  const closeBtn = lightbox.querySelector('.lightbox-close');
  const lightboxImg = lightbox.querySelector('img');

  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-lightbox]')) {
      lightboxImg.src = e.target.getAttribute('src');
      lightbox.classList.add('active');
    }
  });

  closeBtn?.addEventListener('click', () => lightbox.classList.remove('active'));
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.classList.remove('active');
  });
}

/* ==========================================================================
   BOTÃO FLUTUANTE DE WHATSAPP (número vem do Supabase / site_settings)
   ========================================================================== */
async function initFloatingWhatsApp() {
  // Evita duplicar o botão caso a página já tenha um botão fixo no HTML
  if (document.querySelector('.raizes-whatsapp-btn')) return;

  let whatsappNumber = '5511932212956'; // Fallback padrão (mesmo número já usado no site)

  if (typeof fetchSettings === 'function') {
    try {
      const settings = await fetchSettings();
      if (settings && settings.whatsapp_number) {
        whatsappNumber = settings.whatsapp_number;
      }
    } catch (err) {
      console.warn('Usando número de WhatsApp padrão (fallback).', err);
    }
  }

  const cleanPhone = whatsappNumber.replace(/\D/g, '');
  if (!cleanPhone) return;

  const btnHtml = `
    <a href="https://wa.me/${cleanPhone}" target="_blank" rel="noopener noreferrer" class="raizes-whatsapp-btn" aria-label="Fale conosco pelo WhatsApp">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.758.459 3.474 1.33 4.982L2 22l5.133-1.343c1.459.796 3.101 1.214 4.872 1.215h.004c5.505 0 9.987-4.477 9.988-9.984 0-2.665-1.038-5.172-2.925-7.058C17.187 2.943 14.678 2 12.012 2z"/></svg>
      <span class="raizes-whatsapp-text">Fale Conosco</span>
    </a>
  `;

  document.body.insertAdjacentHTML('beforeend', btnHtml);
}
