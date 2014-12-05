mindmup_load = function(mindmup_src_file) {
  var mindmup = false;
  mindmup_data = require('fs').readFileSync(mindmup_src_file);
  mindmup = JSON.parse(mindmup_data);
  console.log("Mindmup loaded from " + mindmup_src_file);
  return mindmup;
};

mindmup_save = function(mindmup_config, mindmup) {
  return new RSVP.Promise(function(fulfill, reject) {
    require('fs').writeFile(mindmup_config.src_file, JSON.stringify(mindmup, null, 2), function(err) {
      if (err) {
        reject(err);
      } else {
        fulfill(mindmup_config.src_file);
      }
    });
  });
};

mindmup_get_attachment = function(mindmup_object) {
  if (mindmup_object.attr === undefined) {
    return false;
  }
  if (mindmup_object.attr.attachment === undefined) {
    return false;
  }
  return mindmup_object.attr.attachment;
};

mindmup_set_colour = function(mindmup_object, colour) {
  console.log("Setting colour for " + mindmup_object.title + " to " + colour);
  mindmup_object.attr.style.background = colour;
  console.log("Colour set");
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
  var promise = new RSVP.Promise(function(fulfill, reject) {
    attachment = mindmup_get_attachment(what);
    if (!attachment) {
      reject("Failed to retrieve attachment");
      return;
    }
    card_url = attachment.content;
    url_parts = card_url.split('/');
    card_id = url_parts[url_parts.length - 2];
    trello.get("/1/cards/" + card_id, function(err, card) {
      if (err) {
        console.log(err);
        reject(err);
        return;
      }
      if (typeof card.idList == 'undefined') {
        reject("Failed to get card from " + card_url);
        return;
      }
      trello.get("/1/lists/" + card.idList, function(err, board) {
        if (err) {
          console.log(err);
          reject(err);
          return;
        }
        if (board.name == 'Doing') {
          mindmup_set_colour(what, '#FFB6C1');
        } else if (board.name == 'Code Review') {
          mindmup_set_colour(what, '#ffff00');
        } else if (board.name == 'Review') {
          mindmup_set_colour(what, '#ffff00');
        } else if (board.name == 'Dev Test') {
          mindmup_set_colour(what, '#ffff00');
        } else if (board.name == 'Awaiting Release') {
          mindmup_set_colour(what, '#ffff00');
        } else if (board.name == 'UAT') {
          mindmup_set_colour(what, '#ffff00');
        } else if (board.name == 'Passed UAT') {
          mindmup_set_colour(what, '#00ff00');
        } else if (board.name == 'Ready to deploy') {
          mindmup_set_colour(what, '#00ff00');
        } else if (board.name == 'Deployed to Live') {
          mindmup_set_colour(what, '#00ff00');
        } else if (board.name == 'Done') {
          mindmup_set_colour(what, '#00ff00');
        }
        fulfill(what);
      });
    });
  });
  return promise;
};

//Sets mindmup colours based on trello list
trello_mup_update = function(trello, mindmup_configs) {
  var mindmup_config = mindmup_configs[config_idx];
  var mindmup = mindmup_load(mindmup_config.src_file);
  var child_node_updates = [];
  mindmup_children_map(mindmup, function(who) {
    mindmup_children_map(who, function(how) {
      mindmup_children_map(how, function(what) {
        node = trello_mup_update_single(what, trello);
        if (node) {
          child_node_updates.push(node);
        }
      });
    });
  });

  console.log("Processing " + child_node_updates.length + " nodes");

  return RSVP.all(child_node_updates)
    .then(function(child_nodes) {
      debugger;
      mindmup_save(mindmup_config, mindmup)
        .then(function(filename) {
          console.log('saved ' + filename);
          config_idx++;
          if (config_idx < mindmup_configs.length) {
            trello_mup_update(trello, mindmup_configs);
          }
        });
    }, function(error) {
      debugger;
      console.log("an error occurred");
      console.log(error);
    });

};

trello_mup_update_single = function(child_node, trello) {
  attachment = mindmup_get_attachment(child_node);
  if (attachment) {
    console.log(attachment);
    if (attachment.content == 'backlog') {
      return new RSVP.Promise(function(fulfill, reject) {
        add_mindmup_to_trello(trello, child_node).then(function(child_node) {
          fulfill(child_node);
        });
      });
    } else {
      return new RSVP.Promise(function(fulfill, reject) {
        colour_mindmup_from_trello(trello, child_node).then(function(child_node) {
          fulfill(child_node);
        });
      });
    }
  }
  return 0;
};

add_mindmup_to_trello = function(trello, mindmup_node) {
  var promise = new RSVP.Promise(function(fulfill, reject) {
    new_card_title = "{_" + mindmup_config.project_name + "} " + mindmup_node.title + " [_]";
    console.log("Adding " + new_card_title);
    trello.post("/1/cards/", {
        name: new_card_title,
        idList: mindmup_config.new_card_list,
      },
      function(err, card) {
        if (err) {
          reject(err);
        }
        var mindmup_id = mindmup_node.id;
        mindmup_walk_tree(mindmup, function(mindmup_node) {
          if (mindmup_node.id == mindmup_id) {
            mindmup_node.attr = {
              attachment: {
                contentType: "text/html",
                content: card.url
              }
            };
          }
        });
        fulfill(mindmup_node);
      });
  });
  return promise;
};

var RSVP = require('rsvp');
var Trello = require("node-trello");
require("./config/trello-mup.config");
var trello = new Trello(trello_config.key, trello_config.token);

var config_idx = 0;

trello_mup_update(trello, mindmup_configs)
  .then(null,
    function(error) {
      console.log('An Error Occurred');
      console.log(error);
    });
