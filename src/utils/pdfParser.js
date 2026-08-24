// src/utils/pdfParser.js

import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker do PDF.js para processamento assíncrono seguro no navegador
if (pdfjsLib?.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

/**
 * Meses em português para conversão de datas tipo "05 AGO" ou "12 OUT"
 */
const MONTH_MAP = {
    'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
    'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
    'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12',
    'JANEIRO': '01', 'FEVEREIRO': '02', 'MARCO': '03', 'MARÇO': '03',
    'ABRIL': '04', 'MAIO': '05', 'JUNHO': '06', 'JULHO': '07',
    'AGOSTO': '08', 'SETEMBRO': '09', 'OUTUBRO': '10', 'NOVEMBRO': '11', 'DEZEMBRO': '12'
};

/**
 * Termos comuns que indicam cabeçalhos, totais ou metadados da fatura que NÃO são compras
 */
const IGNORED_TERMS = [
    'pagamento de fatura', 'pagamento recebido', 'pagamento efetuado', 'total da fatura',
    'total a pagar', 'limite de credito', 'limite total', 'limite disponivel', 'limite utilizado',
    'saldo anterior', 'saldo atual', 'saldo devedor', 'resumo da fatura', 'demonstrativo',
    'vencimento', 'data de fechamento', 'data de emissao', 'credito rotativo', 'taxa de juros',
    'encargos', 'iof', 'multa por atraso', 'juros de mora', 'total em reais', 'total desta fatura',
    'valores em r$', 'subtotal', 'titular', 'numero do cartao', 'autenticacao mecanica',
    'linha digitavel', 'codigo de barras', 'central de atendimento', 'ouvidoria', 'fatura fechada'
];

/**
 * Normaliza uma string para comparação (sem acentos, minúsculas, sem pontuação)
 */
export const normalizeText = (text) => {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Extrai todas as linhas de texto de um arquivo PDF
 * @param {File | ArrayBuffer} fileData 
 * @returns {Promise<string[]>} Array de linhas extraídas
 */
export const extractTextLinesFromPdf = async (fileData) => {
    try {
        let arrayBuffer;
        if (fileData instanceof ArrayBuffer) {
            arrayBuffer = fileData;
        } else if (fileData instanceof Blob || fileData instanceof File) {
            arrayBuffer = await fileData.arrayBuffer();
        } else {
            throw new Error('Formato de arquivo inválido para leitura de PDF.');
        }

        // SEGURANÇA — Mitigação de vulnerabilidades conhecidas em pdfjs-dist 3.x:
        //
        // CVE-2024-4367 / GHSA-wgrm-67xf-hhpq (pdfjs-dist <= 4.1.392)
        //   isEvalSupported: false → impede execução de código via eval() embutido em PDF.
        //   Esta é a mitigação oficial para a CVE nesta versão da API.
        //   Nota: `disableJavaScript` NÃO existe na API 3.x (verificado em runtime).
        //
        // enableScripting: false → desativa o motor de scripting de formulários PDF (XFA/AcroForm).
        //   Reduz a superfície de ataque de scripts interativos em PDFs maliciosos.
        //
        // O FinControl usa pdfjs apenas para extração de texto de extratos bancários.
        // Scripting e eval nunca são necessários nesse fluxo.
        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            isEvalSupported: false,   // Mitiga CVE-2024-4367 na API 3.x
            enableScripting: false,   // Desativa scripting de formulários PDF
        });
        const pdf = await loadingTask.promise;
        const rawLines = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Agrupa itens de texto por linha visual com base na coordenada vertical (Y)
            const lineMap = new Map();

            textContent.items.forEach(item => {
                const text = item.str.trim();
                if (!text) return;

                // Arredonda Y para agrupar palavras na mesma linha
                const yCoord = Math.round(item.transform[5]);
                const xCoord = item.transform[4];

                if (!lineMap.has(yCoord)) {
                    lineMap.set(yCoord, []);
                }
                lineMap.get(yCoord).push({ x: xCoord, text: text });
            });

            // Ordena as linhas de cima para baixo (Y decrescente)
            const sortedYCoords = Array.from(lineMap.keys()).sort((a, b) => b - a);

            sortedYCoords.forEach(y => {
                const rowItems = lineMap.get(y);
                // Ordena as palavras da esquerda para a direita (X crescente)
                rowItems.sort((a, b) => a.x - b.x);
                const rowText = rowItems.map(i => i.text).join(' ').trim();
                if (rowText.length > 2) {
                    rawLines.push(rowText);
                }
            });
        }

        return rawLines;
    } catch (error) {
        console.error('Erro ao extrair texto do PDF:', error);
        throw new Error('Não foi possível ler o arquivo PDF. Verifique se o arquivo não está corrompido ou protegido por senha.');
    }
};

