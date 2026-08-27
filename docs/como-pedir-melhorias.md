# Como mudar o sistema depois de no ar

## O caminho normal: você pede, eu faço

Você não precisa mexer em código nem em comando nenhum. O ciclo é este:

1. Você me diz o que quer, em português: *"na tela Hoje, quero ver o telefone do
   passageiro"*, *"o acerto tem que mostrar também quanto sobrou para a empresa"*.
2. Eu mudo, rodo as 91 verificações automáticas e envio para o GitHub.
3. A Vercel percebe sozinha e publica em uns dois minutos.
4. Você recarrega o site e a mudança está lá.

### Como pedir de um jeito que sai certo na primeira

Descreva **o que você quer que aconteça**, não como fazer. Três coisas ajudam
muito:

- **Onde**: em qual tela.
- **O quê**: o que deve aparecer ou mudar.
- **Por quê**: o problema real que isso resolve. É a parte mais útil — muitas
  vezes existe uma solução melhor do que a que veio à cabeça primeiro.

Exemplo bom: *"Na tela Hoje, quando o serviço é de amanhã cedo, eu queria ver
isso destacado, porque acabei esquecendo de escalar motorista para um transfer
das 5 da manhã."*

## O que você muda sozinha, sem mim

Preço, nome e descrição dos planos são **dados**, não código. Dá para mudar no
Supabase, em **SQL Editor**, e vale na hora — sem publicar nada.

Trocar um preço:

```sql
-- R$ 249,00 vira 24900 (o valor em centavos, sem vírgula)
update planos set preco_centavos = 24900 where id = 'profissional';
```

Trocar nome e descrição:

```sql
update planos
   set nome = 'Início',
       descricao = 'Para quem está começando.'
 where id = 'essencial';
```

Ver como estão agora:

```sql
select id, nome, descricao, preco_centavos / 100.0 as preco_em_reais
  from planos order by ordem;
```

Os identificadores são `essencial`, `profissional` e `frota` — esses não mude,
porque são eles que ligam o plano à assinatura de quem já é cliente.

> Cuidado com quem já está pagando: mudar o preço aqui muda o que aparece no
> site, mas **não** muda a cobrança de quem já assinou. Essa parte é ajustada no
> Asaas. Se for mexer em preço com cliente ativo, me chame antes.

## Se alguma coisa quebrar no ar

A Vercel guarda todas as publicações anteriores e volta para qualquer uma em
segundos:

**Deployments** → ache a publicação que estava boa → três pontinhos →
**Promote to Production** (ou *Instant Rollback*).

O site volta ao que era antes na hora. Depois a gente conserta com calma.

## Quer ver antes de ir para o ar?

Dá para trabalhar de dois jeitos:

- **Direto**: eu publico e você confere no site. É mais rápido, e serve bem para
  mudanças pequenas.
- **Com prévia**: eu mando a mudança para um endereço de teste, você abre, olha,
  e só depois vai para o site de verdade. Melhor para mudanças grandes ou para
  quando já houver cliente pagando usando o sistema.

Hoje está no modo direto. É só me dizer quando quiser mudar para o outro.

## A página de conferência

Se algum dia o site abrir estranho, o primeiro lugar para olhar é
`/diagnostico` no fim do endereço. Ela diz em português se o site está falando
com o banco de dados.
