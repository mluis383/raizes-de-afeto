/* ==========================================================================
   RAÍZES DE AFETO - INTEGRAÇÃO SUPABASE / FALLBACK
   ========================================================================== */

let supabaseClient = null;

if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined' && window.supabase) {
  if (SUPABASE_URL !== 'COLE_AQUI_A_URL_DO_SEU_PROJETO') {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
}

/**
 * Busca dados públicos de uma tabela (collections, portfolio_items, categories...).
 * Tenta primeiro a consulta "completa" (filtrando active=true e ordenando por
 * display_order). Se essas colunas não existirem na tabela do usuário, faz um
 * fallback automático para uma busca simples, para nunca esconder dados reais
 * por causa de uma coluna que não existe no schema atual.
 */
async function fetchSiteData(table) {
  const fallback = (window.defaultSiteData && window.defaultSiteData[table]) || [];

  if (!supabaseClient) {
    return fallback;
  }

  // 1ª tentativa: consulta completa (com filtro de ativo e ordenação)
  try {
    const { data, error } = await supabaseClient
      .from(table)
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (!error && data) return data;
    if (error) console.warn(`[Supabase] Consulta completa falhou em "${table}": ${error.message}. Tentando consulta simples...`);
  } catch (err) {
    console.warn(`[Supabase] Erro inesperado na consulta completa de "${table}":`, err.message);
  }

  // 2ª tentativa: consulta simples, sem depender de colunas específicas
  try {
    const { data, error } = await supabaseClient
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) return data;
    if (error) console.warn(`[Supabase] Consulta simples também falhou em "${table}": ${error.message}`);
  } catch (err) {
    console.warn(`[Supabase] Erro inesperado na consulta simples de "${table}":`, err.message);
  }

  return fallback;
}

/**
 * site_settings é uma tabela chave/valor: { key, value }.
 * Esta função lê todas as linhas e monta um objeto { chave: valor },
 * usado tanto pelo botão de WhatsApp quanto pelos textos dinâmicos do site.
 * Esse é o MESMO formato que o painel administrativo grava (ver admin.js -
 * saveWhatsAppConfig), garantindo que o que o admin salva realmente aparece
 * no site público.
 */
async function fetchSettings() {
  const fallback = (window.defaultSiteData && window.defaultSiteData.settings) || {};

  if (!supabaseClient) return fallback;

  try {
    const { data, error } = await supabaseClient.from('site_settings').select('key, value');
    if (error) throw error;

    const settingsMap = { ...fallback };
    (data || []).forEach(row => {
      if (row && row.key) settingsMap[row.key] = row.value;
    });
    return settingsMap;
  } catch (err) {
    console.warn('[Supabase Fallback] Erro ao carregar configurações:', err.message);
    return fallback;
  }
}

/**
 * Grava uma solicitação de orçamento. Usa a tabela "requests", que é a MESMA
 * tabela lida pelo painel administrativo (admin.js -> loadSolicitacoes),
 * garantindo que todo formulário preenchido no site apareça no painel.
 */
async function sendInquiry(formData) {
  // Sanitização básica contra XSS
  const sanitizedData = {};
  for (let key in formData) {
    sanitizedData[key] = String(formData[key] ?? '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  sanitizedData.status = 'Nova';

  if (!supabaseClient) {
    console.log('[Modo Simulado] Formulário enviado:', sanitizedData);
    return { success: true, isFallback: true };
  }

  try {
    const { error } = await supabaseClient.from('requests').insert([sanitizedData]);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error('Erro ao salvar formulário:', err);
    return { success: false, error: err.message };
  }
}
