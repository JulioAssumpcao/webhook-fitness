import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function generateTemporaryPassword(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const body = req.body;
  console.log('🔔 Webhook recebido com body:', body);

  if (body.webhook_event_type !== 'order_approved') {
    return res.status(200).json({ message: 'Evento ignorado' });
  }

  const nome = body.Customer.full_name || '';
  const email = body.Customer.email;
  const celular = body.Customer.mobile || '';
  const cpf = body.Customer.CPF;
  const cnpj = body.Customer.cnpj;

  const tipo_documento = cnpj ? 'CNPJ' : 'CPF';
  const documento = cnpj || cpf || '';

  const senhaTemporaria = generateTemporaryPassword();

  // 1. Cria o usuário no Supabase Auth
  const { data: user, error: createUserError } = await supabase.auth.admin.createUser({
    email,
    password: senhaTemporaria,
    email_confirm: true,
    user_metadata: {
      nome,
      celular,
      email_verified: true
    }
  });

  if (createUserError) {
    console.error('❌ Erro ao criar usuário:', createUserError);
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }

  // 2. Insere dados no perfil
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.user.id,
    email,
    nome,
    celular,
    tipo_documento,
    documento
  });

  if (profileError) {
    console.error('❌ Erro ao inserir/atualizar profile:', profileError);
    return res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }

  // 3. Envia e-mail com senha
  const msg = {
    to: email,
    from: process.env.FROM_EMAIL,
    subject: 'Seja bem-vindo(a)! Aqui estão seus dados de acesso',
    html: `
      <p>Olá ${nome}, seja bem-vindo(a)!</p>
      <p>Seu acesso está pronto. Aqui estão seus dados:</p>
      <p><strong>Login:</strong> ${email}</p>
      <p><strong>Senha:</strong> ${senhaTemporaria}</p>
      <p><a href="https://fitmemeber.lovable.app/">Clique aqui para acessar sua área de membros</a></p>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log('📧 E-mail enviado com sucesso para:', email);
  } catch (emailError) {
    console.error('❌ Erro ao enviar e-mail:', emailError);
    return res.status(500).json({ error: 'Erro ao enviar e-mail' });
  }

  res.status(200).json({ message: 'Usuário criado, perfil atualizado e e-mail enviado.' });
}
