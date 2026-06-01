# Plano: Garantir que a pesquisadora nunca perca itens já preenchidos

## Objetivo
Eliminar a perda de dados na coleta de preços e reduzir a lentidão, sem alterar onde as fotos são armazenadas. A regra central passa a ser: **nada digitado pode ser perdido**, mesmo com lentidão, falha de rede, recarregamento ou fechamento acidental da página.

## Causas identificadas
1. **Fotos pesam no salvamento.** Cada foto é gravada em base64 dentro da própria coleta. A cada digitação de preço, o salvamento automático reenvia todas as fotos juntas, deixando a gravação lenta e instável após algumas fotos.
2. **Janela de perda ao atualizar.** O salvamento espera 2s (debounce) e não há proteção ao recarregar/fechar. Atualizar nesse intervalo (ou durante uma gravação lenta) perde os últimos itens.
3. **Falha silenciosa.** Se a gravação falha, o erro só vai para o console — sem nova tentativa e sem avisar. A pesquisadora pensa que salvou.
4. **Fotos podem ser apagadas.** Ao abrir a coleta, as fotos não são carregadas (otimização). Ao editar um preço, o salvamento sobrescreve as fotos já existentes com vazio.

## O que será feito

### 1. Rascunho local automático (garantia principal)
- A cada alteração (preço, observação, marca, foto), gravar imediatamente um rascunho no armazenamento local do navegador, identificado pela coleta.
- Ao abrir a coleta, comparar o rascunho local com o que veio do servidor e restaurar automaticamente o que ainda não foi salvo. Assim, mesmo com recarregamento ou queda do app, nada digitado se perde.
- O rascunho local só é apagado depois que o servidor confirma a gravação.

### 2. Salvamento confiável e honesto
- Adicionar novas tentativas automáticas (com espera crescente) quando a gravação falha.
- Mostrar o estado real: "Salvando…", "Salvo HH:MM" e, em caso de falha, "Erro ao salvar — tentando novamente". O selo "Salvo" só aparece após confirmação do servidor.
- Forçar a gravação pendente antes de finalizar a coleta e antes de sair da tela.

### 3. Proteção ao recarregar/sair
- Avisar a pesquisadora se ela tentar fechar/recarregar com alterações ainda não confirmadas.
- Disparar uma gravação imediata ao sair da tela de produtos.

### 4. Correção do bug das fotos
- Carregar as fotos já existentes da coleta aberta (consulta de uma única coleta), para a tela iniciar com os dados reais e nunca sobrescrever com vazio.
- Separar a gravação das fotos da gravação de preços: digitar preço deixa de reenviar as fotos, o que também reduz bastante a lentidão.

## Resultado esperado
- Nenhum item preenchido é perdido em recarregamento, queda ou falha de rede.
- Digitar preços fica mais rápido, pois o salvamento deixa de carregar as fotos junto.
- A pesquisadora sempre sabe se está salvo de verdade.

---

## Detalhes técnicos

**Arquivos afetados:** `src/hooks/useAutoSave.ts`, `src/components/researcher/ProductList.tsx`, `src/components/researcher/ColetaDetail.tsx`, `src/hooks/useColetasPesquisador.ts`. Sem migração de banco.

1. **Rascunho local (novo hook `useColetaDraft` ou extensão do `useAutoSave`)**
   - Chave `coleta-draft:<coletaId>` em `localStorage`, contendo `{ precos, observacoes, textosMaisBarato, fotos, updatedAt }`.
   - Escrita síncrona em cada `setState` relevante (instantânea, não depende do debounce).
   - Na montagem do `ProductList`, hidratar o estado mesclando servidor + rascunho (rascunho vence por ser o mais recente) e disparar um save para reconciliar com o banco.
   - Limpar a chave somente após `onSave` resolver com sucesso.

2. **`useAutoSave` mais robusto**
   - Retry com backoff (ex.: 1s, 3s, 8s) e estado `saveError`.
   - Expor `flush()` para gravar imediatamente (usado em finalizar/desmontar).
   - Manter `lastSaved` apenas em sucesso confirmado.

3. **Proteção de saída**
   - `beforeunload` quando houver alterações pendentes (debounce ativo, retry pendente ou rascunho não confirmado).
   - Chamar `flush()` no cleanup do `ProductList` e antes de `onFinalizarColeta`.

4. **Fotos**
   - Em `ColetaDetail`/`ProductList`, buscar a coluna `fotos` da coleta atual (`select('fotos').eq('id', coleta.id).single()`) ao abrir, para inicializar o estado real.
   - Separar a persistência: o debounce de preços/observações deixa de incluir `fotos`; as fotos passam a ser gravadas em efeito próprio disparado só quando `fotos` muda.
   - `useColetasPesquisador.updateColeta` continua enviando apenas os campos presentes em `updates`, evitando sobrescrever `fotos` quando não foram alteradas.

5. **Status na UI**
   - Substituir os selos atuais por: "Salvando…", "Salvo HH:MM" e "Erro ao salvar — tentando novamente" (destaque), refletindo o estado real do `useAutoSave`.