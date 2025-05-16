import { createClient } from '@supabase/supabase-js'
import sgMail from '@sendgrid/mail'

// Configura variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const sendgridApiKey = process.env.SENDGRID_API_KEY
const fromEmail = process.env.FROM_EMAIL

sgMail.setApiKey(sendgridApiKey)

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const data = req.body

    // Dados do cliente
    const customer = data.Customer
    if (!customer || !customer.email) {
      return res.status(400).json({ error: 'Dados do cliente incompletos' })
    }

    const email = customer.email.toLowerCase()
    const fullName = customer.full_name || customer.first_name || ''
    const celular = customer.mobile || ''
    const cpf = customer.CPF || null
    const cnpj = customer.cnpj || null

    // Define tipo de documento
    let tipo_documento = null
    let documento = null
    if (cpf && cpf.trim() !== '') {
      tipo_documento = 'CPF'
      documento = cpf
    } else if (cnpj && cnpj.trim() !== '') {
      tipo_documento = 'CNPJ'
      documento = cnpj
    }

    // Gera senha temporária (exemplo simples)
    const gerarSenhaTemporaria = () => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let senha = ''
      for (let i = 0; i < 10; i++) {
        senha += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return senha
    }

    const senhaTemporaria = gerarSenhaTemporaria()

    // Tenta criar usuário no Supabase Auth
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password: senhaTemporaria,
      email_confirm: true,
      user_metadata: {
        nome: fullName,
        celular,
      },
    })

    if (userError && userError.code !== '23505') { // 23505 = usuário já existe
      console.error('Erro ao criar usuário no Auth:', userError)
      return res.status(500).json({ error: 'Erro ao criar usuário' })
    }

    // Pega o ID do usuário criado ou existente
    const userId = userData?.id || (await getUserIdByEmail(email))

    if (!userId) {
      return res.status(500).json({ error: 'Não foi possível obter o ID do usuário' })
    }

    // Atualiza ou insere o profile
    const profileData = {
      id: userId,
      nome: fullName,
      email,
      celular,
      tipo_documento,
      documento,
      data_atualizacao: new Date(),
      data_criacao: new Date(),
    }

    // Upsert no profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' })

    if (profileError) {
      console.error('Erro ao inserir/atualizar profile:', profileError)
      return res.status(500).json({ error: 'Erro ao atualizar profile' })
    }

    // Envia e-mail com login e senha temporária
    const msg = {
      to: email,
      from: fromEmail,
      subject: 'Bem-vindo! Seu login e senha temporária',
      text: `Olá ${fullName},\n\nSeu cadastro foi realizado com sucesso.\n\nLogin: ${email}\nSenha temporária: ${senhaTemporaria}\n\nPor favor, acesse e altere sua senha o quanto antes.\n\nObrigado!`,
    }

    await sgMail.send(msg)

    console.log(`Usuário criado no Auth: ${userId}`)
    console.log('✅ Usuário e profile criados/atualizados com sucesso.')

    res.status(200).json({ message: 'Usuário criado e e-mail enviado' })
  } catch (error) {
    console.error('❌ Erro no webhook:', error)
    res.status(500).json({ error: error.message })
  }
}

// Função auxiliar para buscar user ID pelo email se já existir
async function getUserIdByEmail(email) {
  const { data, error } = await supabase.auth.admin.listUsers()
  if (error) {
    console.error('Erro ao listar usuários:', error)
    return null
  }
  const user = data.users.find((u) => u.email === email)
  return user?.id || null
}
