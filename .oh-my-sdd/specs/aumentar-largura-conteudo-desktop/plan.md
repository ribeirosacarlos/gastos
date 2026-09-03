# Plan: Aumentar largura do conteúdo do app em telas grandes

## 1. Decisões Arquiteturais

- **Mudança única e isolada:** em `src/components/app-shell.tsx:8`, a classe `max-w-2xl` do wrapper `<div className="mx-auto max-w-2xl pb-20 md:pb-4">` passa a ser progressiva por breakpoint em vez de fixa: `max-w-2xl md:max-w-4xl lg:max-w-6xl`.
  - Abaixo de `md`: continua `max-w-2xl` (672px) — comportamento mobile idêntico ao atual (Req-01).
  - A partir de `md` (mesmo breakpoint que já ativa a `SidebarNav`/`md:pl-48` na linha 6 do mesmo arquivo): `max-w-4xl` (896px) — evita o "salto" abrupto de 672px direto para uma largura muito maior no mesmo breakpoint em que a sidebar aparece (Req da consistência de breakpoint em `spec.md`, seção 4).
  - A partir de `lg`: `max-w-6xl` (1152px) — aproveita telas de desktop maiores sem ficar excessivamente largo (uma tabela ou formulário maior que ~1150px começa a prejudicar a leitura em vez de ajudar).
  - `mx-auto` já presente mantém o conteúdo centralizado na área restante ao lado da sidebar (Req-03) — nenhuma mudança necessária aí.
- **Nenhuma outra tela precisa de alteração:** conforme levantado em `spec.md`, as telas de formulário/detalhe (`purchases/new`, `purchases/[id]`, `purchases/[id]/edit`, `cards/new`, `cards/[id]`, `cards/[id]/edit`, `categories/new`, `categories/[id]/edit`, `fixed-expenses/new`, `fixed-expenses/[id]`, `fixed-expenses/[id]/edit`, `simulate`) já têm seu próprio `<main className="mx-auto max-w-sm p-4">` — esse `max-w-sm` interno continua sendo o limite efetivo dessas telas independentemente do `AppShell` ficar mais largo por fora (Req-04), então nada nelas muda.
- **Telas que efetivamente ganham largura:** `dashboard`, `purchases` (a tabela do spec original), `cards`, `fixed-expenses`, `settings/currencies` — todas usam `<main className="p-4">` ou equivalente sem `max-w` próprio, então herdam diretamente a nova largura do `AppShell` (Req-02/Req-05).
- **Sem mudança de padding/sidebar:** `pb-20`, `md:pb-4` e `md:pl-48` (linhas 6 e 8 de `app-shell.tsx`) permanecem exatamente como estão — não fazem parte do escopo e não têm relação com a largura do conteúdo (requisito de não-regressão do spec).

## 2. Esquema de Dados/API

- Nenhum. Mudança puramente de classes Tailwind em um único componente de layout (`AppShell`), sem props, sem estado, sem dado de servidor envolvido.

## 3. Bibliotecas e Dependências

- Nenhuma dependência nova — apenas classes utilitárias do Tailwind CSS 4 já em uso no projeto (`max-w-2xl`, `md:`, `lg:` já aparecem em outros arquivos do código-base).

## 4. Riscos e Validação

- **Risco:** grids internos de páginas como `dashboard/page.tsx` (`grid grid-cols-1 gap-3 sm:grid-cols-2`) podem ficar com colunas mais largas do que o desenhado originalmente, já que o container pai cresceu. Isso é o comportamento esperado e desejado (mais espaço aproveitado), não uma regressão — mas vale conferir visualmente no passo de validação manual.
- **Risco:** nenhuma tela usa unidades fixas em pixels dependentes do `max-w-2xl` anterior (confirmado por grep — todas usam classes Tailwind relativas), então não há necessidade de ajuste adicional em nenhuma outra tela.
- **Validação manual (sem suíte automatizada, conforme `constitution.md` seção 5):**
  1. Redimensionar a janela do navegador (ou usar as ferramentas de dev) para simular mobile (< `md`) e confirmar que nenhuma tela mudou visualmente.
  2. Em largura de desktop (>= `lg`), abrir `/purchases` e confirmar que a tabela ocupa visivelmente mais espaço horizontal, com colunas menos espremidas.
  3. Em desktop, abrir `/dashboard`, `/cards` e `/fixed-expenses` e confirmar que o conteúdo também ficou mais largo e continua centralizado ao lado da sidebar.
  4. Em desktop, abrir uma tela de formulário (ex.: `/purchases/new`, `/cards/new`) e confirmar que ela **continua estreita** (não esticou), graças ao `max-w-sm` interno.
  5. Confirmar que a `SidebarNav` (desktop) e o `BottomNav` (mobile) continuam se comportando normalmente, sem sobreposição ou corte de conteúdo.
  6. Rodar `npm run lint` e `tsc --noEmit`.
