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
  console.log('🔵 GERANDO PDF - Dados recebidos:', data);
  console.log('🔵 Coletas:', data.coletas);
  console.log('🔵 Produtos:', data.produtos);
  
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

  // Verificar se todas as datas são iguais
  const datas = Array.from(coletasPorSupermercado.values()).map(c => c.data);
  const todasDataIguais = datas.every(d => d === datas[0]);

  if (todasDataIguais && datas.length > 0) {
    doc.text(`Data da coleta: ${datas[0]}`, 14, yPos);
    yPos += 5;
    doc.text(`Supermercados: ${Array.from(coletasPorSupermercado.values()).map(c => c.nome).join(', ')}`, 14, yPos);
  } else {
    doc.text('Datas e Supermercados:', 14, yPos);
    yPos += 5;
    coletasPorSupermercado.forEach(({ data, nome }) => {
      doc.text(`  • ${nome}: ${data}`, 14, yPos);
      yPos += 5;
    });
  }

  yPos += 3;

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
  const sortedDepartamentos = Array.from(hierarchy.keys()).sort();
  
  sortedDepartamentos.forEach(depNome => {
    // Adicionar linha do departamento (em negrito via estilo)
    tableData.push([{
      content: depNome.toUpperCase(),
      colSpan: 3 + data.coletas.length,
      styles: { fontStyle: 'bold', fontSize: 10, fillColor: [240, 240, 240] }
    }]);
    currentRowIndex++;
    
    const grupoMap = hierarchy.get(depNome)!;
    const sortedGrupos = Array.from(grupoMap.keys()).sort();
    
    sortedGrupos.forEach(grupoNome => {
      // Adicionar linha do grupo (indentada)
      tableData.push([{
        content: '  ' + grupoNome.toUpperCase(),
        colSpan: 3 + data.coletas.length,
        styles: { fontStyle: 'bold', fontSize: 9, fillColor: [250, 250, 250] }
      }]);
      currentRowIndex++;
      
      const subgrupoMap = grupoMap.get(grupoNome)!;
      const sortedSubgrupos = Array.from(subgrupoMap.keys()).sort();
      
      sortedSubgrupos.forEach(subgrupoNome => {
        // Adicionar linha do subgrupo (mais indentada)
        tableData.push([{
          content: '    ' + subgrupoNome.toUpperCase(),
          colSpan: 3 + data.coletas.length,
          styles: { fontStyle: 'bold', fontSize: 8 }
        }]);
        currentRowIndex++;
        
        const produtos = subgrupoMap.get(subgrupoNome)!;
        const produtosOrdenados = produtos.sort((a, b) => a.nome.localeCompare(b.nome));
        
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
          const precos: number[] = [];
          const textosMaisBarato: string[] = [];
          let temTextoMaisBarato = false;
          
          data.coletas.forEach(coleta => {
            console.log(`🔵 Produto ${produto.nome} - Coleta ${coleta.id}:`, {
              precosEditadosAdmin: coleta.precosEditadosAdmin,
              precos: coleta.precos,
              precoFinal: coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0
            });
            
            const preco = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
            const texto = coleta.textosMaisBarato?.[produto.id] || '';
            precos.push(preco);
            textosMaisBarato.push(texto);
            
            if (produto.maisBarato && texto && preco > 0) {
              temTextoMaisBarato = true;
            }
            
            // Adicionar preço sem símbolo por enquanto, será adicionado depois
            row.push(preco > 0 ? `R$ ${preco.toFixed(2)}` : '-');
          });

          // Calcular máximo e mínimo (apenas preços > 0)
          const precosValidos = precos.filter(p => p > 0);
          if (precosValidos.length > 0) {
            const maxPreco = Math.max(...precosValidos);
            const minPreco = Math.min(...precosValidos);

            // Adicionar símbolos diretamente no texto da célula
            for (let i = 0; i < precos.length; i++) {
              if (precos[i] > 0) {
                const cellIndex = 3 + i;
                let symbol = '';
                
                if (precos[i] === maxPreco && precos[i] === minPreco) {
                  symbol = '+ -';
                } else if (precos[i] === maxPreco) {
                  symbol = '+';
                } else if (precos[i] === minPreco) {
                  symbol = '-';
                }
                
                if (symbol) {
                  row[cellIndex] = `R$ ${precos[i].toFixed(2)}${symbol}`;
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
  const headers = [
    'Código',
    'Produto',
    'Qntd',
    ...Array.from(coletasPorSupermercado.values()).map(c => {
      const supermercado = data.supermercados.find(s => s.nome === c.nome);
      return supermercado?.abreviacao || c.nome;
    })
  ];

  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: yPos,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 50 },
      2: { cellWidth: 25 }
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

  // Verificar se todas as datas são iguais
  const datas = Array.from(coletasPorSupermercado.values()).map(c => c.data);
  const todasDataIguais = datas.every(d => d === datas[0]);

  if (todasDataIguais && datas.length > 0) {
    doc.text(`Data da coleta: ${datas[0]}`, 14, yPos);
    yPos += 5;
    doc.text(`Supermercados: ${Array.from(coletasPorSupermercado.values()).map(c => c.nome).join(', ')}`, 14, yPos);
  } else {
    doc.text('Datas e Supermercados:', 14, yPos);
    yPos += 5;
    coletasPorSupermercado.forEach(({ data, nome }) => {
      doc.text(`  • ${nome}: ${data}`, 14, yPos);
      yPos += 5;
    });
  }

  yPos += 3;

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
  const sortedDepartamentos = Array.from(hierarchy.keys()).sort();
  
  sortedDepartamentos.forEach(depNome => {
    tableData.push([{
      content: depNome.toUpperCase(),
      colSpan: 3,
      styles: { fontStyle: 'bold', fontSize: 10, fillColor: [240, 240, 240] }
    }]);
    
    const grupoMap = hierarchy.get(depNome)!;
    const sortedGrupos = Array.from(grupoMap.keys()).sort();
    
    sortedGrupos.forEach(grupoNome => {
      tableData.push([{
        content: '  ' + grupoNome.toUpperCase(),
        colSpan: 3,
        styles: { fontStyle: 'bold', fontSize: 9, fillColor: [250, 250, 250] }
      }]);
      
      const subgrupoMap = grupoMap.get(grupoNome)!;
      const sortedSubgrupos = Array.from(subgrupoMap.keys()).sort();
      
      sortedSubgrupos.forEach(subgrupoNome => {
        tableData.push([{
          content: '    ' + subgrupoNome.toUpperCase(),
          colSpan: 3,
          styles: { fontStyle: 'bold', fontSize: 8 }
        }]);
        
        const produtos = subgrupoMap.get(subgrupoNome)!;
        const produtosOrdenados = produtos.sort((a, b) => a.nome.localeCompare(b.nome));
        
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

  // Verificar se todas as datas são iguais
  const datas = Array.from(coletasPorSupermercado.values()).map(c => c.data);
  const todasDataIguais = datas.every(d => d === datas[0]);

  if (todasDataIguais && datas.length > 0) {
    doc.text(`Data da coleta: ${datas[0]}`, 14, yPos);
    yPos += 5;
  }
  
  doc.text(`Supermercados: ${Array.from(coletasPorSupermercado.values()).map(c => c.nome).join(', ')}`, 14, yPos);
  yPos += 10;

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

  // Verificar se todas as datas são iguais
  const datas = Array.from(coletasPorSupermercado.values()).map(c => c.data);
  const todasDataIguais = datas.every(d => d === datas[0]);

  if (todasDataIguais && datas.length > 0) {
    doc.text(`Data da coleta: ${datas[0]}`, 14, yPos);
    yPos += 5;
    doc.text(`Supermercados: ${Array.from(coletasPorSupermercado.values()).map(c => c.nome).join(', ')}`, 14, yPos);
  } else {
    doc.text('Datas e Supermercados:', 14, yPos);
    yPos += 5;
    coletasPorSupermercado.forEach(({ data, nome }) => {
      doc.text(`  • ${nome}: ${data}`, 14, yPos);
      yPos += 5;
    });
  }

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
      itensEncontrados,
      menorPreco,
      maiorPreco
    });
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  estatisticas.forEach((stat) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(`${stat.nome}:`, 14, yPos);
    doc.text(`  Itens encontrados: ${stat.itensEncontrados}`, 14, yPos + 5);
    doc.text(`  Menor preço: ${stat.menorPreco} vezes`, 14, yPos + 10);
    doc.text(`  Maior preço: ${stat.maiorPreco} vezes`, 14, yPos + 15);
    yPos += 22;
  });

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

  const produtosComDiferenca: any[] = [];

  data.produtos.forEach((produto) => {
    const precos: number[] = [];

    data.coletas.forEach(coleta => {
      const preco = coleta.precosEditadosAdmin?.[produto.id] ?? coleta.precos?.[produto.id] ?? 0;
      if (preco && preco > 0) {
        precos.push(preco);
      }
    });

    if (precos.length >= 2) {
      const menorPreco = Math.min(...precos);
      const maiorPreco = Math.max(...precos);
      const diferencaPercentual = ((maiorPreco - menorPreco) / menorPreco) * 100;

      if (diferencaPercentual >= percentualMinimo) {
        produtosComDiferenca.push({
          nome: produto.nome,
          menorPreco: menorPreco.toFixed(2),
          maiorPreco: maiorPreco.toFixed(2),
          diferenca: diferencaPercentual.toFixed(2)
        });
      }
    }
  });

  if (produtosComDiferenca.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nenhum produto encontrado com essa diferença.', 14, yPos);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    produtosComDiferenca.forEach((prod) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${prod.nome}:`, 14, yPos);
      doc.text(`  Menor: R$ ${prod.menorPreco} | Maior: R$ ${prod.maiorPreco} | Diferença: ${prod.diferenca}%`, 14, yPos + 5);
      yPos += 12;
    });
  }

  doc.save(`${data.nomeCliente}_estatisticas.pdf`);
};

// Gera TXT do relatório
export const generateTXT = (data: RelatorioData) => {
  const lines: string[] = [];

  // Ordenar produtos por nome A-Z
  const produtosOrdenados = [...data.produtos].sort((a, b) => 
    a.nome.localeCompare(b.nome)
  );

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