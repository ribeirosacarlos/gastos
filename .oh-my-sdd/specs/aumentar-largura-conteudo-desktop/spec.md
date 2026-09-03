# Spec: Aumentar largura do conteúdo do app em telas grandes

## 1. Intenção e Visão Geral

O app foi construído mobile-first e todo o conteúdo das telas do grupo `(app)` é envolvido por `AppShell` (`src/components/app-shell.tsx`), que aplica um `max-w-2xl` (672px) fixo, sem nenhuma variação por breakpoint. Em telas de desktop, isso faz com que toda a interface — incluindo a tabela de listagem de compras — fique espremida numa coluna estreita, desperdiçando o espaço horizontal disponível.

O objetivo é que, em telas grandes (desktop), o conteúdo do app use uma largura maior, aproveitando melhor o espaço disponível — sem prejudicar a experiência em telas pequenas (mobile), que deve continuar exatamente como está hoje.

Investigação do código mostrou que a maioria das telas de detalhe/formulário (ex.: cadastro de compra, edição de cartão, cadastro de categoria) já tem seu próprio wrapper interno `mx-auto max-w-sm`, então essas continuam estreitas e legíveis independentemente da largura do `AppShell`. Já as telas de listagem/dashboard (`/purchases`, `/dashboard`, `/cards`, `/fixed-expenses`, `/settings/currencies`) não têm esse wrapper próprio — são essas que efetivamente ganham mais espaço com o aumento do limite global, o que inclui o cenário original relatado (tabela de compras).

## 2. Requisitos Funcionais (Padrão EARS/GEARS)

- **[Req-01]** **While** a viewport for de tamanho mobile (abaixo do breakpoint `md` já usado no restante do app), o sistema **shall** manter o comportamento atual de largura do conteúdo (`max-w-2xl`), sem nenhuma mudança visual.
- **[Req-02]** **While** a viewport for de tamanho desktop (a partir do breakpoint `md`, mesmo ponto de corte já usado hoje para exibir a `SidebarNav`), o sistema **shall** exibir o conteúdo do app com uma largura máxima maior que a atual, aproveitando melhor o espaço horizontal disponível.
- **[Req-03]** **When** o conteúdo do app fica mais largo em desktop, o sistema **shall** manter esse conteúdo centralizado horizontalmente na área disponível (ao lado da `SidebarNav`), assim como já ocorre hoje.
- **[Req-04]** **While** uma tela específica já tiver seu próprio limite de largura interno (ex.: formulários com `mx-auto max-w-sm`, como cadastro/edição de compra, cartão, categoria), o sistema **shall** preservar esse limite interno inalterado — essas telas não devem ficar mais largas só porque o `AppShell` ficou mais largo.
- **[Req-05]** **When** a tabela de listagem de compras (`/purchases`) é exibida em desktop, o sistema **shall** ocupar a largura maior disponibilizada pelo `AppShell`, tornando as colunas (data, descrição, cartão, categoria, valor) visivelmente menos espremidas do que hoje.

## 3. Critérios de Aceite

- [ ] Em viewport mobile (abaixo de `md`), nenhuma tela do app muda visualmente em relação ao comportamento atual.
- [ ] Em viewport desktop, telas sem wrapper próprio de largura (`/dashboard`, `/purchases`, `/cards`, `/fixed-expenses`, `/settings/currencies`) ocupam uma largura maior que os atuais 672px, permanecendo centralizadas.
- [ ] Em viewport desktop, telas com wrapper próprio (`max-w-sm`) — formulários de compra, cartão, categoria, gasto fixo — continuam com a mesma largura estreita de hoje, sem esticar.
- [ ] Na tela de listagem de compras, em desktop, a tabela ocupa visivelmente mais espaço horizontal do que antes da mudança.
- [ ] A `SidebarNav` e o `BottomNav` continuam se comportando como hoje (sidebar fixa em desktop via `md:pl-48`, bottom nav em mobile).
- [ ] `npm run lint` e `tsc --noEmit` passam sem erros.

## 4. Requisitos Não-Funcionais e Contratos

- **Escopo da mudança:** a alteração é feita exclusivamente em `src/components/app-shell.tsx` (o `max-w-2xl` do wrapper global), usando classes Tailwind responsivas (`md:`/`lg:` etc.) para diferenciar mobile de desktop — nenhuma outra tela precisa ser tocada, graças aos wrappers `max-w-sm` já existentes nas telas de formulário/detalhe.
- **Consistência de breakpoint:** o breakpoint usado para a largura maior deve ser coerente com o já usado em `AppShell` para acionar a `SidebarNav`/ajustar o padding (`md:pl-48`), evitando um estado intermediário estranho onde a sidebar já apareceu mas o conteúdo ainda está na largura estreita (ou vice-versa).
- **Stack:** a implementação deve usar exclusivamente Tailwind CSS 4 (já travado por `constitution.md`) — sem novas dependências, sem CSS customizado fora do padrão de utilitários já usado no projeto.
- **Sem regressão de mobile:** nenhuma classe existente relativa ao layout mobile (`pb-20`, `md:pb-4`, `md:pl-48`) deve ser removida ou alterada de forma que quebre o comportamento atual em telas pequenas.
