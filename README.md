# Transfer — sistema para empresas de transfer turístico

Sistema vendido por assinatura. Cada empresa de transfer se cadastra sozinha,
testa 7 dias de graça, escolhe um plano e paga por PIX, boleto ou cartão.
Você, dona do sistema, tem um painel com todos os clientes e todos os pagamentos.

## Quem usa e o que cada um vê

| Quem | Onde entra | O que enxerga |
| --- | --- | --- |
| **Dono da empresa de transfer** | `/app` | A agenda do dia, os motoristas, o acerto do mês e a própria assinatura. Só os dados da empresa dele. |
| **Motorista** | link do WhatsApp, ou `/motorista` | Só os serviços que são dele, e **só o valor que é dele**. Nunca o valor cobrado do cliente. |
| **Você (administração)** | `/admin` | Todas as empresas, assinaturas, pagamentos e a receita do mês. |

A regra do valor não é só de tela: o valor cobrado do cliente fica numa tabela
separada, e o motorista não tem permissão nenhuma sobre ela. Mesmo que alguém
tente falar direto com o banco de dados, por fora do aplicativo, não vê.

O motorista continua **não sendo obrigado a criar conta**: o link que chega no
WhatsApp abre a tela de confirmação sem login nenhum. A conta é opcional, para
quem quiser ver todos os serviços num lugar só.

## O que está pronto

- Cadastro da empresa com 7 dias de teste, contados a partir do dia da entrada
- Login com e-mail e senha, e convite de motorista por link
- Página de planos, escolha de plano e checkout de pagamento
- Cobrança mensal: pagamento confirmado deixa a assinatura em dia, atraso e
  estorno mudam o estado sozinhos, e o mesmo aviso chegando duas vezes não cobra
  duas vezes
- Limite de motoristas por plano, e bloqueio quando o teste vence sem assinatura
- Painel da administração com clientes, assinaturas, pagamentos e receita do mês
- Toda a operação que já existia: agenda do dia, atribuição com disponibilidade,
  aviso por WhatsApp, confirmação do motorista e acerto do mês

## O que falta, e só você pode fazer

1. **Criar o projeto no Supabase** (grátis para começar) — é o banco de dados e o
   login do sistema.
2. **Abrir conta numa empresa de pagamentos** (Asaas ou Mercado Pago). Exige CNPJ
   ou CPF, conta bancária e aprovação deles. Sem isso, o botão de assinar não tem
   para onde mandar o cliente.
3. **Publicar o site** (Vercel ou Netlify).

O passo a passo está em [`docs/como-colocar-no-ar.md`](docs/como-colocar-no-ar.md).

## Como rodar na sua máquina

```bash
npm install
npm run dev
```

Antes, copie `.env.exemplo` para `.env` e preencha com o endereço e a chave
pública do seu projeto Supabase (a *publishable*, chamada de `anon` nas versões
mais antigas do painel). Sem isso, o aplicativo abre avisando que falta configurar.

## Como testar tudo

```bash
bash ferramentas/testar-tudo.sh
```

Esse comando cria um banco limpo, aplica todas as regras e faz duas coisas:

1. **62 verificações no banco de dados** — inclusive tentativas de invasão: uma
   empresa tentando ver a outra, o motorista tentando ver o valor do cliente,
   o motorista tentando aumentar o próprio percentual, alguém tentando forjar um
   pagamento.
2. **29 verificações de tela** — abre o aplicativo num navegador de verdade e
   percorre o caminho inteiro: cadastro, planos, lançamento de serviço,
   atribuição, mensagem de WhatsApp, confirmação do motorista noutro aparelho,
   acerto do mês e o seu painel de administração com um pagamento entrando.

Precisa de um PostgreSQL na máquina. Para preparar uma vez:

```bash
sudo -u postgres psql -c "create role transfer login password 'transfer' superuser"
```

## Como o projeto está organizado

```
src/
  supabase.ts        ligação com o banco
  dados.ts           único lugar que conversa com o banco
  sessao.tsx         quem está logado e qual o papel da pessoa
  tipos.ts           o formato dos dados
  lib/               datas, dinheiro, disponibilidade e mensagens de WhatsApp
  telas/publico/     vitrine, entrar, criar conta, convite, confirmação
  telas/empresa/     hoje, atribuir, acerto, cadastros, assinatura
  telas/motorista/   os serviços do motorista
  telas/admin/       clientes e pagamentos

supabase/
  migrations/        as regras do banco, na ordem em que devem ser aplicadas
  functions/         servidores do pagamento (webhook e criação da assinatura)
  testes/            testes do banco
  local/             faz de conta do login, só para testar na sua máquina

ferramentas/
  testar-tudo.sh     roda todos os testes
  servidor-local/    finge ser o Supabase para testar sem internet
  testes-de-tela/    o teste que percorre o aplicativo num navegador
```

## Dinheiro

Todo valor é guardado em **centavos**, em número inteiro. Nunca em número
quebrado. Isso evita erro de arredondamento em conta de dinheiro.

O quanto o motorista recebe é calculado **dentro do banco de dados**, no momento
da atribuição, e guardado junto do serviço. Assim ele é sempre o mesmo em toda
tela, em todo relatório e em toda mensagem.
