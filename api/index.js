const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase com variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido. Use POST.' });
  }

  try {
    const body = req.body;

    // Verifica se vem estrutura de evento da Kiwify
    const ticket = body?.event_tickets?.[0];
    if (!ticket || !ticket.email || !ticket.name) {
      return res.status(400).json({ message: 'Dados incompletos no webhook.' });
    }

    const nome = ticket.name;
    const email = ticket.email;

    // Insere no Supabase (tabela "profiles")
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ nome, email }]);

    if (error) {
      return res.status(500).json({ message: 'Erro ao inserir no Supabase.', error });
    }

    return res.status(200).json({ message: 'Usuário inserido com sucesso.', data });
//
  } catch (err) {
    return res.status(500).json({ message: 'Erro interno.', error: err.message });
  }
};

