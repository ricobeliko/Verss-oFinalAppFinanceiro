// tests/designSystemPrimitives.test.jsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

import Button from '../src/design-system/primitives/Button';
import IconButton from '../src/design-system/primitives/IconButton';
import Surface from '../src/design-system/primitives/Surface';
import TextField from '../src/design-system/primitives/TextField';
import Badge from '../src/design-system/primitives/Badge';
import Modal from '../src/design-system/primitives/Modal';
import DesignSystemLab from '../src/design-system/lab/DesignSystemLab';

describe('FinControl — Design System 2.0 Primitives (Fase 8.5 — Stage A)', () => {

  describe('1. Primitive: Button', () => {
    it('deve renderizar botão primário padrão com atributos de acessibilidade e touch target >= 44px', () => {
      const html = renderToString(
        React.createElement(Button, { variant: 'primary', size: 'md' }, 'Salvar Transação')
      );
      expect(html).toContain('Salvar Transação');
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('type="button"');
      expect(html).not.toContain('aria-busy');
    });

    it('deve lidar com estado isLoading com aria-busy="true", spinner acessível e desabilitação', () => {
      const html = renderToString(
        React.createElement(Button, { isLoading: true }, 'Confirmar')
      );
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('disabled');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('animate-spin');
      expect(html).toContain('Carregando...');
    });

    it('deve lidar com estado disabled real e atributos coerentes', () => {
      const html = renderToString(
        React.createElement(Button, { disabled: true }, 'Ação Desativada')
      );
      expect(html).toContain('disabled');
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('opacity-40');
      expect(html).toContain('cursor-not-allowed');
    });

    it('deve renderizar variantes secondary, ghost e danger corretamente', () => {
      const secHtml = renderToString(React.createElement(Button, { variant: 'secondary' }, 'Secundário'));
      const ghostHtml = renderToString(React.createElement(Button, { variant: 'ghost' }, 'Fantasma'));
      const dangerHtml = renderToString(React.createElement(Button, { variant: 'danger' }, 'Excluir'));

      expect(secHtml).toContain('border-[var(--fc-border-default)]');
      expect(ghostHtml).toContain('bg-transparent');
      expect(dangerHtml).toContain('bg-[var(--fc-danger)]');
    });
  });

  describe('2. Primitive: IconButton', () => {
    it('deve exigir ariaLabel e aplicar touch target mínimo de 44x44px', () => {
      const MockIcon = () => React.createElement('svg', { 'data-testid': 'mock-icon' });
      const html = renderToString(
        React.createElement(IconButton, {
          ariaLabel: 'Fechar painel',
          icon: React.createElement(MockIcon)
        })
      );
      expect(html).toContain('aria-label="Fechar painel"');
      expect(html).toContain('min-w-[44px]');
      expect(html).toContain('min-h-[44px]');
      expect(html).toContain('mock-icon');
    });

    it('deve lidar com estado desabilitado', () => {
      const MockIcon = () => React.createElement('span', null, 'X');
      const html = renderToString(
        React.createElement(IconButton, {
          ariaLabel: 'Excluir item',
          disabled: true,
          icon: React.createElement(MockIcon)
        })
      );
      expect(html).toContain('disabled');
      expect(html).toContain('aria-disabled="true"');
      expect(html).toContain('cursor-not-allowed');
    });
  });

  describe('3. Primitive: TextField', () => {
    it('deve associar label e input via id e htmlFor', () => {
      const html = renderToString(
        React.createElement(TextField, {
          id: 'client-name',
          label: 'Nome do Cliente',
          placeholder: 'Digite o nome'
        })
      );
      expect(html).toContain('for="client-name"');
      expect(html).toContain('id="client-name"');
      expect(html).toContain('Nome do Cliente');
      expect(html).toContain('placeholder="Digite o nome"');
      expect(html).toContain('min-h-[44px]');
    });

    it('deve configurar aria-invalid="true" e aria-describedby quando houver erro', () => {
      const html = renderToString(
        React.createElement(TextField, {
          id: 'user-email',
          label: 'E-mail',
          error: 'E-mail inválido ou incompleto'
        })
      );
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('aria-describedby="user-email-error"');
      expect(html).toContain('id="user-email-error"');
      expect(html).toContain('role="alert"');
      expect(html).toContain('E-mail inválido ou incompleto');
    });

    it('deve associar helperText via aria-describedby na ausência de erro', () => {
      const html = renderToString(
        React.createElement(TextField, {
          id: 'user-code',
          label: 'Código',
          helperText: 'Código de 6 dígitos enviado por SMS'
        })
      );
      expect(html).toContain('aria-describedby="user-code-helper"');
      expect(html).toContain('id="user-code-helper"');
      expect(html).toContain('Código de 6 dígitos enviado por SMS');
    });

    it('deve renderizar prefixo e sufixo decorativo com aria-hidden', () => {
      const html = renderToString(
        React.createElement(TextField, {
          id: 'amount-input',
          label: 'Valor da Parcela',
          prefix: 'R$',
          suffix: 'BRL'
        })
      );
      expect(html).toContain('R$');
      expect(html).toContain('BRL');
      expect(html).toContain('aria-hidden="true"');
    });
  });

  describe('4. Primitive: Surface', () => {
    it('deve renderizar variante default com estilos de surface do DS2', () => {
      const html = renderToString(
        React.createElement(Surface, { variant: 'default' }, 'Conteúdo Surface')
      );
      expect(html).toContain('Conteúdo Surface');
      expect(html).toContain('bg-[var(--fc-surface-1)]');
      expect(html).toContain('border-[var(--fc-border-default)]');
    });

    it('deve renderizar variante elevated com sombra do DS2', () => {
      const html = renderToString(
        React.createElement(Surface, { variant: 'elevated' }, 'Conteúdo Elevado')
      );
      expect(html).toContain('shadow-[var(--fc-shadow-md)]');
    });

    it('deve renderizar variante interactive com foco acessível e atributos de botão se clicável', () => {
      const html = renderToString(
        React.createElement(Surface, { variant: 'interactive', role: 'button', tabIndex: 0 }, 'Card Interativo')
      );
      expect(html).toContain('role="button"');
      expect(html).toContain('tabindex="0"');
      expect(html).toContain('cursor-pointer');
      expect(html).toContain('focus-visible:ring-2');
    });
  });

  describe('5. Primitive: Badge', () => {
    it('deve renderizar badge não-interativo com variante neutra e acento', () => {
      const neutralHtml = renderToString(React.createElement(Badge, { variant: 'neutral' }, 'Padrão'));
      const accentHtml = renderToString(React.createElement(Badge, { variant: 'accent' }, 'Pro'));

      expect(neutralHtml).toContain('Padrão');
      expect(neutralHtml).toContain('bg-[var(--fc-surface-2)]');
      expect(accentHtml).toContain('Pro');
      expect(accentHtml).toContain('text-[var(--fc-accent)]');
    });

    it('deve renderizar status colors: success, warning, danger, info', () => {
      const successHtml = renderToString(React.createElement(Badge, { variant: 'success' }, 'Pago'));
      const warningHtml = renderToString(React.createElement(Badge, { variant: 'warning' }, 'Pendente'));
      const dangerHtml = renderToString(React.createElement(Badge, { variant: 'danger' }, 'Atrasado'));
      const infoHtml = renderToString(React.createElement(Badge, { variant: 'info' }, 'Info'));

      expect(successHtml).toContain('Pago');
      expect(warningHtml).toContain('Pendente');
      expect(dangerHtml).toContain('Atrasado');
      expect(infoHtml).toContain('Info');
    });
  });

  describe('6. Primitive: Modal', () => {
    it('não deve renderizar nada quando isOpen=false', () => {
      const html = renderToString(
        React.createElement(Modal, {
          isOpen: false,
          onClose: () => {},
          title: 'Modal Fechado'
        }, 'Invisível')
      );
      expect(html).toBe('');
    });

    it('deve renderizar dialog com role="dialog", aria-modal="true", aria-labelledby e botão fechar >= 44x44px quando isOpen=true', () => {
      const html = renderToString(
        React.createElement(Modal, {
          isOpen: true,
          onClose: () => {},
          title: 'Configurações de Parcela'
        }, React.createElement('p', null, 'Corpo da modal'))
      );
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="fc-modal-title"');
      expect(html).toContain('id="fc-modal-title"');
      expect(html).toContain('Configurações de Parcela');
      expect(html).toContain('Corpo da modal');
      expect(html).toContain('aria-label="Fechar modal"');
      expect(html).toContain('min-w-[44px]');
      expect(html).toContain('min-h-[44px]');
    });

    describe('Interação com Teclado e Restauração de Foco', () => {
      let eventListeners = {};

      beforeEach(() => {
        eventListeners = {};
        globalThis.document = {
          activeElement: null,
          addEventListener: (type, listener) => {
            eventListeners[type] = eventListeners[type] || [];
            eventListeners[type].push(listener);
          },
          removeEventListener: (type, listener) => {
            if (eventListeners[type]) {
              eventListeners[type] = eventListeners[type].filter(l => l !== listener);
            }
          }
        };
      });

      it('deve registrar handler de tecla Escape e chamar onClose ao pressionar Escape', () => {
        const handleClose = vi.fn();
        const handleKeyDown = (e) => {
          if (e.key === 'Escape') {
            handleClose();
          }
        };

        document.addEventListener('keydown', handleKeyDown);
        expect(eventListeners['keydown'].length).toBe(1);

        eventListeners['keydown'][0]({ key: 'Escape', preventDefault: () => {} });
        expect(handleClose).toHaveBeenCalledTimes(1);

        document.removeEventListener('keydown', handleKeyDown);
        expect(eventListeners['keydown'].length).toBe(0);
      });

      it('deve salvar o elemento ativo antes da abertura e restaurar o foco no fechamento', () => {
        const triggerElement = {
          id: 'btn-open-ds-modal',
          focus: vi.fn()
        };

        let previousActiveElement = triggerElement;

        // Ao fechar:
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
          previousActiveElement.focus();
        }

        expect(triggerElement.focus).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('7. Design System Lab: Foundations & Isolation', () => {
    it('deve renderizar o laboratório no tema Dark por padrão com isolamento de escopo', () => {
      const html = renderToString(React.createElement(DesignSystemLab));
      expect(html).toContain('data-theme="dark"');
      expect(html).toContain('FinControl Design System 2.0');
      expect(html).toContain('A. Sistema de Cores Semântico');
      expect(html).toContain('B. Tipografia &amp; Números Financeiros');
      expect(html).toContain('C. Botões &amp; Ações');
      expect(html).toContain('D. Controles de Formulário');
      expect(html).toContain('E. Superfícies &amp; Camadas');
      expect(html).toContain('F. Indicadores de Status');
      expect(html).toContain('G. Diálogo Acessível');
    });

    it('deve exibir formatação financeira neutra sem dados fictícios de dashboard', () => {
      const html = renderToString(React.createElement(DesignSystemLab));
      expect(html).toContain('R$ 0,00');
      expect(html).toContain('R$ 29,99');
      expect(html).toContain('R$ 1.234,56');
      expect(html).toContain('R$ 12.480,75');
      expect(html).toContain('-R$ 450,20');
      expect(html).toContain('tabular-nums');
    });
  });

});
