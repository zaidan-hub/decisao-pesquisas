import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Produto, Grupo, Subgrupo, Supermercado, Coleta, Departamento } from '@/types';

interface RelatorioData {
  nome: string;
  nomeCliente: string;
  data: string;
  produtos: Produto[];
  coletas: Coleta[];
  supermercados: Supermercado[];
  grupos: Grupo[];
  subgrupos: Subgrupo[];
  departamentos: Departamento[];
  hierarquiaCustomizada?: {
    departamentos?: { [id: string]: string };
    grupos?: { [id: string]: string };
    subgrupos?: { [id: string]: string };
  };
}

// Gera PDF do relatório
export const generatePDF = (data: RelatorioData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFontSize(16);
  doc.text(data.nomeCliente, pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(new Date(data.data).toLocaleDateString('pt-BR'), pageWidth / 2, 22, { align: 'center' });

  // Informações das coletas
  let yPos = 30;
  doc.setFontSize(9);
  
  // Agrupar coletas por supermercado
  const coletasPorSupermercado = new Map<string, { data: string, nome: string }>();
  data.coletas.forEach(coleta => {
    const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
    if (supermercado) {
      coletasPorSupermercado.set(supermercado.id, {
        data: new Date(coleta.data).toLocaleDateString('pt-BR'),
        nome: supermercado.nome
      });
    }
  });

  // (Informações de Datas e Supermercados removidas do cabeçalho do relatório)


  // Estatísticas
  const produtosPesquisados = data.produtos.length;
  let produtosEncontrados = 0;
  let produtosNaoEncontrados = 0;

  data.produtos.forEach(produto => {
    const temPreco = data.coletas.some(coleta => {
      // Priorizar preços editados pelo admin
      const precoFinal = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
      return precoFinal > 0;
    });
    if (temPreco) {
      produtosEncontrados++;
    } else {
      produtosNaoEncontrados++;
    }
  });

  doc.text(`Produtos pesquisados: ${produtosPesquisados}`, 14, yPos);
  yPos += 5;
  doc.text(`Produtos encontrados: ${produtosEncontrados}`, 14, yPos);
  yPos += 5;
  doc.text(`Produtos não encontrados: ${produtosNaoEncontrados}`, 14, yPos);
  yPos += 8;

  // Criar estrutura hierárquica: Departamento -> Grupo -> Subgrupo -> Produtos
  const tableData: any[] = [];
  const symbolsMap = new Map<number, Map<number, string>>(); // rowIndex -> colIndex -> symbol
  let currentRowIndex = 0;
  
  // Agrupar produtos por departamento, grupo e subgrupo
  const hierarchy = new Map<string, Map<string, Map<string, Produto[]>>>();
  
  data.produtos.forEach(produto => {
    const subgrupo = data.subgrupos.find(s => s.id === produto.subgrupoId);
    const grupo = data.grupos.find(g => g.id === produto.grupoId);
    const departamento = grupo?.departamentoId 
      ? data.departamentos.find(d => d.id === grupo.departamentoId)
      : null;
    
    // Usar nomes customizados se disponíveis, senão usar os originais
    const depNome = departamento 
      ? (data.hierarquiaCustomizada?.departamentos?.[departamento.id] || departamento.nome)
      : 'SEM DEPARTAMENTO';
    const grupoNome = grupo
      ? (data.hierarquiaCustomizada?.grupos?.[grupo.id] || grupo.nome)
      : 'SEM GRUPO';
    const subgrupoNome = subgrupo
      ? (data.hierarquiaCustomizada?.subgrupos?.[subgrupo.id] || subgrupo.nome)
      : 'SEM SUBGRUPO';
    
    const depKey = depNome;
    const grupoKey = grupoNome;
    const subgrupoKey = subgrupoNome;
    
    if (!hierarchy.has(depKey)) {
      hierarchy.set(depKey, new Map());
    }
    const grupoMap = hierarchy.get(depKey)!;
    
    if (!grupoMap.has(grupoKey)) {
      grupoMap.set(grupoKey, new Map());
    }
    const subgrupoMap = grupoMap.get(grupoKey)!;
    
    if (!subgrupoMap.has(subgrupoKey)) {
      subgrupoMap.set(subgrupoKey, []);
    }
    subgrupoMap.get(subgrupoKey)!.push(produto);
  });
  
  // Ordenar e criar linhas da tabela com hierarquia
  const sortedDepartamentos = Array.from(hierarchy.keys());
  
  sortedDepartamentos.forEach(depNome => {
    // Adicionar linha do departamento (em negrito via estilo)
    tableData.push([{
      content: depNome.toUpperCase(),
      colSpan: 3 + data.coletas.length,
      styles: { fontStyle: 'bold', fontSize: 10, fillColor: [240, 240, 240] }
    }]);
    currentRowIndex++;
    
    const grupoMap = hierarchy.get(depNome)!;
    const sortedGrupos = Array.from(grupoMap.keys());
    
    sortedGrupos.forEach(grupoNome => {
      // Adicionar linha do grupo (indentada)
      tableData.push([{
        content: '  ' + grupoNome.toUpperCase(),
        colSpan: 3 + data.coletas.length,
        styles: { fontStyle: 'bold', fontSize: 9, fillColor: [250, 250, 250] }
      }]);
      currentRowIndex++;
      
      const subgrupoMap = grupoMap.get(grupoNome)!;
      const sortedSubgrupos = Array.from(subgrupoMap.keys());
      
      sortedSubgrupos.forEach(subgrupoNome => {
        // Adicionar linha do subgrupo (mais indentada)
        tableData.push([{
          content: '    ' + subgrupoNome.toUpperCase(),
          colSpan: 3 + data.coletas.length,
          styles: { fontStyle: 'bold', fontSize: 8 }
        }]);
        currentRowIndex++;
        
        const produtos = subgrupoMap.get(subgrupoNome)!;
        const produtosOrdenados = produtos;
        
        // Adicionar produtos
        produtosOrdenados.forEach(produto => {
          const qntd = produto.quantidade && produto.unidadeMedida 
            ? `${produto.quantidade} ${produto.unidadeMedida}`
            : produto.quantidade || produto.unidadeMedida || '-';
          
          const row: any[] = [
            produto.codigo,
            produto.nome + (produto.maisBarato ? ' (+Barato)' : ''),
            qntd
          ];

          // Preços por supermercado (priorizar preços editados pelo admin)
          // IMPORTANTE: iterar pelas mesmas chaves de supermercado usadas no cabeçalho
          // para garantir alinhamento correto das colunas
          const precos: number[] = [];
          const textosMaisBarato: string[] = [];
          let temTextoMaisBarato = false;
          
          Array.from(coletasPorSupermercado.keys()).forEach(supermercadoId => {
            // Encontrar a coleta correspondente a este supermercado
            const coletasDoSuper = data.coletas.filter(c => c.supermercadoId === supermercadoId);
            // Pegar o melhor preço disponível entre as coletas do mesmo supermercado
            let preco = 0;
            let texto = '';
            for (const coleta of coletasDoSuper) {
              const p = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
              if (p > 0 && (preco === 0 || p < preco)) {
                preco = p;
                texto = coleta.textosMaisBarato?.[produto.id] || '';
              } else if (preco === 0) {
                texto = texto || coleta.textosMaisBarato?.[produto.id] || '';
              }
            }
            precos.push(preco);
            textosMaisBarato.push(texto);
            
            if (produto.maisBarato && texto && preco > 0) {
              temTextoMaisBarato = true;
            }
            
            row.push(preco > 0 ? `R$ ${preco.toFixed(2)}` : '-');
          });

          // Calcular máximo e mínimo (apenas preços > 0)
          const precosValidos = precos.filter(p => p > 0);
          if (precosValidos.length > 0) {
            const maxPreco = Math.max(...precosValidos);
            const minPreco = Math.min(...precosValidos);

            // Armazenar símbolos no mapa para desenhar coloridos depois
            if (!symbolsMap.has(currentRowIndex)) {
              symbolsMap.set(currentRowIndex, new Map());
            }
            
            for (let i = 0; i < precos.length; i++) {
              if (precos[i] > 0) {
                if (precos[i] === maxPreco && precos[i] === minPreco) {
                  symbolsMap.get(currentRowIndex)!.set(3 + i, '+ -');
                } else if (precos[i] === maxPreco) {
                  symbolsMap.get(currentRowIndex)!.set(3 + i, '+');
                } else if (precos[i] === minPreco) {
                  symbolsMap.get(currentRowIndex)!.set(3 + i, '-');
                }
              }
            }
          }

          tableData.push(row);
          currentRowIndex++;
          
          // Se for produto mais barato e tiver textos, adicionar linha com as marcas
          if (temTextoMaisBarato) {
            const marcasRow: any[] = ['', '', ''];
            textosMaisBarato.forEach(texto => {
              marcasRow.push(texto || '');
            });
            tableData.push(marcasRow);
            currentRowIndex++;
          }
        });
      });
    });
  });

  // Cabeçalhos da tabela (usar abreviação nas colunas)
  const supermercadoNomes = Array.from(coletasPorSupermercado.values()).map(c => {
    const supermercado = data.supermercados.find(s => s.nome === c.nome);
    return supermercado?.abreviacao || c.nome;
  });
  const headers = ['Código', 'Produto', 'Qntd', ...supermercadoNomes];
  const headRow: any[] = [
    'Código',
    'Produto',
    'Qntd',
    ...supermercadoNomes.map(nome => ({ content: nome, styles: { halign: 'right' } }))
  ];

  // Configurar alinhamento das colunas de preço
  const columnStyles: any = {
    0: { cellWidth: 20 },
    1: { cellWidth: 50 },
    2: { cellWidth: 25 }
  };
  for (let i = 3; i < headers.length; i++) {
    columnStyles[i] = { halign: 'right' };
  }

  const manualPriceTextMap = new Map<string, { valueText: string; symbol: string }>();

  autoTable(doc, {
    head: [headRow],
    body: tableData,
    startY: yPos,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles,
    willDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index < 3) return;

      const rowSymbols = symbolsMap.get(data.row.index);
      const symbol = rowSymbols?.get(data.column.index);
      const cellText = data.cell.text?.[0];

      if (!symbol || !cellText || cellText === '-') return;

      manualPriceTextMap.set(`${data.row.index}-${data.column.index}`, {
        valueText: cellText,
        symbol,
      });

      data.cell.text = [''];
    },
    didDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index < 3) return;

      const manualCell = manualPriceTextMap.get(`${data.row.index}-${data.column.index}`);
      if (!manualCell) return;

      const { valueText, symbol } = manualCell;
      const fontSize = data.cell.styles.fontSize || 8;
      const textPos = (data.cell as any).getTextPos();
      const lineY = textPos.y + fontSize * 0.3;
      const rightEdgeX = textPos.x;
      const gap = 0.8;

      doc.setFontSize(fontSize);

      const plusWidth = symbol.includes('+') ? doc.getTextWidth('+') : 0;
      const minusWidth = symbol.includes('-') ? doc.getTextWidth('-') : 0;
      const symbolsWidth = plusWidth + (symbol.includes('+') && symbol.includes('-') ? gap : 0) + minusWidth;
      const valueRightX = rightEdgeX - symbolsWidth - gap;

      doc.setTextColor(0, 0, 0);
      doc.text(valueText, valueRightX, lineY, { align: 'right' });

      let currentX = valueRightX + gap;

      if (symbol.includes('+')) {
        doc.setTextColor(0, 0, 255);
        doc.text('+', currentX, lineY);
        currentX += plusWidth + (symbol.includes('-') ? gap : 0);
      }

      if (symbol.includes('-')) {
        doc.setTextColor(255, 0, 0);
        doc.text('-', currentX, lineY);
      }

      doc.setTextColor(0, 0, 0);
      manualPriceTextMap.delete(`${data.row.index}-${data.column.index}`);
    }
  });

  doc.save(`${data.nomeCliente}_${data.data}.pdf`);
};

