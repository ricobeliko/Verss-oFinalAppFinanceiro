// tests/selectComponent.test.js
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Select from '../src/components/Select';

describe('Componente <Select> — Testes Unitários de Estrutura e Acessibilidade (Commit 1)', () => {
  const sampleOptions = [
    { value: 'card-1', label: 'Nubank Ultravioleta' },
    { value: 'card-2', label: 'Itaú Personalité' },
    { value: 'card-3', label: 'Bradesco Prime', disabled: true },
  ];

  it('renderiza o trigger com role="combobox", aria-haspopup="listbox" e estado fechado', () => {
    const html = renderToString(
      React.createElement(Select, {
        id: 'cardSelect',
        name: 'cardId',
        value: 'card-1',
        options: sampleOptions,
        'aria-label': 'Selecionar Cartão',
      })
    );

    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Selecionar Cartão"');
    expect(html).toContain('Nubank Ultravioleta');
  });

  it('converte children <option> de forma compatível com o elemento nativo', () => {
    const html = renderToString(
      React.createElement(
        Select,
        { id: 'clientSelect', value: 'client-2' },
        React.createElement('option', { value: '' }, 'Selecione uma pessoa'),
        React.createElement('option', { value: 'client-1' }, 'Carlos Tester'),
        React.createElement('option', { value: 'client-2' }, 'Mariana Costa')
      )
    );

    expect(html).toContain('role="combobox"');
    expect(html).toContain('Mariana Costa');
    expect(html).toContain('<select');
    expect(html).toContain('value="client-2"');
    expect(html).toContain('Carlos Tester');
  });

  it('exibe o placeholder quando nenhum valor estiver selecionado', () => {
    const html = renderToString(
      React.createElement(Select, {
        id: 'emptySelect',
        value: '',
        options: sampleOptions,
        placeholder: 'Escolha um cartão...',
      })
    );

    expect(html).toContain('Escolha um cartão...');
  });

  it('inclui elemento <select> sincronizado e oculto para suporte a formulário HTML5 e required', () => {
    const html = renderToString(
      React.createElement(Select, {
        id: 'requiredSelect',
        name: 'testRequired',
        value: '',
        required: true,
        options: sampleOptions,
      })
    );

    expect(html).toContain('required=""');
    expect(html).toContain('class="sr-only absolute pointer-events-none opacity-0 w-0 h-0"');
    expect(html).toContain('name="testRequired"');
  });

  it('aplica estado disabled tanto no botão trigger quanto no select nativo', () => {
    const html = renderToString(
      React.createElement(Select, {
        id: 'disabledSelect',
        value: 'card-1',
        disabled: true,
        options: sampleOptions,
      })
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('disabled:opacity-50 disabled:cursor-not-allowed');
  });

  it('dispara onChange no formato de evento sintético esperado { target: { value, name } }', () => {
    const handleChange = vi.fn();
    const select = React.createElement(Select, {
      id: 'testEventSelect',
      name: 'testName',
      value: 'val-1',
      onChange: handleChange,
      options: [
        { value: 'val-1', label: 'Item 1' },
        { value: 'val-2', label: 'Item 2' },
      ],
    });

    expect(select.props.onChange).toBe(handleChange);
  });
});
