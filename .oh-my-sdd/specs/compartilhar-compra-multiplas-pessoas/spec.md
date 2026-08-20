# Spec: Divisão de compra entre múltiplos participantes

## 1. Intenção e Visão Geral

Hoje uma compra só pode ser "compartilhada" de forma binária: 100% do dono ou 50/50 com a única outra pessoa cadastrada no app (`isShared` + `ownerUserId`, via `getOtherUser()`). Isso não cobre o caso de uma viagem em grupo: o usuário paga tudo no próprio cartão, mas quer dividir o valor entre vários amigos, alguns dos quais ainda não têm cadastro no sistema.

Esta feature generaliza o compartilhamento atual de "1 pessoa fixa" para "N participantes escolhidos", reaproveitando o mesmo conceito (o caso atual de 50/50 com a outra pessoa passa a ser só um caso particular com N=2). Participantes são sempre usuários reais do sistema (com login próprio) — se a pessoa ainda não existe, o próprio fluxo de seleção permite criá-la na hora, com uma senha padrão previsível (nome + "123"), decisão aceita explicitamente pelo usuário dado o caráter pessoal do app.

Fora do escopo desta feature: gastos fixos (`FixedExpense`) continuam com o compartilhamento binário atual; não há valores customizados por participante (divisão é sempre igualitária); não há controle de status de pagamento por participante (é só informativo, "quanto cada um deve").

## 2. Requisitos Funcionais (Padrão EARS/GEARS)

- **[Req-01]** **When** o usuário cria ou edita uma compra, o sistema **shall** permitir selecionar zero ou mais participantes adicionais (além do próprio dono do cartão) para dividir o valor.
- **[Req-02]** **When** o usuário digita, no seletor de participantes, um nome que não corresponde a nenhum usuário existente, o sistema **shall** oferecer a opção de criar um novo usuário com esse nome diretamente no fluxo de seleção.
- **[Req-03]** **When** um novo participante é criado a partir do seletor, o sistema **shall** gerar um `username` derivado do nome (minúsculo, sem acentos/espaços) e uma senha no padrão `<username>123`, persistindo apenas o hash bcrypt da senha (nunca texto puro).
- **[Req-04]** **If** o `username` gerado para um novo participante já existir, o sistema **shall** garantir unicidade acrescentando um sufixo numérico incremental (ex.: `joao`, `joao2`, `joao3`, ...).
- **[Req-05]** **When** uma compra tem um ou mais participantes adicionais, o sistema **shall** dividir o valor de cada parcela igualmente entre o dono e todos os participantes, garantindo que a soma das partes bata exatamente com o valor da parcela (sem perda de centavos por arredondamento).
- **[Req-06]** **When** uma compra não tem nenhum participante adicional, o sistema **shall** manter o comportamento atual: 100% do valor atribuído ao dono.
- **[Req-07]** **While** um usuário está autenticado, o sistema **shall** exibir, nas listagens e no detalhe de compra, apenas as compras em que ele é o dono ou um dos participantes.
- **[Req-08]** **When** uma compra compartilhada é exibida (listagem, detalhe, modal de edição), o sistema **shall** mostrar os nomes de todos os participantes (dono + demais), não apenas um "outro usuário" fixo.
- **[Req-09]** **When** o dashboard calcula "minha parte" de uma parcela de compra compartilhada, o sistema **shall** calcular a parte proporcional a 1/N participantes (generalizando a divisão fixa por 2 usada hoje), aplicada apenas quando o usuário logado é dono ou participante daquela compra.
- **[Req-10]** **If** o usuário tentar remover o próprio dono da lista de participantes de uma compra, o sistema **shall** rejeitar a alteração — o dono é sempre um dos participantes.
- **[Req-11]** **While** uma compra já tem parcela paga, o sistema **shall** continuar permitindo editar a lista de participantes (mesma exceção já aplicada a cartão/descrição/categoria/compartilhamento na Story 1.14), mesmo bloqueando valor/nº de parcelas/data.

## 3. Critérios de Aceite

- [ ] Ao criar/editar uma compra, é possível selecionar múltiplos participantes existentes (não só "compartilhar sim/não").
- [ ] Digitar um nome inexistente no seletor de participantes oferece a opção "criar novo participante" inline, sem sair do formulário de compra.
- [ ] Um participante criado inline vira um usuário real, capaz de fazer login com `username`/`<username>123`.
- [ ] Dois participantes criados com nomes que gerariam o mesmo `username` recebem `username`s únicos (sufixo numérico).
- [ ] Uma compra de R$ 100,00 dividida entre o dono + 2 participantes gera partes cuja soma é exatamente R$ 100,00 (ex.: R$ 33,34 + R$ 33,33 + R$ 33,33), sem sobra nem falta de centavos.
- [ ] Uma compra sem participantes adicionais continua 100% do dono, como hoje.
- [ ] A listagem e o detalhe de compra mostram os nomes de todos os participantes de uma compra compartilhada (não mais um "outro usuário" fixo).
- [ ] Um usuário só vê no `/purchases` as compras em que é dono ou participante.
- [ ] O dashboard mostra a parte do usuário logado como 1/N do valor da parcela, quando ele é dono ou participante de uma compra com N pessoas.
- [ ] Tentar remover o dono da lista de participantes na edição é bloqueado.
- [ ] Editar participantes de uma compra com parcela já paga continua permitido (assim como hoje é permitido editar compartilhamento).
- [ ] Gastos fixos (`FixedExpense`) não são afetados — continuam com o `isShared` binário atual.

## 4. Requisitos Não-Funcionais e Contratos

- **Segurança:**
  - Senha padrão previsível (`<username>123`) é uma decisão de produto aceita explicitamente para este app pessoal — **não** deve ser "corrigida" silenciamente para senha aleatória durante a implementação.
  - Hash de senha continua exclusivamente via `bcryptjs`, mesmo padrão de `verifyPassword`/criação de usuário já existente no sistema. Senha em texto puro nunca é logada, retornada em resposta de action ou persistida.
  - Criação de novo participante só pode ser disparada por um usuário autenticado (`requireUser()`), dentro do fluxo de criar/editar compra.
  - Toda entrada (nome do participante, lista de IDs de participantes) passa por validação Zod antes de tocar o banco, seguindo o padrão já usado em `purchaseSchema`.
- **Contrato de dados (input das Server Actions de compra):**
  - `createPurchase`/`updatePurchase` passam a receber `additionalParticipantUserIds: string[]` (IDs de usuários, excluindo o próprio dono — pode ser vazio) no lugar do atual `isShared: boolean`.
  - Nova action de criação de participante inline recebe `{ name: string }` (obrigatório, não vazio) e retorna o usuário criado (`id`, `name`, `username`) para uso imediato na seleção.
- **Compatibilidade:** a divisão igualitária entre N participantes deve reaproveitar a mesma lógica de divisão exata por centavos já existente (`splitValue` em `src/lib/money.ts`), generalizando o cálculo hoje restrito a "metade" (`userShareCents`) para "1/N".
- **Fora de escopo (não implementar nesta feature):**
  - Valores customizados por participante (divisão sempre igualitária).
  - Controle de status de pagamento por participante (marcar "já pagou").
  - Extensão do mesmo modelo para `FixedExpense`.
  - Mudanças na tela de login (já é genérica para qualquer usuário cadastrado, não precisa de alteração).
  - Edição/remoção de conta de um participante depois de criado (gestão de usuários em geral não faz parte desta feature).
