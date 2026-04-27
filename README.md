# Minha Lista de Tarefas

Aplicação web de gerenciamento de tarefas com prioridades, filtros, busca, anexos e animações.

## Recursos

- **Criar tarefas**: Digite no campo superior e pressione Enter
- **Editar**: Clique duas vezes no texto da tarefa (Enter ou blur para salvar)
- **Concluir**: Marque o checkbox com animação bounce
- **Prioridades**: Classifique como Crítica (C), Alta (A), Média (M), Baixa (B) — ordenação automática
- **Imagens**: Arraste/cole imagens (Ctrl+V ou drag & drop) na tarefa selecionada
- **Busca**: Ctrl+B para abrir a barra de busca com highlight de resultados
- **Navegar**: Use as setas ↑↓ para mover entre tarefas
- **Excluir**: Pressione DEL na tarefa selecionada, confirme com Enter ou E
- **Excluir Todas**: Botão no rodapé com confirmação "tenho certeza" + countdown de segurança
- **Tema**: Clique no ícone ☀️/🌙 para alternar entre tema claro e escuro
- **Seções colapsáveis**: Tarefas separadas em "Pendentes" e "Concluídas"
- **Progresso**: Barra de progresso com porcentagem de conclusão
- **Toast com Desfazer**: Ao excluir, botão "Desfazer" aparece por 4 segundos
- **Truncar textos longos**: >300 chars desktop / >160 chars mobile com "Ver mais"
- **Indicador de salvamento**: "Salvo ✓" aparece brevemente ao salvar
- **Swipe to delete**: No mobile, deslize para excluir
- **Sons**: Notificações sonoras ao criar/concluir/excluir (toggleável)
- **Animações**: Slide in ao criar, fade out ao excluir, ripple nos botões, flash nos contadores
- **Drag & drop**: Arraste tarefas sem prioridade para reordenar
- **Ajuda**: Botão "?" no rodapé com modal explicativo

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

## Formato do Arquivo TXT

```markdown
#|Status|Descrição|Prioridade
---|------|----------|----------
1|Pendente|Fazer relatório|MÉDIA
2|Concluída|Enviar email|ALTA

Total: 2 tarefas | Pendentes: 1 | Concluídas: 1
```

## Limites

- Armazenamento: ~5-10MB (depende do navegador)
- Imagens são compactadas automaticamente (max 500x500px, 60% qualidade)
- Máximo de 5 imagens por tarefa
- Texto longo truncado em 300 chars (desktop) / 160 chars (mobile)
- Ao atingir o limite, será notificado para remover imagens/tarefas antigas

## Tecnologias

- HTML5, CSS3, JavaScript (vanilla)
- Sem dependências externas
- localStorage para persistência

## Ajuda

O botão **"?"** no rodapé abre um modal com dicas sobre ordenação, atalhos, anexos e dados.