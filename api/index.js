import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Coloque sua chave da SendGrid nas variáveis de ambiente

export default async function handler(req, res) {
  try {
    const body = req.body;
    console.log("🔔 Webhook recebido com body:", body);

    const email = body.Customer?.email;
    const nome = body.Customer?.full_name;
    const celular = body.Customer?.mobile || '';
    const cpf = body.Customer?.CPF || body.Customer?.cnpj || '';
    const tipoDocumento = body.Customer?.CPF ? 'cpf' : 'cnpj';
    const endereco = `${body.Customer?.street || ''}, ${body.Customer?.number || ''} ${body.Customer?.complement || ''}`;
    const senhaTemporaria = Math.random().toString(36).slice(-10); // Senha aleatória

    if (!email || !nome) {
      throw new Error(`Erro: nome ou email faltando { nome: ${nome}, email: ${email} }`);
    }

    const { data: existingUsers, error: fetchError } = await supabase.auth.admin.listUsers({ email });

    let userId;

    if (fetchError) {
      throw new Error('Erro ao verificar usuários existentes: ' + fetchError.message);
    }

    if (existingUsers?.users?.length > 0) {
      userId = existingUsers.users[0].id;
    } else {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: senhaTemporaria,
        email_confirm: true,
        user_metadata: { nome, celular }
      });

      if (authError) throw new Error('Erro ao criar usuário no auth: ' + authError.message);
      userId = authUser.user.id;

      // Envia e-mail de boas-vindas com login e senha
      const msg = {
        to: email,
        from: 'sistema@seuprojeto.com', // Domínio verificado no SendGrid
        subject: 'Bem-vindo(a)! Acesso liberado',
        html: `
          <h2>Olá, ${nome}!</h2>
          <p>Seu acesso foi criado com sucesso. Aqui estão suas credenciais:</p>
          <p><strong>Login:</strong> ${email}</p>
          <p><strong>Senha:</strong> ${senhaTemporaria}</p>
          <p><a href="https://fitmemeber.lovable.app">Clique aqui para acessar sua conta</a></p>
          <p>Recomendamos alterar a senha após o primeiro login.</p>
        `
      };
      await sgMail.send(msg);
    }

    // Insere ou atualiza no profiles
    const { error: insertError } = await supabase.from('profiles').upsert({
      id: userId,
      email,
      nome,
      celular,
      cpf,
      tipo_documento: tipoDocumento,
      endereco,
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

    console.log('✅ Usuário e perfil criados/atualizados com sucesso.');
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('❌ Erro no webhook:', err);
    return res.status(500).json({ error: err.message });
  }
}
