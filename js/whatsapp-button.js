/**
 * RAÍZES DE AFETO - Botão Flutuante de WhatsApp
 */
(async function initWhatsAppButton() {
  const titles = await ApiService.getContentTitles();
  const config = titles.whatsapp_config;

  if (!config || !config.title || config.title.trim() === '') {
    return; // Oculta caso o número não esteja configurado
  }

  const phone = config.title.replace(/\D/g, '');
  const label = config.subtitle || 'Fale conosco';

  const btn = document.createElement('a');
  btn.className = 'whatsapp-float-btn';
  btn.href = `https://wa.me/${phone}`;
  btn.target = '_blank';
  btn.rel = 'noopener noreferrer';
  btn.setAttribute('aria-label', label);

  // SVG do Ícone do WhatsApp estilizado na cor da marca
  btn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.332 5.001L2 22l5.124-1.334c1.472.802 3.13 1.224 4.881 1.225h.005c5.505 0 9.988-4.478 9.989-9.985 0-2.666-1.037-5.172-2.925-7.059C17.185 2.96 14.678 2 12.012 2zm0 18.258h-.004c-1.492 0-2.955-.4-4.229-1.157l-.303-.18-3.14.818.837-3.052-.197-.311c-.833-1.326-1.273-2.868-1.273-4.452 0-4.542 3.697-8.239 8.242-8.239 2.2 0 4.268.857 5.824 2.413A8.196 8.196 0 0120.25 11.98c0 4.543-3.696 8.278-8.238 8.278z"/>
    </svg>
    <span>${label}</span>
  `;

  document.body.appendChild(btn);
})();