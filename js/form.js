/* ==========================================================================
   RAÍZES DE AFETO - PROCESSAMENTO DE FORMULÁRIOS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = form.querySelector('button[type="submit"]');
    const feedback = document.getElementById('form-feedback');

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Enviando...';
    feedback.textContent = '';
    feedback.className = 'form-feedback';

    const formData = {
      name: form.name.value,
      whatsapp: form.whatsapp.value,
      email: form.email.value,
      event_date: form.event_date.value,
      event_type: form.event_type.value,
      interest: form.interest.value,
      guest_count: form.guest_count.value,
      city: form.city.value,
      message: form.message.value
    };

    const res = await sendInquiry(formData);

    if (res.success) {
      feedback.classList.add('success');
      feedback.textContent = res.isFallback 
        ? 'Sua solicitação foi gravada localmente. Para contato direto, acesse nosso Instagram!'
        : 'Sua solicitação foi enviada com sucesso! Em breve entraremos em contato.';
      form.reset();
    } else {
      feedback.classList.add('error');
      feedback.textContent = 'Erro ao enviar mensagem. Por favor, tente novamente ou entre em contato pelo Instagram.';
    }

    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Solicitar Orçamento';
  });
});