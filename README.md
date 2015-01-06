trello-mup
=========

Integrates Trello and MindMup. When run it will do two things:

Add a MindMup node to the backlog list on Trello.
-------------------------------------------------
- create a 4th level node 
- add a node attachment just containing the word 'backlog'
- running Trello-mup against the MindMup file will create a new node in Trello and replace the node attachment with the url of the card in Trello.

Colour MindMup node according to their status on the Trello board
-----------------------------------------------------------------
- if a 4th level node has a node attachment that corresponds to a URL of a trello card, then the background colour of that node will be set to reflect to the status of the card as it progresses across the Trello board. Broadly speaking 'red' is in progress, 'yellow' is being tested, 'green' is done.


Why 4th level nodes? We assume that the hierarchy in the MindMup nodes follows this pattern:
- Goal (Why)
-- Actor (Who)
--- Impact (How)
---- Option (What)

@todo
-----
This is a very hacky implementation and needs cleaning up. Notably the MindMup functions should probably live in their own module. Also, because of the requirement to make multiple, by nature asynchronous, calls to the Trello API, the q promise library was used, which led to some hacky refactoring, and probably not entirely correct, changes to variable scopes to ensure their availability during the lifetime of each promise.
