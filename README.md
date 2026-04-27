# Minha Lista de Tarefas

Aplicação web de gerenciamento de tarefas com prioridades, filtros, busca e backup.

## Recursos

- **Criar tarefas**: Digite no campo superior e pressione Enter
- **Editar**: Clique duas vezes no texto da tarefa
- **Concluir**: Marque o checkbox
- **Prioridades**: Classifique como Crítica (C), Alta (A), Média (M), Baixa (B)
- **Imagens**: Arraste/cole imagens (Ctrl+V ou drag & drop)
- **Buscar**: Ctrl+B para abrir a barra de busca
- **Navegar**: Use as setas ↑↓ para mover entre tarefas
- **Excluir**: Pressione DEL na tarefa selecionada, confirme com Enter ou E
- **Tema**: Clique no ícone ☀️/🌙 para alternar entre tema claro e escuro

## Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| Insert | Focar no campo de nova tarefa |
| Ctrl+B | Abrir busca |
| ↑ / ↓ | Navegar entre tarefas |
| DEL | Excluir tarefa selecionada |
| E | Confirmar exclusão (com modal aberto) |
| Escape | Fechar modais / Busca |

## Backup e Restauração

- As tarefas são salvas automaticamente no navegador (localStorage)
- **Exportar**: Baixe um arquivo TXT com todas as tarefas
- **Importar**: Restaure tarefas de um arquivo TXT

## Limites

- Armazenamento: ~5-10MB (depende do navegador)
- Imagens são compactadas automaticamente (max 500x500px, 60% qualidade)
- Máximo de 5 imagens por tarefa
- Ao atingir o limite, será notificado para remover imagens/tarefas antigas

## Formato do Arquivo TXT

```markdown
#|Status|Descrição|Prioridade
---|------|----------|----------
1|Pendente|Fazer relatório|MÉDIA
2|Concluída|Enviar email|ALTA

Total: 2 tarefas | Pendentes: 1 | Concluídas: 1
```

## Tecnologias

- HTML5, CSS3, JavaScript (vanilla)
- Sem dependências externas
- Armazenamento local (localStorage)

## Atalhos Visíveis

Os atalhos também estão disponíveis no rodapé da aplicação para referência rápida.