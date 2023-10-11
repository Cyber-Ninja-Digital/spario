#!/bin/bash

# Переход в каталог вашего проекта
# cd /path_to_your_project

# Обновление данных с удаленного репозитория
git pull origin main

# Проверка на наличие изменений
if [[ $(git status -s) ]]
then
    # Если есть изменения, добавляем их все
    git add -A

    # Получение списка измененных файлов
    changed_files=$(git diff --name-only HEAD)

    # Коммитим изменения с текущей датой и временем в качестве комментария
    git commit -m "Auto-commit: $(date). Changed files: $changed_files"

    # Пушим изменения на удаленный репозиторий
    git push origin main

    echo "Changes were found and have been pushed to origin/main."
else
    # Если изменений нет, просто выводим сообщение
    echo "No changes detected."
fi
