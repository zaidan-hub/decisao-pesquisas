## Diagnóstico

O modal `RelatorioPersonalizadoModal.tsx` (~950 linhas) renderiza dois grandes painéis em árvore. Os gargalos atuais que explicam a lentidão (5–6s para ações simples) são:

1. **Painel direito re-renderiza tudo a cada clique.** Toda a lista `items` é re-mapeada e cada linha cria do zero: um `<Select>` Radix com **N opções** de pai, 3–4 `<Button>` Radix, ícones, handlers inline. Em listas com centenas de itens isso vira milhares de componentes Radix sendo desmontados/remontados a cada `setItems`, `setCollapsedX`, `setRenomeando`, etc.
2. **Filtragem por ancestral é feita dentro do `.map`.** Mesmo itens "escondidos" passam pelo cálculo `getAncestors` + `return null` — paga-se o custo de iterar todos os itens em toda renderização.
3. **`Select` (Radix) sempre montado em cada linha.** O `SelectTrigger` é leve, mas a árvore inteira de subscrições/refs do Radix Select multiplicada por centenas de linhas é cara — e o `SelectContent` é re-criado a cada render. Para uma ação que 99% do tempo nem é usada (mover pai), pagamos esse custo o tempo todo.
4. **`ScrollArea` (Radix) com listas grandes.** Adiciona observers e wrappers caros versus um `div` com `overflow-auto`.
5. **Painel esquerdo: nós sempre montam `Checkbox` Radix mesmo quando colapsados** — ok, mas departamentos/grupos visíveis (mesmo sem filhos expandidos) também passam pelo mapeamento inteiro a cada keystroke/clique.
6. **Sets imutáveis recriados** (`toggleSet`) → mudança de identidade em todo render → memos sem efeito.
7. **Handlers inline em cada linha** impedem qualquer `React.memo` de funcionar.

## Plano de otimização (apenas em `src/components/admin/RelatorioPersonalizadoModal.tsx`)

### 1. Pré-filtrar itens visíveis no painel direito
- Criar `useMemo` `itensVisiveis` que produz `[{ item, idx }]` já sem os escondidos por ancestral colapsado, usando os mapas `subParent`/`grupoParent`. O `.map` da UI passa a iterar só os visíveis.
- Mantém `idx` original para `moverItem`/`removerItem` continuarem funcionando.

### 2. Extrair `HierarquiaRow` como componente `React.memo`
- Props: `item`, `idx`, `nome`, `colapsado`, `opcoesPai`, e callbacks **estáveis** (`onToggleCollapse`, `onMove`, `onRemove`, `onRename`, `onReatribuir`).
- No componente pai, tornar todos os callbacks `useCallback` lendo state via `useRef` (ou via `setItems(prev => ...)`) para que sua identidade não mude. Resultado: ao colapsar um nó, só a linha do nó re-renderiza — não as centenas restantes.
- O nome do item (`getNome`) também passa pré-computado para cada linha visível, evitando lookup repetido.

### 3. Lazy-mount do `<Select>` de "mover pai"
- Substituir o `<Select>` sempre-montado por um botão `MoveRight` que, ao clicar, abre um `<Popover>` simples com a lista de opções (renderizado só enquanto aberto), **ou** por um `<DropdownMenu>` com `modal={false}` montado on-demand.
- Implementação proposta: um sub-componente `ReatribuirPaiButton` controlado por estado `open` local. Enquanto fechado, renderiza apenas um `<Button>` simples — sem Radix Select, sem 100 `<SelectItem>` criados por linha.
- Ganho típico: 5–10× menos nodes/refs por linha.

### 4. Trocar `ScrollArea` por `div` com `overflow-auto`
- Tanto no painel esquerdo quanto no direito. Mantém scroll nativo, elimina os ResizeObservers do Radix.

### 5. Otimizar painel esquerdo
- Extrair `DepartamentoNode`, `GrupoNode`, `SubgrupoNode`, `ProdutoRow` como componentes `React.memo`, recebendo `selectedItems`/`expanded*` via contexto leve (`useContext`) — ou via props já memoizadas. Assim, expandir um grupo só re-renderiza aquele grupo.
- `toggleSet` passa a usar `setExpandedDeps(prev => { const n = new Set(prev); ... })` (já faz isso indiretamente) e os componentes filhos só re-renderizam se a chave deles muda — usar booleano direto via props evita comparar Set inteiro.

### 6. Estabilizar callbacks e memos
- `useCallback` em: `handleSelectItem`, `moverItem`, `removerItem`, `reatribuirParent`, `toggleCollapse*`, `aplicarRenomeio`, `handleAdicionarSelecionados`.
- `itemMeta` continua memoizado, mas suas dependências (`departamentosMap`, etc.) já são estáveis.

### 7. (Opcional, se necessário após 1–6) Virtualização
- Se ainda houver listas com 1000+ itens lentas, adicionar `@tanstack/react-virtual` apenas no painel direito (mais alto ROI). Não introduzir antes — as 6 mudanças acima devem resolver o caso comum sem virtualização.

## Ordem de implementação

1. Extrair `HierarquiaRow` + `ReatribuirPaiButton` lazy (passos 2 e 3) — maior ganho.
2. Pré-filtrar `itensVisiveis` (passo 1).
3. Estabilizar callbacks (passo 6).
4. Trocar `ScrollArea` por `div overflow-auto` (passo 4).
5. Memoizar nodes do painel esquerdo (passo 5).
6. Medir; aplicar virtualização só se ainda houver lentidão (passo 7).

## Resultado esperado

- Clique para colapsar/expandir: re-render localizado em 1 linha (atualmente ~todas as linhas).
- Abrir dropdown de pai: única hora em que a lista de opções é criada (atualmente sempre).
- Buscar/digitar: já usa `useDeferredValue`, mas com `React.memo` corretamente aplicado as linhas do painel direito (que não mudam com a busca esquerda) deixam de re-renderizar.

Nenhuma mudança de comportamento, persistência, RLS ou esquema — somente arquitetura de render do componente.
