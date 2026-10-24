# Identidade visual

- **Cor principal:** laranja `#FF651C` (configurável em Configurações; "Restaurar" volta ao oficial).
- **Secundária:** branco `#FFFFFF`. **Apoio:** grafite `#1F2328`/`#2B2F36`, cinzas suaves e laranja escuro `#D94C0B`.
- **Tipografia:** Inter (servida localmente via `@fontsource-variable/inter`). **Ícones:** Lucide.
- **Símbolo:** redesenhado em SVG vetorial a partir da logo oficial (anel em "U", dois remates superiores e barra
  central) — `src/components/brand/logo.tsx`, `public/brand/simbolo.svg` e `src/app/icon.svg`. As imagens de
  referência estão em `public/brand/referencia-*.jpg`. Havendo arquivo vetorial oficial, substitua o `path`.
- **Gráficos:** receitas em laranja, despesas em azul e terceira série em dourado — paleta validada para daltonismo
  (protanopia, deuteranopia, tritanopia) e contraste nos modos claro e escuro; cada gráfico tem legenda e tabela de
  dados acessível.
- **Modos:** claro (padrão) e escuro (botão no topo).

## Responsividade

| Tela | Comportamento |
|---|---|
| Celular | Menu lateral vira gaveta; portal do aluno com barra de navegação inferior; tabelas com rolagem própria; alvos de toque ≥ 40 px |
| Tablet | Grades em 2 colunas; menu em gaveta até 1024 px |
| Desktop | Menu lateral fixo; grades de 3–4 colunas |
| Monitores 2K/4K e TVs | Interface escalada proporcionalmente (112,5% a partir de 1920 px, 137,5% a partir de 2560 px, 175% a partir de 3200 px) para leitura à distância |
