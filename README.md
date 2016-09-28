
# jsFiler

## Purpose

A cross-browser jQuery plugin to display and modify the tree view of any hierarchical data (file system, inventory, ...).


## Composition

jsFiler is built on top of the [jsTree] extending its functionality. It is configurable for different tree applications and must be supported server-side. 
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

1. supply necessary CSS/JS assets (see demo);

2. supply html/css with the elements to hold the tree;

3. activate the tree via jQuery passing the tree parameters:

 ``` $(<element>).jsfiler(<options>); ```

 *element* - selector of the element containing the tree</br>
 *options* - configuration parameters object
4. example:

 ``` $('#treeId').jsfiler({menuMode: 3, mainMenu: '.menu'});```

 ``` $('#treeId').jsfiler({canDrag: true, knotRemove: 2});``` 

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
+ *selectOpen* - don't open the subtree with node selection (boolean, default is false)
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

PHP support is required. Unzip the package to some web server directory and run the demo. The files:
 
1. *jsfiler.js* - the jQuery plugin
2. *jsfiler.css* - plugin styles/icons
3. *demo.php* - the demo startup
4. *demo.html* - demo htm
5. *demo.css* - demo styles
6. *ajax.php* - server-side emulator for the demo
7. *readme.md* - quick overview

## Revision Credits

[Ivan Bozhanov]

## License

jsFiler is released under the [GPL v.3].

(c) 2015 Vallo Reima

## Feedback
See the [Remote File Manager] solution that implements jsFiler via extended command set and callbacks.

If you have any questions, comments, ideas, or would like to leave any other kind of feedback, feel free to [contact me].

[Ivan Bozhanov]: vakata.com
[jsTree]: jstree.com
[GPL v.3]: https://www.gnu.org/licenses/gpl-3.0.html
[contact me]: mailto:vallo@vregistry.com?subject=jsFiler
[Remote File Manager]: http://vregistry.com/filer/
