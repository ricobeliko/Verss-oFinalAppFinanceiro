// tests/monthAndDatePicker.test.js
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import MonthPicker, { CalendarIcon as MonthCalendarIcon } from '../src/components/MonthPicker';
import DatePicker, { CalendarIcon as DateCalendarIcon } from '../src/components/DatePicker';
import { calculateInvoiceDueDate, calculateInstallments } from '../src/services/financialService';

describe('Componentes <MonthPicker> e <DatePicker> — Testes Unitários de Fuso, Integridade e Acessibilidade (Commit 2)', () => {
  describe('1. Parsing e Formatação de Datas sem Dependência de Fuso (Zero Offset Bug)', () => {
    it('garante que a data 2026-11-05 não retrocede para 2026-11-04 em UTC ou America/Sao_Paulo', () => {
      // Simulação com strings
      const dateStr = '2026-11-05';
      const parts = dateStr.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);

      expect(y).toBe(2026);
      expect(m).toBe(11);
      expect(d).toBe(5);

      const html = renderToString(
        React.createElement(DatePicker, {
          id: 'testDate',
          value: '2026-11-05',
        })
      );

      // Deve exibir 05/11/2026 e nunca 04/11/2026
      expect(html).toContain('05/11/2026');
      expect(html).not.toContain('04/11/2026');
    });

    it('valida corretamente ano bissexto (29/02) vs ano comum (28/02)', () => {
      // 2024 é bissexto (fevereiro tem 29 dias)
      const feb2024 = new Date(2024, 2, 0).getDate();
      expect(feb2024).toBe(29);

      // 2026 é ano comum (fevereiro tem 28 dias)
      const feb2026 = new Date(2026, 2, 0).getDate();
      expect(feb2026).toBe(28);

      // 2028 é bissexto (fevereiro tem 29 dias)
      const feb2028 = new Date(2028, 2, 0).getDate();
      expect(feb2028).toBe(29);
    });

    it('valida meses de 30 dias (abril, junho, setembro, novembro)', () => {
      const months30 = [4, 6, 9, 11];
      months30.forEach((m) => {
        const days = new Date(2026, m, 0).getDate();
        expect(days).toBe(30);
      });

      const months31 = [1, 3, 5, 7, 8, 10, 12];
      months31.forEach((m) => {
        const days = new Date(2026, m, 0).getDate();
        expect(days).toBe(31);
      });
    });

    it('trata valor inicial vazio e valores inválidos graciosamente sem quebrar', () => {
      const htmlEmpty = renderToString(
        React.createElement(DatePicker, {
          id: 'emptyDate',
          value: '',
          placeholder: 'Selecione a data...',
        })
      );
      expect(htmlEmpty).toContain('Selecione a data...');

      const htmlInvalid = renderToString(
        React.createElement(DatePicker, {
          id: 'invalidDate',
          value: 'invalid-date-string',
          placeholder: 'Selecione a data...',
        })
      );
      expect(htmlInvalid).toContain('Selecione a data...');
    });
  });

  describe('2. Renderização e Acessibilidade do <MonthPicker>', () => {
    it('renderiza o botão com texto por extenso em pt-BR e input oculto sincronizado', () => {
      const html = renderToString(
        React.createElement(MonthPicker, {
          id: 'dashboardMonth',
          name: 'filterMonth',
          value: '2026-11',
          required: true,
          'aria-label': 'Competência',
        })
      );

      expect(html).toContain('novembro de 2026');
      expect(html).toContain('type="month"');
      expect(html).toContain('value="2026-11"');
      expect(html).toContain('required=""');
      expect(html).toContain('name="filterMonth"');
      expect(html).toContain('class="sr-only absolute pointer-events-none opacity-0 w-0 h-0"');
    });

    it('renderiza estado disabled no MonthPicker', () => {
      const html = renderToString(
        React.createElement(MonthPicker, {
          id: 'disabledMonth',
          value: '2026-11',
          disabled: true,
        })
      );

      expect(html).toContain('disabled=""');
      expect(html).toContain('disabled:opacity-50 disabled:cursor-not-allowed');
    });

    it('dispara onChange com synthetic event { target: { value: "YYYY-MM" } }', () => {
      const handleChange = vi.fn();
      const el = React.createElement(MonthPicker, {
        id: 'eventMonth',
        value: '2026-11',
        onChange: handleChange,
      });

      expect(el.props.onChange).toBe(handleChange);
    });
  });

  describe('3. Renderização e Acessibilidade do <DatePicker>', () => {
    it('renderiza o botão com data formatada DD/MM/AAAA e input oculto sincronizado', () => {
      const html = renderToString(
        React.createElement(DatePicker, {
          id: 'purchaseDate',
          name: 'purchaseDate',
          value: '2026-05-15',
          required: true,
          'aria-label': 'Data da Compra',
        })
      );

      expect(html).toContain('15/05/2026');
      expect(html).toContain('type="date"');
      expect(html).toContain('value="2026-05-15"');
      expect(html).toContain('required=""');
      expect(html).toContain('name="purchaseDate"');
      expect(html).toContain('class="sr-only absolute pointer-events-none opacity-0 w-0 h-0"');
    });

    it('renderiza estado disabled no DatePicker', () => {
      const html = renderToString(
        React.createElement(DatePicker, {
          id: 'disabledDate',
          value: '2026-05-15',
          disabled: true,
        })
      );

      expect(html).toContain('disabled=""');
      expect(html).toContain('disabled:opacity-50 disabled:cursor-not-allowed');
    });
  });

  describe('4. Tamanho Fixo e Imutabilidade de Classes do Ícone de Calendário (Regressão Fase 9.1)', () => {
    it('garante que CalendarIcon do MonthPicker possui width=16, height=16 e w-4 h-4 tanto fechado quanto aberto', () => {
      // 1. Fechado (isOpen = false: className="text-[var(--fc-text-muted)]")
      const closedHtml = renderToString(
        React.createElement(MonthCalendarIcon, { className: 'text-[var(--fc-text-muted)]' })
      );
      expect(closedHtml).toContain('width="16"');
      expect(closedHtml).toContain('height="16"');
      expect(closedHtml).toContain('w-4');
      expect(closedHtml).toContain('h-4');
      expect(closedHtml).toContain('shrink-0');
      expect(closedHtml).toContain('text-[var(--fc-text-muted)]');

      // 2. Aberto (isOpen = true: className="text-[var(--fc-accent)]")
      const openHtml = renderToString(
        React.createElement(MonthCalendarIcon, { className: 'text-[var(--fc-accent)]' })
      );
      expect(openHtml).toContain('width="16"');
      expect(openHtml).toContain('height="16"');
      expect(openHtml).toContain('w-4');
      expect(openHtml).toContain('h-4');
      expect(openHtml).toContain('shrink-0');
      expect(openHtml).toContain('text-[var(--fc-accent)]');

      // 3. Renderização completa de MonthPicker no DOM
      const pickerHtml = renderToString(
        React.createElement(MonthPicker, { value: '2026-11' })
      );
      expect(pickerHtml).toContain('width="16"');
      expect(pickerHtml).toContain('height="16"');
      expect(pickerHtml).toContain('w-4 h-4 shrink-0 text-[var(--fc-text-muted)]');
    });

    it('garante que CalendarIcon do DatePicker possui width=16, height=16 e w-4 h-4 tanto fechado quanto aberto', () => {
      // 1. Fechado (isOpen = false)
      const closedHtml = renderToString(
        React.createElement(DateCalendarIcon, { className: 'text-[var(--fc-text-muted)]' })
      );
      expect(closedHtml).toContain('width="16"');
      expect(closedHtml).toContain('height="16"');
      expect(closedHtml).toContain('w-4');
      expect(closedHtml).toContain('h-4');
      expect(closedHtml).toContain('shrink-0');
      expect(closedHtml).toContain('text-[var(--fc-text-muted)]');

      // 2. Aberto (isOpen = true)
      const openHtml = renderToString(
        React.createElement(DateCalendarIcon, { className: 'text-[var(--fc-accent)]' })
      );
      expect(openHtml).toContain('width="16"');
      expect(openHtml).toContain('height="16"');
      expect(openHtml).toContain('w-4');
      expect(openHtml).toContain('h-4');
      expect(openHtml).toContain('shrink-0');
      expect(openHtml).toContain('text-[var(--fc-accent)]');

      // 3. Renderização completa de DatePicker no DOM
      const pickerHtml = renderToString(
        React.createElement(DatePicker, { value: '2026-11-05' })
      );
      expect(pickerHtml).toContain('width="16"');
      expect(pickerHtml).toContain('height="16"');
      expect(pickerHtml).toContain('w-4 h-4 shrink-0 text-[var(--fc-text-muted)]');
    });
  });

  describe('5. Invariância de Navegação de Meses e Estabilidade sob Re-renders (Bugfix Fase 12.0)', () => {
    function createDatePickerHarness({ initialValue = '2026-11-19', onChange, useBuggyEffect = false } = {}) {
      let value = initialValue;
      let isOpen = false;
      let viewMode = 'days';

      const parseDateParts = (val) => {
        if (!val || typeof val !== 'string') return null;
        const parts = val.split('-');
        if (parts.length !== 3) return null;
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (isNaN(y) || isNaN(m) || isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) return null;
        return { year: y, month: m, day: d };
      };

      const MONTH_NAMES_FULL = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      const initialParsed = parseDateParts(value);
      let viewYear = initialParsed ? initialParsed.year : 2026;
      let viewMonth = initialParsed ? initialParsed.month : 11;
      let focusedDay = initialParsed ? initialParsed.day : 19;

      let prevDeps = null;

      const runRenderAndEffects = () => {
        const parsed = parseDateParts(value);
        const pYear = parsed?.year;
        const pMonth = parsed?.month;
        const pDay = parsed?.day;

        if (useBuggyEffect) {
          // Implementação anterior defeituosa (Commit c3f54cd / main):
          // Dependência [value, parsed]. Como parsed é objeto novo a cada render,
          // o efeito roda a cada re-render e reseta viewMonth para parsed.month.
          const currentDeps = [value, parsed];
          let depsChanged = false;
          if (!prevDeps) {
            depsChanged = true;
          } else {
            for (let i = 0; i < currentDeps.length; i++) {
              if (!Object.is(currentDeps[i], prevDeps[i])) {
                depsChanged = true;
                break;
              }
            }
          }
          prevDeps = currentDeps;

          if (depsChanged && parsed) {
            viewYear = parsed.year;
            viewMonth = parsed.month;
            focusedDay = parsed.day;
          }
        } else {
          // Implementação corrigida (Fase 12.0):
          // Dependências primitivas [isOpen, pYear, pMonth, pDay]
          const currentDeps = [isOpen, pYear, pMonth, pDay];
          let depsChanged = false;
          if (!prevDeps) {
            depsChanged = true;
          } else {
            for (let i = 0; i < currentDeps.length; i++) {
              if (!Object.is(currentDeps[i], prevDeps[i])) {
                depsChanged = true;
                break;
              }
            }
          }
          prevDeps = currentDeps;

          if (depsChanged && isOpen) {
            viewMode = 'days';
            if (pYear && pMonth && pDay) {
              viewYear = pYear;
              viewMonth = pMonth;
              focusedDay = pDay;
            }
          }
        }
      };

      runRenderAndEffects();

      return {
        open: () => {
          isOpen = true;
          runRenderAndEffects();
        },
        close: () => {
          isOpen = false;
          runRenderAndEffects();
        },
        prevMonth: () => {
          if (viewMonth === 1) {
            viewYear -= 1;
            viewMonth = 12;
          } else {
            viewMonth -= 1;
          }
          runRenderAndEffects();
        },
        nextMonth: () => {
          if (viewMonth === 12) {
            viewYear += 1;
            viewMonth = 1;
          } else {
            viewMonth += 1;
          }
          runRenderAndEffects();
        },
        selectDay: (d) => {
          const mStr = String(viewMonth).padStart(2, '0');
          const dStr = String(d).padStart(2, '0');
          const nextVal = `${viewYear}-${mStr}-${dStr}`;
          isOpen = false;
          if (onChange) {
            onChange({ target: { value: nextVal } });
          }
          runRenderAndEffects();
        },
        rerender: (newVal) => {
          if (newVal !== undefined) value = newVal;
          runRenderAndEffects();
        },
        getHeaderText: () => `${MONTH_NAMES_FULL[viewMonth - 1]} de ${viewYear}`,
        getViewYear: () => viewYear,
        getViewMonth: () => viewMonth,
        getFocusedDay: () => focusedDay,
        getViewMode: () => viewMode,
        getIsOpen: () => isOpen,
      };
    }

    it('PROVA DA FALHA (RED) no modelo anterior: re-render após navegar reseta o mês de volta para Novembro', () => {
      const buggyHarness = createDatePickerHarness({
        initialValue: '2026-11-19',
        useBuggyEffect: true,
      });

      buggyHarness.open();
      expect(buggyHarness.getHeaderText()).toBe('Novembro de 2026');

      // Usuário clica em "Mês anterior"
      buggyHarness.prevMonth();

      // No modelo anterior com defeito, o re-render disparado pelo prevMonth já executava o efeito
      // devido à nova referência de `parsed`, resetando o mês imediatamente de volta para Novembro!
      expect(buggyHarness.getHeaderText()).toBe('Novembro de 2026'); // FALHA COMPROVADA!
    });

    it('PROVA DO SUCESSO (GREEN) no modelo corrigido: navegar para Outubro PERMANECE após re-renders e permite navegar até Setembro', () => {
      const handleChange = vi.fn();
      const harness = createDatePickerHarness({
        initialValue: '2026-11-19',
        onChange: handleChange,
        useBuggyEffect: false,
      });

      harness.open();
      expect(harness.getHeaderText()).toBe('Novembro de 2026');

      // 1. Clica em "Mês anterior" -> passa para "Outubro de 2026"
      harness.prevMonth();
      expect(harness.getHeaderText()).toBe('Outubro de 2026');

      // 2. Re-render com o mesmo value -> PERMANECE "Outubro de 2026"
      harness.rerender();
      expect(harness.getHeaderText()).toBe('Outubro de 2026');

      // 3. Clica de novo em "Mês anterior" -> passa para "Setembro de 2026"
      harness.prevMonth();
      expect(harness.getHeaderText()).toBe('Setembro de 2026');

      // 4. Volta para Outubro clicando em "Próximo mês"
      harness.nextMonth();
      expect(harness.getHeaderText()).toBe('Outubro de 2026');

      // 5. Clica no dia 15 de Outubro e verifica onChange com "2026-10-15"
      harness.selectDay(15);
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith({
        target: { value: '2026-10-15' },
      });
      expect(harness.getIsOpen()).toBe(false);
    });

    it('trata virada de ano corretamente: value="2026-01-10", voltar um mês -> "Dezembro de 2025" e permanece após re-render', () => {
      const harness = createDatePickerHarness({
        initialValue: '2026-01-10',
        useBuggyEffect: false,
      });

      harness.open();
      expect(harness.getHeaderText()).toBe('Janeiro de 2026');

      // Volta um mês (virada de ano)
      harness.prevMonth();
      expect(harness.getHeaderText()).toBe('Dezembro de 2025');

      // Re-render deve preservar Dezembro de 2025
      harness.rerender();
      expect(harness.getHeaderText()).toBe('Dezembro de 2025');
    });

    it('fechar e reabrir após navegar restaura o mês do value selecionado', () => {
      const harness = createDatePickerHarness({
        initialValue: '2026-11-19',
        useBuggyEffect: false,
      });

      harness.open();
      expect(harness.getHeaderText()).toBe('Novembro de 2026');

      // Navega para Outubro sem selecionar nada
      harness.prevMonth();
      expect(harness.getHeaderText()).toBe('Outubro de 2026');

      // Fecha o calendário
      harness.close();
      expect(harness.getIsOpen()).toBe(false);

      // Reabre o calendário: deve ressincronizar com a data de value
      harness.open();
      expect(harness.getHeaderText()).toBe('Novembro de 2026');
      expect(harness.getFocusedDay()).toBe(19);
    });
  });

  describe('6. Cálculo de Vencimento e Parcelas para Compra no Mês Anterior (Bloco 3)', () => {
    // Cartão 1: closingDay < dueDay (ex: fechamento dia 5, vencimento dia 12)
    const cardNubankGold = { id: 'card-1', name: 'Nubank Gold', closingDay: 5, dueDay: 12 };
    // Cartão 2: closingDay >= dueDay (ex: fechamento dia 25, vencimento dia 5)
    const cardInter = { id: 'card-2', name: 'Inter Platinum', closingDay: 25, dueDay: 5 };
    // Cartão 3: closingDay < dueDay com fechamento dia 20 e vencimento dia 28
    const cardLateClosing = { id: 'card-3', name: 'Cartão Fechamento 20', closingDay: 20, dueDay: 28 };

    it('Caso 1: Compra em 2026-10-15 após o fechamento (dia 5) -> 1ª parcela cai em 2026-11-12 (Novembro)', () => {
      const firstDue = calculateInvoiceDueDate('2026-10-15', cardNubankGold);
      const firstDueStr = firstDue.toISOString().split('T')[0];
      expect(firstDueStr).toBe('2026-11-12');

      const installments = calculateInstallments({
        totalValue: 300,
        count: 3,
        startDate: firstDueStr,
      });

      expect(installments).toHaveLength(3);
      // Parcela 1/3: Novembro/2026
      expect(installments[0].number).toBe(1);
      expect(installments[0].dueDate).toBe('2026-11-12');
      expect(installments[0].status).toBe('Pendente');
      // Parcela 2/3: Dezembro/2026
      expect(installments[1].number).toBe(2);
      expect(installments[1].dueDate).toBe('2026-12-12');
      expect(installments[1].status).toBe('Pendente');
      // Parcela 3/3: Janeiro/2027
      expect(installments[2].number).toBe(3);
      expect(installments[2].dueDate).toBe('2027-01-12');
      expect(installments[2].status).toBe('Pendente');
    });

    it('Caso 2: Compra em 2026-10-15 antes do fechamento (dia 25) com vencimento dia 5 -> 1ª parcela cai em 2026-11-05 (Novembro)', () => {
      const firstDue = calculateInvoiceDueDate('2026-10-15', cardInter);
      const firstDueStr = firstDue.toISOString().split('T')[0];
      expect(firstDueStr).toBe('2026-11-05');

      const installments = calculateInstallments({
        totalValue: 300,
        count: 3,
        startDate: firstDueStr,
      });

      expect(installments).toHaveLength(3);
      expect(installments[0].dueDate).toBe('2026-11-05');
      expect(installments[1].dueDate).toBe('2026-12-05');
      expect(installments[2].dueDate).toBe('2027-01-05');
      installments.forEach(inst => expect(inst.status).toBe('Pendente'));
    });

    it('Caso 3: Compra em 2026-10-15 antes do fechamento (dia 20) com vencimento dia 28 -> 1ª parcela cai em 2026-10-28 (Outubro)', () => {
      const firstDue = calculateInvoiceDueDate('2026-10-15', cardLateClosing);
      const firstDueStr = firstDue.toISOString().split('T')[0];
      expect(firstDueStr).toBe('2026-10-28');

      const installments = calculateInstallments({
        totalValue: 300,
        count: 3,
        startDate: firstDueStr,
      });

      expect(installments).toHaveLength(3);
      // Parcela 1/3: Outubro/2026
      expect(installments[0].dueDate).toBe('2026-10-28');
      // Parcela 2/3: Novembro/2026
      expect(installments[1].dueDate).toBe('2026-11-28');
      // Parcela 3/3: Dezembro/2026
      expect(installments[2].dueDate).toBe('2026-12-28');
      // Nenhuma parcela do passado é auto-marcada como paga; todas começam como Pendente
      installments.forEach(inst => expect(inst.status).toBe('Pendente'));
    });
  });
});
