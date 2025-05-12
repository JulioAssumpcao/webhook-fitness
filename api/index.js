const { createClient } = require('@supabase/supabase-js');

// Variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zdwipxnczcikgretwkum.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'seu_service_role_key_aqui';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  // Certificando-se de que é uma requisição POST
  if (req.method === 'POST') {
    const { nome, email } = req.body;

    // Verificar se nome e email foram enviados
    if (!nome || !email) {
      return res.status(400).json({ message: 'Nome e email são obrigatórios.' });
    }

    try {
      // Inserir os dados na tabela "profiles" do Supabase sem o campo 'id'
      const { data, error } = await supabase
        .from('profiles')
        .insert([{ nome: nome, email: email }]);

      if (error) {
        return res.status(500).json({ message: 'Erro ao adicionar usuário: ' + error.message });
      }

      return res.status(200).json({ message: 'Usuário adicionado com sucesso!', data });
    } catch (err) {
      return res.status(500).json({ message: 'Erro ao processar a requisição: ' + err.message });
    }
  } else {
    return res.status(405).json({ message: 'Método não permitido. Use POST.' });
  }
};
