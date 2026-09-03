# Spec: Pré-selecionar cartão do filtro da listagem no cadastro de compra

## 1. Intenção e Visão Geral

Na tela de listagem de compras (`/purchases`), o usuário pode filtrar as compras exibidas por cartão (ex.: "Nubank") via `?cardId=...` na URL. Ao abrir, a partir dessa mesma tela, um formulário para cadastrar uma nova compra, o campo de seleção de cartão desse formulário deveria vir pré-preenchido com o cartão que está ativo no filtro — evitando que o usuário precise selecionar manualmente de novo o cartão que ele já indicou estar usando.

Hoje isso não acontece: o campo de cartão do formulário de nova compra é inicializado com `defaultCardId` (o `lastUsedCardId` do usuário, ou seja, o cartão da última compra criada) e, na ausência dele, o primeiro cartão ativo da lista — o filtro atualmente aplicado na listagem nunca é considerado.

Existem dois pontos de entrada para cadastro de nova compra a partir da tela de listagem, e ambos devem passar a respeitar o filtro ativo:
1. A página "Nova compra" (`/purchases/new`), acessada pelo botão de mesmo nome em `/purchases`.
2. O "Lançamento rápido" (botão flutuante `+`), um modal/sheet disponível em qualquer tela do app, inclusive `/purchases`.

O objetivo é que, quando o usuário tem um cartão filtrado na listagem e abre qualquer um desses dois formulários a partir dali, o cartão já apareça selecionado — sem impedir que o usuário troque a seleção manualmente antes de salvar.

Além disso, ao salvar uma compra a partir da página "Nova compra" (`/purchases/new`) que foi aberta com um filtro de cartão ativo, o usuário deve retornar para `/purchases` com esse mesmo filtro de cartão ainda aplicado — hoje o retorno é feito com `router.push("/purchases")` (sem parâmetros), o que descarta o filtro. Já no "Lançamento rápido", como ele não navega (usa `router.refresh()` mantendo a URL atual), o filtro já é preservado nesse caso sem necessidade de mudança — mas o comportamento deve ser validado para não regredir.

## 2. Requisitos Funcionais (Padrão EARS/GEARS)

- **[Req-01]** **When** o usuário, com um filtro de cartão ativo em `/purchases`, clica em "Nova compra", o sistema **shall** abrir a página `/purchases/new` com o campo de cartão do formulário pré-selecionado com o cartão do filtro.
- **[Req-02]** **When** o usuário, com um filtro de cartão ativo em `/purchases`, abre o "Lançamento rápido" (botão flutuante), o sistema **shall** exibir o campo de cartão do formulário pré-selecionado com o cartão do filtro.
- **[Req-03]** **While** não houver filtro de cartão ativo em `/purchases` (ou o usuário abrir o cadastro a partir de outra tela), o sistema **shall** manter o comportamento atual de pré-seleção (último cartão usado, ou o primeiro cartão ativo da lista na ausência dele).
- **[Req-04]** **If** o cartão indicado pelo filtro da URL não existir mais entre os cartões ativos do usuário (ex.: foi desativado), o sistema **shall** ignorar esse valor e cair no comportamento padrão descrito no Req-03, em vez de pré-selecionar um cartão inválido.
- **[Req-05]** **When** o campo de cartão é pré-selecionado a partir do filtro (Req-01/Req-02), o sistema **shall** permitir que o usuário altere livremente essa seleção antes de salvar a compra, sem nenhuma restrição adicional em relação ao comportamento atual do campo.
- **[Req-06]** **When** o usuário salva com sucesso uma compra a partir da página "Nova compra" (`/purchases/new`) que foi aberta com um filtro de cartão ativo em `/purchases`, o sistema **shall** redirecionar de volta para `/purchases` com esse mesmo filtro de cartão (`?cardId=...`) ainda aplicado na URL.
- **[Req-07]** **While** a página "Nova compra" for aberta sem nenhum filtro de cartão ativo, o sistema **shall** continuar redirecionando de volta para `/purchases` sem parâmetro de cartão, como hoje.
- **[Req-08]** **When** o usuário salva com sucesso uma compra a partir do "Lançamento rápido" aberto sobre `/purchases` com um filtro de cartão ativo, o sistema **shall** manter o usuário na mesma URL filtrada (sem regressão do comportamento atual de `router.refresh()`).

