mindmup_load = function(mindmup_config) {
	mindmup = false;
	if (mindmup_config.src_file) {
		mindmup_data = require('fs').readFileSync(mindmup_config.src_file);
		console.log("Mindmup loaded from " + mindmup_config.src_file);
		mindmup = JSON.parse(mindmup_data);
	}
	return mindmup;
};

mindmup_save = function(mindmup_config, mindmup) {
	require('fs').writeFile(mindmup_config.src_file, JSON.stringify(mindmup, null, 2), function(err) {
		if (err) throw err;
		console.log('Mindmup saved to ' + mindmup_config.src_file);
	});
};

mindmup_get_attachment = function(mindmup_object) {
	if (mindmup_object.attr === undefined) {
		return;
	}
	if (mindmup_object.attr.attachment === undefined) {
		return;
	}
	return mindmup_object.attr.attachment.content;
};

mindmup_set_colour = function(mindmup_object, colour) {
	console.log("Setting colour for " + mindmup_object.title + " to " + colour);
	mindmup_object.attr.style.background = colour;
};

mindmup_walk_tree = function(mindmup_object, fn) {
	if (mindmup_object.ideas === undefined) {
		return;
	}
	var idea_keys = Object.keys(mindmup_object.ideas);
	for (var i = 0; i < idea_keys.length; i++) {
		mindmup_walk_tree(mindmup_object.ideas[idea_keys[i]], fn);
		fn(mindmup_object.ideas[idea_keys[i]]);
	}
};

mindmup_get_child_ideas_map = function(mindmup_object, fn) {
	if (mindmup_object.ideas === undefined) {
		return;
	}
	var idea_keys = Object.keys(mindmup_object.ideas);
	for (var i = 0; i < idea_keys.length; i++) {
		fn(mindmup_object.ideas[idea_keys[i]]);
	}
};

mindmup_get_all_what = function(mindmup_object) {
	var all_what = [];
	mindmup_get_child_ideas_map(mindmup_object, function(who) {
		mindmup_get_child_ideas_map(who, function(how) {
			mindmup_get_child_ideas_map(how, function(what) {
				all_what.push(what);
			});
		});
	});
	return all_what;
};

//Sets mindmup colours based on trello list
//@todo - should this check all nodes, currently just uses the third level
trello_mup_set_colours = function(trello, mindmup) {
	mindmup_get_child_ideas_map(mindmup, function(who) {
		mindmup_get_child_ideas_map(who, function(how) {
			mindmup_get_child_ideas_map(how, function(what) {
				attachment = mindmup_get_attachment(what);
				if (attachment) {
					card_url = attachment.content;
					url_parts = card_url.split('/');
					card_id = url_parts[url_parts.length - 2];
					trello.get("/1/cards/" + card_id, function(err, card) {
						if (err) {
							console.log(err);
							next;
						}
						trello.get("/1/lists/" + card.idList, function(err, board) {
							if (err) {
								console.log(err);
								next;
							}
							if (board.name == 'Doing') {
								mindmup_set_colour(what, '#FFB6C1');
							} else if (board.name == 'Code Review') {
								mindmup_set_colour(what, '#ffff00');
							} else if (board.name == 'Dev Test') {
								mindmup_set_colour(what, '#ffff00');
							} else if (board.name == 'Awaiting  Release') {
								mindmup_set_colour(what, '#CCFF99');
							} else if (board.name == 'UAT') {
								mindmup_set_colour(what, '#CCFF99');
							} else if (board.name == 'Passed UAT') {
								mindmup_set_colour(what, '#00ff00');
							} else if (board.name == 'Deployed to Live') {
								mindmup_set_colour(what, '#00ff00');
							}
							mindmup_save(mindmup_config, mindmup);
						});
					});
				} else {
					//console.log(how.title + ' does not have attachment');
				}
			});
		});
	});
};

add_mindmup_to_trello = function(trello, mindmup_node) {
	console.log("Adding " + mindmup.title + " to Trello");
	trello.post("/1/cards/", {
		name: mindmup_node.title,
		idList: trello_config.new_card_list,
	},
	function(err, card) {
		if (err) throw err;
		var mindmup_id = mindmup_node.id;
		mindmup_walk_tree(mindmup, function(mindmup_node) {
			if (mindmup_node.id == mindmup_id) {
				mindmup_node.attr.attachment.contentType = "text/html";
				mindmup_node.attr.attachment.content = card.url;
				mindmup_save(mindmup_config, mindmup);
			}
		});
	});
}

var Trello = require("node-trello");
require("./config/trello-mup.config");
var trello = new Trello(trello_config.key, trello_config.token);
var mindmup = mindmup_load(mindmup_config);

if (process.argv.indexOf('--add') != -1) {
	var all_nodes = [];
	mindmup_walk_tree(mindmup, function(mindmup_node) {
		if (!mindmup_get_attachment(mindmup_node)) {
			all_nodes.push(mindmup_node);
		}
	});

	for (i = 0; i < all_nodes.length; i++) {
		console.log(i + ': ' + all_nodes[i].title);
	}
	console.log("Enter the index number of a card to add and press return");

	var stdin = process.stdin;
	stdin.resume();
	stdin.setEncoding('utf8');
	stdin.on('data', function(input) {
		selected = all_nodes[parseInt(input)];
		add_mindmup_to_trello(trello, selected);
		//process.exit();
	});
}
else {
	console.log("Updating mindmup colours");
	trello_mup_set_colours(trello, mindmup);
}

