import { createClient } from '@supabase/supabase-js';

// Variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zdwipxnczcikgretwkum.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkd2lweG5jemNpa2dyZXR3a3VtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzAwMzM4NSwiZXhwIjoyMDYyNTc5Mzg1fQ.LvjiTobeUKN0gXEIsowFapJjurIbN0zs97R8qrkcXx4';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async (req, res) => {
  // Certificando-se de que é uma requisição POST
  if (req.method === 'POST') {
    // Pegando os tickets do evento
    const { event_tickets } = req.body;

    // Verificando se o array de tickets existe e contém ao menos um ticket
    if (!event_tickets || event_tickets.length === 0) {
      return res.status(400).json({ message: 'Não foram encontrados tickets no evento.' });
    }

    // Percorrendo os tickets e inserindo no Supabase
    try {
      // Inserir os dados dos tickets na tabela "profiles" do Supabase
      for (const ticket of event_tickets) {
        const { name, email } = ticket;

        // Verificar se o nome e o email existem para cada ticket
        if (!name || !email) {
          return res.status(400).json({ message: 'Nome e email são obrigatórios para cada ticket.' });
        }

        // Inserir no banco de dados
        const { data, error } = await supabase
          .from('profiles')
          .insert([{ nome: name, email: email }]);

        if (error) {
          return res.status(500).json({ message: 'Erro ao adicionar usuário: ' + error.message });
        }
      }

      return res.status(200).json({ message: 'Usuários adicionados com sucesso!' });
    } catch (err) {
      return res.status(500).json({ message: 'Erro ao processar a requisição: ' + err.message });
    }
  } else {
    return res.status(405).json({ message: 'Método não permitido. Use POST.' });
  }
};
