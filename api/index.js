import { createClient } from '@supabase/supabase-js';

// Variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zdwipxnczcikgretwkum.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkd2lweG5jemNpa2dyZXR3a3VtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzAwMzM4NSwiZXhwIjoyMDYyNTc5Mzg1fQ.LvjiTobeUKN0gXEIsowFapJjurIbN0zs97R8qrkcXx4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async (req, res) => {
  // Certificando-se de que é uma requisição POST
  if (req.method === 'POST') {
    const { nome, email } = req.body;

    // Logando os dados recebidos
    console.log('Dados recebidos:', req.body);

    // Verificar se nome e email foram enviados
    if (!nome || !email) {
      console.error('Erro: Nome e email são obrigatórios');
      return res.status(400).json({ message: 'Nome e email são obrigatórios.' });
    }

    try {
      // Inserir os dados na tabela "profiles" do Supabase
      const { data, error } = await supabase
        .from('profiles')
        .insert([{ nome: nome, email: email }]);

      if (error) {
        console.error('Erro ao inserir no Supabase:', error.message);
        return res.status(500).json({ message: 'Erro ao adicionar usuário: ' + error.message });
      }

      return res.status(200).json({ message: 'Usuário adicionado com sucesso!', data });
    } catch (err) {
      console.error('Erro inesperado ao processar a requisição:', err.message);
      return res.status(500).json({ message: 'Erro ao processar a requisição: ' + err.message });
    }
  } else {
    console.error('Método não permitido:', req.method);
    return res.status(405).json({ message: 'Método não permitido. Use POST.' });
  }
};
