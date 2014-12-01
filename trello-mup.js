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
  return mindmup_object.attr.attachment;
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

/**
 * Applies fn to all child nodes
 */
mindmup_children_map = function(mindmup_object, fn) {
  if (mindmup_object.ideas === undefined) {
    return;
  }
  var idea_keys = Object.keys(mindmup_object.ideas);
  for (var i = 0; i < idea_keys.length; i++) {
    fn(mindmup_object.ideas[idea_keys[i]]);
  }
};

colour_mindmup_from_trello = function(trello, what) {
  card_url = what.attr.attachment.content;
  url_parts = card_url.split('/');
  card_id = url_parts[url_parts.length - 2];
  trello.get("/1/cards/" + card_id, function(err, card) {
    if (err) {
      console.log(err);
      return;
    }
    trello.get("/1/lists/" + card.idList, function(err, board) {
      if (err) {
        console.log(err);
        return;
      }
      if (board.name == 'Doing') {
        mindmup_set_colour(what, '#FFB6C1');
      } else if (board.name == 'Code Review') {
        mindmup_set_colour(what, '#ffff00');
      } else if (board.name == 'Dev Test') {
        mindmup_set_colour(what, '#ffff00');
      } else if (board.name == 'Awaiting Release') {
        mindmup_set_colour(what, '#ffff00');
      } else if (board.name == 'UAT') {
        mindmup_set_colour(what, '#ffff00');
      } else if (board.name == 'Passed UAT') {
        mindmup_set_colour(what, '#00ff00');
      } else if (board.name == 'Deployed to Live') {
        mindmup_set_colour(what, '#00ff00');
      }
    });
  });
};

//Sets mindmup colours based on trello list
trello_mup_update = function(trello, mindmup) {
  mindmup_children_map(mindmup, function(who) {
    mindmup_children_map(who, function(how) {
      mindmup_children_map(how, function(what) {
        attachment = mindmup_get_attachment(what);
        if (attachment) {
          if (attachment.content == 'backlog') {
            add_mindmup_to_trello(trello, what);
          } else {
            colour_mindmup_from_trello(trello, what);
          }
          mindmup_save(mindmup_config, mindmup);
        } 
      });
    });
  });
};

add_mindmup_to_trello = function(trello, mindmup_node) {
  console.log(trello_config);
  new_card_title = "{_" + mindmup_config.project_name + "} " + mindmup_node.title + " [_]";
  console.log("Adding " + new_card_title);
  trello.post("/1/cards/", {
      name: new_card_title,
      idList: mindmup_config.new_card_list,
    },
    function(err, card) {
      if (err) throw err;
      var mindmup_id = mindmup_node.id;
      mindmup_walk_tree(mindmup, function(mindmup_node) {
        if (mindmup_node.id == mindmup_id) {
          mindmup_node.attr = {
            attachment: {
              contentType: "text/html",
              content: card.url
            }
          };
          mindmup_save(mindmup_config, mindmup);
        }
      });
    });
};

var Trello = require("node-trello");
require("./config/trello-mup.config");
var trello = new Trello(trello_config.key, trello_config.token);

for (config_idx = 0; config_idx < mindmup_configs.length; config_idx++) {
  var mindmup_config = mindmup_configs[config_idx];
  var mindmup = mindmup_load(mindmup_config);
  trello_mup_update(trello, mindmup);
}
