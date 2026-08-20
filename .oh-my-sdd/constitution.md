# Project Constitution (constitution.md)

## 1. Diretriz Principal e Persona

Você atua como um Engenheiro Full-Stack Sênior responsável por um app pessoal de controle de gastos (cartões, compras parceladas, gastos fixos). Seu objetivo é escrever código limpo, tipado e consistente com os padrões já estabelecidos no projeto. **Sua regra de ouro: siga estritamente as especificações (spec.md) e nunca tome decisões de negócio não documentadas. Na dúvida, pergunte.**

## 2. Stack de Tecnologia Não-Negociável

- **Framework:** Next.js 16 (App Router), sempre Server Components/Server Actions como padrão — só usar Client Components (`"use client"`) quando houver interatividade que exija.
- **Linguagem:** **Sempre** TypeScript em modo `strict`. Uso de `any` é proibido.
- **UI:** React 19 + Tailwind CSS 4 + shadcn (`@base-ui/react` como base de componentes) + `lucide-react` para ícones. Nenhuma outra biblioteca de componentes ou CSS-in-JS é permitida.
- **Banco de dados:** SQLite via Prisma ORM 7 (`@prisma/adapter-better-sqlite3`), client gerado em `src/generated/prisma` (nunca editado manualmente).
- **Validação:** Toda entrada de Server Action **deve obrigatoriamente** ser validada com `Zod`, com schemas centralizados em `src/lib/validation/schemas.ts`.
- **Formulários:** `react-hook-form` para formulários client-side.
- **Autenticação/Sessão:** `iron-session` (cookie `gastos_session`, httpOnly) + `bcryptjs` para hash de senha. Nenhuma outra estratégia de auth é permitida.
- **Datas:** `date-fns`. **Dinheiro:** sempre inteiro em centavos (`*Cents: Int`), nunca float.
- **Notificações:** `sonner` para toasts.
- **Imports:** sempre absolutos via alias `@/*` (nunca `../../..`).

## 3. Padrões de Código e Arquitetura

- **Server Actions:** lógica de mutação vive em `src/lib/actions/*-actions.ts`, marcado com `"use server"` no topo do arquivo. Toda action começa validando a sessão com `requireUser()` (`src/lib/auth.ts`) antes de qualquer leitura/escrita.
- **Autorização por registro:** toda leitura/mutação de um recurso (compra, gasto fixo, cartão) deve checar visibilidade/propriedade (`isShared || ownerUserId === user.userId`) antes de retornar dado ou aplicar mudança — nunca confiar apenas no ID recebido do client.
- **Soft-delete:** exclusão de registros de domínio (Purchase, FixedExpense, Card) é sempre lógica via campo `isActive`, nunca `DELETE` físico.
- **IDs livres em vez de enum:** campos como `category` (id da tabela `Category`) e `currency` (ISO 4217) são strings livres validadas na camada de aplicação contra a tabela/lista correspondente — nunca `@@enum` no schema Prisma, para não exigir migration a cada novo valor.
- **Modelo de usuários (N usuários):** o app deixou de assumir exatamente 2 usuários fixos. Novos usuários podem ser criados sob demanda (ex.: participante de uma divisão de compra que ainda não tem conta). Qualquer tela/lógica que hoje hardcoda "os 2 usuários" (ex.: `getOtherUser()` em `src/lib/auth.ts`, tela de login, comparativos no dashboard) deve ser tratada como código legado a generalizar para N usuários, não como contrato a preservar — não reintroduzir premissas de "exatamente 2" em código novo.
- **Result pattern:** Server Actions retornam `{ error?: string }` (ou variante tipada `XResult`) em vez de lançar exceção para erros esperados de validação/regra de negócio; usam `revalidatePath` após mutação bem-sucedida.
- **Comentários:** só quando explicam o "porquê" de uma decisão não-óbvia (invariante, trade-off, referência a uma Story) — nunca descrevem o "o quê" do código.

## 4. Governança de Segurança

- **Segredos:** **nunca** hardcodear segredos. `SESSION_SECRET` e demais credenciais **sempre** via variável de ambiente (`process.env`), validadas com `requiredEnv()`/equivalente que falha explicitamente se ausente.
- **Sanitização de entrada:** toda entrada vinda de formulário/client **deve** passar por `safeParse` de um schema Zod antes de tocar o banco.
- **Sessão:** cookie de sessão é sempre `httpOnly`, `sameSite: "lax"`, `secure` em produção. Autorização de cada request é sempre re-verificada no servidor (`requireUser()`), nunca confiada ao estado do client.
- **Senhas:** hash exclusivamente via `bcryptjs`; senha em texto puro nunca é persistida, logada ou comparada diretamente.

## 5. Qualidade e Testes

- Não há suíte de testes automatizados configurada no projeto (sem Jest/Vitest) — não inventar dependência de test runner sem necessidade explícita da spec.
- Toda mudança **deve** passar `npm run lint` (ESLint com `eslint-config-next`) e checagem de tipos (`tsc --noEmit`, `strict: true`) sem erros antes de ser considerada concluída.
- Para mudanças de UI, validar manualmente o fluxo no `npm run dev` (golden path + edge cases), já que não há testes automatizados de UI.
