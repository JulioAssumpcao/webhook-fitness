import { createClient } from '@supabase/supabase-js';

// Variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zdwipxnczcikgretwkum.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'seu_service_role_key_aqui';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { nome, email } = req.body;

    // Verificar se nome e email foram enviados
    if (!nome || !email) {
      console.log('Erro: nome ou email faltando', { nome, email });
      return res.status(400).json({ message: 'Nome e email são obrigatórios.' });
    }

    try {
      // Inserir os dados na tabela "profiles" do Supabase sem o campo 'id'
      const { data, error } = await supabase
        .from('profiles')
        .insert([{ nome: nome, email: email }]);

      if (error) {
        console.log('Erro ao inserir no Supabase', error);
        return res.status(500).json({ message: 'Erro ao adicionar usuário: ' + error.message });
      }

      console.log('Usuário inserido com sucesso', data);
      return res.status(200).json({ message: 'Usuário adicionado com sucesso!', data });
    } catch (err) {
      console.log('Erro ao processar a requisição:', err);
      return res.status(500).json({ message: 'Erro ao processar a requisição: ' + err.message });
    }
  } else {
    return res.status(405).json({ message: 'Método não permitido. Use POST.' });
  }
};
