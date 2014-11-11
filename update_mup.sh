#!/bin/bash
set -x
git --work-tree=/Users/andrew/dev/impact-map --git-dir=/Users/andrew/dev/impact-map/.git pull origin master
node ./trello-mup.js
git --work-tree=/Users/andrew/dev/impact-map --git-dir=/Users/andrew/dev/impact-map/.git status
git --work-tree=/Users/andrew/dev/impact-map --git-dir=/Users/andrew/dev/impact-map/.git commit -a -m "Commit from trello-mup"
git --work-tree=/Users/andrew/dev/impact-map --git-dir=/Users/andrew/dev/impact-map/.git push origin master