## 3. Critérios de Aceite

- [ ] Com o filtro de cartão "Nubank" ativo em `/purchases`, clicar em "Nova compra" abre `/purchases/new` já com "Nubank" selecionado no campo de cartão.
- [ ] Com o filtro de cartão "Nubank" ativo em `/purchases`, abrir o "Lançamento rápido" já mostra "Nubank" selecionado no campo de cartão do sheet.
- [ ] Sem filtro de cartão ativo em `/purchases`, ambos os formulários continuam se comportando como hoje (último cartão usado, ou primeiro cartão ativo).
- [ ] Abrir o "Lançamento rápido" a partir de outra tela do app (não `/purchases`) continua se comportando como hoje, sem tentar aplicar um filtro que não existe naquele contexto.
- [ ] O usuário consegue trocar o cartão pré-selecionado por outro antes de salvar, em ambos os formulários.
- [ ] Se o `cardId` do filtro corresponder a um cartão inativo/inexistente, o formulário não quebra e cai no comportamento padrão de pré-seleção.
- [ ] Com o filtro de cartão "Nubank" ativo, criar uma compra pela página "Nova compra" e ser redirecionado de volta para `/purchases` com o filtro "Nubank" ainda aplicado (mesmo que o cartão selecionado na compra criada seja outro).
- [ ] Sem filtro de cartão ativo, criar uma compra pela página "Nova compra" continua redirecionando para `/purchases` sem parâmetro de cartão.
- [ ] Com o filtro de cartão ativo em `/purchases`, criar uma compra pelo "Lançamento rápido" mantém o usuário em `/purchases` com o mesmo filtro após salvar.
- [ ] `npm run lint` e `tsc --noEmit` passam sem erros.

## 4. Requisitos Não-Funcionais e Contratos

- **Fonte da verdade do cartão filtrado:** o `cardId` já presente na URL da listagem (`searchParams.cardId` em `/purchases`, o mesmo lido hoje por `src/app/(app)/purchases/page.tsx` para montar a query Prisma) — nenhum novo mecanismo de estado (contexto global, store) deve ser introduzido para isso.
- **Página "Nova compra" (`/purchases/new`):** por ser um Server Component, deve passar a ler `searchParams.cardId` e propagar como `defaultCardId` com prioridade sobre `user.lastUsedCardId`, respeitando a mesma validação já existente de "cartão precisa estar entre os cartões ativos do usuário".
- **"Lançamento rápido" (`QuickAddSheet`/`QuickAddFab`, montado em `layout.tsx`):** por ser renderizado fora da árvore da página `/purchases` (compartilhado por todas as rotas do grupo `(app)`), a leitura do `cardId` do filtro deve ser feita no lado client (ex.: via `useSearchParams()`, mesmo padrão já usado por `src/components/card-filter.tsx`), sem exigir alteração do layout para Server Component com `searchParams`.
- **Precedência:** quando o filtro de cartão estiver ativo e válido, ele tem prioridade sobre `user.lastUsedCardId` na definição do valor inicial do campo — mas nunca sobre uma escolha manual do próprio usuário já feita no formulário (Req-05).
- **Redirecionamento pós-criação (`/purchases/new`):** o valor de `cardId` usado para o redirecionamento de volta (Req-06/Req-07) é o `cardId` do filtro que estava ativo quando a página foi aberta — não o cartão efetivamente selecionado na compra criada, que pode ser diferente. Isso substitui o atual `router.push("/purchases")` por um redirecionamento que preserva esse parâmetro quando presente.
- **Fora de escopo:** esta correção do redirecionamento cobre apenas o parâmetro `cardId`. Os filtros de categoria (`category`) e mês (`month`), se estiverem ativos, não fazem parte deste spec e podem continuar sendo perdidos no retorno da página "Nova compra" — não devem ser alterados aqui.
- **Stack:** a implementação deve usar exclusivamente os padrões já definidos em `constitution.md` (Next.js 16 App Router, React 19, TypeScript strict) — sem novas dependências externas.
