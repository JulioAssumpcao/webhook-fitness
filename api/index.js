import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const generatePassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pass = '';
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const body = req.body;

  console.log('🔔 Webhook recebido com body:', body);

  const email = body.Customer?.email?.toLowerCase();
  const nome = body.Customer?.full_name;
  const celular = body.Customer?.mobile;
  const CPF = body.Customer?.CPF;
  const CNPJ = body.Customer?.cnpj;
  const documento = CNPJ || CPF || '';
  const tipo_documento = CNPJ ? 'CNPJ' : 'CPF';

  const senhaTemporaria = generatePassword();

  // Verifica se já existe usuário
  const { data: existingUsers } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .limit(1);

  let userId;

  if (existingUsers && existingUsers.length > 0) {
    userId = existingUsers[0].id;
    console.log(`🔁 Usuário já existente com ID: ${userId}`);
  } else {
    // Cria novo usuário no Supabase Auth
    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: {
        nome,
        celular,
        email_verified: true
      }
    });

    if (userError || !newUser?.user?.id) {
      console.error('❌ Erro ao criar usuário:', userError);
      return res.status(500).json({ error: 'Erro ao criar usuário.' });
    }

    userId = newUser.user.id;
    console.log(`✅ Usuário criado no Auth: ${userId}`);
  }

  // Cria/atualiza o perfil
  const profileData = {
    id: userId,
    nome,
    email,
    celular,
    cpf: CPF || '',
    cnpj: CNPJ || '',
    documento,
    tipo_documento,
    produto_nome: body.Product?.product_name || '',
    tipo_produto: body.product_type || '',
    valor_comissao: body.Commissions?.my_commission || 0,
    status_pedido: body.order_status || '',
    data_criacao: new Date(body.created_at),
    data_atualizacao: new Date(body.updated_at)
  };

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' });

  if (profileError) {
    console.error('❌ Erro ao inserir/atualizar profile:', profileError);
    return res.status(500).json({ error: 'Erro ao salvar perfil.' });
  }

  console.log('✅ Usuário e perfil criados/atualizados com sucesso.');

  // Envia e-mail de boas-vindas
  const msg = {
    to: email,
    from: process.env.FROM_EMAIL, // ex: 'contatofitmember@gmail.com'
    subject: 'Seja bem-vindo à FitMember!',
    html: `
      <h2>Olá ${nome}, seja bem-vindo(a)!</h2>
      <p>Seu acesso está pronto. Aqui estão seus dados:</p>
      <ul>
        <li><strong>Login:</strong> ${email}</li>
        <li><strong>Senha:</strong> ${senhaTemporaria}</li>
      </ul>
      <p><a href="https://fitmemeber.lovable.app">Clique aqui para acessar sua área de membros</a></p>
      <p>Recomendamos que você troque sua senha após o primeiro login.</p>
      <br />
      <p>Equipe FitMember</p>
    `
  };

  try {
    await sgMail.send(msg);
    console.log(`📧 E-mail de boas-vindas enviado para ${email}`);
  } catch (emailError) {
    console.error('❌ Erro ao enviar e-mail:', emailError);
  }

  return res.status(200).json({ message: 'Usuário processado com sucesso.' });
}
