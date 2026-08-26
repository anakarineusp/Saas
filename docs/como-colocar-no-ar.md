# Como colocar no ar

Três contas para abrir e um punhado de cópia e cola. Nenhum comando de programador.
Faça na ordem. Se travar em algum passo, é só me dizer o número do passo.

---

## Parte 1 — O banco de dados (Supabase)

É onde ficam os cadastros, os logins e os pagamentos. Começa de graça.

1. Entre em **supabase.com** e crie a conta.
2. Clique em **New project**. Dê o nome que quiser (por exemplo `transfer`),
   escolha uma senha para o banco (guarde num lugar seguro) e a região
   **South America (São Paulo)**.
3. Espere uns dois minutos até o projeto ficar pronto.

### Aplicar as regras do sistema

São dois cliques e uma colagem. Está tudo num arquivo só.

4. Abra este link no navegador:
   **https://github.com/anakarineusp/Saas/blob/claude/spec-review-x140h3/docs/tudo-em-um.sql**
5. No canto de cima à direita da caixa de código tem um **botão de copiar**
   (dois quadradinhos sobrepostos). Clique nele: o arquivo inteiro vai para a
   área de transferência.
6. No Supabase, no menu da esquerda, clique em **SQL Editor** e depois em
   **New query**.
7. Cole (Ctrl+V, ou Cmd+V no Mac) e clique em **Run**, no canto de baixo à
   direita.
8. Espere aparecer **Success**. Pode demorar uns segundos. Pronto: o banco está
   montado.

Se der algum recado em vermelho, me mande a foto da tela que eu vejo o que foi.

> Se você errar e rodar duas vezes, não tem problema nenhum: o arquivo foi feito
> para poder ser rodado de novo sem estragar nada.

### Pegar as duas chaves

7. No menu, vá em **Project Settings → API**.
8. Copie o **Project URL** e a chave **anon public**.

Essas duas informações são públicas de propósito: elas ficam dentro do site, e
quem manda em quem vê o quê é o banco de dados. **A outra chave, a `service_role`,
é secreta. Nunca coloque ela no site, nem me mande por mensagem.**

### Criar o seu acesso de administradora

9. Vá em **Authentication → Users → Add user**, e crie um usuário com o seu e-mail
   e uma senha.
10. Copie o **ID** que aparece na lista (uma sequência longa de letras e números).
11. Volte no **SQL Editor** e rode isto, trocando o ID e o nome:

```sql
insert into public.perfis (id, nome, papel)
values ('cole-aqui-o-id-do-passo-10', 'Seu nome', 'admin');
```

Pronto: quando você entrar com esse e-mail, cai direto no painel de clientes.

---

## Parte 2 — A empresa de pagamentos (Asaas)

É quem cobra de verdade e deposita na sua conta.

1. Entre em **asaas.com** e crie a conta da sua empresa. Vão pedir CNPJ ou CPF,
   conta bancária e alguns documentos. A aprovação costuma levar de um a dois dias.
2. Enquanto isso, use o **ambiente de testes** (sandbox), que funciona igual e não
   move dinheiro nenhum.
3. Com a conta aprovada, vá em **Integrações → Chave de API** e gere a chave.
4. Vá em **Integrações → Webhooks** e cadastre:
   - **URL**: `https://SEU-PROJETO.supabase.co/functions/v1/pagamentos-webhook`
   - **Token de autenticação**: invente uma senha longa e guarde
   - **Eventos**: marque os de cobrança (criada, confirmada, recebida, vencida,
     estornada)

### Guardar as chaves secretas no lugar certo

5. No Supabase, vá em **Edge Functions → Secrets** e cadastre:
   - `ASAAS_API_KEY` — a chave do passo 3
   - `ASAAS_WEBHOOK_TOKEN` — a senha que você inventou no passo 4
   - `ASAAS_API_URL` — `https://api-sandbox.asaas.com/v3` enquanto estiver
     testando, ou `https://api.asaas.com/v3` quando for para valer
6. Ainda no Supabase, publique os dois servidores da pasta `supabase/functions`.
   Esse passo é o único que precisa de uma ferramenta de programador; me chame que
   eu faço, ou peça para quem for cuidar da parte técnica.

---

## Parte 3 — Publicar o site (Vercel)

1. Entre em **vercel.com** e escolha **Continue with GitHub**.
2. **Add New → Project** e escolha o repositório **Saas**.
3. Em **Environment Variables**, cadastre as duas do Supabase:
   - `VITE_SUPABASE_URL` — o Project URL
   - `VITE_SUPABASE_ANON_KEY` — a chave anon public
4. Clique em **Deploy**.

No fim a Vercel te dá um endereço. Esse é o link do sistema.

---

## Antes de vender para o primeiro cliente

Estas coisas não são código, mas são obrigatórias quando se cobra de gente e se
guarda dado de outras pessoas:

- **Termos de uso** e **política de privacidade** no site
- **LGPD**: você passa a ser responsável pelos dados dos clientes dos seus
  clientes (nome de passageiro, telefone de motorista). Vale conversar com um
  contador ou advogado uma vez.
- **Nota fiscal** da assinatura, todo mês. O Asaas emite automaticamente se você
  configurar.
- **Um jeito de falar com você**: um WhatsApp ou e-mail de suporte no rodapé.

---

## Enquanto isso

Você não precisa de nada disso pronto para mostrar o sistema. O protótipo que já
está publicado continua funcionando e serve para as primeiras conversas.
