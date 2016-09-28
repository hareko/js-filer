/**
 * jsFiler jQuery plugin
 * Dependencies:  jsTree 3.x
 * 
 * @package     jsFiler
 * @version     3.0
 * @author      Vallo Reima <info@vallo.me>
 * @license     GNU LGPL http://opensource.org/licenses/gpl-3.0.html
 * @copyright   (c) 2014, Hareko
 * 
 * @param {object} $ jQuery
 * @param {object} document
 * @param {object} undefined
 * @returns {object}
 */
(function($, document, undefined) {

  "use strict";

  if ($.jsfiler === undefined) {
    var that = this;
  } else {
    return; /* prevent another load */
  }

  var trees = []; /* tree info objects */
  var tree = '';  /* current tree object */
  var plugins = ['types', 'search', 'dnd'];
  var treeConfig = {/* properties & methods configurable*/
    menuMode: 1, /* 1 - right-click menu, 2 - icon menu, 3 - both */
    iconPath: '', /* path to tree and menu icons */
    checkbox: false, /* no tree checkboxes */
    canDrag: true, /* allow drag & drop */
    rootSingle: false, /* allow multiple roots */
    rootLeaf: true, /* allow leafs for root node */
    rootParent: -1, /* root parent id */
    saveState: false, /* save opened/selected state */
    selectOpen: false, /* don't open the subtree with node selection*/
    knotRemove: 0, /* knots deletion: 0 - empty only, 1 - +copied, 2 - all */
    nameDupl: 0, /* duplicate child names: 2 - allow, 1 - case-sensitive, 0 - no */
    nameTrim: /^\s+|\s+$/g, /* name trim patterm (leading & trailing spaces */
    nameValidate: false, /* don't validate */
//    nameValidate: /^[^\\\/?%*:|'\"<>]+$/, /* Windows-like test pattern */
    userAuth: null, /* user authorization token */
    urlAjax: 'ajax.php' /* ajax request url */
  };
  var change = ['canDrag', 'rootLeaf', 'knotRemove', 'selectOpen', 'userAuth', 'urlAjax']; /* dynamically changeable */
  var txts = {
    searchResult: '# nodes found',
    confirmReplace: 'Are you sure to replace the node',
    confirmDelete: 'Are you sure to delete the node(s)',
    knotExists: 'The node exists already',
    badName: "Invalid name. Don't use \\\/?%*:'|\"<>",
    ajaxFail: 'An error occured',
    loading: 'Loading...'
  };

  var busy = {tck: null, dts: '', txt: ''}; /* ajax call in progress status */
  var treeClass = 'js-filer-tree';
  var menuSuffix = '-menu';
  var menuClass = 'js-filer' + menuSuffix;
  var meterClass = 'js-filer-meter'; /* command meter div */
  var pasteClass = 'js-filer-';
  var suffix = '-no'; /* disabled command */
  var copied = 'copied'; /* copied node attribute */

  var treeCommands = {/* core set */
    opn: {label: 'Open', menu: false},
    sch: {label: 'Search', icon: ['c_sch.png', 'c_sch-no.png']},
    cpy: {label: 'Copy', icon: ['c_cpy.png', 'c_cpy-no.png']},
    cut: {label: 'Cut', icon: ['c_cut.png', 'c_cut-no.png']},
    pst: {label: 'Paste', icon: ['c_pst.png', 'c_pst-no.png']},
    mve: {label: 'Move', menu: false},
    cre: {label: 'Create', submenu: {
        'new': {label: 'New knot', icon: ['c_new.png', 'c_new-no.png']},
        'add': {label: 'New leaf', icon: ['c_add.png', 'c_add-no.png']}
      }
    },
    ren: {label: 'Rename', icon: ['c_ren.png', 'c_ren-no.png']},
    del: {label: 'Delete', icon: ['c_del.png', 'c_del-no.png']}
  };

  $.jsfiler = {
    /** 
     *  the jsfiler version in use
     */
    version: '3.0',
    /**
     * commander
     * @param {string} cmd -- command token
     * @param {object|array} obj -- node(s)
     * @param {mixed} prm -- parameters
     */
    Command: function(cmd, obj, prm) {
      if (prm.args) {
        tree.args = $.extend({}, prm.args);
        delete prm.args;
      } else {
        tree.args = {};
      }
      if (cmd === 'sch') {
        Search(prm, obj);
      } else if (cmd === 'cpy') {
        CheckAllowed(cmd, obj);
      } else if (cmd === 'cut') {
        CheckAllowed(cmd, obj);
      } else if (cmd === 'pst') {
        var pst = $(tree.Id).jstree('get_buffer');
        if (pst.mode && pst.node) {
          Remit(cmd, pst.node, $(tree.Id).jstree('get_node', obj));
        }
      } else if (cmd === 'new' || cmd === 'add') {
        Create(cmd, obj, prm);
      } else if (cmd === 'ren') {
        if (prm.text === undefined) {
          prm.text = tree.cmdInfo.name;
        }
        $(tree.Id).jstree('rename_node', obj, prm.text);
      } else if (cmd === 'del') {
        CheckAllowed(cmd, obj);
      } else if (!$.jsfiler.Engaged()) {
        var node = $(tree.Id).jstree('get_node', obj);
        Request(cmd, {
          id: node.id,
          idt: node.text,
          pid: node.parent}, prm);
      }
    },
    /**
     * refresh the node/tree
     * @param {array} nodes
     */
    Refresh: function(nodes) {
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        for (var t in trees) {
          if (n.indexOf(t) + 1) {
            tree = trees[t];
            if (n === t) {
              $(tree.Id).jstree('refresh');
            } else if ($('#' + n).length) {
              $(tree.Id).jstree('refresh_node', '#' + n);
            }
          }
        }
      }
    },
    /**
     * check if action allowed
     * @param {string} id 
     * @return {bool}
     */
    TreeInfo: function(id) {
      var t = false;
      if (isNaN(id)) {
        var Id = id ? ('#' + id) : tree.Id;
        for (var i in trees) {
          if (Id.indexOf(trees[i].Id) + 1) {
            t = i;
            break;
          }
        }
      } else {
        var k = 0;
        for (var i in trees) {
          if (k === id) {
            t = i;
            break;
          }else{
            k++;
          }
        }
      }
      return t === false ? {} : $.extend({}, trees[t]);
    },
    /**
     * check if action allowed
     * @return {bool}
     */
    Engaged: function() {
      return (busy.tck !== null);
    },
    /**
     * indicate the command name in action
     * @param {string} txt -- text to show
     * @param {object} obj -- user meter 
     */
    Busy: function(txt, obj) {
      if (txt) {
        if (obj) {
          busy.obj = GetObj(obj);
          busy.obj.addClass(meterClass);
        } else {
          NodeOpts(tree.cmdInfo.Id, txt, false);
        }
        busy.txt = txt;
        busy.tck = setInterval(function() {
          busy.dts += '.';
          if (busy.dts.length > 3) {
            busy.dts = '';
          }
          var d = busy.dts;
          for (var i = busy.dts.length; i < 3; i++) {
            d += '&nbsp;';
          }
          $('.' + meterClass).html(busy.txt + d);
        }, 200);
      } else if (busy.tck !== null) {
        clearInterval(busy.tck);
        busy.tck = null;
        if (busy.obj) {
          busy.obj.removeClass(meterClass);
          busy.obj.html('');
          delete busy.obj;
        } else {
          $('.' + meterClass).remove();
        }
      }
    },
    /**
     * set node type & icon and refresh
     * @param {str} id
     * @param {int} type
     * @param {int} icon
     * @param {bool} frsh refresh
     */
    SetNode: function(id, type, icon, frsh) {
      var obj = GetObj(id);
      $(tree.Id).jstree('deselect_all', true);
      $(tree.Id).jstree('select_node', obj);
      if (type) {
        $(tree.Id).jstree('set_type', obj, type);
      }
      if (icon) {
        var t = type ? type : $(tree.Id).jstree('get_type', obj);
        if (tree.treeIcons[t]) {
          var i = icon - 1;
          if (tree.icons[tree.treeIcons[t][0]]) {
            var a = tree.icons[tree.treeIcons[t][0]];
            var ico = i < a.length ? a[i].src : '';
          } else {
            a = tree.treeIcons[t][1];
            ico = i < a.length ? a[i] : '';
            ;
          }
          $(tree.Id).jstree('set_icon', obj, ico);
        }
      }
      if (frsh) {
        $(tree.Id).jstree('refresh_node', obj);
      }
    },
    /**
     * destroy an instance
     * @param {string} Id
     */
    Destroy: function(Id) {
      var id = Id.replace('#', '');
      GetObj(id).jstree('destroy');
      trees[id] = null;
      delete trees[id];
      id = '';
      for (var t in trees) {
        if (trees.hasOwnProperty(t)) {
          id = t;
          break;
        }
      }
      tree = id ? trees[id] : null;
    }
  };

  /* core callbacks */
  var callBacks = {
    encode: function(dat) { /* encode request data */
      return encodeURI(dat);
    },
    check: null, /* dnd check */
    allow: null, /* commands accesssible */
    action: null, /* action processor */
    request: null, /* request processor */
    response: null, /*response processor */
    dialog: null  /* user dialog */
  };

  var treeParm = {
    plugins: [],
    core: {
      animation: 100,
      strings: {'Loading ...': ''},
      data: function(node, callback) {
        var prm = {cmd: 'opn', id: (node.id === '#' ? tree.rootParent : node.id)};
        GetData(prm, function(nodes) {
          if (nodes.length) {
            Open(nodes, callback);
          } else {
            callback(nodes);
          }
        });
      }
    },
    search: {
      fuzzy: false,
      close_opened_onclear: false,
      ajax: function(str, callback) {
        tree.search.str = tree.callBacks.encode(str);
        var prm = {cmd: 'sch', id: tree.cmdInfo.Id.replace('#', ''), fnd: tree.search};
        GetData(prm, callback);
      },
      search_callback: function(str, node) {
        var s = tree.search.csi ? str : str.toLowerCase();  /* needle */
        var t = tree.search.csi ? node.text : node.text.toLowerCase();  /* haystack */
        if (tree.search.pos === 0) {
          var f = (t === s);
        } else if (tree.search.pos === 1) {
          f = (t.indexOf(s) === 0);
        } else if (tree.search.pos === 2) {
          f = (t.lastIndexOf(s) === t.length - s.length);
        } else if (tree.search.pos === 3) {
          f = (t.indexOf(s) !== -1);
        } else {
          f = null;
        }
        return f;
      }
    },
    state: {
      key: '',
      filter: function(obj) {
        return obj;
      }
    },
    dnd: {
      copy: true,
      always_copy: false,
      check_while_dragging: true,
      is_draggable: function(n) {
        TreeSelect(n[0].id);
        return (tree.canDrag !== false && !$.jsfiler.Engaged() && CheckDnd(n));
      }
    },
    contextmenu: {
      select_node: true,
      items: function(obj) {
        ClearOpts(obj);
        ContextMenu(tree.cmdMenu, AllowCommands(GetObj(obj)));
        return tree.cmdMenu;
      }
    },
    types: {}
  };
  var types = {
    '#': {
      max_children: -1,
      valid_children: [0]
    },
    0: {
      valid_children: [1, 2],
      icon: 'root'
    },
    1: {
      valid_children: [1, 2, 3],
      icon: 'knot_leaf'
    },
    2: {
      valid_children: [1, 2, 3],
      icon: 'knot'
    },
    3: {
      valid_children: [],
      icon: 'leaf'
    }
  };

  /**
   * open/search
   * @param {object} args -- request arguments
   * @param {function} clb -- callback
   */
  var GetData = function(args, clb) {
    TreeSelect(args.id);
    args.idt = NodeName(args.id);
    args.cmt = tree.cmdList[args.cmd].label;
    Ajax(args, {busy: $.jsfiler.Engaged()}, function(args, rslt) {
      var dat = rslt.status ? rslt.factor : [];
      clb.call(this, dat);
      if (rslt.prompt) {
        Dialog(rslt.prompt);
      }
    });
  };

  /**
   * open subtree
   * @param {array} nodes
   * @param {function} clbk
   */
  var Open = function(nodes, clbk) {
    if (nodes[0].type === 0) {
      if (nodes.length > 1 && tree.rootSingle) {
        nodes = [nodes.shift()];  /* reject other roots */
      }
      if (nodes.length === 1) {
        nodes[0].state.opened = true; /* open single root */
      }
      for (var id in trees) {
        if (nodes[0].id.indexOf(id) + 1) {
          trees[id].cmdInfo.Id = '#' + nodes[0].id;
          trees[id].cmdInfo.name = nodes[0].text;
          trees[id].cmdInfo.type = 0;
        }
      }
    }
    clbk(nodes);
    Opening(nodes);
  };
  /**
   * fill subtree
   * @param {array} nodes
   */
  var Opening = function(nodes) {
    if ($('#' + nodes[0].id).length > 0) {
      if (tree.callBacks.metadata) {
        tree.callBacks.metadata(nodes);
      }
      if (!$.isEmptyObject(tree.pending)) { /* waiting for a load */
        var opr = tree.pending.shift();
        opr.apply(that, tree.pending);
        tree.pending = [];
      }
    } else {
      /* wait for the populating */
      setTimeout(function() {
        Opening(nodes);
      }, 100);
    }
  };

  /**
   * create a node
   * @param {string} cmd -- new/add
   * @param {object|array} obj -- node(s)
   * @param {mixed} prm -- parameters
   */
  var Create = function(cmd, obj, prm) {
    var parm = typeof prm === 'object' ? prm : {};
    parm.type = cmd === 'new' ? 2 : 3;
    if (parm.icon === undefined) {
      parm.icon = $(tree.Id).jstree(true).settings.types[parm.type].icon;
    }
    if (parm.text === undefined) {
      parm.text = tree.cmdList[cmd].label;
    }
    if (parm.pos === undefined) {
      var pos = 'last';
    } else {
      pos = parm.pos;
      delete parm.pos;
    }
    $(tree.Id).jstree('create_node', obj, parm, pos, function(node) {
      if ($(tree.Id).jstree('is_closed', '#' + node.parent)) {
        $(tree.Id).jstree('open_node', '#' + node.parent, null, false);
      }
    });
  };

  /**
   * form command list and attach event
   * @param {bool} flg -- true - include disabled
   */
  var CommandList = function(flg) {
    var cmds = '';
    for (var cmd in tree.cmdList) {
      if (tree.cmdList[cmd].menu !== false) {
        cmds += CommandItem(cmd, cmd);
        if (flg) {
          cmds += CommandItem(cmd + suffix, cmd);
        }
      }
    }
    return cmds;
  };
  /**
   * form command list and attach event
   * @param {string} cmd
   * @param {string} key -- list key
   */
  var CommandItem = function(cmd, key) {
    var cmds = '<a href="#' + cmd + '"' + ' title="' + tree.cmdList[key].label + '"';
    if (!tree.iconPath) {
      cmds += ' class="_' + cmd + '">';
    } else if (tree.iconPath === '_') {
      var s = cmd.indexOf(suffix) + 1 ? 'none' : 'underline';
      cmds += ' style="text-decoration:' + s + ';">' + tree.cmdList[key].label;
    } else {
      cmds += '><img src="' + tree.icons[cmd].src + '" alt="" />';
    }
    cmds += '</a>';
    return cmds;
  };
  /**
   * correct right-click menu
   * @param {object} coms
   * @param {array} cms -- alowed
   * @return {bool} true -- all disabled
   */
  var ContextMenu = function(coms, cms) {
    var f = true; /* disable parent */
    for (var cmd in coms) {
      if (coms[cmd].submenu) {
        coms[cmd]._disabled = ContextMenu(coms[cmd].submenu, cms);
      } else if ($.inArray(cmd, cms) + 1) {
        f = false;
        coms[cmd].icon = tree.icons[cmd] ? tree.icons[cmd].src : '_' + cmd + ' _cmd';
        coms[cmd]._disabled = false;
      } else {
        coms[cmd].icon = tree.icons[cmd + suffix] ? tree.icons[cmd + suffix].src : '_' + cmd + suffix + ' _cmd';
        var f = tree.cmdList[cmd].icon && tree.cmdList[cmd].icon.length > 1 && tree.cmdList[cmd].icon[0] === tree.cmdList[cmd].icon[1];
        coms[cmd]._disabled = !f;
      }
    }
    return f;
  };
  /**
   * dynamic menu action
   * @param {string} cmd 
   */
  var ContextMenu0 = function(cmd) {
    /**
     * dynamic menu action
     * @param {object} obj node
     */
    this.act = function(obj) {
      Action(obj, cmd);
    };
  };
  /**
   * process a command
   * @param {object} com -- selected command or node
   * @param {bool|string} flg -- true - main menu
   *                             false - node menu
   *                             string - contextmenu command
   */
  var Action = function(com, flg) {
    if ($.jsfiler.Engaged()) {
      return;
    } else if (flg === true) {
      var a = com.parents('.' + menuClass);
      tree = trees[$(a[0]).attr('id').replace(menuSuffix, '')];
    } else {
      TreeSelect(com);
    }
    tree.cmdInfo.cmd = typeof flg === 'string' ? flg : com.attr('href').substr(1).replace(suffix, '');
    if (tree.menuType === 2 && $(tree.menuId).length) {
      $(tree.menuId).children().hide();
    }
    var obj = $(tree.cmdInfo.Id);
    if ($(tree.Id).jstree('can_paste') && tree.cmdInfo.cmd !== 'pst') {
      $(tree.Id).jstree('clear_buffer');  /* cancel pending paste */
      CopyCut('clr', []);
    }
    var act = tree.callBacks.action ? tree.callBacks.action(obj) : tree.cmdInfo.cmd;
    if (act === 'sch') {
      var str = Dialog(tree.cmdList.sch.label, {pmt: ''});
      if (str) {
        $.jsfiler.Command(act, obj, str);
      } else {
        $(tree.Id).jstree('deselect_node', obj);
        $(tree.Id).jstree('select_node', obj);
      }
    } else if (act !== false) {
      var prm = typeof act === 'object' ? act : {};
      $.jsfiler.Command(tree.cmdInfo.cmd, obj, prm);
    }
  };
  /**
   * get node title
   * @param {array} cms
   */
  var ShowIcons = function(cms) {
    $(tree.menuId).children().hide();
    for (var cmd in tree.cmdList) {
      var c = '';
      if ($.inArray(cmd, cms) + 1) {
        c = 'a[href="#' + cmd + '"]';
      } else if (tree.menuType === 1) {
        var f = (tree.cmdList[cmd].icon && tree.cmdList[cmd].icon.length > 1);
        if (!tree.iconPath || f) {
          var s = f && tree.cmdList[cmd].icon[0] === tree.cmdList[cmd].icon[1] ? '' : suffix;
          c = 'a[href="#' + cmd + s + '"]';
        }
      }
      if (c !== '') {
        $(tree.menuId).children(c).css('display', 'inline-block');
      }
    }
  };
  /**
   * form node options htm
   * @param {object} node
   * @param {string} htm -- html to insert
   * @param {bool} flg -- true - menu (else meter)
   */
  var NodeOpts = function(node, htm, flg) {
    if (tree.menuType !== 1) {
      ClearOpts(node);
    }
    var h = '<span class="';
    if (flg) {
      h += menuClass + '" id="' + tree.menuId.substr(1) + '">';
    } else {
      h += meterClass + '">';
    }
    h += htm + '</span>';
    var obj = GetObj(node);
    if ($(obj).children('a').length) {
      $(obj).children('a:first').after(h);
    } else {
      $(obj).append(h);
    }
  };
  /**
   * remove node options
   * @param {object} node
   */
  var ClearOpts = function(node) {
    var id = TreeSelect(node, true);
    if (id && trees[id].menuType === 2 && $(trees[id].menuId).length) {
      if ($(trees[id].menuId).children('a').length) {
        $(trees[id].menuId).children('a').off('click');
      }
      $(trees[id].menuId).remove();
    }
  };

  /**
   * save current node info
   * @param {object} obj -- node
   * @param {string} cmd -- token
   */
  var NodeInfo = function(obj, cmd) {
    var id = TreeSelect(obj, true);
    var o = GetObj(obj);
    var c = cmd ? cmd : trees[id].cmdInfo.cmd;
    trees[id].cmdInfo = {
      cmd: c,
      Id: '#' + o.attr('id'),
      name: $(trees[id].Id).jstree('get_node', o).text,
      type: $(trees[id].Id).jstree('get_type', o),
      flag: false
    };
  };

  /**
   * get tree info
   * @param {mixed} node
   * @param {bool} mode -- true - get id
   * @return {object} 
   */
  var TreeSelect = function(node, mode) {
    var id = null;
    var a = GetObj(node).parents('.' + treeClass);
    if (a.length === 1) {
      id = $(a[0]).attr('id');
      if (!trees[id]) {
        id = false;
      } else if (!mode) {
        tree = trees[id];
      }
    }
    return id;
  };

  /**
   * get jQuery object
   * @param {string|object} obj
   * @return {object} 
   */
  var GetObj = function(obj) {
    if (typeof obj === 'string') {
      var o = $('#' + obj.replace('#', ''));
    } else if (obj.id) {
      o = $('#' + obj.id);
    } else if (obj.attr) {
      o = obj;
    } else {
      o = $(obj);
    }
    return o;
  };

  /**
   * tree instances
   * @param {object} options
   * @returns {object}
   */
  $.fn.jsfiler = function(options) {

    var config = {
      Id: '#', /* tree id */
      menuId: '#', /* commands block */
      menuType: 0, /* 0 - no icon menu, 1 - common, 2 - node */
      mainMenu: '',
      callBacks: {},
      cmdList: {},
      cmdMenu: {},
      treeIcons: {},
      icons: {},
      txts: {},
      cmdInfo: {Id: '', cmd: '', flag: false, name: '', type: null},
      args: {}, /* request arguments */
      search: false,
      nodes: [], /* multiple delete or paste id's */
      nodez: {}, /* move/copy replacement ids */
      pending: {} /* revoke command after node load */
    };
    var parm = {}; /* tree parameters */

    var that = this;

    /**
     * extract/merge the options
     */
    var Options = function() {
      if (opts.styles) {
        var c = (typeof opts.styles === 'string' ? [opts.styles] : opts.styles.join("\n"));
        Style(c);
        delete opts.styles;
      }
      $.extend(config.txts, txts);
      if (opts.txts) {
        $.extend(config.txts, opts.txts);
        delete opts.txts;
      }
      $.extend(config.callBacks, callBacks);
      if (opts.callBacks) {
        for (c in opts.callBacks) {
          if (opts.callBacks[c] !== null) {
            config.callBacks[c] = opts.callBacks[c];
          }
        }
        delete opts.callBacks;
      }
      if (opts.cmdList === undefined) {
        var coms = $.extend({}, treeCommands);
        CmdList(coms);
      } else {
        coms = $.extend(true, {}, opts.cmdList);
        CmdList(coms);
        for (c in treeCommands) {
          if (treeCommands[c].menu === false) {
            if (config.cmdList[c] === undefined) {
              config.cmdList[c] = treeCommands[c];
            } else {
              config.cmdList[c].menu = false;
            }
          }
        }
        delete opts.cmdList;
      }
      TreeIcons();
      $.extend(config, treeConfig, opts);
      if (config.iconPath) {
        Icons();
      }
      $.extend(parm, treeParm);
      $.extend(parm.types, types);
      Types();
      parm.plugins = $.merge([], plugins);
      if (config.saveState !== false) {
        parm.plugins.push('state');
      }
      if (config.checkbox !== false) {
//        parm.plugins.push('checkbox');  /* not implemented */
      }
      if (config.menuMode !== 2) {
        parm.plugins.push('contextmenu');
        config.cmdMenu = $.extend(true, {}, coms);
        CmdMenu(config.cmdMenu);
      }
      parm.core.strings['Loading ...'] = config.loading;
    };
    /**
     * build command list
     * @param {object} coms
     */
    var CmdList = function(coms) {
      for (var com in coms) {
        if (coms[com].submenu) {
          CmdList(coms[com].submenu);
        } else {
          config.cmdList[com] = coms[com];
        }
      }
    };
    /**
     * correct right-click menu
     * @param {object} coms
     */
    var CmdMenu = function(coms) {
      for (var com in coms) {
        if (coms[com].submenu) {
          CmdMenu(coms[com].submenu);
        } else if (coms[com].menu !== false) {
          var f = new ContextMenu0(com);
          coms[com].action = f.act;
          delete coms[com].flag;
        } else {
          delete coms[com];
        }
      }
    };
    /**
     * create caller's style tag
     * @param {string} css
     */
    var Style = function(css) {
      var obj = document.createElement('style');
      obj.setAttribute('type', 'text/css');
      if (obj.styleSheet) {                          /* IE */
        obj.styleSheet.cssText = css;
      } else {
        obj.appendChild(document.createTextNode(css));
      }
      var div = document.getElementsByTagName('head')[0];
      div.appendChild(obj);
    };
    /**
     * set tree icons
     */
    var TreeIcons = function() {
      if (opts.treeIcons === undefined) {
        config.treeIcons = {};
        for (var c in types) {
          if (types[c].icon) {
            config.treeIcons[c] = [types[c].icon, [types[c].icon]];
          }
        }
      } else {
        for (c in opts.treeIcons) {
          if (!$.isArray(opts.treeIcons[c][1])) {
            opts.treeIcons[c][1] = [opts.treeIcons[c][1]];
          }
        }
        config.treeIcons = opts.treeIcons;
        delete opts.treeIcons;
      }
    };
    /**
     * icon loader
     */
    var Icons = function() {
      for (var c in config.treeIcons) {  /* preload tree images */
        if ($.isArray(config.treeIcons[c]) && config.treeIcons[c].length > 1) {
          var i = config.treeIcons[c];
          config.icons[i[0]] = [];
          for (var j = 0; j < i[1].length; j++) {
            config.icons[i[0]][j] = new Image();
            config.icons[i[0]][j].src = config.iconPath + i[1][j];
          }
        }
      }
      for (c in config.cmdList) {  /* preload command images */
        if (config.cmdList[c].icon) {
          if (typeof config.cmdList[c].icon === 'string') {
            config.cmdList[c].icon = [config.cmdList[c].icon];
          }
          config.icons[c] = new Image();
          config.icons[c].src = config.iconPath + config.cmdList[c].icon[0];
          if (config.cmdList[c].icon.length > 1) {
            config.icons[c + suffix] = new Image();
            config.icons[c + suffix].src = config.iconPath + config.cmdList[c].icon[1];
          }
        }
      }
    };
    /**
     * types plugin types
     */
    var Types = function() {
      for (var c in parm.types) {  /* normalize */
        if (config.treeIcons[c]) {
          var i = config.treeIcons[c][0];
          if (config.icons[i]) {
            parm.types[c].icon = config.icons[i][0].src;
          } else {
            parm.types[c].icon = config.treeIcons[c][1][0];
          }
        }
      }
      if (config.rootSingle) {
        parm.types['#'].max_children = 1; /* single top node */
      }
      if (config.rootLeaf) {
        parm.types[0].valid_children.push(3);
      }
    };

    /**
     * create a tree
     * @param {string} id -- tree id
     */
    var Init = function(id) {
      tree = $.extend({}, config);
      tree.Id = '#' + id;
      tree.menuId = '#' + id + menuSuffix; /* commands block */
      if (tree.menuMode > 1) {
        tree.menuType = $(tree.mainMenu).length ? 1 : 2;
      }
      trees[id] = tree;
      $(tree.Id).addClass(treeClass);
      if (tree.menuType === 1) {
        NodeOpts($(tree.mainMenu), CommandList(true), true);
        ShowIcons([]);
        $(tree.menuId).children('a').click(function() {
          var c = $(this).attr('href').replace(suffix, '').substr(1);
          if ($(this).attr('href').indexOf(suffix) === -1) {
            Action($(this), true);
          }
          return false;
        });
      }
      parm.state.key = id;
      Operations(id);
      $('#' + id).jstree(parm);
      $('#' + id).jstree(true).settings.core.check_callback = CheckBefore;
    };

    /**
     * tree operations
     * @param {string} id -- tree id
     */
    var Operations = function(id) {
      var i, j, r;
      $('#' + id).on({
        'loaded.jstree': function(e, data) {
//          i = $(e.target).jstree(true).settings.types[0].icon;
          r = $(e.target).find('li');
          for (j = 0; j < r.length; j++) {  /* icon/type adjustment */
            $(e.target).jstree('set_type', r[j], 0); // replace default root type
//            $(e.target).jstree('set_icon', r[j], i); // replace default root icon
          }
        }, 'select_node.jstree': function(e, data) {
          if (data.node && $(tree.Id).find('.jstree-clicked').length === 1) {
            if ($.jsfiler.Engaged()) {  /* prevent selection */
              if (tree.cmdInfo.Id.substr(1) !== data.node.id) {
                $(tree.Id).jstree('deselect_node', data.node, true);
                $(tree.Id).jstree('select_node', tree.cmdInfo.Id, true);
              }
            } else if (!tree.cmdInfo.flag) {
              if (tree.selectOpen) {
                $(tree.Id).jstree('open_node', data.node);
              }
              NodeCommands(data.node.id);
            }
          }
        }, 'before_open.jstree': function(e, data) {
          if (true) {
            return false;
          }
        }, 'search.jstree': function(e, data) {
          $(tree.Id).jstree('deselect_node', tree.cmdInfo.Id);
          if (data.nodes.length === 0) {
            tree.search = false;
            $(tree.Id).jstree('select_node', tree.cmdInfo.Id);
          }
        }, 'create_node.jstree': function(e, data) {
          tree.cmdInfo.flag = 2;
          $(tree.Id).jstree('edit', data.node);
        }, 'rename_node.jstree': function(e, data) {
          r = $('#' + data.node.id);
          var flg = tree.cmdInfo.flag;
          if (flg) {
            var title = CheckName(data.node.text, data.old, data.node.parent, r);
            tree.cmdInfo.flag = false;
          } else {
            title = null;
            tree.cmdInfo.flag = 1;
            $(tree.Id).jstree('edit', r);
          }
          if (typeof title === 'string') {  /* name is correct */
            Request(tree.cmdInfo.cmd, {id: data.node.id, idt: title, pid: data.node.parent}, data);
          } else if (title === true) {  /* incorrect name, retry */
            tree.cmdInfo.flag = flg;
            $(tree.Id).jstree('edit', r);
          } else if (flg === 1 && title === false) {
            $(tree.Id).jstree('set_text', r, data.old);
          } else if (flg === 2) {
//            $(tree.Id).jstree('delete_node', '#' + data.node.id);
            $(tree.Id).jstree('refresh_node', '#' + data.node.parent);
          }
        }, 'copy.jstree': function(e, data) {
          CopyCut('cpy', data.node);
        }, 'cut.jstree': function(e, data) {
          CopyCut('cut', data.node);
        }, 'paste.jstree': function(e, data) {
          CopyCut('pst', []);
        }, 'copy_node.jstree': function(e, data) {
          r = 'cpy';
          if (tree.cmdInfo.cmd === 'mve') {
            r = 'MVE';      /* multi tree move */
          } else if (tree.cmdInfo.cmd === 'pst') {
            i = $(tree.Id).jstree('get_buffer');
            if (i && i.mode === 'move_node') {
              r = 'MVE';    /* multi tree cut/paste */
            }
          }
          CopyMove(r, data);
        }, 'move_node.jstree': function(e, data) {
          CopyMove('mve', data);
        }, 'delete_node.jstree': function(e, data) {
        }, 'after_open.jstree': function(e, data) { /* check copy/cut */
          var pst = $(tree.Id).jstree('get_buffer');
          if (pst.mode) {
            var cmd = pst.mode === 'copy_node' ? 'cpy' : 'cut';
            var nds = $(tree.Id).jstree('get_children_dom', '#' + data.node.id);
            nds.push({id: data.node.id});
            for (i = 0; i < nds.length; i++) {
              for (j = 0; j < pst.node.length; j++) {
                if (nds[i].id === pst.node[j].id) {
                  $('#' + nds[i].id).addClass(pasteClass + cmd);
                  break;
                }
              }
            }
          }
        }, 'refresh_node.jstree': function(e, data) { /* new selection */
          $(tree.Id).jstree('open_node', data.node);
        }, 'changed.jstree': function(e, data) { /* new selection */
        }
      });
      /*      $(document).on('dnd_stop.vakata', function (e, data) {
       console.log(data);
       }); */
    };

    /**
     * constructor
     */
    var opts = options ? $.extend({}, options) : {};
    Options(); /* override defaults */
    return that.each(function() {
      var id = $(this).attr('id');
      if (trees[id] === undefined) {
        Init(id); /* create a tree */
      } else {
        for (var opt in opts) { /* modify config */
          if ($.inArray(opt, change) + 1) {
            trees[id][opt] = config[opt]; /* allowed change */
          }
        }
      }
    });
  };

  /**
   * form command list and attach event
   * @param {object} node
   */
  var NodeCommands = function(node) {
    TreeSelect(node);
    if (tree.search) {
      $(tree.Id).jstree('clear_search');
      tree.search = false;
    }
    var obj = GetObj(node);
    if (tree.menuType === 2) {
      NodeOpts(obj, CommandList(), true);
    }
    ShowIcons(AllowCommands(obj));
    NodeInfo(obj);
    if (tree.menuType === 2) {
      $(tree.menuId).children('a').click(function() {
        Action($(this), false);
        return false;
      });
    }
    return true;
  };

  /**
   * check operation allowance
   * @param {string} oper
   * @param {object} node
   * @param {object} parent
   * @param {int} pos
   * @param {object} misc -- move - new parent
   * @return {bool} 
   */
  var CheckBefore = function(oper, node, parent, pos, misc) {
    if ($.jsfiler.Engaged()) {
      var chk = false;
    } else if ((oper === 'move_node' || oper === 'copy_node') && tree.cmdInfo.flag === false) {
      if (misc && misc.core) {
        var id = TreeSelect(node, true);
        Remit(trees[id].cmdInfo.cmd, node, parent);
        chk = false;
      } else if (misc && misc.dnd) {
        chk = CheckDnd(node, misc.ref);
        tree.cmdInfo.cmd = oper === 'copy_node' ? 'cpy' : 'mve';
      }
    } else {
      chk = true;
    }
    return chk;
  };
  /**
   *  drag/drop allowance
   *  @param {object} obj -- node(s) - jstree
   *  @param {object} parent -- Drop - jstree
   * @return {bool} 
   */
  var CheckDnd = function(obj, parent) {
    if (parent === undefined) {
      var f = obj.length === 1 && obj[0].type !== 0; /* don't drag multiple nodes and/or root node */
    } else {
      f = parent.type && parent.type !== 3 && /* don't drop to a leaf node */
              (obj.parent && obj.parent !== parent.id); /* don't drop to parent */
    }
    if (tree.callBacks.check) {
      f = tree.callBacks.check(f, obj, parent);
    }
    return f;
  };
  /**
   * search command
   * @param {mixed} cnd -- search condition
   * @param {object} obj -- selected node
   */
  var Search = function(cnd, obj) {
    $(tree.Id).jstree('deselect_node', obj);
    if (tree.menuType === 1) {
      ShowIcons([]);
    } else if (tree.menuType === 2) {
      ClearOpts(obj);
    }
    if (typeof cnd !== 'object') {
      cnd = {str: cnd, csi: 0, pos: 0};
    }
    tree.search = cnd;
    $(tree.Id).jstree('search', cnd.str);
  };
  /**
   * trim and validate name, check for duplicates
   * @param {string} nme -- new name
   * @param {string} old -- old name
   * @param {string} pid -- parent id
   * @param {object} rlt -- result node
   * @return {mixed} -- null - no changes
   *                    false - cancel
   *                    true - retry 
   *                    string - trimmed new name
   */
  var CheckName = function(nme, old, pid, rlt) {
    var err = '';
    var trm = new RegExp(tree.nameTrim);
    var name = nme.replace(trm, ''); /* trim spaces and periods */
    var nam = name;
    if (name !== nme) {
      $(tree.Id).jstree('set_text', rlt, name); /* replace with trimmed name */
    }
    if (name === '' || name === old) {
      var flg = null; /* empty or not changed */
    } else if (tree.nameValidate) {
      var ptr = new RegExp(tree.nameValidate);
      flg = ptr.test(name); /* check for denied symbols */
    } else {
      flg = true;
    }
    if (flg && tree.nameDupl < 2) {
      var nid = rlt.attr('id');
      var nodes = $(tree.Id).jstree('get_children_dom', '#' + pid);
      for (var i = 0; i < nodes.length; i++) {  /* check for duplicate names */
        var id = $(nodes[i]).attr('id');
        var nn = NodeName(id);
        if (id && id !== nid && ((tree.nameDupl === 1 && nn === name) ||
                (tree.nameDupl === 0 && nn.toLowerCase() === name.toLowerCase()))) {
          nam = nn;
          flg = false;
          break;
        }
      }
      if (!flg) {
        err = tree.txts.knotExists;
      }
    } else if (flg === false) {
      err = tree.txts.badName;
    }
    if (err !== '') {
      flg = Dialog([err, nam], {pmt: true});
    } else if (flg) {
      flg = name;
    }
    return flg;
  };

  /**
   * exclude non-delete nodes, ask for delete confirmation
   * @param {string} cmd
   * @param {object} node -- command node
   * @return {bool}
   */
  var CheckAllowed = function(cmd, node) {
    var ids = $(tree.Id).jstree('get_selected');
    var id = GetObj(node).attr('id');
    var a = [id];
    for (var i in ids) {
      var obj = $('#' + ids[i]);
      if ($.inArray(cmd, AllowCommands(obj)) === -1) {
        $(tree.Id).jstree('deselect_node', obj, true);
      } else if (ids[i] !== id) {
        a.push(ids[i]);
      }
    }
    var txt = [tree.txts.confirmDelete];
    var b = [];
    for (i = 0; i < a.length; i++) {
      obj = '#' + a[i];
      if (ClickedParent(a[i]).length) {
        $(tree.Id).jstree('deselect_node', obj, true);
      } else {
        b.push(obj);
//        txt.push(NodeName(obj));
        txt.push($(tree.Id).jstree('get_path', obj, '/'));
      }
    }
    if (b.length > 0) {
      if (cmd === 'del') {
        Dialog(txt, {cmd: 'del', fnc: ConfirmDelete, dat: b});
      } else {
        $(tree.Id).jstree(cmd === 'cpy' ? 'copy' : 'cut', b);
      }
    }
    return b;
  };

  /**
   * find clicked parent nodes
   * @param {string} id -- node to check
   * @return {array}
   */
  var ClickedParent = function(id) {
    var rlt = [];
    var ids = $(tree.Id).jstree('get_path', '#' + id, false, true);
    ids.shift();
    ids.pop();
    for (var i in ids) {
      if ($(tree.Id).jstree('is_selected', '#' + ids[i])) {
        rlt.push(ids[i]);
      }
    }
    return rlt;
  };

  /**
   * dialog box answer
   * @param {bool} cfm -- true - remove
   * @param {array} nodes
   */
  var ConfirmDelete = function(cfm, nodes) {
    /**
     * check if action allowed
     * @param {object} data -- before object
     * @return {bool}
     */
    if (cfm) {
      tree.nodes = [];
      tree.nodez = {};
      for (var i = 0; i < nodes.length; i++) {
        var id = nodes[i].substr(1);
        tree.nodes.push(id);
        tree.nodez[id] = $(tree.Id).jstree('get_parent', nodes[i]);
      }
      Request('del', {id: tree.nodes, pid: tree.nodez});
    } else {
      $(tree.Id).jstree('deselect_all', true);
      $(tree.Id).jstree('select_node', tree.cmdInfo.Id);
    }
  };

  /**
   * copy/move/paste when new parent's children are loaded
   * @param {string} cmd
   * @param {object|array} node
   * @param {object} parent - new one
   * @param {bool} flg -- true - load was made
   */
  var Remit = function(cmd, node, parent, flg) {
    TreeSelect(parent);
    NodeInfo(parent, cmd);
    if (parent.type === 2 || $(tree.Id).jstree('is_loaded', '#' + parent.id)) {
      if (parent.state.opened) {
        CheckReplace(cmd, node, parent);
      } else {
        $(tree.Id).jstree('open_node', parent, function() {
          CheckReplace(cmd, node, parent);
        });
      }
    } else if (!flg) {
      tree.pending = [Remit, cmd, node, parent, true];
      $(tree.Id).jstree('load_node', parent, function() {
        $(tree.Id).jstree('open_node', parent);
      });
    }
  };

  /**
   * check if destination subnode exists
   * @param {string} cmd -- move/copy_node
   * @param {object} node -- to move
   * @param {object} parent -- new parent
   */
  var CheckReplace = function(cmd, node, parent) {
    var nodes = $.isArray(node) ? node : [node];
    NodeInfo(nodes[0], cmd);
    var pos = 0;
    tree.nodez = {};
    var txt = [tree.txts.confirmReplace];
    var child = $(tree.Id).jstree('get_children_dom', '#' + parent.id);
    for (var i = 0; i < child.length; i++) {
      var nme = NodeName(child[i].id);
      for (var j = 0; j < nodes.length; j++) {
        if (child[i].id !== nodes[j].id && ((tree.nameDupl === 1 && nme === nodes[j].text) ||
                (tree.nameDupl === 0 && nme.toLowerCase() === nodes[j].text.toLowerCase()))) {
          tree.nodez[nodes[j].id] = child[i].id;
          txt.push($(tree.Id).jstree('get_path', child[i].id, '/'));
          break;
        }
      }
      if (nme < nodes[0].text) {
        pos = i + 1;
      }
    }
    tree.nodes = {};
    tree.cmdInfo.flag = nodes.length;
    var data = [cmd, nodes, parent, pos];
    if ($.isEmptyObject(tree.nodez)) {
      ConfirmReplace(true, data);
    } else {
      Dialog(txt, {cmd: 'rpl', fnc: ConfirmReplace, dat: data});
    }
  };

  /**
   * dialog box answer
   * @param {bool} cfm
   * @param {object} data -- copy/move object
   * @return {bool}
   */
  var ConfirmReplace = function(cfm, data) {
    if (!cfm) {
      tree.cmdInfo.flag = false;
      if (data[0] === 'pst') {
        $(tree.Id).jstree('clear_buffer');  /* cancel paste */
        CopyCut('clr', []);
        NodeCommands(data[2].id);
      }
    } else if (data[0] === 'pst') {
      $(tree.Id).jstree('paste', data[2], data[3]);
    } else if (data[0] === 'cpy') {
      $(tree.Id).jstree('copy_node', data[1], data[2], data[3]);
    } else {
      $(tree.Id).jstree('move_node', data[1], data[2], data[3]);
    }
  };
  /**
   * copy/move server-side
   * @param {string} cmd -- cpy/mve; MVE - move as copy
   * @param {object} data
   */
  var CopyMove = function(cmd, data) {
    tree.nodes[data.node.id] = [cmd === 'mve' ? data.node.id : data.original.id, data.old_parent];
    tree.cmdInfo.flag--;
    if (tree.cmdInfo.flag === 0) {
      if (!$.isEmptyObject(tree.nodez)) {  /* replacement */
        tree.args.rpl = tree.nodez;
      }
      var fid = tree.Id.replace('#', '');
      if (data.old_parent.indexOf(fid) === -1) {
        fid = TreeSelect(data.old_parent, true);
      } else if (data.parent.indexOf(fid) === -1) {
        fid = TreeSelect(data.parent, true);
      } else {
        fid = null;
      }
      if (fid) {
        tree.args.fid = fid;
      }
      tree.cmdInfo.flag = false;
      Request(cmd.toLowerCase(), {
        id: tree.nodes,
        idt: data.node.text,
        pid: data.parent}, data);
    }
  };

  /**
   * mark the nodes
   * @param {string} cmd -- cpy/cut
   * @param {array} nodes
   */
  var CopyCut = function(cmd, nodes) {
    for (var t in trees) {
      $(trees[t].Id).find('.' + pasteClass + 'cpy' + ',' + '.' + pasteClass + 'cut').removeClass(pasteClass + 'cpy' + ' ' + pasteClass + 'cut');
    }
    for (var i = 0; i < nodes.length; i++) {
      GetObj(nodes[i]).addClass(pasteClass + cmd);
    }
  };

  /**
   * get valid commands
   * @param {object} obj node
   * @return {array} 
   */
  var AllowCommands = function(obj) {
    var node = $(tree.Id).jstree('get_node', obj);
    var cms = [];
    for (var cmd in tree.cmdList) {
      if ((cmd === 'sch' && node.type < 2) ||
              (cmd === 'new' && node.type !== 3) ||
              (cmd === 'add' && node.type !== 3 && (node.type !== 0 || tree.rootLeaf)) ||
              (cmd === 'cpy' && node.type !== 0) ||
              (cmd === 'cut' && node.type !== 0 && RemoveAllowed(node)) ||
              (cmd === 'pst' && PasteAllowed(node)) ||
              (cmd === 'ren' && (node.type !== 0 || !tree.rootSingle)) ||
              (cmd === 'del' && RemoveAllowed(node))) {
        cms.push(cmd);
      }
    }
    return tree.callBacks.allow ? tree.callBacks.allow(node, cms) : cms;
  };
  /**
   * check remove allowance
   * @param {object} node jstree
   * @returns {bool}
   */
  var RemoveAllowed = function(node) {
    return (tree.knotRemove > 1 || node.type > 1 ||
            (tree.knotRemove === 1 && node.li_attr[copied]));
  };
  /**
   * check paste allowance
   * @param {object} node jstree
   * @returns {bool}
   */
  var PasteAllowed = function(node) {
    var pst = $(tree.Id).jstree('get_buffer');
    if (pst.mode && node.type !== 3) {
      var f = 0;
      for (var i = 0; i < pst.node.length; i++) {
        if (pst.node[i].id === node.id || pst.node[i].parent === node.id) {
          f = 2;
        } else if (pst.node[i].type === 3) {
          f = 1;
          break;
        }
      }
      var r = (f === 0 || (f === 1 && (node.type !== 0 || tree.rootLeaf)));
    } else {
      r = false;
    }
    return r;
  };
  /**
   * get node title
   * @param {object} obj
   * @return {string} 
   */
  var NodeName = function(obj) {
    var c = $(tree.Id).jstree('get_node', obj).text;
    return c;
  };
  /**
   * server request
   * @param {string} cmd -- command token
   * @param {object} parm -- command params
   * @param {array} data -- jstree data
   *                          args - additional params
   * @return {object} 
   */
  var Request = function(cmd, parm, data) {
    var args = $.extend({}, tree.args, parm);
    tree.args = {};
    args.cmd = cmd;
    args.cmt = tree.callBacks.encode(tree.cmdList[cmd].label);
    args.idt = parm.idt ? tree.callBacks.encode(parm.idt) : '';
    if (data === undefined) {
      data = {};
    }
    if (tree.cmdList[cmd].menu !== false) {
      if (data.busy) {
        $.jsfiler.Busy(data.busy.txt, data.busy.obj);
      } else {
        $.jsfiler.Busy(tree.cmdList[cmd].label);
      }
    }
    Ajax(args, data, Response);
  };

  /**
   * command response
   * @param {object} arg -- request params
   * @param {object} rsp -- response 
   * @param {object} dat
   */
  var Response = function(arg, rsp, dat) {
    var i;
    var sid = null;
    if (!rsp.status) {
      sid = RollBack(arg, rsp, dat);
    } else if (arg.cmd === 'new' || arg.cmd === 'add') {
      sid = rsp.factor.id;
      $(tree.Id).jstree('set_id', dat.node, sid);
      if (rsp.factor.li_attr) {
        for (i in rsp.factor.li_attr) {
          dat.node.li_attr[i] = rsp.factor.li_attr[i];
          $('#' + sid).attr(i, rsp.factor.li_attr[i]);
        }
      }
      if (rsp.factor.a_attr) {
        for (i in rsp.factor.a_attr) {
          dat.node.a_attr[i] = rsp.factor.a_attr[i];
          $('#' + sid).find('a').attr(i, rsp.factor.a_attr[i]);
        }
      }
      if (tree.callBacks.metadata) {
        tree.callBacks.metadata([rsp.factor]);
      }
      if ($(tree.Id).jstree('get_type', dat.node.parent) === 2) {
        $(tree.Id).jstree('set_type', dat.node.parent, 1);
        $(tree.Id).jstree('set_icon', dat.node.parent, $(tree.Id).jstree(true).settings.types[1].icon);
      }
    } else if (arg.cmd === 'cpy' || arg.cmd === 'mve') {
      ResponseRemit(arg, rsp.factor, dat);
    } else if (arg.cmd === 'del') {
      for (i in arg.pid) {
        $(tree.Id).jstree('delete_node', i);
        if (arg.pid[i] !== '#') {
          sid = arg.pid[i];
          if ($(tree.Id).jstree('get_type', sid) !== 0 && !$(tree.Id).jstree('get_children_dom', sid).length) {
            $(tree.Id).jstree('set_type', sid, 2);
            $(tree.Id).jstree('set_icon', sid, $(tree.Id).jstree(true).settings.types[2].icon);
          }
        }
      }
    }
    if (!sid) {
      var a = $(tree.Id).jstree('get_selected');
      if (a.length) {
        sid = a[0];
      }
    }
    $(tree.Id).jstree('deselect_all');
    if (sid) {
      $(tree.Id).jstree('select_node', sid);
    } else {
      ShowIcons([]);
    }
    if (rsp.status && tree.callBacks.response) {
      tree.callBacks.response(arg, rsp, dat);
    }
    if (rsp.prompt) {
      Dialog(rsp.prompt);
    }
  };

  /**
   * undo the changes
   * @param {object} arg -- request params
   * @param {object} rsp -- response 
   * @param {object} dat
   * @return {string}
   */
  var RollBack = function(arg, rsp, dat) {
    var i, a;
    var sid = null;
    if (arg.cmd === 'new' || arg.cmd === 'add') {
      sid = dat.node.parent;
      $(tree.Id).jstree('delete_node', dat.node);
    } else if (arg.cmd === 'ren') {
      sid = dat.node.id;
      $(tree.Id).jstree('set_text', dat.node, dat.old);
    } else if (arg.cmd === 'cpy' || arg.cmd === 'mve') {
      a = rsp.factor ? rsp.factor : {};
      for (i in arg.id) {
        if (a[i] === undefined) {
          $(tree.Id).jstree('delete_node', '#' + i);
          if (arg.cmd === 'mve') {
            TreeSelect(arg.id[i][1]);
            $(tree.Id).jstree('refresh_node', '#' + arg.id[i][1]);
            TreeSelect(i);
          }
        }
      }
    }
    return sid;
  };

  /**
   * copy/move response
   * @param {object} arg -- request args
   * @param {object} ids -- ids to change 
   * @param {object} dat -- tree data
   */

  var ResponseRemit = function(arg, ids, dat) {
    var i;
    if (!$.isEmptyObject(ids) && $(tree.Id).jstree('get_type', '#' + dat.parent) === 2) {
      $(tree.Id).jstree('open_node', dat.parent);
      $(tree.Id).jstree('set_type', '#' + dat.parent, 1);
//      $(tree.Id).jstree('set_icon', '#' + dat.parent, $(tree.Id).jstree(true).settings.types[1].icon);
    }
    if (arg.rpl) {
      for (i in arg.rpl) {
        $(tree.Id).jstree('delete_node', arg.rpl[i]);
      }
    }
    if (ids) {
      for (i in ids) {
        var n = $(tree.Id).jstree('get_node', i);
        if (arg.cmd === 'cpy') {
          n.li_attr[copied] = i;
        }
        if (i !== ids[i]) {
          $(tree.Id).jstree('set_id', '#' + i, ids[i]);
        }
        if (n.parent !== arg.pid) {
          n.parent = arg.pid;
        }
      }
    }
    for (i in arg.id) {
      var id = arg.id[i][1];
      if (!$(tree.Id).jstree('get_children_dom', '#' + id).length) {
        $(tree.Id).jstree('set_type', '#' + id, 2);
      }
    }
    if (arg.cmd === 'mve' && arg.fid !== arg.tid) {
      TreeSelect(id);
      $(tree.Id).jstree('deselect_all', true);
      $(tree.Id).jstree('select_node', '#' + id);
      TreeSelect(arg.pid);
    }
  };
  /**
   * make ajax request
   * @param {object} args -- request params
   * @param {object} data -- misc. caller data
   *                    meth - request method (default POST)
   * @param {function} clbk callback
   */
  var Ajax = function(args, data, clbk) {
    args.tid = tree.Id.replace('#', '');
    args.tzo = (new Date()).getTimezoneOffset();
    args.ver = $.jsfiler.version;
    if (tree.callBacks.request) {
      var dat = tree.callBacks.request(args, data);
      args = dat.args;
      data = dat.data;
    }
    var rslt = '';
    $.ajax({
      async: true,
      type: 'POST',
      url: tree.urlAjax,
      dataType: 'json',
      beforeSend: function(xhr) {
        if (tree.jsonSend) {
          xhr.setRequestHeader('Content-Type', 'application/json');
        }
        if (tree.userAuth) {
          xhr.setRequestHeader('Authorization', tree.userAuth);
        }
      },
      data: (tree.jsonSend ? JSON.stringify(args) : args),
      success: function(result) {
        rslt = result;
      },
      complete: function(obj, sts) {
        if (sts !== 'success') {
          var pmt = [tree.txts.ajaxFail + ': ', sts + ' (' + obj.status + ' ' + obj.statusText + ')'];
          rslt = {status: false, prompt: pmt, factor: null};
        }
        if (data.busy === true) {
          delete data.busy;
        } else {
          $.jsfiler.Busy();
        }
        clbk(args, rslt, data);
      }
    });
  };
  /**
   * customized/default messenger
   * @param {string|array} msg -- message text
   * @param {object} obj -- caller info
   * @return {bool|null} 
   */
  var Dialog = function(msg, obj) {
    if (tree.callBacks.dialog) {  /* caller dialoger */
      var rtn = tree.callBacks.dialog(msg, obj);
    } else {
      var txt = (typeof msg === 'string') ? msg : msg.join("\n");
      if (obj) {
        if (typeof obj.pmt === 'string') {
          rtn = prompt(txt, obj.pmt);
        } else {
          rtn = confirm(txt);
        }
        if (obj.fnc) {
          obj.fnc(rtn, obj.dat);
        }
      } else {
        alert(txt);
        var rtn = null;
      }
    }
    return rtn;
  };

})(jQuery, document);