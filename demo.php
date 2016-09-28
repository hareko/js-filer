<?php
/**
 * jsFiler demo 
 * 
 * GET parameters:
 *  mode -- r - right-click menu
 *          m - main menu
 *          n - node menu
 * 
 * @package     jsFiler
 * @author      Vallo Reima
 * @copyright   (c) 2016
 */
date_default_timezone_set('UTC');

$c = isset($_GET['mode']) ? $_GET['mode'] : 'rm'; //get menu mode
$m = 0;
if (stripos($c, 'r') !== false) {
  $m += 1;
}
if (stripos($c, 'm') !== false || stripos($c, 'n') !== false) {
  $m += 2;
}
$menuMode = $m ? "$m" : 'null';
$mainMenu = (stripos($c, 'm') === false) ? '' : '.menu';//displaying no/id
$treeId = 'filer_0';//root node
$name = 'jsFiler';
$head = "$name Plugin Demo &nbsp;&copy; " . date('Y') . " <a href=\"mailto:info@vregistry.com?subject=$name\">vRegistry</a>";

$path = 'http://filer.vregistry.com/pub'; //assets 
$jquery = '2.1.4.min';
$nme = pathinfo(__FILE__, PATHINFO_FILENAME);
require_once("$nme.phtml");
