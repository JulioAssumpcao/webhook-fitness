import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://zdwipxnczcikgretwkum.supabase.co", // sua URL do supabase
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkd2lweG5jemNpa2dyZXR3a3VtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzAwMzM4NSwiZXhwIjoyMDYyNTc5Mzg1fQ.LvjiTobeUKN0gXEIsowFapJjurIbN0zs97R8qrkcXx4" // sua chave Service Role do Supabase
);

export default async function handler(req, res) {
  if (req.method === "POST") {
    try {
      // Obtendo dados do corpo da requisição
      const body = req.body;

      // Log para ver a estrutura completa do corpo da requisição
      console.log("Dados recebidos:", JSON.stringify(body, null, 2));

      // Extraindo nome e email corretamente da estrutura da Kiwify
      const nome = body.Cliente?.full_name;
      const email = body.Cliente?.["e-mail"];

      // Log para verificar nome e email extraídos
      console.log("Nome extraído:", nome);
      console.log("Email extraído:", email);

      // Verificando se nome e email existem
      if (!nome || !email) {
        throw new Error(`Erro: nome ou email faltando { nome: ${nome}, email: ${email} }`);
      }

      // Inserindo dados no Supabase
      const { data, error } = await supabase
        .from("profiles") // Assumindo que a tabela no Supabase se chama "profiles"
        .insert([
          {
            nome: nome,
            email: email,
            cpf: body.Cliente?.cnpj || null,
            celular: body.Cliente?.celular || null,
            endereco: body.Cliente?.rua || null,
            cidade: body.Cliente?.cidade || null,
            estado: body.Cliente?.estado || null,
            cep: body.Cliente?.CEP || null,
            produto_nome: body.Produto?.product_name || null,
            tipo_produto: body.product_type || null,
            valor_comissao: body.Comissões?.valor_da_cobrança || null,
            status_pedido: body.order_status || null,
            data_criacao: body.created_at || null,
            data_atualizacao: body.updated_at || null,
            subscription_id: body.subscription_id || null
          }
        ]);

      if (error) {
        console.error("Erro ao inserir no Supabase:", error);
        return res.status(500).json({ error: "Erro ao inserir no Supabase" });
      }

      // Respondendo com sucesso
      return res.status(200).json({ message: "Dados inseridos com sucesso", data });
    } catch (error) {
      console.error("Erro no webhook:", error);
      return res.status(400).json({ error: error.message });
    }
  } else {
    // Se não for um método POST
    return res.status(405).json({ error: "Método não permitido" });
  }
}