// Gera PDF de Produtos Não Encontrados
export const generateProdutosNaoEncontradosPDF = (data: RelatorioData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFontSize(16);
  doc.text(data.nomeCliente, pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(new Date(data.data).toLocaleDateString('pt-BR'), pageWidth / 2, 22, { align: 'center' });

  // Informações das coletas
  let yPos = 30;
  doc.setFontSize(9);
  
  // Agrupar coletas por supermercado
  const coletasPorSupermercado = new Map<string, { data: string, nome: string }>();
  data.coletas.forEach(coleta => {
    const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
    if (supermercado) {
      coletasPorSupermercado.set(supermercado.id, {
        data: new Date(coleta.data).toLocaleDateString('pt-BR'),
        nome: supermercado.nome
      });
    }
  });

  // (Informações de Datas e Supermercados removidas do cabeçalho do relatório)


  // Identificar produtos não encontrados
  const produtosNaoEncontrados = data.produtos.filter(produto => {
    const temPreco = data.coletas.some(coleta => {
      const precoFinal = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
      return precoFinal > 0;
    });
    return !temPreco;
  });

  // Quantidade de produtos não encontrados
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Produtos não encontrados: ${produtosNaoEncontrados.length}`, 14, yPos);
  yPos += 8;

  // Criar estrutura hierárquica para produtos não encontrados
  const tableData: any[] = [];
  const hierarchy = new Map<string, Map<string, Map<string, Produto[]>>>();
  
  produtosNaoEncontrados.forEach(produto => {
    const subgrupo = data.subgrupos.find(s => s.id === produto.subgrupoId);
    const grupo = data.grupos.find(g => g.id === produto.grupoId);
    const departamento = grupo?.departamentoId 
      ? data.departamentos.find(d => d.id === grupo.departamentoId)
      : null;
    
    const depKey = departamento?.nome || 'SEM DEPARTAMENTO';
    const grupoKey = grupo?.nome || 'SEM GRUPO';
    const subgrupoKey = subgrupo?.nome || 'SEM SUBGRUPO';
    
    if (!hierarchy.has(depKey)) {
      hierarchy.set(depKey, new Map());
    }
    const grupoMap = hierarchy.get(depKey)!;
    
    if (!grupoMap.has(grupoKey)) {
      grupoMap.set(grupoKey, new Map());
    }
    const subgrupoMap = grupoMap.get(grupoKey)!;
    
    if (!subgrupoMap.has(subgrupoKey)) {
      subgrupoMap.set(subgrupoKey, []);
    }
    subgrupoMap.get(subgrupoKey)!.push(produto);
  });
  
  // Ordenar e criar linhas da tabela
  const sortedDepartamentos = Array.from(hierarchy.keys());
  
  sortedDepartamentos.forEach(depNome => {
    tableData.push([{
      content: depNome.toUpperCase(),
      colSpan: 3,
      styles: { fontStyle: 'bold', fontSize: 10, fillColor: [240, 240, 240] }
    }]);
    
    const grupoMap = hierarchy.get(depNome)!;
    const sortedGrupos = Array.from(grupoMap.keys());
    
    sortedGrupos.forEach(grupoNome => {
      tableData.push([{
        content: '  ' + grupoNome.toUpperCase(),
        colSpan: 3,
        styles: { fontStyle: 'bold', fontSize: 9, fillColor: [250, 250, 250] }
      }]);
      
      const subgrupoMap = grupoMap.get(grupoNome)!;
      const sortedSubgrupos = Array.from(subgrupoMap.keys());
      
      sortedSubgrupos.forEach(subgrupoNome => {
        tableData.push([{
          content: '    ' + subgrupoNome.toUpperCase(),
          colSpan: 3,
          styles: { fontStyle: 'bold', fontSize: 8 }
        }]);
        
        const produtos = subgrupoMap.get(subgrupoNome)!;
        const produtosOrdenados = produtos;
        
        produtosOrdenados.forEach(produto => {
          const qntd = produto.quantidade && produto.unidadeMedida 
            ? `${produto.quantidade} ${produto.unidadeMedida}`
            : produto.quantidade || produto.unidadeMedida || '-';
          
          tableData.push([
            produto.codigo,
            produto.nome,
            qntd
          ]);
        });
      });
    });
  });

  // Tabela com produtos não encontrados
  autoTable(doc, {
    head: [['Código', 'Produto', 'Qntd']],
    body: tableData,
    startY: yPos,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 120 },
      2: { cellWidth: 25 }
    }
  });

  doc.save(`${data.nomeCliente}_${data.data}_nao_encontrados.pdf`);
};

// Gera PDF de Comparativo da Concorrência
export const generateComparativoConcorrenciaPDF = (
  data: RelatorioData,
  supermercadoReferenciaId: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFontSize(16);
  doc.text('COMPARATIVO DA CONCORRÊNCIA', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(data.nomeCliente, pageWidth / 2, 22, { align: 'center' });

  // Informações das coletas
  let yPos = 30;
  doc.setFontSize(9);
  
  // Agrupar coletas por supermercado
  const coletasPorSupermercado = new Map<string, { data: string, nome: string, coleta: Coleta }>();
  data.coletas.forEach(coleta => {
    const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
    if (supermercado) {
      coletasPorSupermercado.set(supermercado.id, {
        data: new Date(coleta.data).toLocaleDateString('pt-BR'),
        nome: supermercado.nome,
        coleta
      });
    }
  });

  // (Informações de Datas e Supermercados removidas do cabeçalho do relatório)



  // Identificar supermercado de referência
  const supermercadoRef = data.supermercados.find(s => s.id === supermercadoReferenciaId);
  const coletaRef = coletasPorSupermercado.get(supermercadoReferenciaId)?.coleta;
  
  if (!supermercadoRef || !coletaRef) {
    doc.text('Erro: Supermercado de referência não encontrado', 14, yPos);
    doc.save(`${data.nomeCliente}_comparativo_concorrencia.pdf`);
    return;
  }

  // Filtrar apenas coletas dos outros supermercados
  const outrasColetas = Array.from(coletasPorSupermercado.values())
    .filter(c => c.coleta.supermercadoId !== supermercadoReferenciaId);

  // ===== TABELA 1 - FÍSICO =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FÍSICO', 14, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');

  // Calcular dados da tabela físico
  const dadosFisico = new Map<string, {
    menorPreco: number,
    maiorPreco: number,
    precoIgual: number,
    total: number
  }>();

  // Inicializar contadores para cada supermercado
  outrasColetas.forEach(({ coleta, nome }) => {
    dadosFisico.set(coleta.supermercadoId, {
      menorPreco: 0,
      maiorPreco: 0,
      precoIgual: 0,
      total: 0
    });
  });

  // Para cada produto, comparar preços
  data.produtos.forEach(produto => {
    const precoRef = coletaRef.precosEditadosAdmin?.[produto.id] ?? coletaRef.precos?.[produto.id] ?? 0;
    
    if (precoRef > 0) {
      outrasColetas.forEach(({ coleta }) => {
        const precoConcorrente = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
        
        if (precoConcorrente > 0) {
          const dados = dadosFisico.get(coleta.supermercadoId)!;
          dados.total++;
          
          if (precoConcorrente < precoRef) {
            dados.menorPreco++;
          } else if (precoConcorrente > precoRef) {
            dados.maiorPreco++;
          } else {
            dados.precoIgual++;
          }
        }
      });
    }
  });

  // Calcular totais para o resumo
  const resumoFisico = {
    menorPreco: 0,
    maiorPreco: 0,
    precoIgual: 0,
    total: 0,
    menorPrecoPerc: 0,
    maiorPrecoPerc: 0,
    precoIgualPerc: 0,
    totalPerc: 0
  };

  dadosFisico.forEach(dados => {
    resumoFisico.menorPreco += dados.menorPreco;
    resumoFisico.maiorPreco += dados.maiorPreco;
    resumoFisico.precoIgual += dados.precoIgual;
    resumoFisico.total += dados.total;
  });

  // Calcular percentuais do resumo
  if (resumoFisico.total > 0) {
    resumoFisico.menorPrecoPerc = (resumoFisico.menorPreco / resumoFisico.total) * 100;
    resumoFisico.maiorPrecoPerc = (resumoFisico.maiorPreco / resumoFisico.total) * 100;
    resumoFisico.precoIgualPerc = (resumoFisico.precoIgual / resumoFisico.total) * 100;
    resumoFisico.totalPerc = 100;
  }

  // Construir tabela físico (usar abreviação nas colunas)
  const headersFisico = [''];
  const supermercadosColunas: string[] = [];
  
  outrasColetas.forEach(({ nome, coleta }) => {
    const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
    const nomeColuna = supermercado?.abreviacao || nome;
    headersFisico.push(nomeColuna, '%');
    supermercadosColunas.push(nomeColuna);
  });
  headersFisico.push('Resumo', '%');

  const bodyFisico = [
    ['Menor Pr.', 
      ...outrasColetas.flatMap(({ coleta }) => {
        const dados = dadosFisico.get(coleta.supermercadoId)!;
        const perc = dados.total > 0 ? ((dados.menorPreco / dados.total) * 100).toFixed(1) : '0.0';
        return [dados.menorPreco.toString(), perc + '%'];
      }),
      resumoFisico.menorPreco.toString(),
      resumoFisico.menorPrecoPerc.toFixed(1) + '%'
    ],
    ['Maior Pr.', 
      ...outrasColetas.flatMap(({ coleta }) => {
        const dados = dadosFisico.get(coleta.supermercadoId)!;
        const perc = dados.total > 0 ? ((dados.maiorPreco / dados.total) * 100).toFixed(1) : '0.0';
        return [dados.maiorPreco.toString(), perc + '%'];
      }),
      resumoFisico.maiorPreco.toString(),
      resumoFisico.maiorPrecoPerc.toFixed(1) + '%'
    ],
    ['Pr. Igual', 
      ...outrasColetas.flatMap(({ coleta }) => {
        const dados = dadosFisico.get(coleta.supermercadoId)!;
        const perc = dados.total > 0 ? ((dados.precoIgual / dados.total) * 100).toFixed(1) : '0.0';
        return [dados.precoIgual.toString(), perc + '%'];
      }),
      resumoFisico.precoIgual.toString(),
      resumoFisico.precoIgualPerc.toFixed(1) + '%'
    ],
    ['Total', 
      ...outrasColetas.flatMap(({ coleta }) => {
        const dados = dadosFisico.get(coleta.supermercadoId)!;
        return [dados.total.toString(), '100.0%'];
      }),
      resumoFisico.total.toString(),
      '100.0%'
    ]
  ];

  autoTable(doc, {
    head: [headersFisico],
    body: bodyFisico,
    startY: yPos,
    styles: { fontSize: 8, cellPadding: 2, halign: 'right' },
    headStyles: { fillColor: [66, 66, 66], halign: 'center' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ===== TABELA 2 - FINANCEIRO =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCEIRO', 14, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');

  // Calcular valores financeiros
  const valoresFinanceiro = new Map<string, {
    concorrencia: number,
    referencia: number,
    diferenca: number,
    percConcorrencia: number,
    percReferencia: number
  }>();

  outrasColetas.forEach(({ coleta }) => {
    let totalConcorrencia = 0;
    let totalReferencia = 0;
    let count = 0;

    data.produtos.forEach(produto => {
      const precoRef = coletaRef.precosEditadosAdmin?.[produto.id] ?? coletaRef.precos?.[produto.id] ?? 0;
      const precoConcorrente = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
      
      // Só contar produtos que existem em ambos
      if (precoRef > 0 && precoConcorrente > 0) {
        totalReferencia += precoRef;
        totalConcorrencia += precoConcorrente;
        count++;
      }
    });

    const diferenca = totalConcorrencia - totalReferencia;
    const percConcorrencia = 100;
    const percReferencia = totalConcorrencia > 0 
      ? (totalReferencia / totalConcorrencia) * 100 
      : 0;

    valoresFinanceiro.set(coleta.supermercadoId, {
      concorrencia: totalConcorrencia,
      referencia: totalReferencia,
      diferenca,
      percConcorrencia,
      percReferencia
    });
  });

  // Calcular resumo financeiro
  const resumoFinanceiro = {
    concorrencia: 0,
    referencia: 0,
    diferenca: 0,
    percConcorrencia: 100,
    percReferencia: 0
  };

  valoresFinanceiro.forEach(valores => {
    resumoFinanceiro.concorrencia += valores.concorrencia;
    resumoFinanceiro.referencia += valores.referencia;
  });

  resumoFinanceiro.diferenca = resumoFinanceiro.concorrencia - resumoFinanceiro.referencia;
  resumoFinanceiro.percReferencia = resumoFinanceiro.concorrencia > 0
    ? (resumoFinanceiro.referencia / resumoFinanceiro.concorrencia) * 100
    : 0;

  // Construir tabela financeiro (usar abreviação nas colunas)
  const headersFinanceiro = [''];
  outrasColetas.forEach(({ nome, coleta }) => {
    const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
    const nomeColuna = supermercado?.abreviacao || nome;
    headersFinanceiro.push(nomeColuna, '%');
  });
  headersFinanceiro.push('Resumo', '%');

  const bodyFinanceiro = [
    ['Concorrência', 
      ...outrasColetas.flatMap(({ coleta }) => {
        const valores = valoresFinanceiro.get(coleta.supermercadoId)!;
        return [
          'R$ ' + valores.concorrencia.toFixed(2),
          valores.percConcorrencia.toFixed(1) + '%'
        ];
      }),
      'R$ ' + resumoFinanceiro.concorrencia.toFixed(2),
      resumoFinanceiro.percConcorrencia.toFixed(1) + '%'
    ],
    [supermercadoRef.nome, 
      ...outrasColetas.flatMap(({ coleta }) => {
        const valores = valoresFinanceiro.get(coleta.supermercadoId)!;
        return [
          'R$ ' + valores.referencia.toFixed(2),
          valores.percReferencia.toFixed(1) + '%'
        ];
      }),
      'R$ ' + resumoFinanceiro.referencia.toFixed(2),
      resumoFinanceiro.percReferencia.toFixed(1) + '%'
    ],
    ['Diferença', 
      ...outrasColetas.flatMap(({ coleta }) => {
        const valores = valoresFinanceiro.get(coleta.supermercadoId)!;
        const percDiferenca = valores.concorrencia > 0 
          ? ((valores.diferenca / valores.concorrencia) * 100).toFixed(1)
          : '0.0';
        return [
          'R$ ' + valores.diferenca.toFixed(2),
          percDiferenca + '%'
        ];
      }),
      'R$ ' + resumoFinanceiro.diferenca.toFixed(2),
      resumoFinanceiro.concorrencia > 0 
        ? ((resumoFinanceiro.diferenca / resumoFinanceiro.concorrencia) * 100).toFixed(1) + '%'
        : '0.0%'
    ]
  ];

  autoTable(doc, {
    head: [headersFinanceiro],
    body: bodyFinanceiro,
    startY: yPos,
    styles: { fontSize: 8, cellPadding: 2, halign: 'right' },
    headStyles: { fillColor: [66, 66, 66], halign: 'center' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' }
    }
  });

  doc.save(`${data.nomeCliente}_comparativo_concorrencia.pdf`);
};

// Gera PDF de Comparativo da Concorrência segmentado por Departamento
export const generateComparativoPorDepartamentoPDF = (
  data: RelatorioData,
  supermercadoReferenciaId: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Cabeçalho
  doc.setFontSize(16);
  doc.text('COMPARATIVO DA CONCORRÊNCIA POR DEPARTAMENTO', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(data.nomeCliente, pageWidth / 2, 22, { align: 'center' });

  let yPos = 30;

  // Agrupar coletas por supermercado
  const coletasPorSupermercado = new Map<string, { data: string, nome: string, coleta: Coleta }>();
  data.coletas.forEach(coleta => {
    const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
    if (supermercado) {
      coletasPorSupermercado.set(supermercado.id, {
        data: new Date(coleta.data).toLocaleDateString('pt-BR'),
        nome: supermercado.nome,
        coleta
      });
    }
  });

  // Identificar supermercado de referência
  const supermercadoRef = data.supermercados.find(s => s.id === supermercadoReferenciaId);
  const coletaRef = coletasPorSupermercado.get(supermercadoReferenciaId)?.coleta;

  if (!supermercadoRef || !coletaRef) {
    doc.setFontSize(9);
    doc.text('Erro: Supermercado de referência não encontrado', 14, yPos);
    doc.save(`${data.nomeCliente}_comparativo_concorrencia_departamento.pdf`);
    return;
  }

  // Filtrar apenas coletas dos outros supermercados
  const outrasColetas = Array.from(coletasPorSupermercado.values())
    .filter(c => c.coleta.supermercadoId !== supermercadoReferenciaId);

  // Agrupar produtos por departamento, preservando a ordem personalizada
  const departamentosOrdenados: { nome: string; produtos: Produto[] }[] = [];
  const depIndex = new Map<string, number>();

  data.produtos.forEach(produto => {
    const grupo = data.grupos.find(g => g.id === produto.grupoId);
    const departamento = grupo?.departamentoId
      ? data.departamentos.find(d => d.id === grupo.departamentoId)
      : null;
    const depNome = departamento
      ? (data.hierarquiaCustomizada?.departamentos?.[departamento.id] || departamento.nome)
      : 'SEM DEPARTAMENTO';

    if (!depIndex.has(depNome)) {
      depIndex.set(depNome, departamentosOrdenados.length);
      departamentosOrdenados.push({ nome: depNome, produtos: [] });
    }
    departamentosOrdenados[depIndex.get(depNome)!].produtos.push(produto);
  });

  // Helper que monta as tabelas FÍSICO e FINANCEIRO para um conjunto de produtos
  const renderSecao = (produtosSecao: Produto[]) => {
    // ===== TABELA 1 - FÍSICO =====
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FÍSICO', 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');

    const dadosFisico = new Map<string, { menorPreco: number, maiorPreco: number, precoIgual: number, total: number }>();
    outrasColetas.forEach(({ coleta }) => {
      dadosFisico.set(coleta.supermercadoId, { menorPreco: 0, maiorPreco: 0, precoIgual: 0, total: 0 });
    });

    produtosSecao.forEach(produto => {
      const precoRef = coletaRef.precosEditadosAdmin?.[produto.id] ?? coletaRef.precos?.[produto.id] ?? 0;
      if (precoRef > 0) {
        outrasColetas.forEach(({ coleta }) => {
          const precoConcorrente = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
          if (precoConcorrente > 0) {
            const dados = dadosFisico.get(coleta.supermercadoId)!;
            dados.total++;
            // "Menor Pr." = referência teve MENOR preço que a coluna (referência mais barata)
            if (precoConcorrente > precoRef) dados.menorPreco++;
            // "Maior Pr." = referência teve MAIOR preço que a coluna (referência mais cara)
            else if (precoConcorrente < precoRef) dados.maiorPreco++;
            else dados.precoIgual++;
          }
        });
      }
    });

    const resumoFisico = { menorPreco: 0, maiorPreco: 0, precoIgual: 0, total: 0, menorPrecoPerc: 0, maiorPrecoPerc: 0, precoIgualPerc: 0, totalPerc: 0 };
    dadosFisico.forEach(dados => {
      resumoFisico.menorPreco += dados.menorPreco;
      resumoFisico.maiorPreco += dados.maiorPreco;
      resumoFisico.precoIgual += dados.precoIgual;
      resumoFisico.total += dados.total;
    });
    if (resumoFisico.total > 0) {
      resumoFisico.menorPrecoPerc = (resumoFisico.menorPreco / resumoFisico.total) * 100;
      resumoFisico.maiorPrecoPerc = (resumoFisico.maiorPreco / resumoFisico.total) * 100;
      resumoFisico.precoIgualPerc = (resumoFisico.precoIgual / resumoFisico.total) * 100;
      resumoFisico.totalPerc = 100;
    }

    const headersFisico = [''];
    outrasColetas.forEach(({ nome, coleta }) => {
      const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
      headersFisico.push(supermercado?.abreviacao || nome, '%');
    });
    headersFisico.push('Resumo', '%');

    const bodyFisico = [
      ['Menor Pr.',
        ...outrasColetas.flatMap(({ coleta }) => {
          const dados = dadosFisico.get(coleta.supermercadoId)!;
          const perc = dados.total > 0 ? ((dados.menorPreco / dados.total) * 100).toFixed(1) : '0.0';
          return [dados.menorPreco.toString(), perc + '%'];
        }),
        resumoFisico.menorPreco.toString(), resumoFisico.menorPrecoPerc.toFixed(1) + '%'],
      ['Maior Pr.',
        ...outrasColetas.flatMap(({ coleta }) => {
          const dados = dadosFisico.get(coleta.supermercadoId)!;
          const perc = dados.total > 0 ? ((dados.maiorPreco / dados.total) * 100).toFixed(1) : '0.0';
          return [dados.maiorPreco.toString(), perc + '%'];
        }),
        resumoFisico.maiorPreco.toString(), resumoFisico.maiorPrecoPerc.toFixed(1) + '%'],
      ['Pr. Igual',
        ...outrasColetas.flatMap(({ coleta }) => {
          const dados = dadosFisico.get(coleta.supermercadoId)!;
          const perc = dados.total > 0 ? ((dados.precoIgual / dados.total) * 100).toFixed(1) : '0.0';
          return [dados.precoIgual.toString(), perc + '%'];
        }),
        resumoFisico.precoIgual.toString(), resumoFisico.precoIgualPerc.toFixed(1) + '%'],
      ['Total',
        ...outrasColetas.flatMap(({ coleta }) => {
          const dados = dadosFisico.get(coleta.supermercadoId)!;
          return [dados.total.toString(), '100.0%'];
        }),
        resumoFisico.total.toString(), '100.0%']
    ];

    autoTable(doc, {
      head: [headersFisico],
      body: bodyFisico,
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 2, halign: 'right' },
      headStyles: { fillColor: [66, 66, 66], halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;

    // ===== TABELA 2 - FINANCEIRO =====
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCEIRO', 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');

    const valoresFinanceiro = new Map<string, { concorrencia: number, referencia: number, diferenca: number, percConcorrencia: number, percReferencia: number }>();
    outrasColetas.forEach(({ coleta }) => {
      let totalConcorrencia = 0;
      let totalReferencia = 0;
      produtosSecao.forEach(produto => {
        const precoRef = coletaRef.precosEditadosAdmin?.[produto.id] ?? coletaRef.precos?.[produto.id] ?? 0;
        const precoConcorrente = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
        if (precoRef > 0 && precoConcorrente > 0) {
          totalReferencia += precoRef;
          totalConcorrencia += precoConcorrente;
        }
      });
      const diferenca = totalConcorrencia - totalReferencia;
      const percReferencia = totalConcorrencia > 0 ? (totalReferencia / totalConcorrencia) * 100 : 0;
      valoresFinanceiro.set(coleta.supermercadoId, { concorrencia: totalConcorrencia, referencia: totalReferencia, diferenca, percConcorrencia: 100, percReferencia });
    });

    const resumoFinanceiro = { concorrencia: 0, referencia: 0, diferenca: 0, percConcorrencia: 100, percReferencia: 0 };
    valoresFinanceiro.forEach(valores => {
      resumoFinanceiro.concorrencia += valores.concorrencia;
      resumoFinanceiro.referencia += valores.referencia;
    });
    resumoFinanceiro.diferenca = resumoFinanceiro.concorrencia - resumoFinanceiro.referencia;
    resumoFinanceiro.percReferencia = resumoFinanceiro.concorrencia > 0 ? (resumoFinanceiro.referencia / resumoFinanceiro.concorrencia) * 100 : 0;

    const headersFinanceiro = [''];
    outrasColetas.forEach(({ nome, coleta }) => {
      const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
      headersFinanceiro.push(supermercado?.abreviacao || nome, '%');
    });
    headersFinanceiro.push('Resumo', '%');

    const bodyFinanceiro = [
      ['Concorrência',
        ...outrasColetas.flatMap(({ coleta }) => {
          const valores = valoresFinanceiro.get(coleta.supermercadoId)!;
          return ['R$ ' + valores.concorrencia.toFixed(2), valores.percConcorrencia.toFixed(1) + '%'];
        }),
        'R$ ' + resumoFinanceiro.concorrencia.toFixed(2), resumoFinanceiro.percConcorrencia.toFixed(1) + '%'],
      [supermercadoRef.nome,
        ...outrasColetas.flatMap(({ coleta }) => {
          const valores = valoresFinanceiro.get(coleta.supermercadoId)!;
          return ['R$ ' + valores.referencia.toFixed(2), valores.percReferencia.toFixed(1) + '%'];
        }),
        'R$ ' + resumoFinanceiro.referencia.toFixed(2), resumoFinanceiro.percReferencia.toFixed(1) + '%'],
      ['Diferença',
        ...outrasColetas.flatMap(({ coleta }) => {
          const valores = valoresFinanceiro.get(coleta.supermercadoId)!;
          const rawPerc = valores.concorrencia > 0 ? (valores.diferenca / valores.concorrencia) * 100 : 0;
          // referência mais cara (diferenca < 0) => "+", referência mais barata (diferenca > 0) => "-"
          const sinal = rawPerc < 0 ? '+' : rawPerc > 0 ? '-' : '';
          const percDiferenca = sinal + Math.abs(rawPerc).toFixed(1);
          return ['R$ ' + valores.diferenca.toFixed(2), percDiferenca + '%'];
        }),
        'R$ ' + resumoFinanceiro.diferenca.toFixed(2),
        (() => {
          const rawPerc = resumoFinanceiro.concorrencia > 0 ? (resumoFinanceiro.diferenca / resumoFinanceiro.concorrencia) * 100 : 0;
          const sinal = rawPerc < 0 ? '+' : rawPerc > 0 ? '-' : '';
          return sinal + Math.abs(rawPerc).toFixed(1) + '%';
        })()]
    ];

    autoTable(doc, {
      head: [headersFinanceiro],
      body: bodyFinanceiro,
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 2, halign: 'right' },
      headStyles: { fillColor: [66, 66, 66], halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  };

  departamentosOrdenados.forEach(dep => {
    // Quebra de página se não houver espaço suficiente para o cabeçalho da seção
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(230, 230, 230);
    doc.rect(14, yPos - 5, pageWidth - 28, 7, 'F');
    doc.text(dep.nome, 16, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 6;
    renderSecao(dep.produtos);
  });

  doc.save(`${data.nomeCliente}_comparativo_concorrencia_departamento.pdf`);
};



// Gera PDF de Estatísticas
export const generateEstatisticasPDF = (
  data: RelatorioData,
  percentualMinimo: number
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFontSize(16);
  doc.text('ESTATÍSTICAS', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(data.nomeCliente, pageWidth / 2, 22, { align: 'center' });

  // Informações das coletas
  let yPos = 30;
  doc.setFontSize(9);
  
  // Agrupar coletas por supermercado
  const coletasPorSupermercado = new Map<string, { data: string, nome: string, coleta: Coleta }>();
  data.coletas.forEach(coleta => {
    const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
    if (supermercado) {
      coletasPorSupermercado.set(supermercado.id, {
        data: new Date(coleta.data).toLocaleDateString('pt-BR'),
        nome: supermercado.nome,
        coleta
      });
    }
  });

  // (Informações de Datas e Supermercados removidas do cabeçalho do relatório)


  yPos += 5;

  // Total de itens pesquisados
  const totalItens = data.produtos.length;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de itens pesquisados: ${totalItens}`, 14, yPos);
  yPos += 10;

  // Estatísticas por supermercado
  doc.setFontSize(10);
  doc.text('Estatísticas por Supermercado:', 14, yPos);
  yPos += 7;

  const estatisticas: any[] = [];

  coletasPorSupermercado.forEach(({ nome, coleta }) => {
    const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
    const abreviacao = supermercado?.abreviacao || nome;
    let itensEncontrados = 0;
    let menorPreco = 0;
    let maiorPreco = 0;

    data.produtos.forEach((produto) => {
      const preco = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
      if (preco && preco > 0) {
        itensEncontrados++;

        // Verificar se é menor ou maior preço
        const precosOutros: number[] = [];
        data.coletas.forEach(outraColeta => {
          if (outraColeta.id !== coleta.id) {
            const precoOutro = outraColeta.precosEditadosAdmin?.[produto.id] ?? outraColeta.precos?.[produto.id] ?? 0;
            if (precoOutro && precoOutro > 0) {
              precosOutros.push(precoOutro);
            }
          }
        });

        if (precosOutros.length > 0) {
          const menorOutros = Math.min(...precosOutros);
          const maiorOutros = Math.max(...precosOutros);

          if (preco < menorOutros) menorPreco++;
          if (preco > maiorOutros) maiorPreco++;
        }
      }
    });

    estatisticas.push({
      nome,
      abreviacao,
      itensEncontrados,
      menorPreco,
      maiorPreco
    });
  });

  // Tabela: cada supermercado é uma coluna
  const statHeaders = ['', ...estatisticas.map((s) => s.abreviacao)];

  const statBody = [
    ['Itens encontrados', ...estatisticas.map((s) => String(s.itensEncontrados))],
    ['Menor preço (vezes)', ...estatisticas.map((s) => String(s.menorPreco))],
    ['Maior preço (vezes)', ...estatisticas.map((s) => String(s.maiorPreco))],
  ];

  autoTable(doc, {
    head: [statHeaders],
    body: statBody,
    startY: yPos,
    styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
    headStyles: { fillColor: [66, 66, 66], halign: 'center' },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;


  // Produtos com diferença superior ao percentual mínimo
  yPos += 5;
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Produtos com diferença superior a ${percentualMinimo}%:`, 14, yPos);
  yPos += 7;

  // Colunas: uma por coleta/supermercado (usar abreviação)
  const colunasColetas = Array.from(coletasPorSupermercado.values());

  const produtosComDiferenca: { nome: string; precos: (number | null)[]; diferenca: string }[] = [];

  data.produtos.forEach((produto) => {
    const precosPorColeta: (number | null)[] = colunasColetas.map(({ coleta }) => {
      const preco = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
      return preco && preco > 0 ? preco : null;
    });

    const precosValidos = precosPorColeta.filter((p): p is number => p !== null);

    if (precosValidos.length >= 2) {
      const menorPreco = Math.min(...precosValidos);
      const maiorPreco = Math.max(...precosValidos);
      const diferencaPercentual = ((maiorPreco - menorPreco) / menorPreco) * 100;

      if (diferencaPercentual >= percentualMinimo) {
        produtosComDiferenca.push({
          nome: produto.nome,
          precos: precosPorColeta,
          diferenca: diferencaPercentual.toFixed(2)
        });
      }
    }
  });

  // Ordenar por diferença decrescente
  produtosComDiferenca.sort((a, b) => parseFloat(b.diferenca) - parseFloat(a.diferenca));


  if (produtosComDiferenca.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nenhum produto encontrado com essa diferença.', 14, yPos);
  } else {
    const headers = [
      'Produto',
      ...colunasColetas.map(({ nome, coleta }) => {
        const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
        return supermercado?.abreviacao || nome;
      }),
      'Diferença'
    ];

    const body = produtosComDiferenca.map((prod) => [
      prod.nome,
      ...prod.precos.map((p) => (p !== null ? 'R$ ' + p.toFixed(2) : '-')),
      prod.diferenca + '%'
    ]);

    autoTable(doc, {
      head: [headers],
      body,
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 2, halign: 'right' },
      headStyles: { fillColor: [66, 66, 66], halign: 'center' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' }
      }
    });
  }

  doc.save(`${data.nomeCliente}_estatisticas.pdf`);
};

// Gera PDF de Comparativo por Compradores
export const generateComparadoresPDF = (
  data: RelatorioData,
  supermercadoReferenciaId: string,
  compradores: { nome: string; produtos: string[] }[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Ordenar compradores alfabeticamente
  const compradoresOrdenados = [...compradores].sort((a, b) => a.nome.localeCompare(b.nome));

  // Map coletas por supermercado
  const coletasPorSupermercado = new Map<string, { data: string; nome: string; coleta: Coleta }>();
  data.coletas.forEach(coleta => {
    const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
    if (supermercado) {
      coletasPorSupermercado.set(supermercado.id, {
        data: new Date(coleta.data).toLocaleDateString('pt-BR'),
        nome: supermercado.nome,
        coleta
      });
    }
  });

  const supermercadoRef = data.supermercados.find(s => s.id === supermercadoReferenciaId);
  const coletaRef = coletasPorSupermercado.get(supermercadoReferenciaId)?.coleta;

  if (!supermercadoRef || !coletaRef) {
    doc.text('Erro: Supermercado de referência não encontrado', 14, 20);
    doc.save(`${data.nomeCliente}_compradores.pdf`);
    return;
  }

  const outrasColetas = Array.from(coletasPorSupermercado.values())
    .filter(c => c.coleta.supermercadoId !== supermercadoReferenciaId);

  // Cabeçalho geral (uma vez)
  doc.setFontSize(14);
  doc.text('COMPARATIVO POR COMPRADOR', pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(data.nomeCliente, pageWidth / 2, 22, { align: 'center' });

  let yPos = 30;
  doc.setFontSize(9);

  // (Informações de Datas e Supermercados removidas do cabeçalho do relatório)


  // Cada comprador em sequência
  compradoresOrdenados.forEach((comprador) => {
    // Checar se precisa de nova página (nome + tabelas precisam de ~80px mínimo)
    if (yPos > 220) { doc.addPage(); yPos = 20; }

    // Nome do comprador
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${comprador.nome} (${comprador.produtos.length} produtos)`, 14, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 7;

    const produtosComprador = data.produtos.filter(p => comprador.produtos.includes(p.id));

    // ===== TABELA FÍSICO =====
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FÍSICO', 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');

    const dadosFisico = new Map<string, { menorPreco: number; maiorPreco: number; precoIgual: number; total: number }>();
    outrasColetas.forEach(({ coleta }) => {
      dadosFisico.set(coleta.supermercadoId, { menorPreco: 0, maiorPreco: 0, precoIgual: 0, total: 0 });
    });

    produtosComprador.forEach(produto => {
      const precoRef = coletaRef.precosEditadosAdmin?.[produto.id] ?? coletaRef.precos?.[produto.id] ?? 0;
      if (precoRef > 0) {
        outrasColetas.forEach(({ coleta }) => {
          const precoConcorrente = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
          if (precoConcorrente > 0) {
            const dados = dadosFisico.get(coleta.supermercadoId)!;
            dados.total++;
            if (precoConcorrente < precoRef) dados.menorPreco++;
            else if (precoConcorrente > precoRef) dados.maiorPreco++;
            else dados.precoIgual++;
          }
        });
      }
    });

    const resumoFisico = { menorPreco: 0, maiorPreco: 0, precoIgual: 0, total: 0 };
    dadosFisico.forEach(d => { resumoFisico.menorPreco += d.menorPreco; resumoFisico.maiorPreco += d.maiorPreco; resumoFisico.precoIgual += d.precoIgual; resumoFisico.total += d.total; });

    const headersFisico = [''];
    outrasColetas.forEach(({ nome, coleta }) => {
      const sup = data.supermercados.find(s => s.id === coleta.supermercadoId);
      headersFisico.push(sup?.abreviacao || nome, '%');
    });
    headersFisico.push('Resumo', '%');

    const mkRow = (label: string, key: 'menorPreco' | 'maiorPreco' | 'precoIgual' | 'total') => {
      const row = [label];
      outrasColetas.forEach(({ coleta }) => {
        const d = dadosFisico.get(coleta.supermercadoId)!;
        const val = key === 'total' ? d.total : d[key];
        const perc = d.total > 0 ? ((val / d.total) * 100).toFixed(1) : '0.0';
        row.push(val.toString(), key === 'total' ? '100.0%' : perc + '%');
      });
      const rVal = key === 'total' ? resumoFisico.total : resumoFisico[key];
      const rPerc = resumoFisico.total > 0 ? ((rVal / resumoFisico.total) * 100).toFixed(1) : '0.0';
      row.push(rVal.toString(), key === 'total' ? '100.0%' : rPerc + '%');
      return row;
    };

    autoTable(doc, {
      head: [headersFisico],
      body: [mkRow('Menor Pr.', 'menorPreco'), mkRow('Maior Pr.', 'maiorPreco'), mkRow('Pr. Igual', 'precoIgual'), mkRow('Total', 'total')],
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 2, halign: 'right' },
      headStyles: { fillColor: [66, 66, 66], halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;

    // ===== TABELA FINANCEIRO =====
    if (yPos > 240) { doc.addPage(); yPos = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCEIRO', 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');

    const valoresFin = new Map<string, { concorrencia: number; referencia: number; diferenca: number }>();
    outrasColetas.forEach(({ coleta }) => {
      let totalConc = 0, totalRef = 0;
      produtosComprador.forEach(produto => {
        const pRef = coletaRef.precosEditadosAdmin?.[produto.id] ?? coletaRef.precos?.[produto.id] ?? 0;
        const pConc = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
        if (pRef > 0 && pConc > 0) { totalRef += pRef; totalConc += pConc; }
      });
      valoresFin.set(coleta.supermercadoId, { concorrencia: totalConc, referencia: totalRef, diferenca: totalConc - totalRef });
    });

    const resumoFin = { concorrencia: 0, referencia: 0, diferenca: 0 };
    valoresFin.forEach(v => { resumoFin.concorrencia += v.concorrencia; resumoFin.referencia += v.referencia; });
    resumoFin.diferenca = resumoFin.concorrencia - resumoFin.referencia;

    const headersFin = [''];
    outrasColetas.forEach(({ nome, coleta }) => {
      const sup = data.supermercados.find(s => s.id === coleta.supermercadoId);
      headersFin.push(sup?.abreviacao || nome, '%');
    });
    headersFin.push('Resumo', '%');

    const bodyFin = [
      ['Concorrência', ...outrasColetas.flatMap(({ coleta }) => {
        const v = valoresFin.get(coleta.supermercadoId)!;
        return ['R$ ' + v.concorrencia.toFixed(2), '100.0%'];
      }), 'R$ ' + resumoFin.concorrencia.toFixed(2), '100.0%'],
      [supermercadoRef.nome, ...outrasColetas.flatMap(({ coleta }) => {
        const v = valoresFin.get(coleta.supermercadoId)!;
        const perc = v.concorrencia > 0 ? ((v.referencia / v.concorrencia) * 100).toFixed(1) : '0.0';
        return ['R$ ' + v.referencia.toFixed(2), perc + '%'];
      }), 'R$ ' + resumoFin.referencia.toFixed(2), (resumoFin.concorrencia > 0 ? ((resumoFin.referencia / resumoFin.concorrencia) * 100).toFixed(1) : '0.0') + '%'],
      ['Diferença', ...outrasColetas.flatMap(({ coleta }) => {
        const v = valoresFin.get(coleta.supermercadoId)!;
        const perc = v.concorrencia > 0 ? ((v.diferenca / v.concorrencia) * 100).toFixed(1) : '0.0';
        return ['R$ ' + v.diferenca.toFixed(2), perc + '%'];
      }), 'R$ ' + resumoFin.diferenca.toFixed(2), (resumoFin.concorrencia > 0 ? ((resumoFin.diferenca / resumoFin.concorrencia) * 100).toFixed(1) : '0.0') + '%']
    ];

    autoTable(doc, {
      head: [headersFin],
      body: bodyFin,
      startY: yPos,
      styles: { fontSize: 8, cellPadding: 2, halign: 'right' },
      headStyles: { fillColor: [66, 66, 66], halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;
  });

  doc.save(`${data.nomeCliente}_compradores.pdf`);
};

// Gera PDF da lista de um comprador
export const generateCompradorListaPDF = (
  compradorNome: string,
  supermercadoNome: string,
  produtosLista: Produto[],
  grupos: Grupo[],
  subgrupos: Subgrupo[],
  departamentos: Departamento[],
  hierarquiaCustomizada?: any
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.text(`Lista do Comprador: ${compradorNome}`, pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Supermercado: ${supermercadoNome}`, pageWidth / 2, 22, { align: 'center' });
  doc.text(`Total de produtos: ${produtosLista.length}`, pageWidth / 2, 28, { align: 'center' });

  let yPos = 35;

  // Build hierarchy
  const hierarchy = new Map<string, Map<string, Map<string, Produto[]>>>();
  produtosLista.forEach(produto => {
    const subgrupo = subgrupos.find(s => s.id === produto.subgrupoId);
    const grupo = grupos.find(g => g.id === produto.grupoId);
    const departamento = grupo?.departamentoId ? departamentos.find(d => d.id === grupo.departamentoId) : null;

    const depNome = departamento ? (hierarquiaCustomizada?.departamentos?.[departamento.id] || departamento.nome) : 'SEM DEPARTAMENTO';
    const grupoNome = grupo ? (hierarquiaCustomizada?.grupos?.[grupo.id] || grupo.nome) : 'SEM GRUPO';
    const subgrupoNome = subgrupo ? (hierarquiaCustomizada?.subgrupos?.[subgrupo.id] || subgrupo.nome) : 'SEM SUBGRUPO';

    if (!hierarchy.has(depNome)) hierarchy.set(depNome, new Map());
    const gm = hierarchy.get(depNome)!;
    if (!gm.has(grupoNome)) gm.set(grupoNome, new Map());
    const sm = gm.get(grupoNome)!;
    if (!sm.has(subgrupoNome)) sm.set(subgrupoNome, []);
    sm.get(subgrupoNome)!.push(produto);
  });

  const tableData: any[] = [];
  Array.from(hierarchy.keys()).forEach(depNome => {
    tableData.push([{ content: depNome.toUpperCase(), colSpan: 4, styles: { fontStyle: 'bold', fontSize: 10, fillColor: [240, 240, 240] } }]);
    const gm = hierarchy.get(depNome)!;
    Array.from(gm.keys()).forEach(grupoNome => {
      tableData.push([{ content: '  ' + grupoNome.toUpperCase(), colSpan: 4, styles: { fontStyle: 'bold', fontSize: 9, fillColor: [250, 250, 250] } }]);
      const sm = gm.get(grupoNome)!;
      Array.from(sm.keys()).forEach(subgrupoNome => {
        tableData.push([{ content: '    ' + subgrupoNome.toUpperCase(), colSpan: 4, styles: { fontStyle: 'bold', fontSize: 8 } }]);
        sm.get(subgrupoNome)!.forEach(produto => {
          const qntd = produto.quantidade && produto.unidadeMedida
            ? `${produto.quantidade} ${produto.unidadeMedida}`
            : produto.quantidade || produto.unidadeMedida || '-';
          tableData.push([produto.codigo, produto.nome, produto.unidadeMedida, qntd]);
        });
      });
    });
  });

  autoTable(doc, {
    head: [['Código', 'Produto', 'Unidade', 'Quantidade']],
    body: tableData,
    startY: yPos,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 90 }, 2: { cellWidth: 30 }, 3: { cellWidth: 30 } }
  });

  doc.save(`Lista_Comprador_${compradorNome}.pdf`);
};

// Gera TXT do relatório
export const generateTXT = (data: RelatorioData) => {
  const lines: string[] = [];

  // Manter ordem original da lista
  const produtosOrdenados = data.produtos;

  produtosOrdenados.forEach(produto => {
    data.coletas.forEach(coleta => {
      const supermercado = data.supermercados.find(s => s.id === coleta.supermercadoId);
      // Priorizar preços editados pelo admin
      const preco = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
      const textoMaisBarato = coleta.textosMaisBarato?.[produto.id] || '';
      
      if (preco > 0) {
        const dataFormatada = new Date(coleta.data)
          .toLocaleDateString('pt-BR')
          .split('/')
          .reverse()
          .join('')
          .replace(/\//g, '');
        
        const linha = [
          dataFormatada,
          produto.codigo,
          supermercado?.nome || 'N/A',
          preco.toFixed(2),
          produto.quantidade || '-',
          produto.unidadeMedida || '-',
          produto.nome + (produto.maisBarato && textoMaisBarato ? ` (${textoMaisBarato})` : '')
        ].join('\t');
        
        lines.push(linha);
      }
    });
  });

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${data.nomeCliente}_${data.data}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
// ============================================================================
// Relatório Personalizado: hierarquia totalmente customizável (mover/renomear)
// ============================================================================
interface VisualizacaoItemPDF {
  tipo: 'departamento' | 'grupo' | 'subgrupo' | 'produto';
  id: string;
  parentId?: string;
}

interface RelatorioPersonalizadoData {
  nome: string;
  data: string; // ISO yyyy-mm-dd
  produtos: Produto[];
  coletas: Coleta[];
  supermercados: Supermercado[];
  grupos: Grupo[];
  subgrupos: Subgrupo[];
  departamentos: Departamento[];
  hierarquia: {
    ordem?: VisualizacaoItemPDF[];
    nomes?: {
      departamentos?: { [id: string]: string };
      grupos?: { [id: string]: string };
      subgrupos?: { [id: string]: string };
    };
  };
}

const formatDataBR = (iso: string) => {
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
};

export const generateRelatorioPersonalizadoPDF = (data: RelatorioPersonalizadoData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFontSize(16);
  doc.text(data.nome, pageWidth / 2, 15, { align: 'center' });
  doc.setFontSize(10);
  doc.text(formatDataBR(data.data), pageWidth / 2, 22, { align: 'center' });

  let yPos = 30;
  doc.setFontSize(9);

  // Agrupar coletas por supermercado
  const coletasPorSupermercado = new Map<string, { data: string; nome: string }>();
  data.coletas.forEach(c => {
    const s = data.supermercados.find(x => x.id === c.supermercadoId);
    if (s) {
      coletasPorSupermercado.set(s.id, { data: formatDataBR(c.data), nome: s.nome });
    }
  });
  // (Informações de Datas e Supermercados removidas do cabeçalho do relatório)


  const ordem = data.hierarquia.ordem || [];
  const nomes = data.hierarquia.nomes || {};
  const produtosMap = new Map(data.produtos.map(p => [p.id, p]));
  const departamentosMap = new Map(data.departamentos.map(d => [d.id, d]));
  const gruposMap = new Map(data.grupos.map(g => [g.id, g]));
  const subgruposMap = new Map(data.subgrupos.map(s => [s.id, s]));

  const nomeDepartamento = (id: string) => nomes.departamentos?.[id] || departamentosMap.get(id)?.nome || 'SEM DEPARTAMENTO';
  const nomeGrupo = (id: string) => nomes.grupos?.[id] || gruposMap.get(id)?.nome || 'SEM GRUPO';
  const nomeSubgrupo = (id: string) => nomes.subgrupos?.[id] || subgruposMap.get(id)?.nome || 'SEM SUBGRUPO';

  const tableData: any[] = [];
  const symbolsMap = new Map<number, Map<number, string>>();
  let currentRowIndex = 0;
  const colCount = 3 + coletasPorSupermercado.size;

  // Renderizar na ordem dada
  ordem.forEach(item => {
    if (item.tipo === 'departamento') {
      tableData.push([{
        content: nomeDepartamento(item.id).toUpperCase(),
        colSpan: colCount,
        styles: { fontStyle: 'bold', fontSize: 10, fillColor: [240, 240, 240] }
      }]);
      currentRowIndex++;
    } else if (item.tipo === 'grupo') {
      tableData.push([{
        content: '  ' + nomeGrupo(item.id).toUpperCase(),
        colSpan: colCount,
        styles: { fontStyle: 'bold', fontSize: 9, fillColor: [250, 250, 250] }
      }]);
      currentRowIndex++;
    } else if (item.tipo === 'subgrupo') {
      tableData.push([{
        content: '    ' + nomeSubgrupo(item.id).toUpperCase(),
        colSpan: colCount,
        styles: { fontStyle: 'bold', fontSize: 8 }
      }]);
      currentRowIndex++;
    } else if (item.tipo === 'produto') {
      const produto = produtosMap.get(item.id);
      if (!produto) return;
      const qntd = produto.quantidade && produto.unidadeMedida
        ? `${produto.quantidade} ${produto.unidadeMedida}`
        : produto.quantidade || produto.unidadeMedida || '-';
      const row: any[] = [
        produto.codigo,
        produto.nome + (produto.maisBarato ? ' (+Barato)' : ''),
        qntd,
      ];
      const precos: number[] = [];
      Array.from(coletasPorSupermercado.keys()).forEach(supId => {
        const coletasSup = data.coletas.filter(c => c.supermercadoId === supId);
        let preco = 0;
        for (const c of coletasSup) {
          const p = c.precosEditadosAdmin?.[produto.id] ?? c.precos?.[produto.id] ?? 0;
          if (p > 0 && (preco === 0 || p < preco)) preco = p;
        }
        precos.push(preco);
        row.push(preco > 0 ? `R$ ${preco.toFixed(2)}` : '-');
      });
      const validos = precos.filter(p => p > 0);
      if (validos.length > 0) {
        const maxP = Math.max(...validos);
        const minP = Math.min(...validos);
        if (!symbolsMap.has(currentRowIndex)) symbolsMap.set(currentRowIndex, new Map());
        for (let i = 0; i < precos.length; i++) {
          if (precos[i] > 0) {
            if (precos[i] === maxP && precos[i] === minP) symbolsMap.get(currentRowIndex)!.set(3 + i, '+ -');
            else if (precos[i] === maxP) symbolsMap.get(currentRowIndex)!.set(3 + i, '+');
            else if (precos[i] === minP) symbolsMap.get(currentRowIndex)!.set(3 + i, '-');
          }
        }
      }
      tableData.push(row);
      currentRowIndex++;
    }
  });

  // Caso ordem esteja vazia mas haja produtos (fallback): listar em ordem simples
  if (ordem.length === 0) {
    data.produtos.forEach(produto => {
      const qntd = produto.quantidade && produto.unidadeMedida
        ? `${produto.quantidade} ${produto.unidadeMedida}`
        : produto.quantidade || produto.unidadeMedida || '-';
      const row: any[] = [produto.codigo, produto.nome, qntd];
      Array.from(coletasPorSupermercado.keys()).forEach(supId => {
        const coletasSup = data.coletas.filter(c => c.supermercadoId === supId);
        let preco = 0;
        for (const c of coletasSup) {
          const p = c.precosEditadosAdmin?.[produto.id] ?? c.precos?.[produto.id] ?? 0;
          if (p > 0 && (preco === 0 || p < preco)) preco = p;
        }
        row.push(preco > 0 ? `R$ ${preco.toFixed(2)}` : '-');
      });
      tableData.push(row);
      currentRowIndex++;
    });
  }

  const supermercadoNomes = Array.from(coletasPorSupermercado.values()).map(c => {
    const s = data.supermercados.find(x => x.nome === c.nome);
    return s?.abreviacao || c.nome;
  });
  const headRow: any[] = [
    'Código', 'Produto', 'Qntd',
    ...supermercadoNomes.map(n => ({ content: n, styles: { halign: 'right' } }))
  ];
  const columnStyles: any = {
    0: { cellWidth: 20 },
    1: { cellWidth: 50 },
    2: { cellWidth: 25 },
  };
  for (let i = 3; i < 3 + supermercadoNomes.length; i++) {
    columnStyles[i] = { halign: 'right' };
  }
  const manualPriceTextMap = new Map<string, { valueText: string; symbol: string }>();

  autoTable(doc, {
    head: [headRow],
    body: tableData,
    startY: yPos,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles,
    willDrawCell: (d) => {
      if (d.section !== 'body' || d.column.index < 3) return;
      const sym = symbolsMap.get(d.row.index)?.get(d.column.index);
      const txt = d.cell.text?.[0];
      if (!sym || !txt || txt === '-') return;
      manualPriceTextMap.set(`${d.row.index}-${d.column.index}`, { valueText: txt, symbol: sym });
      d.cell.text = [''];
    },
    didDrawCell: (d) => {
      if (d.section !== 'body' || d.column.index < 3) return;
      const m = manualPriceTextMap.get(`${d.row.index}-${d.column.index}`);
      if (!m) return;
      const { valueText, symbol } = m;
      const fontSize = d.cell.styles.fontSize || 8;
      const tp = (d.cell as any).getTextPos();
      const lineY = tp.y + fontSize * 0.3;
      const rightX = tp.x;
      const gap = 0.8;
      doc.setFontSize(fontSize);
      const plusW = symbol.includes('+') ? doc.getTextWidth('+') : 0;
      const minusW = symbol.includes('-') ? doc.getTextWidth('-') : 0;
      const symW = plusW + (symbol.includes('+') && symbol.includes('-') ? gap : 0) + minusW;
      const valueRightX = rightX - symW - gap;
      doc.setTextColor(0, 0, 0);
      doc.text(valueText, valueRightX, lineY, { align: 'right' });
      let cx = valueRightX + gap;
      if (symbol.includes('+')) {
        doc.setTextColor(0, 0, 255);
        doc.text('+', cx, lineY);
        cx += plusW + (symbol.includes('-') ? gap : 0);
      }
      if (symbol.includes('-')) {
        doc.setTextColor(255, 0, 0);
        doc.text('-', cx, lineY);
      }
      doc.setTextColor(0, 0, 0);
      manualPriceTextMap.delete(`${d.row.index}-${d.column.index}`);
    }
  });

  const safeName = data.nome.replace(/[^a-z0-9_-]+/gi, '_');
  doc.save(`${safeName}_${data.data}.pdf`);
};
