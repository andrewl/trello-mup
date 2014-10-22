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
              if (board.name == 'ToDo') {
                mindmup_set_colour(what, '#ff0000');
              } else if (board.name == 'Doing') {
                mindmup_set_colour(what, '#ffff00');
              } else if (board.name == 'Done') {
                mindmup_set_colour(what, '#00ff00');
              }
              mindmup_save(mindmup_config, mindmup);
            });
          });
        } else {
          console.log(how.title + ' does not have attachment');
        }
      });
    });
  });
};

var Trello = require("node-trello");
require("./config/trello-mup.config");
var trello = new Trello(trello_config.key, trello_config.token);
var mindmup = mindmup_load(mindmup_config);

trello_mup_set_colours(trello, mindmup);

/*
   mindmup_get_child_ideas_map(mindmup, function(who) {
   console.log(who.title);
   mindmup_get_child_ideas_map(who, function(how) {
   console.log('-- ' + how.title);
   mindmup_get_child_ideas_map(how, function(what) {
   console.log('---- ' + what.title);
   });
   });
   });

   all_what = mindmup_get_all_what(mindmup);
   */

/*
   URL arguments are passed in as an object.
   t.get("/1/members/me", { cards: "open" }, function(err, data) {
   if (err) throw err;
   console.log(data);
   });

*/
