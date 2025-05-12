import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const body = req.body;

    const email = body.Customer?.email;
    const nome = body.Customer?.full_name;

    if (!email || !nome) {
      throw new Error(`Erro: nome ou email faltando { nome: ${nome}, email: ${email} }`);
    }

    // Verifica se o usuário já existe no auth
    const { data: existingUsers, error: fetchError } = await supabase.auth.admin.listUsers({
      email
    });

    let userId;
    if (fetchError) {
      throw new Error('Erro ao verificar usuários existentes: ' + fetchError.message);
    }

    if (existingUsers?.users?.length > 0) {
      userId = existingUsers.users[0].id;
    } else {
      // Cria novo usuário no auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true
      });

      if (authError) throw new Error('Erro ao criar usuário no auth: ' + authError.message);
      userId = authUser.user.id;
    }

    // Insere dados no profiles
    const { error: insertError } = await supabase.from('profiles').upsert({
      id: userId,
      email: email,
      nome: nome,
      celular: body.Customer?.mobile,
      cpf: body.Customer?.cnpj,
      endereco: `${body.Customer?.street}, ${body.Customer?.number} ${body.Customer?.complement}`,
      cidade: body.Customer?.city,
      estado: body.Customer?.state,
      cep: body.Customer?.zipcode,
      produto_nome: body.Product?.product_name,
      tipo_produto: body.product_type,
      valor_comissao: parseInt(body.Commissions?.my_commission || 0),
      status_pedido: body.order_status,
      data_criacao: new Date(body.created_at),
      data_atualizacao: new Date(body.updated_at),
      subscription_id: body.subscription_id
    });

    if (insertError) throw new Error('Erro ao inserir no profiles: ' + insertError.message);

    console.log('Usuário e profile criados/atualizados com sucesso.');
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Erro no webhook:', err);
    return res.status(500).json({ error: err.message });
  }
}
