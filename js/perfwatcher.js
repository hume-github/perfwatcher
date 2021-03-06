/**
 * Generic helper functions for Perfwatcher
 *
 * Copyright (c) 2011 Cyril Feraudet
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @category  Monitoring
 * @author    Cyril Feraudet <cyril@feraudet.com>
 * @copyright 2011 Cyril Feraudet
 * @license   http://opensource.org/licenses/mit-license.php
 * @link      http://www.perfwatcher.org/
 **/ 
var PERFWATCHER_VERSION='2.2.4-20150127';
var json_item_datas = new Array();
var current_graph = null;
var current_selection = null;
var pwgraph_hover_enabled = true;
var pwgraph_current_zone = 'tab';
var current_tab = null;
graphid = 0;
var contextMenu;
var clipboard = new Array();
var selection_is_saved = true;
function positionsubmenu(position, elements) {
		var options = {
			of: elements.target.element   
		};
		if(elements.element.element.parent().parent().parent().attr('id') === "headerLeft") {
				options.my = "left top";
				options.at = "left bottom";
		} else {
				options.my = "left top";
				options.at = "right top";
		}
		elements.element.element.position(options);
}

$(document).ready(function() {
	$.ajax({
		async : false, type: 'GET', url: 'action.php',
		data : { 'action': 'get_js', 'tpl': 'json_actions', '_': (new Date()).getTime(), 'id': 0 },
		complete : function (r) {
			if(r.status) {
				var jsfiles = jQuery.parseJSON(r.responseText);
				for (i in jsfiles) {
					$(document).find('head').append('<script type="text/javascript" src="'+jsfiles[i]+'"></script>');
				}
			}
		}
	});
	$('#headerLeft').html(ich.mainMenutpl({}));
	$('#headerCenter').html(ich.headerCentertpl({}));
	$('#headerRight').html(ich.headerRighttpl({}));
	$(ich.contextmenutpl({})).appendTo('body');
	$('#headerLeft > ul').menu({
            position: { using: positionsubmenu },
            focus: function(event, ui) {
                hide_graph_helpers();
            }
    });
	$('#headerLeft > ul > li > a > span.ui-icon-carat-1-e').removeClass('ui-icon');
	$('#headerLeft').show();

    $("#clip").contextmenu({
        delegate: "#clip_content",
        menu: "#clip_contextmenu",
        position: function(event, ui) { return {my: "right top", at: "right bottom", of: "#clip"} },
        select: function(event, ui) {
            switch(ui.cmd) {
                case 'clip_empty':
                    clipboard_empty();
                break;
                default:
                    alert(ui.cmd + ' is not a known submenu item ...');
                break;
            }
        }
    });
    clipboard_update_title();
    $('#mainMenu').on('mouseover', function() {
                hide_graph_helpers();
        });

    $('#mainSplitter').height($(window).height() - $('#mainMenu').height());
	$('#mainSplitter').layout({
        west__size: 300,
        center__paneSelector: "#rightpane",
        west__paneSelector: "#leftpane"
	});
	window.setTimeout(function () {
		auto_refresh_status();
	}, 10000);

	$('#timebutton').html(ich.timebuttontpl({}));
	$('#timebutton div div').click(function () {
		var method = $(this).attr('class');
		$(current_graph).pwgraph(method).pwgraph('display');
	});
	$('#datetime').html((new Date).toString());

    hide_graph_helpers();

	$('#clip_content').click(function() {
        if(clipboard.length == 0) {
            notify_ok("Clipboard is empty");
            return;
        }
        hide_graph_helpers();
        clipboard_new_dialog();
        $('#clipboard_rollback_btn').click(function () {
                $('#modalcliplist').html('');
                clipboard_prepare_dialog();
                clipboard_refresh_view();
        });
        $('#clipboard_switch_markdown_btn').click(function () {
                clipboard_switch_view();
        });
	});

	$('a[pwmenuid^="menu_"]').click(function () {
		//console.log($(this).attr("id"));
		switch($(this).attr("pwmenuid")) {
			case 'menu_view_new':
				askfor({ title: 'New view name' }, function(title) {
					$.ajax({
						async : false, type: "POST", url: "action.php?tpl=json_actions",
						data : { "action" : "new_view", "view_title" : title },
						complete : function (r) {
							if(!r.status) {
								notify_ko('Error, can\'t retrieve data from server !');
							} else {
								ids = jQuery.parseJSON(r.responseText);
								if((ids['id'] != -1) && (ids['view_id'] != -1)) {
									view_id = ids['view_id'];
									location.hash = "id_"+view_id;
									$('#tree').jstree("refresh");
									notify_ok("New view is created");
								} else {
									notify_ko("New view creation failed");
								}
							}
						}
					});
				});
			break;
			case 'menu_view_open':
				select_view(function() {
						location.hash = "id_"+view_id;
						$('#tree').jstree("refresh");
				});
			break;
			case 'menu_view_delete':
				confirmfor({title: 'Do you really want to delete this view ?'}, function() {
					$.ajax({
						async : false, type: "POST", url: "action.php?tpl=json_actions",
						data : { "action" : "delete_view", "view_id" : view_id },
						complete : function (r) {
							if(!r.status) {
								notify_ko('Error, can\'t retrieve data from server !');
							} else {
								result = jQuery.parseJSON(r.responseText);
								if(result['view_id'] > 0) {
									view_id = result['view_id'];
									location.hash = "id_"+view_id;
									$('#tree').jstree("refresh");
									notify_ok("View deleted");
								} else {
									notify_ko("View could not be deleted");
								}
							}
						}
					});
				});
			break;
			case 'menu_rename_node':
				$('#tree').jstree("rename");
			break;
			case 'menu_rename_tab':
			break;
			case 'menu_copy':
				$('#tree').jstree("copy");
			break;
			case 'menu_paste':
				$('#tree').jstree("paste");
			break;
			case 'menu_cut':
				$('#tree').jstree("cut");
			break;
			case 'menu_display_toggle_tree':
                $('#mainSplitter').layout().toggle('west');
			break;
			case 'menu_refresh_tree':
				$('#tree').jstree("refresh");
			break;
			case 'menu_refresh_node':
				select_node(json_item_datas['jstree']['id'], '');
			break;
			case 'menu_refresh_status':
				refresh_status();
			break;
			case 'menu_about_box':
				perfwatcher_about_box();
			break;
			default:
				console.log('Undefined stuff : '+ $(this).attr("id"));
			break;
		}
	});

	$(function () {
		var cache = {}, lastXhr;
		$('#searchtext').autocomplete({
			minLength: 2,
			source: function( request, response ) {
				var term = request.term;
				if ( term in cache ) {
					response( cache[ term ] );
					return;
				}

				lastXhr = $.getJSON( "action.php?tpl=json_actions&action=search&id=0&view_id="+view_id, request, function( data, status, xhr ) {
					cache[ term ] = data;
					if ( xhr === lastXhr ) {
						response( data );
					}
				});
			},
			select: function(event, ui) { 
				$('#tree').jstree("search", ui.item.label);
			}
		});
		$('#searchtext').keypress(function(event) {
			if ( event.which == 13 ) {
				 $('#tree').jstree("search", $('#searchtext').val());
				 $('#searchtext').autocomplete("close");
			}
		});
	});

});

// vim: set filetype=javascript fdm=marker sw=4 ts=4 et:
