import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Produto, Grupo, Subgrupo, Supermercado, Coleta } from '@/types';

interface RelatorioData {
  nome: string;
  nomeCliente: string;
  data: string;
  produtos: Produto[];
  coletas: Coleta[];
  supermercados: Supermercado[];
  grupos: Grupo[];
  subgrupos: Subgrupo[];
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
    const temPreco = data.coletas.some(coleta => 
      coleta.precos && coleta.precos[produto.id] && coleta.precos[produto.id] > 0
    );
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

  // Criar dados da tabela
  const tableData: any[] = [];
  
  // Ordenar produtos por grupo, subgrupo e nome
  const produtosOrdenados = [...data.produtos].sort((a, b) => {
    const grupoA = data.grupos.find(g => g.id === a.grupoId);
    const grupoB = data.grupos.find(g => g.id === b.grupoId);
    if (grupoA && grupoB && grupoA.nome !== grupoB.nome) {
      return grupoA.nome.localeCompare(grupoB.nome);
    }
    const subgrupoA = data.subgrupos.find(s => s.id === a.subgrupoId);
    const subgrupoB = data.subgrupos.find(s => s.id === b.subgrupoId);
    if (subgrupoA && subgrupoB && subgrupoA.nome !== subgrupoB.nome) {
      return subgrupoA.nome.localeCompare(subgrupoB.nome);
    }
    return a.nome.localeCompare(b.nome);
  });

  produtosOrdenados.forEach(produto => {
    const row: any[] = [
      produto.codigo,
      produto.nome,
      produto.quantidade || produto.unidadeMedida
    ];

    // Preços por supermercado
    const precos: number[] = [];
    data.coletas.forEach(coleta => {
      const preco = coleta.precos?.[produto.id] || 0;
      precos.push(preco);
      row.push(preco > 0 ? `R$ ${preco.toFixed(2)}` : '-');
    });

    // Calcular máximo e mínimo (apenas preços > 0)
    const precosValidos = precos.filter(p => p > 0);
    if (precosValidos.length > 0) {
      const maxPreco = Math.max(...precosValidos);
      const minPreco = Math.min(...precosValidos);

      // Adicionar símbolos + e -
      for (let i = 0; i < precos.length; i++) {
        if (precos[i] > 0) {
          if (precos[i] === maxPreco) {
            row[3 + i] += ' +';
          }
          if (precos[i] === minPreco) {
            row[3 + i] += ' -';
          }
        }
      }
    }

    tableData.push(row);
  });

  // Cabeçalhos da tabela
  const headers = [
    'Código',
    'Produto',
    'Quantidade',
    ...Array.from(coletasPorSupermercado.values()).map(c => c.nome)
  ];

  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: yPos,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 60 },
      2: { cellWidth: 25 }
    }
  });

  doc.save(`${data.nomeCliente}_${data.data}.pdf`);
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
      const preco = coleta.precos?.[produto.id] || 0;
      
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
          produto.quantidade || produto.unidadeMedida,
          produto.nome
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