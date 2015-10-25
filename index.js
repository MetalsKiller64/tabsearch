/*
jpm run -b /Applications/Firefox.app/Contents/MacOS/firefox -p addon-basteln
jpm run -b -p addon-basteln
jpm post --post-url http://localhost:8888/
*/

var ui = require("sdk/ui");
var data = require("sdk/self").data;
var buttons = require('sdk/ui/button/action');
var { Toolbar } = require("sdk/ui/toolbar");
var { Frame } = require("sdk/ui/frame");
var panels = require("sdk/panel");

var { modelFor } = require("sdk/model/core");
var { viewFor } = require("sdk/view/core");

var tabs = require("sdk/tabs");
var tab_utils = require("sdk/tabs/utils");

var preferences = require("sdk/simple-prefs").prefs;

var { Hotkey } = require("sdk/hotkeys");

var toolbar = undefined;
var marked_tabs = new Array();
var current_marked_tab = 0;
var prev_pattern = "";

var default_show_hide_combo = "accel-shift-t";
var default_combo_switch_prev = "accel-shift-left";
var default_combo_switch_next = "accel-shift-right";
//var custom_show_hide_combo = "";

var use_panel = preferences["use_panel"];
var show_toolbar = preferences["show_toolbar_on_startup"];
var enable_hotkey_show_hide = preferences["enable_hotkey_show_hide"];
var enable_hotkey_switching = preferences["enable_hotkey_switching"];
//var enable_hotkey_controls = preferences["enable_hotkey_controls"];

//TODO: suchbegriff historie die sessionübergreifend gespeichert wird und in den settings gelöscht werden kann
function update_badge(nummer = undefined)
{
	console.log("update_badge")
	if (preferences["badge_usage"] == 0)
	{
		console.log("NONE")
		button.state("window", {
			badge: ""
		});
		return;
	}
	if (nummer == undefined || typeof(nummer) == "object")
	{
		nummer = require("sdk/tabs").length;
		console.log("dingens: "+require("sdk/tabs").length);
	}
	console.log("dongens: "+nummer.toSource());
	button.state("window", {
		badge: nummer
	});
}

function define_badge_update(update)
{
	if (update == 1)
	{
		tabs.on("open", update_badge);
		tabs.on("close", update_badge);
	}
	else if (update == 2 || update == 0)
	{
		tabs.removeListener("open", update_badge);
		tabs.removeListener("close", update_badge);
		if (button != undefined)
		{
			update_badge();
		}
	}
}

function on_preference_change(preference_name)
{
	if (preference_name == "use_panel")
	{
		define_hotkey_show_hide();
	}
	if (preference_name == "save")
	{
		define_hotkey_show_hide();
		define_hotkeys_switching();
	}
	if (preference_name == "badge_usage")
	{
		console.log("define_badge_update; "+preferences["badge_usage"]);
		define_badge_update(preferences["badge_usage"]);
	}
}
require("sdk/simple-prefs").on("use_panel", on_preference_change);
require("sdk/simple-prefs").on("save_preferences", function() {
	on_preference_change("save");
});
require("sdk/simple-prefs").on("badge_usage", on_preference_change);
define_hotkey_show_hide();
define_hotkeys_switching();
console.log("define_badge_update; "+preferences["badge_usage"]);
define_badge_update(preferences["badge_usage"]);

function define_hotkey_show_hide()
{
	if (enable_hotkey_show_hide == true)
	{
		use_panel = preferences["use_panel"];
		key_combo = default_show_hide_combo;
		custom_combo = preferences["hotkey_show_hide_combo"];
		if (custom_combo != "")
		{
			key_combo = custom_combo;
		}
		console.log(key_combo);
		//console.log(use_panel);
		if (use_panel == false)
		{
			/*var hotkey_show_hide = Hotkey({
				combo: "accel-shift-t",
				onPress: toggle_toolbar
			});*/
			var hotkey_show_hide = Hotkey({
				combo: key_combo,
				onPress: toggle_toolbar
			});
		}
		else
		{
			/*var hotkey_show_hide = Hotkey({
				combo: "accel-shift-t",
				onPress: show_panel
			});*/
			var hotkey_show_hide = Hotkey({
				combo: key_combo,
				onPress: show_panel
			});
		}
	}
}
// TODO: alte hotkeys entfernen wenn neue definiert wurden
function define_hotkeys_switching()
{
	if (enable_hotkey_switching == true)
	{
		key_combo_prev = default_combo_switch_prev;
		key_combo_next = default_combo_switch_next;
		custom_combo_prev = preferences["hotkey_switch_combo_prev"]
		custom_combo_next = preferences["hotkey_switch_combo_next"]
		if (custom_combo_prev != "")
		{
			key_combo_prev = custom_combo_prev;
		}
		if (custom_combo_next != "")
		{
			key_combo_next = custom_combo_next;
		}
		console.log("prev: "+key_combo_prev)
		console.log("next: "+key_combo_next)
		var hotkey_switching_prev = Hotkey({
			combo: key_combo_prev,
			onPress: function() {
				activate_marked_tab("prev");
			}
		});

		var hotkey_switching_next = Hotkey({
			combo: key_combo_next,
			onPress: function() {
				activate_marked_tab("next");
			}
		});
	}
}

var button = buttons.ActionButton({
	id: "tabsearch",
	label: "TabSearch",
	icon: "./icon.png",
	onClick: function() {
		toggle_toolbar();
	}
});

update_badge();

