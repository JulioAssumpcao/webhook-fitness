import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    console.log('🔔 Webhook recebido com body:', req.body)

    const body = req.body

    const email = body.Customer?.email
    const nome = body.Customer?.full_name
    const celular = body.Customer?.mobile || ''

    if (!email || !nome) {
      throw new Error(`❌ Erro: nome ou email faltando { nome: ${nome}, email: ${email} }`)
    }

    console.log('🔍 Verificando se usuário já existe no auth...')
    const { data: existingUsers, error: fetchError } = await supabase.auth.admin.listUsers({ email })

    let userId
    if (fetchError) {
      throw new Error('❌ Erro ao buscar usuários existentes: ' + fetchError.message)
    }

    if (existingUsers?.users?.length > 0) {
      console.log('👤 Usuário já existe. Atualizando metadata...')
      userId = existingUsers.users[0].id

      const { error: updateMetaError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { nome, celular },
        raw_user_meta_data: { celular },
      })

      if (updateMetaError) {
        throw new Error('❌ Erro ao atualizar metadata: ' + updateMetaError.message)
      }

    } else {
      console.log('🆕 Criando novo usuário no auth...')
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { nome, celular },
        raw_user_meta_data: { celular },
      })

      if (authError) {
        throw new Error('❌ Erro ao criar usuário no auth: ' + authError.message)
      }

      userId = authUser.user.id
      console.log('✅ Usuário criado no auth com ID:', userId)
    }

    console.log('📦 Inserindo no profiles...')
    const { error: insertError } = await supabase.from('profiles').upsert({
      id: userId,
      email,
      nome,
      celular,
      cpf: body.Customer?.cnpj,
      endereco: `${body.Customer?.street}, ${body.Customer?.number} ${body.Customer?.complement || ''}`,
      cidade: body.Customer?.city,
      estado: body.Customer?.state,
      cep: body.Customer?.zipcode,
      produto_nome: body.Product?.product_name,
      tipo_produto: body.product_type,
      valor_comissao: parseInt(body.Commissions?.my_commission || 0),
      status_pedido: body.order_status,
      data_criacao: new Date(body.created_at),
      data_atualizacao: new Date(body.updated_at),
      subscription_id: body.subscription_id,
    })

    if (insertError) {
      throw new Error('❌ Erro ao inserir no profiles: ' + insertError.message)
    }

    console.log('🎉 Usuário e perfil salvos com sucesso.')
    return res.status(200).json({ success: true })

  } catch (err) {
    console.error('🔥 Erro geral no webhook:', err)
    return res.status(500).json({ error: err.message })
  }
}
