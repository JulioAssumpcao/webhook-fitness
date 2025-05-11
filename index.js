const { createClient } = require('@supabase/supabase-js');

// Pegue as variáveis de ambiente
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { email, nome } = req.body;
    
    // Adicionar o novo usuário à tabela 'profiles' no Supabase
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ nome: nome, email: email }]);
    
    if (error) {
      return res.status(500).json({ message: error.message });
    }
    
    return res.status(200).json({ message: 'Usuário adicionado com sucesso!', data });
  }
  
  return res.status(405).json({ message: 'Método não permitido' });
};
