
# jsFiler  [![npm version](https://badge.fury.io/js/jsfiler.svg)](https://badge.fury.io/js/jsfiler)

## Purpose

A cross-browser jQuery plugin to display and modify the tree view of any hierarchical data (file directories, inventory lists, ...) supplied from server-side.


## Composition

jsFiler is built on top of the [jsTree] extending its functionality: command menus, dialogues, server communication. 
It is configurable for different tree applications and expects the back-end support. 
The (multi)tree and operations behaviour are specified via configuration parameters and user callbacks.


## Features

+ default/customized tree and command icons;
+ tree behavior options;
+ standard command set extensible by user commands;
+ different command menu configurations;
+ multi-tree handling;
+ copy/move between the trees;
+ make Ajax json requests;
+ synchronize tree events and Ajax calls;
+ tree event and request/response callbacks;
+ node name validation;
+ delete/replace confirmation;
+ search options;
+ multilingual support.


## Creation

Examine the demo for the details (see Installation):

1. supply necessary CSS/JS assets;
2. supply html/css with the elements to hold the tree;
3. activate the tree via jQuery passing the tree parameters:

 ``` $(<element>).jsfiler(<options>); ```

 *element* - selector of the element containing the tree</br>
 *options* - configuration parameters object

 For example:

 ``` $('#treeId').jsfiler({menuMode: 3, mainMenu: '.menu'});```

## Configuration
The options can be passed during activation and after that.

+ *menuMode* - the command menu: 1 - right-click menu, 2 - icon menu, 3 - both (integer, default is 1)
+ *mainMenu* - icon menu element selector (string, default is '' placing behind the current node)
+ *iconPath* - user path to tree and menu icons (string, default is '' using own css)
+ *checkbox* -  tree checkboxes (boolean, default is false)
+ *canDrag* -  allow drag'n drop (boolean, default is true)
+ *rootSingle* - allow multiple roots (boolean, default is false)
+ *rootLeaf* - allow leafs for root node (boolean, default is true)
+ *saveState* - save opened/selected state (boolean, default is false)
+ *selectOpen* - open the subtree by node selection (0 - don't, 1 - by click, 2 - by dblclick; default is 2)
+ *knotRemove* - knots deletion: 0 - empty only, 1 - +copied, 2 - all (integer, default is 0)
+ *nameDupl* - duplicate child names: 2 - allow, 1 - case-sensitive, 0 - no (integer, default is 0)
+ *nameTrim* - node name trim pattern (string, default is /^\s+|\s+$/g)
+ *nameValidate* - node name validation pattern (string, default is false; Windows-like: /^[^\\\/?%*:|'\"<>]+$/)
+ *urlAjax* - ajax request url (string, default is ajax.php)
+ *userAuth* - user authorization token (string, default is null)


## Operation

The tree has 3 types of the nodes: *root, folder, file*. Click the pointer before the tree node icon to open/close the sub-nodes. 
Click the node and select the required command from the right-click or icon menu. Use drag'n drop to move/copy the nodes.

## Installation

Unzip the files to some web server directory: 

1. *jsfiler.js* - the plugin
2. *jsfiler.css* - plugin styles/icons
3. *icons* - tree & command icons folder
5. *demo.html* - the demo
6. *ajax.php* - server-side emulator for the demo
7. *readme.md* - quick overview

PHP support is required to run the *demo.html*. Use the *mode* parameter to try different menu modes (*mode=rm* is default):

+ r - right-click menu
+ m - main menu
+ n - node menu

The demo must function like [here].

## Revision Credits

[Ivan Bozhanov] of jsTree

## License

jsFiler is released under the [GPL v.3].

(c) 2015 Vallo Reima

## Feedback
Examine the [Remote File Manager] solution that implements jsFiler via extended command set, enhanced dialog and callbacks.

If you have any questions, comments, ideas, or would like to leave any other kind of feedback, feel free to [contact me].

## ChangeLog ##
- 14 Apr 2017
    - *selectOpen* option, default 2

[here]: http://vregistry.com/samples/demo/?app=jsfiler
[Ivan Bozhanov]: http://vakata.com/en/
[jsTree]: https://www.jstree.com/
[GPL v.3]: https://www.gnu.org/licenses/gpl-3.0.html
[contact me]: mailto:vallo@vregistry.com?subject=jsFiler
[Remote File Manager]: http://vregistry.com/filer/