var panel = panels.Panel({
	height: 50,
	contentURL: data.url("panel_content.html"),
	contentScriptFile: data.url("panel_script.js")
});

function show_panel()
{
	panel.show();
}

panel.on("show", function() {
	panel.port.emit("show");
});

panel.port.on("start_search", function (pattern) {
	//console.log(pattern);
	panel.hide();
	default_only_first = preferences["only_first"];
	default_match_case = preferences["match_case"];
	start_search({"inhalt":pattern, "only_first":default_only_first, "match_case":default_match_case});
});

var frame = ui.Frame({
	url: "./tool_frame.html",
	onMessage: (e) => {
		//console.log(e.data);
		if (e.data == "prev" || e.data == "next")
		{
			activate_marked_tab(e.data)
		}
		else if (e.data.toString() == "clear")
		{
			clear_marked_tabs();
		}
		else
		{
			start_search(e.data);
		}
	}
});

frame.on("ready", send_prefs_and_defaults);


function send_prefs_and_defaults()
{
	var show_controls = preferences["show_controls"];
	var default1 = preferences["only_first"];
	var default2 = preferences["match_case"];
	//console.log("send prefs: "+show_controls+", "+default1+", "+default2);
	frame.postMessage({show_controls, default1, default2}, frame.url);
}


function activate_tab(tab)
{
	// get the XUL tab that corresponds to this high-level tab
	var lowLevelTab = viewFor(tab);
	try
	{
		lowLevelTab.style.color = 'red !important';
	}
	catch (exception)
	{
		//activate_tab(tab);
		return;
	}
	tab_utils.activateTab(lowLevelTab)
	//var browser = tab_utils.getBrowserForTab(lowLevelTab);
	//console.log(browser.contentDocument.body.innerHTML);
	//var highLevelTab = modelFor(lowLevelTab);
	//console.log(highLevelTab.url);
}

function activate_marked_tab(direction)
{
	if (direction == "prev")
	{
		if (current_marked_tab == 0)
		{
			current_marked_tab = marked_tabs.length - 1;
			activate_tab(marked_tabs[current_marked_tab]);
			return;
		}
		else
		{
			current_marked_tab -= 1;
			activate_tab(marked_tabs[current_marked_tab]);
			return;
		}
	}
	if (direction == "next")
	{
		//console.log(current_marked_tab+", "+marked_tabs.length);
		if (current_marked_tab == (marked_tabs.length - 1))
		{
			current_marked_tab = 0;
			activate_tab(marked_tabs[0]);
			return;
		}
		else
		{
			current_marked_tab += 1;
			activate_tab(marked_tabs[current_marked_tab]);
			return;
		}
	}
}

function clear_marked_tabs()
{
	for (i=0; i<marked_tabs.length; i++)
	{
		//console.log(marked_tabs);
		//console.log(marked_tabs[i]);
		viewFor(marked_tabs[i]).style.color = "black";
	}
	marked_tabs = new Array();
	current_marked_tab = 0;
}


if (show_toolbar == true)
{
	var toolbar = ui.Toolbar({
		title: "TabSearch",
		items: [frame]
	});
}

function toggle_toolbar()
{
	if (toolbar == undefined)
	{
		toolbar = ui.Toolbar({
			title: "TabSearch",
			items: [frame]
		});
		return;
	}

	if (toolbar.hidden == false)
	{
		toolbar.destroy();
		return;
	}

	toolbar = ui.Toolbar({
		title: "TabSearch",
		items: [frame]
	});
}

function start_search(args)
{
	var tabs = require("sdk/tabs");
	var pattern = args["inhalt"];
	var only_first_match = args["only_first"];
	var match_case = args["match_case"];
	var matching_tabs = new Array();
	if (pattern == "")
	{
		for (let tab of tabs)
		{
			viewFor(tab).style.color = 'black';
		}
		return;
	}

	if (pattern == prev_pattern && marked_tabs.length != 0)
	{
		activate_marked_tab("next");
		return;
	}

	clear_marked_tabs();
	prev_pattern = pattern;
	for (let tab of tabs)
	{
		try
		{
			pattern_regex = new RegExp(pattern, "g")
			pattern_regex_low = new RegExp(pattern.toLowerCase(), "g")
		}
		catch (exception)
		{
			if (exception instanceof SyntaxError)
			{
				frame.postMessage("no found", frame.url);
				return;
			}
		}
		if (tab.title.search(pattern_regex) != -1)
		{
			matching_tabs.push(tab);
			marked_tabs.push(tab);
		}
		else if (match_case == false && tab.title.toLowerCase().search(pattern_regex_low) != -1)
		{
			matching_tabs.push(tab);
			marked_tabs.push(tab);
		}
	}

	if (matching_tabs.length == 0)
	{
		frame.postMessage("no found", frame.url);
		if (preferences["badge_usage"] == 1)
		{
			update_badge(0);
		}
		return;
	}

	if (matching_tabs.length == 1 || only_first_match == true)
	{
		if (preferences["badge_usage"] == 1)
		{
			update_badge(1);
		}
		activate_tab(matching_tabs[0]);
		viewFor(matching_tabs[0]).style.color = "black";
		marked_tabs = new Array();
	}
	else
	{
		if (preferences["badge_usage"] == 1)
		{
			update_badge(matching_tabs.length);
		}
		for (i=0; i<matching_tabs.length; i++)
		{
			tab = matching_tabs[i];
			viewFor(tab).style.color = 'red';
			if (i == 0)
			{
				activate_tab(tab);
			}
		}
	}
}
