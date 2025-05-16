import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  try {
    const body = req.body;

    const email = body.Customer?.email;
    const nome = body.Customer?.full_name;
    const celular = body.Customer?.mobile || '';

    if (!email || !nome) {
      throw new Error(`Erro: nome ou email faltando { nome: ${nome}, email: ${email} }`);
    }

    // Verifica se o usuário já existe no auth
    const { data: existingUsers, error: fetchError } = await supabase.auth.admin.listUsers({ email });

    let userId;
    let senhaTemporaria = Math.random().toString(36).slice(-8); // senha aleatória simples

    if (fetchError) {
      throw new Error('Erro ao verificar usuários existentes: ' + fetchError.message);
    }

    if (existingUsers?.users?.length > 0) {
      userId = existingUsers.users[0].id;

      // Atualiza o metadata e telefone do usuário existente
      const { error: updateMetaError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          nome,
          celular
        },
        raw_user_meta_data: {
          celular,
        }
      });

      if (updateMetaError) {
        throw new Error('Erro ao atualizar metadata ou telefone do usuário: ' + updateMetaError.message);
      }

    } else {
      // Cria novo usuário no auth com senha temporária e metadata
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: senhaTemporaria,
        email_confirm: true,
        user_metadata: {
          nome,
          celular
        },
        raw_user_meta_data: {
          celular,
        }
      });

      if (authError) throw new Error('Erro ao criar usuário no auth: ' + authError.message);
      userId = authUser.user.id;

      // Enviar e-mail de boas-vindas com login e senha
      const msg = {
        to: email,
        from: 'seuemail@seudominio.com', // substitua pelo seu e-mail verificado no SendGrid
        subject: 'Bem-vindo! Seu acesso ao sistema',
        text: `Olá ${nome},\n\nSeu cadastro foi realizado com sucesso.\nSeu login: ${email}\nSenha temporária: ${senhaTemporaria}\n\nPor favor, altere sua senha ao entrar.\n\nObrigado!`,
        html: `<p>Olá ${nome},</p>
               <p>Seu cadastro foi realizado com sucesso.</p>
               <p><b>Login:</b> ${email}</p>
               <p><b>Senha temporária:</b> ${senhaTemporaria}</p>
               <p>Por favor, altere sua senha ao entrar.</p>
               <p>Obrigado!</p>`
      };

      await sgMail.send(msg);
    }

    // Insere ou atualiza no profiles
    const { error: insertError } = await supabase.from('profiles').upsert({
      id: userId,
      email: email,
      nome: nome,
      celular: celular,
      cpf: body.Customer?.cnpj || body.Customer?.CPF || '',
      tipo_documento: body.Customer?.cnpj ? 'cnpj' : 'cpf',
      endereco: `${body.Customer?.street || ''}, ${body.Customer?.number || ''} ${body.Customer?.complement || ''}`,
      cidade: body.Customer?.city || '',
      estado: body.Customer?.state || '',
      cep: body.Customer?.zipcode || '',
      produto_nome: body.Product?.product_name || '',
      tipo_produto: body.product_type || '',
      valor_comissao: parseInt(body.Commissions?.my_commission || 0),
      status_pedido: body.order_status || '',
      data_criacao: new Date(body.created_at),
      data_atualizacao: new Date(body.updated_at),
      subscription_id: body.subscription_id || null
    });

    if (insertError) throw new Error('Erro ao inserir no profiles: ' + insertError.message);

    console.log('Usuário e profile criados/atualizados com sucesso.');
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Erro no webhook:', err);
    return res.status(500).json({ error: err.message });
  }
}
