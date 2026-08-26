# Transfer Gramado — protótipo de demonstração

Protótipo de venda para empresa de transfer turístico. Roda inteiro no navegador do
celular: sem servidor, sem login e sem instalar nada. Os dados ficam guardados no
próprio aparelho (localStorage).

## Como rodar no computador

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal (algo como `http://localhost:5173`).

## Como gerar o site para publicar

```bash
npm run build
```

Isso cria a pasta `dist`. É essa pasta que vai para a Netlify ou a Vercel.
Nas duas, o projeto é reconhecido sozinho: comando de build `npm run build`,
pasta de publicação `dist`.

## As telas

- **Hoje** — os serviços do dia, em ordem de horário. Card com borda vermelha é
  serviço sem motorista. Tocar no card abre o painel de atribuir.
- **Atribuir** (painel) — mostra cada motorista como *Livre*, *Ocupado às HH:MM* ou
  *Não cabe*, calculado na hora. Depois de escolher, aparecem os botões de avisar
  o motorista e o indicador pelo WhatsApp.
- **Acerto** — por mês: total faturado, total a pagar, quanto cada motorista tem a
  receber (tocar na linha abre os serviços dele) e a comissão de cada indicador.
- **Cadastros** — motoristas, indicadores e serviços: adicionar, editar e excluir.

## O que o motorista vê

O botão "Avisar motorista" abre o WhatsApp com a mensagem pronta e um link.
Esse link mostra ao motorista só os dados do serviço e **o valor dele** — nunca o
valor cobrado do cliente. Os dados que ele precisa ver viajam dentro do próprio
link, então a tela abre certo em qualquer celular.

Quando o link é aberto no aparelho da empresa, o "Aceito" muda o serviço para
confirmado e o check aparece na tela Hoje.

## Antes de uma reunião

Os dados de exemplo estão em `src/seed.ts` — nomes, horários, rotas e valores são
fáceis de trocar. As datas se ajustam sozinhas ao dia em que o app for aberto,
então a tela Hoje nunca aparece vazia.

Para zerar tudo entre uma reunião e outra, use o link discreto
"restaurar dados de demonstração" no rodapé.

## Estrutura

```
src/
  seed.ts               dados de demonstração
  types.ts              o formato dos dados
  lib/armazenamento.ts  único lugar que grava e lê no navegador
  lib/formato.ts        datas, dinheiro e os cálculos de percentual
  lib/disponibilidade.ts  livre / ocupado / não cabe
  lib/whatsapp.ts       as mensagens prontas
  lib/link.ts           o link de confirmação do motorista
  telas/                Hoje, Atribuir, Acerto, Cadastros, Confirmar
  componentes/          barra de abas, painel e campos de formulário
```
