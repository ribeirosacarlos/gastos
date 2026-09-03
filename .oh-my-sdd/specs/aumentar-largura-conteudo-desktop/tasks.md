## Tasks

- [x] 1. Em `src/components/app-shell.tsx`, alterar a classe `max-w-2xl` do wrapper de conteúdo para `max-w-2xl md:max-w-4xl lg:max-w-6xl`, mantendo `mx-auto`, `pb-20` e `md:pb-4` inalterados.
- [x] 2. Rodar `npm run lint` e `tsc --noEmit` e corrigir eventuais erros/avisos introduzidos.
- [ ] 3. Validar manualmente em largura mobile (< `md`): nenhuma tela do app muda visualmente.
- [ ] 4. Validar manualmente em largura desktop (>= `lg`): `/purchases` exibe a tabela com colunas visivelmente menos espremidas.
- [ ] 5. Validar manualmente em largura desktop: `/dashboard`, `/cards` e `/fixed-expenses` também ficam mais largos e continuam centralizados ao lado da sidebar.
- [ ] 6. Validar manualmente em largura desktop: uma tela de formulário (ex.: `/purchases/new` ou `/cards/new`) continua com a mesma largura estreita de hoje, sem esticar.
- [ ] 7. Validar manualmente que `SidebarNav` (desktop) e `BottomNav` (mobile) continuam se comportando normalmente, sem sobreposição ou corte de conteúdo.
