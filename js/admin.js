/* ==========================================================================
   RAÍZES DE AFETO - PAINEL ADMINISTRATIVO
   ========================================================================== */

let mediaItems = [];
let categoryItems = [];

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth();
  injectToastStyles();
  loadSolicitacoes();
  loadCategorias();
  loadMedia();
  loadTitles();
  loadConfig();
  renderAdminCollections();
});

/* ==========================================================================
   AUTENTICAÇÃO — protege o painel: sem sessão válida, volta para login.html
   ========================================================================== */
async function requireAuth() {
  if (!supabaseClient) {
    console.warn('Supabase não configurado — não é possível validar a sessão.');
    return;
  }
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return;
    }
    const userLabel = document.getElementById('admin-user-label');
    if (userLabel && session.user) userLabel.textContent = session.user.email;
  } catch (err) {
    console.error('Erro ao validar sessão:', err);
    window.location.href = 'login.html';
  }
}

async function logoutAdmin() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
}

/* ==========================================================================
   FEEDBACK VISUAL (toasts) — Salvando... / Salvo com sucesso! / Erro
   ========================================================================== */
function injectToastStyles() {
  if (document.getElementById('raizes-toast-style')) return;
  const style = document.createElement('style');
  style.id = 'raizes-toast-style';
  style.innerHTML = `
    #raizes-toast-container { position: fixed; top: 20px; right: 20px; z-index: 99999; display:flex; flex-direction:column; gap:10px; }
    .raizes-toast { padding: 12px 18px; border-radius: 8px; font-size: 0.9rem; color:#fff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); opacity:0; transform: translateY(-10px); transition: all 0.25s ease; }
    .raizes-toast.show { opacity:1; transform: translateY(0); }
    .raizes-toast.info { background:#8a7967; }
    .raizes-toast.success { background:#3e8e5a; }
    .raizes-toast.error { background:#c62828; }
  `;
  document.head.appendChild(style);

  if (!document.getElementById('raizes-toast-container')) {
    const container = document.createElement('div');
    container.id = 'raizes-toast-container';
    document.body.appendChild(container);
  }
}

