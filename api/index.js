import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zdwipxnczcikgretwkum.supabase.co',
  'SUA_SERVICE_ROLE_KEY' // Substitua por sua chave do tipo SERVICE ROLE
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const data = req.body;
    const cliente = data.Cliente || {};
    const produto = data.Produto || {};
    const comissoes = data.Comissões || {};

    const nome = cliente.full_name;
    const email = cliente["e-mail"];

    if (!nome || !email) {
      console.error('Erro: nome ou email faltando', { nome, email });
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    const { error } = await supabase.from('profiles').insert([
      {
        nome,
        email,
        celular: cliente.celular,
        cpf: cliente.cnpj,
        endereco: cliente.rua,
        cidade: cliente.cidade,
        estado: cliente.estado,
        cep: cliente.CEP,
        produto_nome: produto.product_name,
        tipo_produto: data.product_type,
        valor_comissao: comissoes.minha_comissão,
        status_pedido: data.order_status,
        data_criacao: new Date(data.created_at),
        data_atualizacao: new Date(data.updated_at),
        subscription_id: data.id_de_assinatura,
      },
    ]);

    if (error) {
      console.error('Erro ao inserir no Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: 'Dados inseridos com sucesso' });
  } catch (err) {
    console.error('Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro ao processar a requisição' });
  }
}
