## Objetivo

Na lista "Hierarquia" (painel direito) do modal de Relatórios Personalizados, adicionar:

1. Contrair/expandir nós (departamento, grupo, subgrupo) — ocultando os filhos na visualização.
2. Corrigir os botões ↑ / ↓ para que cada item só troque de lugar com um item do mesmo tipo (departamento ↔ departamento, grupo ↔ grupo, subgrupo ↔ subgrupo, produto ↔ produto), em vez de simplesmente trocar com o item adjacente no array.

## Mudanças (apenas em `src/components/admin/RelatorioPersonalizadoModal.tsx`)

### 1. Estado de collapse no editor
- Adicionar `collapsedDeps`, `collapsedGrupos`, `collapsedSubs` (`Set<string>`) ao `RelatorioEditor`.
- Render: em cada linha de departamento/grupo/subgrupo, prefixar um botão chevron (`ChevronDown` quando expandido, `ChevronRight` quando contraído) que alterna o respectivo Set. Para `produto`, manter um pequeno espaçador para alinhar.
- No `.map` da `items`, esconder a renderização de qualquer item cujo ancestral esteja colapsado:
  - produto escondido se seu `parentId` (subgrupo) estiver em `collapsedSubs`, OU se o grupo pai do subgrupo estiver em `collapsedGrupos`, OU se o departamento avô estiver em `collapsedDeps`.
  - subgrupo escondido se seu grupo pai estiver em `collapsedGrupos` ou o departamento avô estiver em `collapsedDeps`.
  - grupo escondido se seu departamento pai estiver em `collapsedDeps`.
- Para resolver os ancestrais, derivar de `items` (cada item tem `parentId`) — fazer um helper `getAncestors(item)` que retorna `{ depId, grupoId, subId }`.

### 2. Mover apenas com vizinhos do mesmo tipo (mantendo subárvore)

Substituir `moverItem(idx, dir)` por uma versão que opera em "blocos":

- Um **bloco** de um item começa no seu índice e termina antes do próximo item de tipo de mesma profundidade-ou-maior (ou seja, inclui todos os descendentes consecutivos com nível de tipo > nível do alvo). Níveis: departamento=0, grupo=1, subgrupo=2, produto=3.
- Algoritmo `moveSameType(idx, dir)`:
  1. Identificar o bloco do item alvo (`[start, end)`).
  2. Procurar o **próximo bloco de mesmo `tipo`** na direção `dir`:
     - `dir = +1`: começar no índice `end`, varrer adiante até achar item com `tipo === alvo.tipo` (será o início do bloco vizinho); calcular o `end` desse bloco. Trocar os dois blocos consecutivos ou não.
     - `dir = -1`: varrer de trás pra frente a partir de `start-1` até achar item com `tipo === alvo.tipo`; esse é o início do bloco anterior; o `end` dele é `start`.
  3. Se não existir vizinho do mesmo tipo, não faz nada.
  4. Reordenar o array juntando: prefixo + (bloco vizinho) + (itens entre blocos, se houver) + (bloco alvo) + sufixo — para o caso `+1`; espelhado para `-1`.
- Resultado: um subgrupo trocará de posição com o próximo/anterior subgrupo, levando seus produtos junto; idem para grupo (leva subgrupos + produtos) e departamento (leva tudo abaixo).

Manter `parentId` inalterado (a operação só reordena, não muda hierarquia).

### 3. UI / acessibilidade

- Botão chevron ocupa ~16px à esquerda da linha (antes do `[D]/[G]/[S]/[P]`).
- Para `produto`, renderizar um `<span className="w-4" />` no lugar do chevron para manter alinhamento.
- Tooltip dos botões ↑/↓ continua "Mover para cima/baixo".

Nada mais é tocado: árvore esquerda, persistência, seleção e renomear ficam como estão.