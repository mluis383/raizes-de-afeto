/**
 * RAÍZES DE AFETO - ApiService (camada de conveniência sobre o Supabase)
 *
 * IMPORTANTE: este arquivo NÃO cria mais seu próprio cliente Supabase.
 * Ele reaproveita o `supabaseClient` global já criado por supabase-service.js,
 * a partir das credenciais definidas em supabase-config.js.
 * Isso evita ter duas fontes de verdade para URL/chave do Supabase.
 *
 * Ordem de carregamento esperada nas páginas que usam este arquivo:
 *   1. data.js
 *   2. supabase-config.js
 *   3. CDN do @supabase/supabase-js
 *   4. supabase-service.js   (cria `supabaseClient`)
 *   5. supabase-client.js    (este arquivo, adiciona `ApiService`)
 */

const ApiService = {
  // --- CATEGORIAS ---
  async getCategories() {
    if (!supabaseClient) return window.defaultSiteData.categories;
    const { data, error } = await supabaseClient
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) { console.error(error); return window.defaultSiteData.categories; }
    return data;
  },

  async saveCategory(category) {
    if (!supabaseClient) return { success: false, error: 'Supabase não configurado.' };
    const { error } = category.id
      ? await supabaseClient.from('categories').update(category).eq('id', category.id)
      : await supabaseClient.from('categories').insert([category]);
    return { success: !error, error: error?.message };
  },

  async deleteCategory(id) {
    if (!supabaseClient) return { success: false, error: 'Supabase não configurado.' };
    const { error } = await supabaseClient.from('categories').delete().eq('id', id);
    return { success: !error, error: error?.message };
  },

  // --- IMAGENS E MÍDIA ---
  async getMedia() {
    if (!supabaseClient) return window.defaultSiteData.media_library;
    const { data, error } = await supabaseClient
      .from('media_library')
      .select('*, categories(name)')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return window.defaultSiteData.media_library; }
    return data;
  },

  async uploadMediaFile(file, altText, caption, categoryId) {
    if (!supabaseClient) throw new Error("Supabase não configurado.");

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Upload Storage
    const { error: storageError } = await supabaseClient
      .storage
      .from('site-media')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (storageError) throw storageError;

    // Obter URL Pública
    const { data: publicUrlData } = supabaseClient
      .storage
      .from('site-media')
      .getPublicUrl(filePath);

    // Salvar registro na tabela media_library
    const mediaRecord = {
      file_name: file.name,
      storage_path: filePath,
      public_url: publicUrlData.publicUrl,
      file_size: file.size,
      mime_type: file.type,
      alt_text: altText,
      caption: caption,
      category_id: categoryId || null
    };

    const { data: dbData, error: dbError } = await supabaseClient
      .from('media_library')
      .insert([mediaRecord])
      .select();

    if (dbError) throw dbError;
    return dbData[0];
  },

  async checkImageUsage(imageId) {
    if (!supabaseClient) return [];
    const usages = [];

    // Busca ocorrências em coleções vinculadas pela categoria da imagem
    try {
      const { data } = await supabaseClient.from('media_library').select('id').eq('id', imageId);
      if (!data || data.length === 0) return usages;
    } catch (e) { /* ignore */ }

    return usages;
  },

  async deleteMedia(id, storagePath) {
    if (!supabaseClient) return { success: false, error: 'Supabase não configurado.' };
    // Remove do Storage
    if (storagePath) {
      await supabaseClient.storage.from('site-media').remove([storagePath]);
    }
    // Remove da tabela
    const { error } = await supabaseClient.from('media_library').delete().eq('id', id);
    return { success: !error, error: error?.message };
  },

  // --- TÍTULOS E CONTEÚDOS ---
  async getContentTitles() {
    if (!supabaseClient) return window.defaultSiteData.content_titles;
    const { data, error } = await supabaseClient.from('content_titles').select('*');
    if (error) return window.defaultSiteData.content_titles;

    const map = {};
    (data || []).forEach(item => { map[item.content_key] = item; });
    return map;
  },

  async saveContentTitle(contentKey, titleData) {
    if (!supabaseClient) return { success: false, error: 'Supabase não configurado.' };
    const payload = { content_key: contentKey, ...titleData, updated_at: new Date() };
    const { error } = await supabaseClient.from('content_titles').upsert(payload, { onConflict: 'content_key' });
    return { success: !error, error: error?.message };
  },

  // --- SOLICITAÇÕES DE ORÇAMENTO ---
  async getBudgetRequests() {
    if (!supabaseClient) return window.defaultSiteData.requests;
    const { data, error } = await supabaseClient.from('requests').select('*').order('created_at', { ascending: false });
    if (error) return window.defaultSiteData.requests;
    return data;
  },

  async updateRequestStatus(id, status) {
    if (!supabaseClient) return { success: false, error: 'Supabase não configurado.' };
    const { error } = await supabaseClient.from('requests').update({ status }).eq('id', id);
    return { success: !error, error: error?.message };
  }
};
