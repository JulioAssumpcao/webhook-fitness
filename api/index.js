import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function gerarSenhaTemporaria(tamanho = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  let senha = '';
  for (let i = 0; i < tamanho; i++) {
    senha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return senha;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const body = req.body;
    const customer = body.Customer;

    if (!customer || !customer.email) {
      return res.status(400).json({ error: 'Dados do cliente incompletos' });
    }

    // Gera senha temporária
    const senhaTemporaria = gerarSenhaTemporaria();

    // Cria usuário no Supabase Auth
    const { data: user, error: authError } = await supabase.auth.admin.createUser({
      email: customer.email,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: {
        nome: customer.full_name,
        celular: customer.mobile,
      },
    });

    if (authError) {
      // Se usuário já existe, pode tentar atualizar o perfil direto
      if (!authError.message.includes('duplicate')) {
        throw authError;
      }
    }

    const userId = user ? user.id : null;

    // Se não criou usuário, busca o id do usuário existente
    if (!userId) {
      const { data: existingUsers, error: searchUserError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', customer.email)
        .limit(1)
        .single();

      if (searchUserError || !existingUsers) {
        throw searchUserError || new Error('Usuário existente não encontrado');
      }
      userId = existingUsers.id;
    }

    // Define tipo_documento e separa cpf/cnpj
    const tipo_documento = customer.CPF ? 'CPF' : (customer.cnpj ? 'CNPJ' : null);

    // Insere ou atualiza o profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        nome: customer.full_name,
        email: customer.email,
        celular: customer.mobile,
        tipo_documento,
        cpf: customer.CPF || null,
        cnpj: customer.cnpj || null,
        produto_nome: body.Product?.product_name || null,
        tipo_produto: body.product_type || null,
        valor_comissao: body.Commissions?.my_commission || null,
        status_pedido: body.order_status || null,
        data_criacao: body.created_at || null,
        data_atualizacao: body.updated_at || null,
        subscription_id: null,
      }, { onConflict: 'id' });

    if (profileError) {
      throw profileError;
    }

    // Enviar email de boas-vindas com login e senha temporária
    const msg = {
      to: customer.email,
      from: process.env.FROM_EMAIL, // ex: 'contatofitmember@gmail.com'
      subject: 'Bem-vindo(a) à plataforma! Seu login e senha temporária',
      text: `Olá ${customer.full_name},

Seu cadastro foi realizado com sucesso.

Email: ${customer.email}
Senha temporária: ${senhaTemporaria}

Por favor, faça login e altere sua senha assim que possível.

Abraços,
Equipe FitMember`,
    };

    await sgMail.send(msg);

    console.log(`Usuário criado no Auth: ${userId}`);
    res.status(200).json({ message: 'Usuário e profile criados/atualizados com sucesso.' });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).json({ error: error.message || error.toString() });
  }
}
