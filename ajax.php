<?php

/**
 * demo tree emulation
 *
 * @package     jsFiler
 * @author      Vallo Reima
 * @copyright   (c) 2015
 */
date_default_timezone_set('UTC');
$nodes = array(/* [id,parent,type,name */
    array(0, -1, 0, 'Root1'),
    array(1, 0, 2, 'Knot1'),
    array(2, 0, 2, 'Knot2'),
    array(3, 1, 3, 'Leaf1'),
    array(4, 2, 3, 'Leaf2'),
    array(5, 0, 2, 'Knot3'),
    array(6, 5, 3, 'Leaf2'),
    array(7, -1, 0, 'Root2'),
    array(8, 7, 2, 'Knot4')
);
$rq = (object) $_REQUEST;
if (!isset($rq->ver)) {
  $rq->ver = 1;
}
$rq->pfx = 'filer_0_';
$rq->fid = str_replace($rq->pfx, '', $rq->id);
$rsp = array('status' => true, 'prompt' => '');
if ($rq->cmd == 'opn') {
  $rsp['factor'] = Children($nodes, $rq);
} else if ($rq->cmd == 'sch') {
  $rsp['factor'] = Search($nodes, $rq);
} else if ($rq->cmd == 'new' || $rq->cmd == 'add') {
  $rsp['factor'] = ['id' => $rq->pfx . time()];
} else if ($rq->cmd == 'cpy' || $rq->cmd == 'mve') {
  $rsp['factor'] = [];  /* return old_id => new_id */
  foreach ($rq->id as $id => $ids) {
    if ($rq->cmd == 'cpy') {
      $rsp['factor'][$id] = $rq->pfx . time();
    } else {
      $rsp['factor'][$id] = $ids[0];
    }
  }
} else {
  /* dummy response */
}
header('Content-type: application/json');
echo json_encode($rsp);

/**
 * 
 * @param array $nodes
 * @param object $rq
 * @return array
 */
function Children($nodes, $rq) {
  $rlt = array();
  for ($i = 0; $i < count($nodes); $i++) {
    if ($nodes[$i][1] == $rq->fid) {
      $state = '';
      foreach ($nodes as $node) {
        if ($node[1] == $nodes[$i][0]) {
          if ($nodes[$i][2] != 0) {
            $nodes[$i][2] = 1;
          }
          $state = 'closed';
        }
      }
      if ($rq->ver == 3) {
        $state = array('opened' => false);
        $chd = $nodes[$i][2] < 2;
        $r = array('id' => $rq->pfx . $nodes[$i][0], 'text' => $nodes[$i][3], 'state' => $state, 'children' => $chd, 'type' => $nodes[$i][2]);
//        $r = array('id' => $rq->pfx . $nodes[$i][0], 'text' => $nodes[$i][3], 'state' => $state, 'children' => $chd, 'li_attr' => array('rel' => $nodes[$i][2]));
        /*        if ($nodes[$i][2] == 'root'){
          $opn = true;
          $pnt = '#';
          }else{
          $opn = false;
          $pnt = $rq->id;
          }
          $r = array('id' => $rq->pfx . $nodes[$i][0], 'text' => $nodes[$i][3], 'state' => array('opened' => $opn), 'parent' => $pnt, 'li_attr' => array('rel' => $nodes[$i][2])); */
      } else {
        $attr = array('id' => $rq->pfx . $nodes[$i][0], 'rel' => $nodes[$i][2]);  /* root node */
        $r = array('attr' => $attr, 'data' => $nodes[$i][3], 'state' => $state);
      }
      array_push($rlt, $r);
    }
  }
  return $rlt;
}

/**
 * get found subnode id's of the node
 * @param array $nodes
 * @param object $rq
 * @return array
 */
function Search($nodes, $rq) {
  $nds = array();
  Find($nodes, $nds, $rq->fid, -1, $rq->fnd);
  $rlt = array();
  $a = array_keys($nds);
  foreach ($nds as $id => $nde) {
    if (!$nde[0]) {
      for ($i = 0; $i < count($a); $i++) {
        if ($nds[$a[$i]][1] == $id && $nds[$a[$i]][0]) {
          $nde[0] = true;
        }
      }
    }
    if ($nde[0]) {
      $rlt[] = $rq->pfx . $id;
    }
  }
  return $rlt;
}

/**
 * find subnode id's of the node
 * @param array $nodes
 * @param array $rlt
 * @param int $id - knot
 * @param int $pnt - parent
 * @param array $cnd -- str - search text, csi - case-sensitive flag
 * @return void
 */
function Find($nodes, &$rlt, $id, $pnt, $cnd) {
  foreach ($nodes as $node) {
    if ($node[1] == $id && empty($rlt[$id][0])) {
      $fnd = $cnd['csi'] ? stripos($node[3], $cnd['str']) : strpos($node[3], $cnd['str']);
      $rlt[$id] = array($fnd !== false, $pnt);
      Find($nodes, $rlt, $node[0], $id, $cnd);
    }
  }
}
