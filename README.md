# Minha Lista de Tarefas

Aplicação web de gerenciamento de tarefas com projetos, prioridades, filtros, busca, anexos e tour guiado. Funciona 100% offline — sem dependências externas.

---

## Funcionalidades

### Tarefas

- **Criar**: Digite no campo superior e pressione `Enter`
- **Editar**: Clique duas vezes no texto da tarefa; salva com `Enter` ou ao clicar fora
- **Concluir**: Marque o checkbox — a tarefa vai para a seção "Concluídas" com animação
- **Excluir**: Selecione e pressione `Del`, ou clique no botão `×`; confirme com `Enter` ou `E`
- **Desfazer exclusão**: Botão "Desfazer" aparece por 4 segundos após excluir
- **Copiar texto**: Botão 📋 na tarefa copia o texto para a área de transferência (ícone muda para ✅)
- **Textos longos**: Acima de 300 chars (desktop) / 160 chars (mobile) são truncados com "Ver mais"

### Projetos

- Crie até **5 projetos** para separar tarefas por contexto
- Alterne pelos projetos usando as **abas** abaixo do título
- **Clique direito** na aba para renomear ou excluir o projeto
- Cada projeto tem nome, cor e ícone customizáveis
- Excluir um projeto move suas tarefas para o projeto **Geral**
- O projeto **Geral** não pode ser excluído

### Prioridades e Ordenação

- Classifique tarefas como **Crítica (C)**, **Alta (A)**, **Média (M)** ou **Baixa (B)**
- Clique no botão de prioridade novamente para removê-la
- Ordenação automática: Crítica → Alta → Média → Baixa → Sem prioridade
- Pendentes ficam acima de Concluídas
- **Arrastar**: Segure o ícone `⋮⋮` para reordenar tarefas de mesma prioridade

### Filtros e Busca

- **Filtros rápidos**: Clique em qualquer contador (ex.: "3 crítica") para filtrar a lista; clique novamente ou em "Limpar filtro" para desfazer
- Contadores disponíveis: Total, Pendentes, Concluídas, Sem prioridade, Crítica, Alta, Média, Baixa
- **Busca** (`Ctrl+B`): Destaca resultados com highlight; use `↑↓` para navegar entre eles

### Anexos de Imagem

- Arraste uma imagem para a tela ou pressione `Ctrl+V` para colar
- Formatos suportados: PNG, JPG, GIF, WebP
- Máximo de **5 imagens** por tarefa
- Imagens são compactadas automaticamente (máx. 500×500 px, 60% qualidade)
- Clique na imagem para ampliar

### Visual e Experiência

- **Tema claro/escuro**: Clique em ☀️/🌙 no cabeçalho
- **Barra de progresso**: Porcentagem de tarefas concluídas no projeto atual
- **Indicador "Salvo ✓"**: Confirma o salvamento automático após cada alteração
- **Sons**: Notificações ao criar, concluir e excluir (clique em 🔊 no rodapé para silenciar)
- **Animações**: Slide-in ao criar, fade-out ao excluir, ripple nos botões, flash nos contadores
- **Swipe para excluir** (mobile): Deslize a tarefa para a esquerda

### Backup e Restauração

- Dados salvos automaticamente no navegador (`localStorage`)
- **Exportar** (⬇): Gera um arquivo `.txt` com todas as tarefas de todos os projetos
- **Importar** (⬆): Restaura tarefas de um `.txt`; arquivos exportados por esta aplicação preservam o projeto de origem de cada tarefa
- Arquivos exportados em versões anteriores (sem coluna Projeto) são importados no projeto ativo no momento

### Tour Guiado

- Clique em **🎓 Tour** no rodapé para iniciar o guia interativo
- 7 passos cobrem todas as funcionalidades principais com highlight visual
- O tour inicia automaticamente na primeira visita
- Navegue com `→`/`←` ou com os botões; feche com `Esc` ou "Pular tour"

---

## Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Insert` | Focar no campo de nova tarefa |
| `Ctrl+B` | Abrir / fechar busca |
| `↑` / `↓` | Navegar entre tarefas (ou resultados da busca) |
| `Del` | Excluir tarefa selecionada |
| `E` | Confirmar exclusão (com modal aberto) |
| `→` / `←` | Próximo / anterior no tour guiado |
| `Esc` | Fechar modais, busca ou tour |

---

## Formato do Arquivo TXT (exportação)

```
#|Projeto|Status|Descrição|Prioridade
---|-------|------|----------|----------
1|Geral|Pendente|Fazer relatório|MÉDIA
2|Trabalho|Concluída|Enviar email|ALTA

Total: 2 tarefas | Pendentes: 1 | Concluídas: 1
```

Ao importar, o projeto é identificado pelo nome. Se o projeto não existir, a tarefa é importada no projeto **Geral**.

---

## Limites

| Item | Limite |
|------|--------|
| Projetos | 5 (incluindo Geral) |
| Imagens por tarefa | 5 |
| Tamanho de imagem | 500 KB |
| Texto por tarefa | Sem limite (truncado visualmente acima de 300 chars) |
| Armazenamento total | ~5–10 MB (depende do navegador) |

---

## Tecnologias

- HTML5, CSS3, JavaScript vanilla
- Sem dependências externas
- `localStorage` para persistência de dados