/**
 * Converte valor em formato de moeda ("1.234,56" ou "24,90") para Number (float)
 */
const parseMonetaryValue = (valStr) => {
    if (!valStr) return null;
    // Remove "R$", espaços, etc.
    const cleaned = valStr.replace(/R\$|\s/gi, '');
    
    // Se tiver ponto e vírgula: "1.234,56"
    if (cleaned.includes('.') && cleaned.includes(',')) {
        return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }
    // Se tiver apenas vírgula: "120,00"
    if (cleaned.includes(',')) {
        return parseFloat(cleaned.replace(',', '.'));
    }
    // Se for apenas número com ponto decimal: "120.00"
    if (cleaned.includes('.')) {
        return parseFloat(cleaned);
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
};

/**
 * Analisa as linhas de texto da fatura e extrai as transações individuais
 * @param {string[]} lines 
 * @param {string} fallbackYear 
 * @returns {Array<Object>} Transações estruturadas
 */
export const parseInvoiceTransactions = (lines, fallbackYear = new Date().getFullYear().toString()) => {
    const transactions = [];

    // Regex para detectar valores monetários no final ou meio da linha (ex: "R$ 150,00", "150,00", "1.250,90")
    const valueRegex = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+\.\d{2})(?:\s*[-–]|(?:\s*[CD]))?$/i;

    // Regex para datas:
    // 1. "05/08" ou "05/08/2026"
    const dateSlashRegex = /\b(\d{2})\/(\d{2})(?:\/(\d{2,4}))?\b/;
    // 2. "05 AGO" ou "12 OUT"
    const dateMonthWordRegex = /\b(\d{2})\s+([A-Z]{3,9})\b/i;

    // Regex para parcelamentos:
    // "02/10", "PARC 02/10", "PARC. 02/10", "(02/10)", "02 de 10", "PARCELA 02/10", "2/10"
    const installmentRegex = /(?:PARC(?:ELA)?\.?\s*|\(|\b)(\d{1,2})\s*(?:\/|\s+de\s+)\s*(\d{1,2})\)?/i;

    lines.forEach((line, lineIndex) => {
        const lowerLine = line.toLowerCase();

        // 1. Pula termos ignorados (totais, cabeçalhos, limites)
        if (IGNORED_TERMS.some(term => lowerLine.includes(term))) {
            return;
        }

        // 2. Tenta extrair o valor monetário
        const valueMatch = line.match(valueRegex);
        if (!valueMatch) {
            return;
        }

        const valueString = valueMatch[1];
        const value = parseMonetaryValue(valueString);
        if (!value || value <= 0) return;

        // Linha sem o valor para facilitar extração de descrição e data
        const lineWithoutValue = line.substring(0, valueMatch.index).trim();

        // 3. Tenta extrair a data
        let transactionDate = null;
        let lineWithoutDate = lineWithoutValue;

        const slashMatch = lineWithoutValue.match(dateSlashRegex);
        const wordMatch = lineWithoutValue.match(dateMonthWordRegex);

        if (slashMatch) {
            const day = slashMatch[1];
            const month = slashMatch[2];
            let year = slashMatch[3] ? (slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3]) : fallbackYear;
            transactionDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            lineWithoutDate = lineWithoutValue.replace(slashMatch[0], '').trim();
        } else if (wordMatch) {
            const day = wordMatch[1];
            const monthAbbr = wordMatch[2].toUpperCase();
            const monthNum = MONTH_MAP[monthAbbr];
            if (monthNum) {
                transactionDate = `${fallbackYear}-${monthNum}-${day.padStart(2, '0')}`;
                lineWithoutDate = lineWithoutValue.replace(wordMatch[0], '').trim();
            }
        }

        // Se não conseguiu extrair a data, usa a data atual como fallback
        if (!transactionDate) {
            transactionDate = new Date().toISOString().split('T')[0];
        }

        // 4. Tenta extrair parcelamento (ex: 02/10)
        let currentInstallment = 1;
        let totalInstallments = 1;
        let lineWithoutInstallment = lineWithoutDate;

        const instMatch = lineWithoutDate.match(installmentRegex);
        if (instMatch) {
            const cur = parseInt(instMatch[1], 10);
            const tot = parseInt(instMatch[2], 10);
            if (!isNaN(cur) && !isNaN(tot) && tot >= cur && tot > 1 && tot <= 99) {
                currentInstallment = cur;
                totalInstallments = tot;
                lineWithoutInstallment = lineWithoutDate.replace(instMatch[0], '').trim();
            }
        }

        // 5. Limpa a descrição da compra
        let description = lineWithoutInstallment
            .replace(/[•\-_*]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Se a descrição ficou muito curta ou sem letras, ignora
        if (description.length < 2 || !/[a-zA-Z]/.test(description)) {
            return;
        }

        transactions.push({
            id: `inv-${lineIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            description: description.toUpperCase(),
            value: value,
            date: transactionDate,
            currentInstallment,
            totalInstallments,
            isShared: false,
            clientId: '',
            selected: true,
        });
    });

    return transactions;
};

/**
 * Cruza os itens extraídos do PDF com as compras já cadastradas no Firestore
 * Detecta compras duplicadas ou parcelas já existentes
 */
export const matchAndDeduplicate = (extractedItems, existingLoans, selectedCardId) => {
    const loansForCard = existingLoans.filter(l => l.cardId === selectedCardId);

    return extractedItems.map(item => {
        const normItemDesc = normalizeText(item.description);
        let isDuplicate = false;
        let duplicateReason = '';
        let matchedLoan = null;

        // Procura por compra similar no mesmo cartão
        for (const loan of loansForCard) {
            const normLoanDesc = normalizeText(loan.description);
            
            // Verifica similaridade de nome
            const isNameMatch = normLoanDesc === normItemDesc || 
                (normLoanDesc.length > 4 && normItemDesc.includes(normLoanDesc)) ||
                (normItemDesc.length > 4 && normLoanDesc.includes(normItemDesc));

            if (isNameMatch) {
                // Se a compra no banco é parcelada
                if (loan.installmentsCount > 1 && item.totalInstallments > 1) {
                    // Verifica se o total de parcelas bate ou o valor da parcela é idêntico
                    const sampleInstVal = loan.installments?.[0]?.value || (loan.totalValue / loan.installmentsCount);
                    const isValMatch = Math.abs(sampleInstVal - item.value) < 0.10;

                    if (isValMatch) {
                        isDuplicate = true;
                        duplicateReason = `Compra parcelada já cadastrada (${loan.installmentsCount}x). Parcela ${item.currentInstallment} já lançada.`;
                        matchedLoan = loan;
                        break;
                    }
                } else if (loan.installmentsCount === 1 && item.totalInstallments === 1) {
                    // Compra à vista: compara data e valor
                    const isValMatch = Math.abs((loan.totalValue || 0) - item.value) < 0.10;
                    const isDateMatch = loan.purchaseDate === item.date;

                    if (isValMatch && isDateMatch) {
                        isDuplicate = true;
                        duplicateReason = 'Compra à vista idêntica já cadastrada nesta data.';
                        matchedLoan = loan;
                        break;
                    }
                }
            }
        }

        return {
            ...item,
            isDuplicate,
            duplicateReason,
            matchedLoanId: matchedLoan?.id || null,
            // Se for duplicada, desmarca por padrão para não importar duas vezes
            selected: !isDuplicate
        };
    });
};
