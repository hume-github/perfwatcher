<?php
/**
 * PHP version 5
 *
 * LICENSE: This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @category  Monitoring
 * @author    Cyril Feraudet <cyril@feraudet.com>
 * @copyright 2012 Cyril Feraudet
 * @license   http://www.gnu.org/copyleft/lesser.html  LGPL License 2.1
 * @link      http://www.perfwatcher.org/
 */

class folder_filling_regex {
	private $datas = array();

	function __construct($datas) {
		$this->datas =& $datas;
	}

	function is_compatible() {
		switch($this->datas['type']) {
			case 'folder':
			case 'drive':
				return true;
			break;
			default:
				return false;
			break;
		}
	}

	function get_info() {
		global $folder_filling_plugins;
		return array(
			'title' => "Autofill ".$this->datas['type']." using regex",
			'content_url' => 'html/folder_filling_regex.html'
		);
	}

	function test ($regex) {
		global $rrds_path;
		$out = '';
        $dh = opendir($rrds_path);
        while ($hostdir = readdir($dh)) {
            if ($hostdir == '..' || $hostdir == '.' || $hostdir == '_csv') { continue; }
            if (substr($hostdir,0,11) != 'aggregator_' && @ereg($regex, $hostdir)) {
                $out .= "$hostdir\n";
            }
        }
        closedir($dh);
		return $out;
	}

	function save ($regex) {
		global $jstree, $id;
		$datas = $jstree->get_datas($this->datas['id']);
		if (!isset($datas['serverslist'])) { $datas['serverslist'] = array(); }
		$datas['serverslist']['servernameregex'] = $regex;
        $jstree->set_datas($id, $datas);
		return true;
	}
}

?>