/*
	if (message.data == "get_focus")
	{
		document.getElementById("textfeld").focus();
		return;
	}
	if (message.data == "no found")
	{
		document.getElementById("message").style.display = "";
		setTimeout(reset_message, 1500);
		return;
	}
	/*if (message.data == "show_controls")
	{
		document.getElementById("controls").style.display == "";
		return;
	}* /
	var show_controls = message.data["show_controls"];
	var only_first_value = message.data["default1"];
	var match_case_value = message.data["default2"];

	if (show_controls == true)
	{
		document.getElementById("controls").style.display = "";
		return;
	}

	//window.parent.postMessage(message.data, "*");
	document.getElementById("only_first").checked = only_first_value;
	document.getElementById("match_case").checked = match_case_value;
}

function reset_message()
{
	document.getElementById("message").style.display = "none";
}

function start_search()
{
	var inhalt = document.getElementById("textfeld").value
	var only_first = document.getElementById("only_first").checked;
	var match_case = document.getElementById("match_case").checked;
	window.parent.postMessage({inhalt, only_first, match_case}, "*");
}
*/
self.port.on("show", function onShow() {
	panel_text_entry.focus();
});