function showToast(message, type = 'info', duration = 3000) {
  injectToastStyles();
  const container = document.getElementById('raizes-toast-container');
  const toast = document.createElement('div');
  toast.className = `raizes-toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
  return toast;
}

/* ==========================================================================
   NAVEGAÇÃO ENTRE ABAS
   ========================================================================== */
function switchTab(tabKey, evt) {
  document.querySelectorAll('.admin-menu-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');

  const selectedTab = document.getElementById(`tab-${tabKey}`);
  if (selectedTab) selectedTab.style.display = 'block';

  const clickedEl = (evt && evt.currentTarget) || window.event?.currentTarget;
  if (clickedEl) clickedEl.classList.add('active');

  // Recarrega dados relevantes ao entrar na aba, garantindo que o painel
  // sempre mostre o estado mais atual do Supabase.
  if (tabKey === 'colecoes') renderAdminCollections();
  if (tabKey === 'categorias') loadCategorias();
  if (tabKey === 'midia') loadMedia();
}

/* === 1. SOLICITAÇÕES DE ORÇAMENTO === */
async function loadSolicitacoes() {
  const list = document.getElementById('list-solicitacoes');
  if (!list) return;

  let requests = [];
  if (supabaseClient) {
    const { data, error } = await supabaseClient.from('requests').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao carregar solicitações:', error);
      showToast('Não foi possível carregar as solicitações.', 'error');
    }
    requests = data || [];
  } else {
    requests = window.defaultSiteData?.requests || [];
  }

  document.getElementById('count-nova').textContent = requests.filter(r => r.status === 'Nova').length;
  document.getElementById('count-analise').textContent = requests.filter(r => r.status === 'Em análise').length;
  document.getElementById('count-respondida').textContent = requests.filter(r => r.status === 'Respondida').length;
  document.getElementById('count-concluida').textContent = requests.filter(r => r.status === 'Concluída').length;

  window._allRequests = requests;
  renderRequestsTable(requests);

  const searchInput = document.getElementById('req-search');
  const statusFilter = document.getElementById('req-filter-status');
  const applyFilters = () => {
    const term = (searchInput.value || '').toLowerCase();
    const status = statusFilter.value;
    const filtered = requests.filter(r => {
      const matchesTerm = !term || [r.name, r.email, r.whatsapp].some(v => (v || '').toLowerCase().includes(term));
      const matchesStatus = !status || r.status === status;
      return matchesTerm && matchesStatus;
    });
    renderRequestsTable(filtered);
  };
  searchInput.oninput = applyFilters;
  statusFilter.onchange = applyFilters;
}

function renderRequestsTable(requests) {
  const list = document.getElementById('list-solicitacoes');
  if (requests.length === 0) {
    list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhuma solicitação encontrada.</td></tr>';
    return;
  }

  list.innerHTML = requests.map(req => {
    const cleanPhone = req.whatsapp ? req.whatsapp.replace(/\D/g, '') : '';
    const safeMessage = (req.message || '').replace(/'/g, "\\'").replace(/\n/g, ' ');
    return `
      <tr>
        <td><strong>${req.name || ''}</strong><br><small>${req.city || ''}</small></td>
        <td>
          <button type="button" onclick="navigator.clipboard.writeText('${req.email || ''}'); showToast('E-mail copiado!','success')">Copiar E-mail</button>
          ${cleanPhone ? `<button type="button" onclick="window.open('https://wa.me/${cleanPhone}', '_blank')">WhatsApp</button>` : ''}
        </td>
        <td>${req.event_type || 'Evento'} - ${req.event_date || 'Data N/I'}</td>
        <td>
          <select onchange="updateStatus('${req.id}', this.value)">
            <option value="Nova" ${req.status === 'Nova' ? 'selected' : ''}>Nova</option>
            <option value="Em análise" ${req.status === 'Em análise' ? 'selected' : ''}>Em análise</option>
            <option value="Respondida" ${req.status === 'Respondida' ? 'selected' : ''}>Respondida</option>
            <option value="Concluída" ${req.status === 'Concluída' ? 'selected' : ''}>Concluída</option>
          </select>
        </td>
        <td><button type="button" class="btn-secondary" onclick="alert('${safeMessage}')">Ver Mensagem</button></td>
      </tr>
    `;
  }).join('');
}

async function updateStatus(id, newStatus) {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.from('requests').update({ status: newStatus }).eq('id', id);
  if (error) {
    showToast('Não foi possível atualizar o status.', 'error');
  } else {
    showToast('Status atualizado!', 'success');
  }
  loadSolicitacoes();
}

/* === 2. GESTÃO DE IMAGENS E MÍDIA === */
async function loadMedia() {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.from('media_library').select('*').order('created_at', { ascending: false });
    if (error) console.error('Erro ao carregar mídia:', error);
    mediaItems = data || [];
  } else {
    mediaItems = window.defaultSiteData?.media_library || [];
  }
  populateMediaCategoryFilters();
  renderMediaGrid(mediaItems);
}

function populateMediaCategoryFilters() {
  const filterSelect = document.getElementById('media-filter-category');
  const uploadSelect = document.getElementById('upload-category');
  const options = categoryItems.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  if (filterSelect) {
    filterSelect.innerHTML = '<option value="">Todas as categorias</option>' + options;
  }
  if (uploadSelect) {
    uploadSelect.innerHTML = '<option value="">Sem categoria</option>' + options;
  }
}

function filterMedia() {
  const term = (document.getElementById('media-search')?.value || '').toLowerCase();
  const categoryId = document.getElementById('media-filter-category')?.value || '';

  const filtered = mediaItems.filter(item => {
    const name = (item.file_name || item.filename || '').toLowerCase();
    const caption = (item.caption || '').toLowerCase();
    const matchesTerm = !term || name.includes(term) || caption.includes(term);
    const matchesCategory = !categoryId || String(item.category_id) === String(categoryId);
    return matchesTerm && matchesCategory;
  });

  renderMediaGrid(filtered);
}

function renderMediaGrid(items) {
  const container = document.getElementById('media-container');
  if (!container) return;

  if (!items || items.length === 0) {
    container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px;">Nenhuma imagem cadastrada na biblioteca.</div>';
    return;
  }

  container.innerHTML = items.map(img => {
    const name = img.file_name || img.filename || 'imagem';
    const sizeKb = img.file_size ? (img.file_size / 1024).toFixed(1) : '—';
    return `
    <div class="media-card">
      <img src="${img.public_url}" alt="${img.alt_text || name}" loading="lazy">
      <div class="media-card-body">
        <strong>${name}</strong><br>
        <small>${sizeKb} KB</small>
        <div style="margin-top:8px; display:flex; gap:4px; flex-wrap:wrap;">
          <button type="button" onclick="navigator.clipboard.writeText('${img.public_url}'); showToast('URL copiada!','success')">URL</button>
          <button type="button" onclick="deleteMedia('${img.id}', '${img.storage_path}')" style="color:red;">Excluir</button>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

function openUploadModal() {
  document.getElementById('form-upload-media').reset();
  document.getElementById('upload-preview-container').style.display = 'none';
  document.getElementById('modal-upload').style.display = 'flex';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function previewUploadImage(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById('upload-preview-img').src = e.target.result;
      document.getElementById('upload-preview-container').style.display = 'block';
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function handleUploadMedia(event) {
  event.preventDefault();
  const fileInput = document.getElementById('upload-file');
  const file = fileInput.files[0];
  if (!file) return;

  if (!supabaseClient) {
    showToast('Supabase não configurado.', 'error');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast('A imagem excede o limite de 5MB.', 'error');
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const toast = showToast('Salvando...', 'info', 60000);

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage.from('site-media').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseClient.storage.from('site-media').getPublicUrl(filePath);

    const categoryId = document.getElementById('upload-category').value || null;

    const { error: dbError } = await supabaseClient.from('media_library').insert([{
      file_name: file.name,
      storage_path: filePath,
      public_url: publicUrlData.publicUrl,
      file_size: file.size,
      mime_type: file.type,
      alt_text: document.getElementById('upload-alt').value,
      caption: document.getElementById('upload-caption').value,
      category_id: categoryId
    }]);
    if (dbError) throw dbError;

    toast.remove();
    showToast('Imagem enviada com sucesso!', 'success');
    closeModal('modal-upload');
    loadMedia();
  } catch (err) {
    console.error('Erro no upload:', err);
    toast.remove();
    showToast('Não foi possível enviar a imagem. Verifique sua conexão e tente novamente.', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

async function deleteMedia(id, path) {
  if (!confirm('Tem certeza que deseja remover esta imagem?')) return;
  if (!supabaseClient) return;

  try {
    // Verifica se a imagem está vinculada a alguma coleção antes de excluir
    const { data: collections } = await supabaseClient.from('collections').select('title').eq('cover_image_id', id);
    if (collections && collections.length > 0) {
      showToast(`Não é possível excluir: a imagem está vinculada à coleção "${collections[0].title}".`, 'error', 5000);
      return;
    }
  } catch (e) {
    // A tabela pode não usar cover_image_id — segue normalmente
  }

  const { error: dbError } = await supabaseClient.from('media_library').delete().eq('id', id);
  if (dbError) {
    showToast('Não foi possível excluir este item.', 'error');
    return;
  }

  if (path) {
    await supabaseClient.storage.from('site-media').remove([path]);
  }

  showToast('Imagem excluída com sucesso!', 'success');
  loadMedia();
}

/* === 3. GESTÃO DE CATEGORIAS === */
async function loadCategorias() {
  if (supabaseClient) {
    const { data, error } = await supabaseClient.from('categories').select('*').order('display_order', { ascending: true });
    if (error) console.error('Erro ao carregar categorias:', error);
    categoryItems = data || [];
  } else {
    categoryItems = window.defaultSiteData?.categories || [];
  }

  const list = document.getElementById('list-categorias');
  if (list) {
    if (categoryItems.length === 0) {
      list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Nenhuma categoria cadastrada.</td></tr>';
    } else {
      list.innerHTML = categoryItems.map(cat => `
        <tr>
          <td>${cat.display_order ?? '-'}</td>
          <td><strong>${cat.name}</strong></td>
          <td><code>${cat.slug || ''}</code></td>
          <td>${cat.active ? 'Ativo' : 'Inativo'}</td>
          <td style="display:flex; gap:4px; flex-wrap:wrap;">
            <button type="button" onclick='editCategory(${JSON.stringify(cat).replace(/'/g, "&#39;")})'>Editar</button>
            <button type="button" onclick="toggleCategory('${cat.id}', ${!cat.active})">${cat.active ? 'Desativar' : 'Ativar'}</button>
            <button type="button" style="color:red;" onclick="deleteCategory('${cat.id}')">Excluir</button>
          </td>
        </tr>
      `).join('');
    }
  }

  populateMediaCategoryFilters();
}

function slugify(text) {
  return (text || '')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function openCategoryModal() {
  document.getElementById('form-category').reset();
  document.getElementById('cat-id').value = '';
  document.getElementById('modal-category-title').textContent = 'Nova Categoria';
  document.getElementById('modal-category').style.display = 'flex';
}

function editCategory(cat) {
  document.getElementById('cat-id').value = cat.id;
  document.getElementById('cat-name').value = cat.name || '';
  document.getElementById('cat-slug').value = cat.slug || '';
  document.getElementById('cat-description').value = cat.description || '';
  document.getElementById('cat-image-url').value = cat.image_url || '';
  document.getElementById('cat-order').value = cat.display_order ?? '';
  document.getElementById('cat-active').checked = cat.active !== false;

  document.getElementById('modal-category-title').textContent = 'Editar Categoria';
  document.getElementById('modal-category').style.display = 'flex';
}

async function handleSaveCategory(event) {
  event.preventDefault();
  if (!supabaseClient) {
    showToast('Supabase não configurado.', 'error');
    return;
  }

  const id = document.getElementById('cat-id').value;
  const name = document.getElementById('cat-name').value.trim();
  let slug = document.getElementById('cat-slug').value.trim();
  if (!slug) slug = slugify(name);

  const payload = {
    name,
    slug,
    description: document.getElementById('cat-description').value,
    image_url: document.getElementById('cat-image-url').value,
    display_order: parseInt(document.getElementById('cat-order').value, 10) || 0,
    active: document.getElementById('cat-active').checked
  };

  const toast = showToast('Salvando...', 'info', 60000);
  try {
    const { error } = id
      ? await supabaseClient.from('categories').update(payload).eq('id', id)
      : await supabaseClient.from('categories').insert([payload]);

    if (error) throw error;

    toast.remove();
    showToast('Categoria salva com sucesso!', 'success');
    closeModal('modal-category');
    loadCategorias();
  } catch (err) {
    console.error('Erro ao salvar categoria:', err);
    toast.remove();
    showToast('Não foi possível salvar a categoria.', 'error');
  }
}

async function toggleCategory(id, newActiveState) {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.from('categories').update({ active: newActiveState }).eq('id', id);
  if (error) {
    showToast('Não foi possível atualizar a categoria.', 'error');
  } else {
    showToast('Categoria atualizada!', 'success');
  }
  loadCategorias();
}

async function deleteCategory(id) {
  if (!confirm('Deseja realmente excluir esta categoria? Essa ação não pode ser desfeita.')) return;
  if (!supabaseClient) return;

  try {
    // Verifica se existem imagens vinculadas a essa categoria antes de excluir
    const { data: linkedMedia } = await supabaseClient.from('media_library').select('id').eq('category_id', id);
    if (linkedMedia && linkedMedia.length > 0) {
      const proceed = confirm(`Existem ${linkedMedia.length} imagem(ns) vinculada(s) a esta categoria. As imagens NÃO serão excluídas, apenas perderão a categoria. Deseja continuar?`);
      if (!proceed) return;
      await supabaseClient.from('media_library').update({ category_id: null }).eq('category_id', id);
    }

    const { error } = await supabaseClient.from('categories').delete().eq('id', id);
    if (error) throw error;

    showToast('Categoria excluída com sucesso!', 'success');
    loadCategorias();
  } catch (err) {
    console.error('Erro ao excluir categoria:', err);
    showToast('Não foi possível excluir este item.', 'error');
  }
}

/* === 4. TÍTULOS E CONTEÚDOS === */
async function loadTitles() {
  let titles = [];
  if (supabaseClient) {
    const { data, error } = await supabaseClient.from('content_titles').select('*');
    if (error) console.error('Erro ao carregar conteúdos:', error);
    titles = data || [];
  }
  const container = document.getElementById('content-titles-list');
  if (!container) return;

  if (titles.length === 0) {
    container.innerHTML = '<p>Nenhum título cadastrado.</p>';
    return;
  }

  container.innerHTML = titles.map(t => `
    <div class="card-panel">
      <h3>${t.content_key} ${t.page ? `(${t.page})` : ''}</h3>
      <input type="text" value="${t.title || ''}" id="title-${t.id}" style="width:100%; padding:8px; margin-bottom:8px;">
      <textarea id="desc-${t.id}" style="width:100%; padding:8px;">${t.description || ''}</textarea>
      <button type="button" class="btn-primary" style="margin-top:8px;" onclick="saveTitle('${t.id}')">Salvar</button>
    </div>
  `).join('');
}

async function saveTitle(id) {
  const newTitle = document.getElementById(`title-${id}`).value;
  const newDesc = document.getElementById(`desc-${id}`).value;
  if (!supabaseClient) return;

  const toast = showToast('Salvando...', 'info', 60000);
  const { error } = await supabaseClient.from('content_titles').update({ title: newTitle, description: newDesc }).eq('id', id);
  toast.remove();
  if (error) {
    showToast('Não foi possível salvar.', 'error');
  } else {
    showToast('Salvo com sucesso!', 'success');
  }
}

/* === 5. CONFIGURAÇÃO DE WHATSAPP (tabela site_settings: key/value) === */
async function loadConfig() {
  if (!supabaseClient) return;
  const { data } = await supabaseClient.from('site_settings').select('value').eq('key', 'whatsapp_number').single();
  if (data) document.getElementById('cfg-whatsapp').value = data.value;
}

async function saveWhatsAppConfig() {
  const val = document.getElementById('cfg-whatsapp').value.replace(/\D/g, '');
  if (!supabaseClient) {
    showToast('Supabase não configurado.', 'error');
    return;
  }

  const toast = showToast('Salvando...', 'info', 60000);
  const { error } = await supabaseClient.from('site_settings').upsert({ key: 'whatsapp_number', value: val }, { onConflict: 'key' });
  toast.remove();
  if (error) {
    showToast('Não foi possível salvar.', 'error');
  } else {
    showToast('WhatsApp salvo com sucesso!', 'success');
  }
}

/* === 6. GESTÃO DE COLEÇÕES E PREÇOS === */
async function renderAdminCollections() {
  const tbody = document.getElementById('list-colecoes-admin');
  if (!tbody || !supabaseClient) return;

  tbody.innerHTML = '<tr><td colspan="6">Carregando coleções...</td></tr>';

  const { data: collections, error } = await supabaseClient
    .from('collections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="6">Erro ao carregar: ${error.message}</td></tr>`;
    return;
  }

  if (!collections || collections.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">Nenhuma coleção cadastrada.</td></tr>';
    return;
  }

  tbody.innerHTML = collections.map(col => `
    <tr>
      <td><img src="${col.cover_image_url || 'assets/images/collection-placeholder.jpg'}" style="width:50px; height:50px; object-fit:cover; border-radius:6px;"></td>
      <td><strong>${col.title}</strong></td>
      <td>${col.style || '-'}</td>
      <td>${formatCurrency(col.price)}</td>
      <td><span class="badge ${col.active === false ? 'badge-inactive' : 'badge-active'}">${col.active === false ? 'Inativa' : 'Ativa'}</span></td>
      <td>
        <button type="button" class="btn-sm" onclick='editCollection(${JSON.stringify(col).replace(/'/g, "&#39;")})'>Editar</button>
        <button type="button" class="btn-sm" onclick="toggleCollectionActive('${col.id}', ${col.active === false})">${col.active === false ? 'Ativar' : 'Desativar'}</button>
        <button type="button" class="btn-sm btn-danger" onclick="deleteCollection('${col.id}')">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function openCollectionModal() {
  document.getElementById('form-collection').reset();
  document.getElementById('col-id').value = '';
  document.getElementById('modal-collection-title').textContent = 'Nova Coleção';
  document.getElementById('modal-collection').style.display = 'flex';
}

function editCollection(col) {
  document.getElementById('col-id').value = col.id;
  document.getElementById('col-title').value = col.title || '';
  document.getElementById('col-style').value = col.style || '';
  document.getElementById('col-price').value = col.price || '';
  document.getElementById('col-description').value = col.description || '';
  document.getElementById('col-image-url').value = col.cover_image_url || '';

  document.getElementById('modal-collection-title').textContent = 'Editar Coleção';
  document.getElementById('modal-collection').style.display = 'flex';
}

async function handleSaveCollection(e) {
  e.preventDefault();
  if (!supabaseClient) {
    showToast('Supabase não configurado.', 'error');
    return;
  }

  const id = document.getElementById('col-id').value;
  const payload = {
    title: document.getElementById('col-title').value,
    style: document.getElementById('col-style').value,
    price: parseFloat(document.getElementById('col-price').value) || 0,
    description: document.getElementById('col-description').value,
    cover_image_url: document.getElementById('col-image-url').value,
    active: true,
    display_order: 0
  };

  const toast = showToast('Salvando...', 'info', 60000);
  const res = id
    ? await supabaseClient.from('collections').update(payload).eq('id', id)
    : await supabaseClient.from('collections').insert([payload]);
  toast.remove();

  if (res.error) {
    console.error('Erro ao salvar coleção:', res.error);
    showToast('Não foi possível salvar a coleção.', 'error');
  } else {
    showToast('Coleção salva com sucesso! O preço já está refletido no site público.', 'success');
    closeModal('modal-collection');
    renderAdminCollections();
  }
}

async function toggleCollectionActive(id, newActiveState) {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.from('collections').update({ active: newActiveState }).eq('id', id);
  if (error) {
    showToast('Não foi possível atualizar a coleção.', 'error');
  } else {
    showToast('Coleção atualizada!', 'success');
  }
  renderAdminCollections();
}

async function deleteCollection(id) {
  if (!confirm('Deseja realmente excluir esta coleção?')) return;
  if (!supabaseClient) return;

  const { error } = await supabaseClient.from('collections').delete().eq('id', id);
  if (error) {
    console.error('Erro ao excluir coleção:', error);
    showToast('Não foi possível excluir este item.', 'error');
  } else {
    showToast('Coleção excluída com sucesso!', 'success');
    renderAdminCollections();
  }
}
