var panel_text_entry = document.getElementById("panel_text");

panel_text_entry.addEventListener('keyup', function onkeyup(event) {
	if (event.keyCode == 13)
	{
		// Remove the newline.
		pattern = panel_text_entry.value //.replace(/(\r\n|\n|\r)/gm,"");
		self.port.emit("start_search", pattern);
		//panel_text_entry.value = '';
	}
}, false);

self.port.on("show", function onShow() {
	panel_text_entry.focus();
	panel_text_entry.select();
});
