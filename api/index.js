import { createClient } from '@supabase/supabase-js'
import sgMail from '@sendgrid/mail'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const sendgridApiKey = process.env.SENDGRID_API_KEY

sgMail.setApiKey(sendgridApiKey)

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false }
})

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const body = req.body

    // Dados do cliente
    const {
      Customer: {
        full_name,
        email,
        mobile,
        CPF,
        cnpj
      } = {}
    } = body

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' })
    }

    // Define o tipo de documento
    let tipo_documento = null
    let documento = null

    if (CPF && CPF.trim() !== '') {
      tipo_documento = 'CPF'
      documento = CPF.trim()
    } else if (cnpj && cnpj.trim() !== '') {
      tipo_documento = 'CNPJ'
      documento = cnpj.trim()
    } else {
      tipo_documento = 'Outro'
      documento = null
    }

    // Cria senha temporária random (exemplo com 10 chars)
    const gerarSenhaTemporaria = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      let senha = ''
      for (let i = 0; i < 10; i++) {
        senha += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return senha
    }
    const senhaTemporaria = gerarSenhaTemporaria()

    // Cria usuário no Supabase Auth (Admin)
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password: senhaTemporaria,
      user_metadata: {
        nome: full_name || '',
        celular: mobile || ''
      },
      email_confirm: true // já confirma o e-mail (se quiser)
    })

    if (userError) {
      console.error('Erro ao criar usuário:', userError)
      return res.status(500).json({ error: 'Erro ao criar usuário no Supabase', details: userError.message })
    }

    // Insere/atualiza o profile no Supabase (tabela profiles)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userData.id,
        nome: full_name || '',
        email,
        celular: mobile || '',
        tipo_documento,
        documento,
        data_criacao: new Date().toISOString()
      })

    if (profileError) {
      console.error('Erro ao inserir/atualizar profile:', profileError)
      return res.status(500).json({ error: 'Erro ao inserir/atualizar profile', details: profileError.message })
    }

    // Envia email de boas-vindas com login e senha temporária
    const msg = {
      to: email,
      from: 'contatofitmember@gmail.com', // seu e-mail verificado no SendGrid
      subject: 'Bem-vindo(a) à Plataforma FitMember!',
      text: `
Olá ${full_name || ''},

Seu cadastro foi realizado com sucesso!

Use seu e-mail para login: ${email}
Senha temporária: ${senhaTemporaria}

Por favor, acesse a plataforma e altere sua senha assim que possível.

Obrigado(a)!
      `,
      html: `
<p>Olá <strong>${full_name || ''}</strong>,</p>
<p>Seu cadastro foi realizado com sucesso!</p>
<p><strong>Login:</strong> ${email}<br />
<strong>Senha temporária:</strong> ${senhaTemporaria}</p>
<p>Por favor, acesse a plataforma e altere sua senha assim que possível.</p>
<p>Obrigado(a)!</p>
`
    }

    try {
      await sgMail.send(msg)
    } catch (err) {
      console.error('Erro ao enviar email:', err)
      // Continue sem bloquear, mas avise no log
    }

    return res.status(200).json({ message: 'Usuário criado e email enviado com sucesso.' })
  } catch (err) {
    console.error('Erro no webhook:', err)
    return res.status(500).json({ error: 'Erro interno no servidor' })
  }
}
