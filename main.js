// XD拡張APIのクラスをインポート
const { Artboard, Color, Rectangle } = require('scenegraph')
const application = require('application')
const fs = require('uxp').storage.localFileSystem

// 全体にかけるスケール
let scale = 1.0

// レスポンシブパラメータを保存する
/**
 * @type {ResponsiveParameter[]}
 */
let responsiveBounds = null

// 出力するフォルダ
let outputFolder = null

// エキスポートフラグを見るかどうか
let optionCheckMarkedForExport = true

// 画像を出力するかどうか
let optionImageNoExport = false

const STR_CONTENT = 'content'
const STR_VERTICAL = 'vertical'
const STR_HORIZONTAL = 'horizontal'
const STR_PREFERRED = 'preferred'

// オプション文字列　全て小文字 数字を含まない
// OPTION名に H V　X Yといった、高さ方向をしめすものはできるだけ出さないようにする
const STYLE_ALIGN = 'align' // テキストの縦横のアライメントの設定が可能　XDの設定に上書き
const STYLE_BLANK = 'blank'
const STYLE_CANVAS_GROUP = 'canvas-group' // 削除予定
const STYLE_COMMENT_OUT = 'comment-out'
const STYLE_COMPONENT = 'component'
const STYLE_CONTENT_SIZE_FITTER = 'content-size-fitter' //自身のSizeFitterオプション
const STYLE_CONTENT_SIZE_FITTER_HORIZONTAL_FIT =
  'content-size-fitter-horizontal-fit'
const STYLE_CONTENT_SIZE_FITTER_VERTICAL_FIT =
  'content-size-fitter-vertical-fit'
const STYLE_DIRECTION = 'direction'
const STYLE_FIX = 'fix'
const STYLE_IMAGE = 'image'
const STYLE_IMAGE_NO_SLICE = 'image-no-slice' // 9スライスしない (アトラスを作成すると現在Unity側でうまく動作せず)
const STYLE_IMAGE_SCALE = 'image-scale'
const STYLE_IMAGE_SLICE = 'image-slice' // 9スライス ドット数を指定する
const STYLE_IMAGE_TYPE = 'image-type' // sliced tiled simple filled
const STYLE_LAYER = 'layer'
const STYLE_LAYOUT_ELEMENT = 'layout-element'
const STYLE_LAYOUT_GROUP = 'layout-group' //子供を自動的にどうならべるかのオプション
const STYLE_LAYOUT_GROUP_CHILD_ALIGNMENT = 'layout-group-child-alignment'
const STYLE_LAYOUT_GROUP_CHILD_FORCE_EXPAND = 'layout-group-child-force-expand'
const STYLE_LAYOUT_GROUP_CONTROL_CHILD_SIZE = 'layout-group-control-child-size'
const STYLE_LAYOUT_GROUP_SPACING_X = 'layout-spacing-x'
const STYLE_LAYOUT_GROUP_START_AXIS = 'layout-group-start-axis'
const STYLE_LAYOUT_GROUP_USE_CHILD_SCALE = 'layout-group-use-child-scale'
const STYLE_PRESERVE_ASPECT = 'preserve-aspect'
const STYLE_RAYCAST_TARGET = 'raycast-target' // 削除予定
const STYLE_RECT_TRANSFORM_ANCHOR_OFFSET_X = 'rect-transform-anchor-offset-x'
const STYLE_RECT_TRANSFORM_ANCHOR_OFFSET_Y = 'rect-transform-anchor-offset-x'
const STYLE_RECT_MASK_2D = 'rect-mask-two-d'
const STYLE_SCROLL_RECT = 'scroll-rect'
const STYLE_TOGGLE_GROUP = 'toggle-group'
const STYLE_TYPE_BUTTON = 'button'
const STYLE_TYPE_IMAGE = 'image'
const STYLE_TYPE_INPUT = 'input'
const STYLE_TYPE_SCROLLBAR = 'scrollbar'
const STYLE_TYPE_SLIDER = 'slider'
const STYLE_TYPE_TEXT = 'text'
const STYLE_TYPE_TEXTMP = 'textmp' // textmeshpro
const STYLE_TYPE_TOGGLE = 'toggle'
const STYLE_TYPE_VIEWPORT = 'viewport'
const STYLE_V_ALIGN = 'v-align' //テキストの縦方向のアライメント XDの設定に追記される

/**
 * @type {[{selector_ops:[{name:string,op:string}], style:{}}]}
 */
let cssRules = null

/**
 * @returns {Promise<void>}
 */
async function loadCssRules() {
  if (cssRules != null) return
  cssRules = []
  const folder = await fs.getPluginFolder()
  const file = await folder.getEntry('xd-unity.css')
  const contents = await file.read()
  const rules = parseCss(contents)
  for (const rule of rules) {
    let nameOps = parseCssSelector(rule.selector)
    if (!nameOps) {
      throw 'failed to parse CSS:"' + rule + '"'
    }
    cssRules.push({ selector_ops: nameOps, style: rule.style })
  }
}

/**
 * CSS Parser
 * @author Jason Miller https://jsfiddle.net/user/developit/fiddles/ https://jsfiddle.net/developit/vzkckrw4/
 * @param {string} text
 * @return {[{selector:string, style:{}}]}
 */
function parseCss(text) {
  let tokenizer = /([\s\S]+?)\{([\s\S]*?)\}/gi,
    rules = [],
    token
  text = text.replace(/\/\*[\s\S]*?\*\//g, '')
  while ((token = tokenizer.exec(text))) {
    let style = parseCssRule(token[2].trim())
    const selector = token[1].trim().replace(/\s*\,\s*/, ', ')
    rules.push({ selector, style })
  }
  return rules
}

/**
 * @param css
 * @return {{}}
 */
function parseCssRule(css) {
  let tokenizer = /\s*([a-z\-]+)\s*:\s*((?:[^;]*url\(.*?\)[^;]*|[^;]*)*)\s*(?:;|$)/gi,
    obj = {},
    token
  while ((token = tokenizer.exec(css))) {
    obj[token[1].toLowerCase()] = token[2]
  }
  return obj
}

/**
 * NodeNameを分解
 * 現在、スペース有りも無しも区別していない
 * .a.b .c  -> [".a",".b",".c"]
 * .a.b.c  -> [".a",".b",".c"]
 * @param {string} nodeName
 * @param nodeName
 * @return {string[]}
 */
function parseNodeName(nodeName) {
  // nodeNameもCSS selectorフォーマットのため
  const args = parseCssSelector(nodeName)
  if (args) {
    const names = []
    for (let arg of args) {
      names.push(arg.name)
    }
    return names
  }
  // parseできなかった場合はそのまま帰す
  return [nodeName]
}

class MinMaxSize {
  constructor() {
    this.minWidth = null
    this.minHeight = null
    this.maxWidth = null
    this.maxHeight = null
  }

  addSize(w, h) {
    if (this.minWidth == null || this.minWidth > w) {
      this.minWidth = w
    }
    if (this.maxWidth == null || this.maxWidth < w) {
      this.maxWidth = w
    }
    if (this.minHeight == null || this.minHeight > h) {
      this.minHeight = h
    }
    if (this.maxHeight == null || this.maxHeight < h) {
      this.maxHeight = h
    }
  }
}

class CalcBounds {
  constructor() {
    this.sx = null
    this.sy = null
    this.ex = null
    this.ey = null
  }

  addBoundsParam(x, y, w, h) {
    if (this.sx == null || this.sx > x) {
      this.sx = x
    }
    if (this.sy == null || this.sy > y) {
      this.sy = y
    }
    const ex = x + w
    const ey = y + h
    if (this.ex == null || this.ex < ex) {
      this.ex = ex
    }
    if (this.ey == null || this.ey < ey) {
      this.ey = ey
    }
  }

  /**
   * @param {Bounds} bounds
   */
  addBounds(bounds) {
    this.addBoundsParam(bounds.x, bounds.y, bounds.width, bounds.height)
  }

  /**
   * @returns {Bounds}
   */
  get bounds() {
    return {
      x: this.sx,
      y: this.sy,
      width: this.ex - this.sx,
      height: this.ey - this.sy,
    }
  }
}

class GlobalBounds {
  constructor(node) {
    this.visible = node.visible
    this.bounds = getGlobalDrawBounds(node)
    this.global_bounds = getGlobalDrawBounds(node)
  }
}

class ResponsiveParameter {
  constructor(node) {
    this.node = node
  }
  updateBefore() {
    this.before = new GlobalBounds(this.node)
  }
  updateAfter() {
    this.after = new GlobalBounds(this.node)
  }
  updateRestore() {
    this.restore = new GlobalBounds(this.node)
  }
  update() {
    // DrawBoundsでのレスポンシブパラメータ(場合によっては不正確)
    this.responsiveParameter = calcRectTransform(this.node, null)
    // GlobalBoundsでのレスポンシブパラメータ(場合によっては不正確)
    this.responsiveParameterGlobal = calcRectTransform(this.node, null, false)
  }
}

class SelectorArg {
  constructor(parsedTokenGroups) {
    /*
    pseudo_name 例: :not
    pseudo_open
    name　例: #aaa .bbb ccc
    attr
    attr_name 例:
      attr_op 例: *= ^= $=
      attr_val 例: dddd
    bracket_close
     */
    this.name = parsedTokenGroups.name

    let op = parsedTokenGroups.op
    if (!op) {
      // opがNull・Undefinedで会った場合 ''に置き換える
      op = ''
    } else {
      op = op.trim()
      if (op === '') op = '%20' // 空白が全部きえてしまった場合　→ '%20'(スペース)
    }
    this.op = op
  }

  /**
   * セレクターのArgとマッチするかの判定
   * 戻り値next_parentに先登った親がはいる　これにより連続して判定することができる
   * namesが文字列なのは、content等のSceneNodeを持たないもの用
   * @param {string[]} names
   * @param {SceneNodeClass} parent
   * @returns {null|{next_parent: SceneNodeClass}}
   */
  match(names, parent) {
    //console.log('---------check----------')
    //console.log(this, names)
    switch (this.op) {
      case '':
        break
      case '>':
        if (parent == null) {
          // 親の名前でチェックしなければならないが、親がなかった
          return null
        }
        const parentNodeName = getNodeName(parent)
        names = parseNodeName(parentNodeName)
        names.push(getElementName(parent))
        parent = parent.parent
        break
      default:
      case '%20':
        throw 'CSS error'
    }
    if (this.name !== '*') {
      if (!names.find(name => name === this.name)) return null
    }
    return {
      next_parent: parent,
    }
  }
}

/**
 * TODO:この関数にキャッシュを導入すると良いのでは
 * @param {string} selectorString
 * @return {[SelectorArg]}
 */
function parseCssSelector(selectorString) {
  if (!selectorString) {
    return null
  }
  selectorString = selectorString.trim()
  // 正規表現テスト https://re\s*([a-z\-]+)\s*:\s*((?:[^;]*url\(.*?\)[^;]*|[^;]*)*)\s*(?:;|$)gex101.com/
  // 表現一覧 https://jsoup.org/apidocs/index.html?org/jsoup/select/Selector.html
  // const regexSelector = /(?<name>[.#]?[a-zA-Z0-9_\-*]+)?(?<attr>\[(?<attr_name>[a-z]+)(?<attr_op>[$=]+)"?(?<attr_val>[a-zA-Z0-9_\-]*)"?])?(?<op>[ >]+)?/g
  /*
  pseudo_name 例: :not
  pseudo_open
  name　例: #aaa .bbb ccc
  attr
  attr_name 例:
  attr_op 例: *= ^= $=
  attr_val 例: dddd
  bracket_close
   */
  const regexSelector = /((?<pseudo_name>:[a-zA-Z0-9_\-]+)(?<pseudo_open>\()?\s*)?(?<name>[.#]?[a-zA-Z0-9_\-*]+)?(?<attr>\[\s*(?<attr_name>[a-z]+)(\s*(?<attr_op>[$=]+)\s*)"?(?<attr_val>[a-zA-Z0-9_\-]*)"?\s*])?(\s*(?<bracket_close>\)))?(?<op>[ >]+)?/gi
  //const regexSelector = /(?<name>[\.#]?[a-zA-Z0-9_\-]+)(?<op>[ >]+)?/gi
  // セレクターを分解
  let nameOps = []
  while (true) {
    let token = regexSelector.exec(selectorString)
    if (!token || !token[0]) {
      // マッチした文字列が空なら終了
      break
    }
    /**
     * opの種類は　'', '%20'(スペース), '>'
     * .a.b -> selector_ops:[ {name:".a","op":""}, {name:".b","op":""} ]
     * .a > .b -> selector_ops:[ {name:".a","op":">"}, {name:".b","op":""} ]
     */
    nameOps.push(new SelectorArg(token.groups))
  }
  // Validation
  // 最後の要素のopは'' であるべき
  // valueのなかに{}の文字がはいっているとエラーになる確率が高い
  if (nameOps.length === 0) {
    return null
  }
  return nameOps
}

function checkStyleButton(style) {
  return checkBoolean(style[STYLE_TYPE_BUTTON])
}

function checkStyleCommentOut(style) {
  return checkBoolean(style[STYLE_COMMENT_OUT])
}

function checkStyleImage(style) {
  if (checkBoolean(style[STYLE_IMAGE_SLICE])) {
    return true
  }
  return checkBoolean(style[STYLE_TYPE_IMAGE])
}

function checkStyleInput(style) {
  return checkBoolean(style[STYLE_TYPE_INPUT])
}

function checkStyleScrollbar(style) {
  return checkBoolean(style[STYLE_TYPE_SCROLLBAR])
}

function checkStyleSlider(style) {
  return checkBoolean(style[STYLE_TYPE_SLIDER])
}

function checkStyleText(style) {
  return checkBoolean(style[STYLE_TYPE_TEXT])
}

function checkStyleTextMeshPro(style) {
  return checkBoolean(style[STYLE_TYPE_TEXTMP])
}

function checkStyleToggle(style) {
  return checkBoolean(style[STYLE_TYPE_TOGGLE])
}

function checkStyleViewport(style) {
  return checkBoolean(style[STYLE_TYPE_VIEWPORT])
}

/**
 * ファイル名につかえる文字列に変換する
 * @param {string} name
 * @param {boolean} includeDot ドットも変換対象にするか
 * @return {string}
 */
function convertToFileName(name, includeDot) {
  if (includeDot) {
    return name.replace(/[\\/:*?"<>|#\x00-\x1F\x7F\.]/g, '_')
  }
  return name.replace(/[\\/:*?"<>|#\x00-\x1F\x7F]/g, '_')
}

/**
 * 誤差範囲での差があるか
 * @param {number} a
 * @param {number} b
 * @param {number=} eps
 */
function approxEqual(a, b, eps) {
  if (eps == null) {
    eps = 0.00001 // リサイズして元にもどしたとき､これぐらいの誤差がでる
  }
  return Math.abs(a - b) < eps
}

/**
 * ラベル名につかえる文字列に変換する
 * @param {string} name
 * @return {string}
 */
function convertToLabel(name) {
  return name.replace(/[\\/:*?"<>|# \x00-\x1F\x7F]/g, '_')
}

/**
 * オブジェクトのもつ全てのプロパティを表示する
 * レスポンシブデザイン用プロパティが無いか調べるときに使用
 * @param {*} obj
 */
function printAllProperties(obj) {
  let propNames = []
  let o = obj
  while (o) {
    propNames = propNames.concat(Object.getOwnPropertyNames(o))
    o = Object.getPrototypeOf(o)
  }
  console.log(propNames)
}

/**
 * Alphaを除きRGBで6桁16進の色の値を取得する
 * @param {number} color
 */
function getRGB(color) {
  return ('000000' + color.toString(16)).substr(-6)
}

/**
 * 親をさかのぼり､Artboardを探し出す
 * @param {SceneNode} node
 * @returns {Artboard|null}
 */
function getArtboard(node) {
  let parent = node
  while (parent != null) {
    if (parent.constructor.name === 'Artboard') {
      return parent
    }
    parent = parent.parent
  }
  return null
}

/**
 * グローバル座標とサイズを取得する
 * responsiveBoundsの中の値は壊れないようにする
 * @param {SceneNodeClass} node
 * @return {null|Bounds}
 */
function getGlobalDrawBounds(node) {
  // レスポンシブパラメータ作成用で､すでに取得した変形してしまう前のパラメータがあった場合
  // それを利用するようにする
  const hashBounds = responsiveBounds
  let bounds = null
  if (hashBounds) {
    const hBounds = hashBounds[node.guid]
    if (hBounds && hBounds.before) {
      bounds = Object.assign({}, hBounds.before.bounds)
    }
  }
  if (bounds) return bounds

  bounds = node.globalDrawBounds
  const viewPortHeight = node.viewportHeight
  if (viewPortHeight != null) bounds.height = viewPortHeight
  return {
    x: bounds.x * scale,
    y: bounds.y * scale,
    width: bounds.width * scale,
    height: bounds.height * scale,
    ex: (bounds.x + bounds.width) * scale,
    ey: (bounds.y + bounds.height) * scale,
  }
}

/**
 * グローバル座標とサイズを取得する
 * @param {SceneNodeClass} node
 * @return {null|Bounds}
 */
function getGlobalBounds(node) {
  const hashBounds = responsiveBounds
  let bounds = null
  if (hashBounds != null) {
    const hBounds = hashBounds[node.guid]
    if (hBounds && hBounds.before) {
      bounds = Object.assign({}, hBounds.before.global_bounds)
    }
  }
  if (bounds) return bounds

  bounds = node.globalBounds
  // Artboardにあるスクロール領域のボーダー
  const viewPortHeight = node.viewportHeight
  if (viewPortHeight != null) bounds.height = viewPortHeight
  return {
    x: bounds.x * scale,
    y: bounds.y * scale,
    width: bounds.width * scale,
    height: bounds.height * scale,
    ex: (bounds.x + bounds.width) * scale,
    ey: (bounds.y + bounds.height) * scale,
  }
}

/**
 * Baum2用Boundsパラメータの取得
 * Artboard内でのDrawBoundsを取得する
 * x､yはCenterMiddleでの座標になる
 * @param {SceneNodeClass} node
 * @param {SceneNodeClass} base
 * @return {{cx: number, cy: number, width: number, height: number}}
 */
function getDrawBoundsCMInBase(node, base) {
  const nodeDrawBounds = getGlobalDrawBounds(node)
  const baseBounds = getGlobalDrawBounds(base)
  return {
    cx: nodeDrawBounds.x - baseBounds.x + nodeDrawBounds.width / 2,
    cy: nodeDrawBounds.y - baseBounds.y + nodeDrawBounds.height / 2,
    width: nodeDrawBounds.width,
    height: nodeDrawBounds.height,
  }
}

/**
 * 相対座標のBoundsを返す
 * @param {Bounds} bounds
 * @param {Bounds} baseBounds
 * @returns {Bounds}
 */
function getBoundsInBase(bounds, baseBounds) {
  return {
    x: bounds.x - baseBounds.x,
    y: bounds.y - baseBounds.y,
    width: bounds.width,
    height: bounds.height,
  }
}

/**
 * @param {SceneNodeClass} node
 * @param {SceneNodeClass} base
 * @return {{cx: number, cy: number, width: number, height: number}}
 */
function getBoundsCMInBase(node, base) {
  const nodeBounds = getGlobalBounds(node)
  const baseBounds = getGlobalBounds(base)
  return {
    cx: nodeBounds.x - baseBounds.x + nodeBounds.width / 2,
    cy: nodeBounds.y - baseBounds.y + nodeBounds.height / 2,
    width: nodeBounds.width,
    height: nodeBounds.height,
  }
}

/**
 * @param renditions
 * @param fileName
 * @return {*|number|bigint}
 */
function searchFileName(renditions, fileName) {
  return renditions.find(entry => {
    return entry.fileName === fileName
  })
}

/**
 * @param r
 * @returns {boolean}
 */
function checkBoolean(r) {
  if (typeof r == 'string') {
    const val = r.toLowerCase()
    if (val === 'false' || val === '0' || val === 'null') return false
  }
  return !!r
}

/**
 * 線分の衝突
 * @param {number} as
 * @param {number} ae
 * @param {number} bs
 * @param {number} be
 */
function testLine(as, ae, bs, be) {
  if (as >= bs) {
    return as < be
  }
  return ae > bs
}

/**
 * バウンディングボックスの衝突検知
 * @param {Bounds} a
 * @param {Bounds} b
 */
function testBounds(a, b) {
  return (
    testLine(a.x, a.x + a.width, b.x, b.x + b.width) &&
    testLine(a.y, a.y + a.height, b.y, b.y + b.height)
  )
}

/**
 * @param style
 * @return {{}|null}
 */
function getContentSizeFitterParam(style) {
  if (style == null) return null
  /*
  const styleContentSizeFitter = style[STYLE_CONTENT_SIZE_FITTER]
  if (styleContentSizeFitter == null) return null
  */

  let param = {}
  const styleHorizontalFit = style[STYLE_CONTENT_SIZE_FITTER_HORIZONTAL_FIT]
  if (styleHorizontalFit) {
    Object.assign(param, {
      horizontal_fit: styleHorizontalFit.trim(),
    })
  }
  const styleVerticalFit = style[STYLE_CONTENT_SIZE_FITTER_VERTICAL_FIT]
  if (styleVerticalFit) {
    Object.assign(param, {
      vertical_fit: styleVerticalFit.trim(),
    })
  }

  if (Object.keys(param).length === 0) {
    return null
  }

  return param
}

/**
 * @param styleScrollRect
 * @returns {{horizontal: boolean, vertical: boolean}}
 */
function getScrollRectStyle(styleScrollRect) {
  const horizontal = hasAnyParamInStr(styleScrollRect, 'x', STR_HORIZONTAL)
  const vertical = hasAnyParamInStr(styleScrollRect, 'y', STR_VERTICAL)
  return { horizontal, vertical }
}

/**
 * Viewportの子供の整理をする
 * ･Y順に並べる
 * @param jsonElements
 */
function sortElementsByPositionAsc(jsonElements) {
  // 子供のリスト用ソート 上から順に並ぶように　(コンポーネント化するものをは一番下 例:Image Component)
  if (jsonElements == null) return
  jsonElements.sort((elemA, elemB) => {
    const a_y = elemA['component'] ? Number.MAX_VALUE : elemA['y']
    const b_y = elemB['component'] ? Number.MAX_VALUE : elemB['y']
    if (a_y === b_y) {
      const a_x = elemA['component'] ? Number.MAX_VALUE : elemA['x']
      const b_x = elemB['component'] ? Number.MAX_VALUE : elemB['x']
      return b_x - a_x
    }
    return b_y - a_y
  })
}

function sortElementsByPositionDesc(jsonElements) {
  // 子供のリスト用ソート 上から順に並ぶように　(コンポーネント化するものをは一番下 例:Image Component)
  jsonElements.sort((elemA, elemB) => {
    const a_y = elemA['component'] ? Number.MAX_VALUE : elemA['y']
    const b_y = elemB['component'] ? Number.MAX_VALUE : elemB['y']
    if (b_y === a_y) {
      const a_x = elemA['component'] ? Number.MAX_VALUE : elemA['x']
      const b_x = elemB['component'] ? Number.MAX_VALUE : elemB['x']
      return a_x - b_x
    }
    return a_y - b_y
  })
}

/**
 * リピートグリッドから、GridLayoutGroup用パラメータを取得する
 * @param {RepeatGrid} repeatGrid
 * @param style
 * @return {{}}
 */
function getLayoutFromRepeatGrid(repeatGrid, style) {
  let layoutJson = {}
  const repeatGridBounds = getGlobalBounds(repeatGrid)
  const nodesBounds = getNodeListBounds(repeatGrid.children, null)
  Object.assign(layoutJson, {
    method: 'grid',
    padding: {
      left: nodesBounds.bounds.x - repeatGridBounds.x,
      right: 0,
      top: nodesBounds.bounds.y - repeatGridBounds.y,
      bottom: 0,
    },
    spacing_x: repeatGrid.paddingX * scale, // 横の隙間
    spacing_y: repeatGrid.paddingY * scale, // 縦の隙間
    cell_max_width: repeatGrid.cellSize.width * scale,
    cell_max_height: repeatGrid.cellSize.height * scale,
  })
  assignLayoutParam(layoutJson, style)

  if (style != null) {
    const contentStyleLayout = style[STYLE_LAYOUT_GROUP]
    if (hasAnyParamInStr(contentStyleLayout, 'x', STR_HORIZONTAL)) {
      // gridLayoutJson を Horizontalに変える
      layoutJson['method'] = STR_HORIZONTAL
    } else if (hasAnyParamInStr(contentStyleLayout, 'y', STR_VERTICAL)) {
      // gridLayoutJson を Verticalに変える
      layoutJson['method'] = STR_VERTICAL
    }
  }

  return layoutJson
}

/**
 * 子供(コンポーネント化するもの･withoutNodeを除く)の全体サイズと
 * 子供の中での最大Width、Heightを取得する
 * @param {SceneNodeList} nodeList
 * @param {SceneNodeClass} withoutNode
 * @returns {{node_max_height: number, node_max_width: number, bounds: Bounds}}
 */
function getNodeListBounds(nodeList, withoutNode) {
  // ToDo: jsonの子供情報Elementsも､node.childrenも両方つかっているが現状しかたなし
  let childrenCalcBounds = new CalcBounds()
  // セルサイズを決めるため最大サイズを取得する
  let childrenMinMaxSize = new MinMaxSize()
  nodeList.forEach(node => {
    const { style } = getNodeNameAndStyle(node)
    // コンポーネントにする場合は除く
    if (style[STYLE_COMPONENT]) return
    // Mask Viewportグループのように､子供のなかに描画エリア指定されているものがある場合も除く
    if (node === withoutNode) return
    const childBounds = getGlobalBounds(node)
    childrenCalcBounds.addBounds(childBounds)
    childrenMinMaxSize.addSize(childBounds.width, childBounds.height)
  })
  return {
    bounds: childrenCalcBounds.bounds,
    node_max_width: childrenMinMaxSize.maxWidth * scale,
    node_max_height: childrenMinMaxSize.maxHeight * scale,
  }
}

/**
 * Viewport内の、オブジェクトリストから Paddingを計算する
 * @param {SceneNodeClass} parentNode
 * @param {SceneNodeClass} maskNode
 * @param {SceneNodeList} nodeChildren
 * @returns {{padding: {top: number, left: number, bottom: number, right: number}, cell_max_height: number, cell_max_width: number}}
 */
function getPaddingAndCellMaxSize(parentNode, maskNode, nodeChildren) {
  // Paddingを取得するため､子供(コンポーネント化するもの･maskを除く)のサイズを取得する
  // ToDo: jsonの子供情報Elementsも､node.childrenも両方つかっているが現状しかたなし
  let childrenCalcBounds = getNodeListBounds(nodeChildren, maskNode)
  //
  // Paddingの計算
  let viewportBounds = getGlobalDrawBounds(parentNode) // 描画でのサイズを取得する　影など増えた分も考慮したPaddingを取得する
  const childrenBounds = childrenCalcBounds.bounds
  let paddingLeft = childrenBounds.x - viewportBounds.x
  if (paddingLeft < 0) paddingLeft = 0
  let paddingTop = childrenBounds.y - viewportBounds.y
  if (paddingTop < 0) paddingTop = 0
  let paddingRight =
    viewportBounds.x +
    viewportBounds.width -
    (childrenBounds.x + childrenBounds.width)
  if (paddingRight < 0) paddingRight = 0
  let paddingBottom =
    viewportBounds.y +
    viewportBounds.height -
    (childrenBounds.y + childrenBounds.height)
  if (paddingBottom < 0) paddingBottom = 0
  return {
    padding: {
      left: paddingLeft,
      right: paddingRight,
      top: paddingTop,
      bottom: paddingBottom,
    },
    cell_max_width: childrenCalcBounds.node_max_width,
    cell_max_height: childrenCalcBounds.node_max_height,
  }
}

/**
 * Layoutパラメータを生成する
 * ※List､LayoutGroup､Viewport共通
 * AreaNode　と　json.elementsの子供情報から
 * Spacing､Padding､Alignment情報を生成する
 * Baum2にわたすにはmethodが必要
 * @param {*} json
 * @param {SceneNodeClass} viewportNode
 * @param {SceneNodeClass} maskNode
 * @param {SceneNodeList} nodeChildren
 */
function calcLayout(json, viewportNode, maskNode, nodeChildren) {
  let jsonLayout = getPaddingAndCellMaxSize(
    viewportNode,
    maskNode,
    nodeChildren,
  )
  // componentの無いelemリストを作成する
  let elements = []
  forEachReverseElements(json.elements, element => {
    //後ろから追加していく
    if (element && element['component'] == null) {
      elements.push(element)
    }
  })

  // spacingの計算
  // 最小の隙間をもつ elemV elemHを探す
  // TODO: elem0と一つにせず、最も左にあるもの、最も上にあるものを選出するとすると　ルールとしてわかりやすい
  const elem0 = elements[0]

  if (elem0 == null) return jsonLayout

  /** @type { {x:number, y:number, w:number, h:number}|null } */
  let elemV = null
  /** @type { {x:number, y:number, w:number, h:number}|null } */
  let elemH = null

  let spacing_x = null
  let spacing_y = null

  const elem0Top = elem0.y + elem0.h / 2
  const elem0Bottom = elem0.y - elem0.h / 2
  const elem0Left = elem0.x - elem0.w / 2
  const elem0Right = elem0.x + elem0.w / 2
  // 縦にそこそこ離れているELEMを探す
  for (let i = 1; i < elements.length; i++) {
    const elem = elements[i]
    const elemTop = elem.y + elem.h / 2
    const elemBottom = elem.y - elem.h / 2
    const elemLeft = elem.x - elem.w / 2
    const elemRight = elem.x + elem.w / 2

    // 縦ズレをさがす
    if (elem0Bottom >= elemTop) {
      let space = elem0Bottom - elemTop
      if (spacing_y == null || spacing_y > space) {
        elemV = elem
        spacing_y = space
      }
    }
    if (elem0Top <= elemBottom) {
      let space = elemBottom - elem0Top
      if (spacing_y == null || spacing_y > space) {
        elemV = elem
        spacing_y = space
      }
    }

    // 横ズレをさがす
    if (elem0Right < elemLeft) {
      let space = elemLeft - elem0Right
      if (spacing_x == null || spacing_x > space) {
        elemH = elem
        spacing_x = space
      }
    }
    if (elem0Left > elemRight) {
      let space = elem0Left - elemRight
      if (spacing_x == null || spacing_x > space) {
        elemH = elem
        spacing_x = space
      }
    }
  }

  if (spacing_x != null) {
    Object.assign(jsonLayout, {
      spacing_x: spacing_x,
    })
  }

  if (spacing_y != null) {
    Object.assign(jsonLayout, {
      spacing_y: spacing_y,
    })
  }

  let child_alignment = ''
  // 縦ズレ参考Elemと比較し、横方向child_alignmentを計算する
  if (elem0 && elemV) {
    // left揃えか
    if (approxEqual(elem0.x - elem0.w / 2, elemV.x - elemV.w / 2)) {
      child_alignment += 'left'
    } else if (approxEqual(elem0.x + elem0.w / 2, elemV.x + elemV.w / 2)) {
      child_alignment += 'right'
    } else if (approxEqual(elem0.x, elemV.x)) {
      child_alignment += 'center'
    }
  }

  // 横ズレ参考Elemと比較し、縦方向child_alignmentを計算する
  if (elem0 && elemH) {
    // left揃えか
    if (approxEqual(elem0.y - elem0.h / 2, elemH.y - elemH.h / 2)) {
      child_alignment += 'top'
    } else if (approxEqual(elem0.y + elem0.h / 2, elemH.y + elemH.h / 2)) {
      child_alignment += 'bottom'
    } else if (approxEqual(elem0.y, elemH.y)) {
      child_alignment += 'middle'
    }
  }

  if (child_alignment !== '') {
    Object.assign(jsonLayout, {
      child_alignment: child_alignment,
    })
  }

  return jsonLayout
}

/**
 * @param json
 * @param {SceneNodeClass} viewportNode
 * @param {SceneNodeClass} maskNode
 * @param {SceneNodeList} children
 * @returns {{padding: {top: number, left: number, bottom: number, right: number}, cell_max_height: number, cell_max_width: number}}
 */
function calcVLayout(json, viewportNode, maskNode, children) {
  // 子供のリスト用ソート 上から順に並ぶように　(コンポーネント化するものをは一番下 例:Image Component)
  sortElementsByPositionAsc(json.elements)
  let jsonVLayout = calcLayout(json, viewportNode, maskNode, children)
  jsonVLayout['method'] = STR_VERTICAL
  return jsonVLayout
}

/**
 * @param json
 * @param {SceneNodeClass} viewportNode
 * @param {SceneNodeClass} maskNode
 * @param {SceneNodeList} children
 * @returns {{padding: {top: number, left: number, bottom: number, right: number}, cell_max_height: number, cell_max_width: number}}
 */
function calcHLayout(json, viewportNode, maskNode, children) {
  // 子供のリスト用ソート 上から順に並ぶように　(コンポーネント化するものをは一番下 例:Image Component)
  //sortElementsByPositionAsc(json.elements)
  let jsonHLayout = calcLayout(json, viewportNode, maskNode, children)
  jsonHLayout['method'] = STR_HORIZONTAL
  return jsonHLayout
}

/**
 * @param json
 * @param {SceneNodeClass} viewportNode
 * @param {SceneNodeClass} maskNode
 * @param {SceneNodeList} children
 * @returns {{padding: {top: number, left: number, bottom: number, right: number}, cell_max_height: number, cell_max_width: number}}
 */
function calcGridLayout(json, viewportNode, maskNode, children) {
  // 子供のリスト用ソート 上から順に並ぶように　(コンポーネント化するものをは一番下 例:Image Component)
  sortElementsByPositionAsc(json.elements)
  let jsonLayout
  if (viewportNode.constructor.name === 'RepeatGrid') {
    jsonLayout = getLayoutFromRepeatGrid(viewportNode, null)
  } else {
    // RepeatGridでなければ、VLayout情報から取得する
    jsonLayout = calcLayout(json, viewportNode, maskNode, children)
    jsonLayout['method'] = 'grid'
  }
  return jsonLayout
}

/**
 * @param json
 * @param viewportNode
 * @param maskNode
 * @param children
 * @param style
 * @return {null}
 */
function getLayoutJson(json, viewportNode, maskNode, children, style) {
  if (style == null) return null
  let styleLayout = style[STYLE_LAYOUT_GROUP]
  if (styleLayout == null) return null
  let layoutJson = null
  if (hasAnyParamInStr(styleLayout, 'y', STR_VERTICAL)) {
    layoutJson = calcVLayout(json, viewportNode, maskNode, children)
  } else if (hasAnyParamInStr(styleLayout, 'x', STR_HORIZONTAL)) {
    layoutJson = calcHLayout(json, viewportNode, maskNode, children)
  } else if (hasAnyParamInStr(styleLayout, 'grid')) {
    layoutJson = calcGridLayout(json, viewportNode, maskNode, children)
  }
  if (layoutJson != null) {
    assignLayoutParam(layoutJson, style)
  }
  return layoutJson
}

/**
 * 逆順にForEach　コンポーネント化するものを省く
 * @param {*} elements
 * @param {*} func
 */
function forEachReverseElements(elements, func) {
  if (elements == null) return
  for (let i = elements.length - 1; i >= 0; i--) {
    //後ろから追加していく
    let elementJson = elements[i]
    if (elementJson && elementJson['component'] == null) {
      func(elementJson)
    }
  }
}

/**
 * @param {SceneNodeClass} node
 */
function getUnityName(node) {
  const nodeName = getNodeName(node)
  const id = getIdFromNodeName(nodeName)
  if (!id) {
    return nodeName
  }
  return id
}

/**
 * 文字列の中に所定のパラメータ文字列がるかチェックする
 * option = x
 * option = ,x,
 * option = ,x
 * @param {string} str
 * @param {string} param
 * @return {null|boolean}
 */
function hasParamInStr(str, param) {
  if (str == null || param == null) return null
  if (str === param) return true
  if (str.startsWith(`${param} `)) return true
  if (str.indexOf(` ${param} `) >= 0) return true
  return str.endsWith(` ${param}`)
}

/**
 * @param {string} str
 * @param {...string} params
 * @return {boolean}
 */
function hasAnyParamInStr(str, ...params) {
  for (let param of params) {
    if (hasParamInStr(str, param)) return true
  }
  return false
}

/**
 * @param {string} styleFix
 * @returns {null|{top: boolean, left: boolean, bottom: boolean, width: boolean, right: boolean, height: boolean}}
 */
function getStyleFix(styleFix) {
  if (styleFix == null) {
    return null
  }
  let styleFixWidth = false
  let styleFixHeight = false
  let styleFixTop = false
  let styleFixBottom = false
  let styleFixLeft = false
  let styleFixRight = false

  if (hasAnyParamInStr(styleFix, 'w', 'width', 'size')) {
    styleFixWidth = true
  }
  if (hasAnyParamInStr(styleFix, 'h', 'height', 'size')) {
    styleFixHeight = true
  }
  if (hasAnyParamInStr(styleFix, 't', 'top')) {
    styleFixTop = true
  }
  if (hasAnyParamInStr(styleFix, 'b', 'bottom')) {
    styleFixBottom = true
  }
  if (hasAnyParamInStr(styleFix, 'l', 'left')) {
    styleFixLeft = true
  }
  if (hasAnyParamInStr(styleFix, 'r', 'right')) {
    styleFixRight = true
  }
  if (hasParamInStr(styleFix, 'x')) {
    styleFixLeft = true
    styleFixRight = true
  }
  if (hasParamInStr(styleFix, 'y')) {
    styleFixTop = true
    styleFixBottom = true
  }

  return {
    left: styleFixLeft,
    right: styleFixRight,
    top: styleFixTop,
    bottom: styleFixBottom,
    width: styleFixWidth,
    height: styleFixHeight,
  }
}

/**
 * 本当に正確なレスポンシブパラメータは、シャドウなどエフェクトを考慮し、どれだけ元サイズより
 大きくなるか最終アウトプットのサイズを踏まえて計算する必要がある
 calcResonsiveParameter内で、判断する必要があると思われる
 * 自動で取得されたレスポンシブパラメータは､optionの @Pivot @StretchXで上書きされる
 fix: {
      // ロック true or ピクセル数
      left: fixOptionLeft,
      right: fixOptionRight,
      top: fixOptionTop,
      bottom: fixOptionBottom,
      width: fixOptionWidth,
      height: fixOptionHeight,
    },
 anchor_min: anchorMin,
 anchor_max: anchorMax,
 offset_min: offsetMin,
 offset_max: offsetMax,
 * @param {SceneNodeClass} node
 * @param style
 * @param calcDrawBounds
 * @return {{offset_max: {x: null, y: null}, fix: {top: (boolean|number), left: (boolean|number), bottom: (boolean|number), width: boolean, right: (boolean|number), height: boolean}, anchor_min: {x: null, y: null}, anchor_max: {x: null, y: null}, offset_min: {x: null, y: null}}|null}
 */
function calcRectTransform(node, style, calcDrawBounds = true) {
  let hashBounds = responsiveBounds
  if (!node || !node.parent) return null
  if (!style) {
    // fix を取得するため
    // TODO: anchor スタイルのパラメータはとるべきでは
    style = getNodeNameAndStyle(node).style
  }
  // console.log(`----------------------${node.name}----------------------`)
  let styleFixWidth = null
  let styleFixHeight = null
  let styleFixTop = null
  let styleFixBottom = null
  let styleFixLeft = null
  let styleFixRight = null

  const styleFix = style[STYLE_FIX]
  if (styleFix != null) {
    // オプションが設定されたら、全ての設定が決まる(NULLではなくなる)
    const fix = getStyleFix(styleFix)
    styleFixWidth = fix.width
    styleFixHeight = fix.height
    styleFixTop = fix.top
    styleFixBottom = fix.bottom
    styleFixLeft = fix.left
    styleFixRight = fix.right
  }

  const boundsParameterName = calcDrawBounds ? 'bounds' : 'global_bounds'

  const bounds = hashBounds[node.guid]
  if (!bounds || !bounds.before || !bounds.after) return null
  const beforeBounds = bounds.before[boundsParameterName]
  const afterBounds = bounds.after[boundsParameterName]
  const parentBounds = hashBounds[node.parent.guid]
  if (!parentBounds || !parentBounds.before || !parentBounds.after) return null

  const parentBeforeBounds = parentBounds.before[boundsParameterName]
  const parentAfterBounds = parentBounds.after[boundsParameterName]

  // X座標
  // console.log(node.name + '-------------------')
  // console.log(beforeBounds.width, afterBounds.width)
  if (styleFixWidth == null) {
    styleFixWidth = approxEqual(beforeBounds.width, afterBounds.width, 0.0005)
  }

  if (styleFixLeft == null) {
    if (
      approxEqual(
        beforeBounds.x - parentBeforeBounds.x,
        afterBounds.x - parentAfterBounds.x,
      )
    ) {
      // ロックされている
      styleFixLeft = true
    } else {
      // 親のX座標･Widthをもとに､Left座標がきまる
      styleFixLeft =
        (beforeBounds.x - parentBeforeBounds.x) / parentBeforeBounds.width
    }
  }

  const beforeRight =
    parentBeforeBounds.x +
    parentBeforeBounds.width -
    (beforeBounds.x + beforeBounds.width)
  const afterRight =
    parentAfterBounds.x +
    parentAfterBounds.width -
    (afterBounds.x + afterBounds.width)

  if (styleFixRight == null) {
    if (styleFixRight == null && approxEqual(beforeRight, afterRight, 0.001)) {
      // ロックされている 0.001以下の誤差が起きることを確認した
      styleFixRight = true
    } else {
      // 親のX座標･Widthをもとに､割合でRight座標がきまる
      styleFixRight =
        (parentBeforeBounds.ex - beforeBounds.ex) / parentBeforeBounds.width
    }
  }

  // Y座標
  if (styleFixHeight == null) {
    styleFixHeight = approxEqual(
      beforeBounds.height,
      afterBounds.height,
      0.0005,
    )
  }

  if (styleFixTop == null) {
    if (
      approxEqual(
        beforeBounds.y - parentBeforeBounds.y,
        afterBounds.y - parentAfterBounds.y,
      )
    ) {
      styleFixTop = true
    } else {
      // 親のY座標･heightをもとに､Top座標がきまる
      styleFixTop =
        (beforeBounds.y - parentBeforeBounds.y) / parentBeforeBounds.height
    }
  }

  const beforeBottom = parentBeforeBounds.ey - beforeBounds.ey
  const afterBottom = parentAfterBounds.ey - afterBounds.ey
  if (styleFixBottom == null) {
    if (
      styleFixBottom == null &&
      approxEqual(beforeBottom, afterBottom, 0.0005)
    ) {
      styleFixBottom = true
    } else {
      // 親のY座標･Heightをもとに､Bottom座標がきまる
      styleFixBottom =
        (parentBeforeBounds.ey - beforeBounds.ey) / parentBeforeBounds.height
    }
  }

  // anchorの値を決める
  // ここまでに
  // fixOptionWidth,fixOptionHeight : true || false
  // fixOptionTop,fixOptionBottom : true || number
  // fixOptionLeft,fixOptionRight : true || number
  // になっていないといけない
  // console.log("left:" + fixOptionLeft, "right:" + fixOptionRight)
  // console.log("top:" + fixOptionTop, "bottom:" + fixOptionBottom)
  // console.log("width:" + fixOptionWidth, "height:" + fixOptionHeight)

  let offsetMin = {
    x: null,
    y: null,
  } // left(x), bottom(h)
  let offsetMax = {
    x: null,
    y: null,
  } // right(w), top(y)
  let anchorMin = { x: null, y: null } // left, bottom
  let anchorMax = { x: null, y: null } // right, top

  // fixOptionXXX
  // null 定義されていない widthかheightが固定されている
  // number 親に対しての割合 anchorに割合をいれ､offsetを0
  // true 固定されている anchorを0か1にし､offsetをピクセルで指定

  if (styleFixLeft === true) {
    // 親のX座標から､X座標が固定値できまる
    anchorMin.x = 0
    offsetMin.x = beforeBounds.x - parentBeforeBounds.x
  } else {
    anchorMin.x = styleFixLeft
    offsetMin.x = 0
  }
  if (styleFixRight === true) {
    // 親のX座標から､X座標が固定値できまる
    anchorMax.x = 1
    offsetMax.x = beforeBounds.ex - parentBeforeBounds.ex
  } else {
    anchorMax.x = 1 - styleFixRight
    offsetMax.x = 0
  }

  if (styleFixWidth) {
    if (styleFixLeft === true) {
      anchorMax.x = anchorMin.x
      offsetMax.x = offsetMin.x + beforeBounds.width
    } else if (styleFixLeft !== true && styleFixRight === true) {
      anchorMin.x = anchorMax.x
      offsetMin.x = offsetMax.x - beforeBounds.width
    }
    if (styleFixLeft !== true && styleFixRight !== true) {
      //両方共ロックされていない
      anchorMin.x = anchorMax.x = (styleFixLeft + 1 - styleFixRight) / 2
      offsetMin.x = -beforeBounds.width / 2
      offsetMax.x = beforeBounds.width / 2
    }
  }

  // AdobeXD と　Unity2D　でY軸の向きがことなるため､Top→Max　Bottom→Min
  if (styleFixTop === true) {
    // 親のY座標から､Y座標が固定値できまる
    anchorMax.y = 1
    offsetMax.y = -(beforeBounds.y - parentBeforeBounds.y)
  } else {
    anchorMax.y = 1 - styleFixTop
    offsetMax.y = 0
  }
  if (styleFixBottom === true) {
    // 親のY座標から､Y座標が固定値できまる
    anchorMin.y = 0
    offsetMin.y = -(beforeBounds.ey - parentBeforeBounds.ey)
  } else {
    anchorMin.y = styleFixBottom
    offsetMin.y = 0
  }

  if (styleFixHeight) {
    if (styleFixTop === true) {
      anchorMin.y = anchorMax.y
      offsetMin.y = offsetMax.y - beforeBounds.height
    } else if (styleFixTop !== true && styleFixBottom === true) {
      anchorMax.y = anchorMin.y
      offsetMax.y = offsetMin.y + beforeBounds.height
    } else if (styleFixTop !== true && styleFixBottom !== true) {
      //両方共ロックされていない
      anchorMin.y = anchorMax.y = 1 - (styleFixTop + 1 - styleFixBottom) / 2
      offsetMin.y = -beforeBounds.height / 2
      offsetMax.y = beforeBounds.height / 2
    }
  }

  if (styleFix != null && hasAnyParamInStr(styleFix, 'c', 'center')) {
    anchorMin.x = 0.5
    anchorMax.x = 0.5
    const center = beforeBounds.x + beforeBounds.width / 2
    const parentCenter = parentBeforeBounds.x + parentBeforeBounds.width / 2
    offsetMin.x = center - parentCenter - beforeBounds.width / 2
    offsetMax.x = center - parentCenter + beforeBounds.width / 2
  }

  if (styleFix != null && hasAnyParamInStr(styleFix, 'm', 'middle')) {
    anchorMin.y = 0.5
    anchorMax.y = 0.5
    const middle = beforeBounds.y + beforeBounds.height / 2
    const parentMiddle = parentBeforeBounds.y + parentBeforeBounds.height / 2
    offsetMin.y = -(middle - parentMiddle) - beforeBounds.height / 2
    offsetMax.y = -(middle - parentMiddle) + beforeBounds.height / 2
  }

  return {
    fix: {
      left: styleFixLeft,
      right: styleFixRight,
      top: styleFixTop,
      bottom: styleFixBottom,
      width: styleFixWidth,
      height: styleFixHeight,
    },
    anchor_min: anchorMin,
    anchor_max: anchorMax,
    offset_min: offsetMin,
    offset_max: offsetMax,
  }
}

/**
 * root以下のノードのレスポンシブパラメータ作成
 * @param {SceneNodeClass} root
 * @return {ResponsiveParameter[]}
 */
function makeResponsiveParameter(root) {
  let hashBounds = responsiveBounds
  // 現在のboundsを取得する
  nodeWalker(root, node => {
    let param = new ResponsiveParameter(node)
    param.updateBefore()
    hashBounds[node.guid] = param
  })

  const rootWidth = root.globalBounds.width
  const rootHeight = root.globalBounds.height
  const resizePlusWidth = 100
  const resizePlusHeight = 100

  // rootのリサイズ
  const viewportHeight = root.viewportHeight // viewportの高さの保存
  root.resize(rootWidth + resizePlusWidth, rootHeight + resizePlusHeight)
  if (viewportHeight) {
    // viewportの高さを高さが変わった分の変化に合わせる
    root.viewportHeight = viewportHeight + resizePlusHeight
  }

  // 変更されたboundsを取得する
  nodeWalker(root, node => {
    let bounds =
      hashBounds[node.guid] ||
      (hashBounds[node.guid] = new ResponsiveParameter(node))
    bounds.updateAfter()
  })

  // Artboardのサイズを元に戻す
  root.resize(rootWidth, rootHeight)
  if (viewportHeight) {
    root.viewportHeight = viewportHeight
  }

  // 元に戻ったときのbounds
  nodeWalker(root, node => {
    hashBounds[node.guid].updateRestore()
  })

  // レスポンシブパラメータの生成
  for (let key in hashBounds) {
    hashBounds[key].update()
  }

  return hashBounds
}

/**
 * @param beforeBounds
 * @param restoreBounds
 * @return {boolean}
 */
function checkBounds(beforeBounds, restoreBounds) {
  return (
    approxEqual(beforeBounds.x, restoreBounds.x) &&
    approxEqual(beforeBounds.y, restoreBounds.y) &&
    approxEqual(beforeBounds.width, restoreBounds.width) &&
    approxEqual(beforeBounds.height, restoreBounds.height)
  )
}

function checkBoundsVerbose(beforeBounds, restoreBounds) {
  let result = true
  if (!approxEqual(beforeBounds.x, restoreBounds.x)) {
    console.log(`X座標が変わった ${beforeBounds.x} -> ${restoreBounds.x}`)
    result = false
  }
  if (!approxEqual(beforeBounds.y, restoreBounds.y)) {
    console.log(`Y座標が変わった ${beforeBounds.y} -> ${restoreBounds.y}`)
    result = false
  }
  if (!approxEqual(beforeBounds.width, restoreBounds.width)) {
    console.log(`幅が変わった ${beforeBounds.width} -> ${restoreBounds.width}`)
    result = false
  }
  if (!approxEqual(beforeBounds.height, restoreBounds.height)) {
    console.log(
      `高さが変わった ${beforeBounds.height} -> ${restoreBounds.height}`,
    )
    result = false
  }
  return result
}

/**
 * レスポンシブパラメータを取得するため､Artboardのサイズを変更し元にもどす
 * 元通りのサイズに戻ったかどうかのチェック
 * @param {ResponsiveParameter[]} hashBounds
 * @param {boolean|null} repair
 */
function checkHashBounds(hashBounds, repair) {
  let result = true
  for (let key in hashBounds) {
    let value = hashBounds[key]
    if (value.before && value.restore) {
      let beforeBounds = value.before
      let restoreBounds = value.restore.bounds
      if (!checkBoundsVerbose(beforeBounds, restoreBounds)) {
        // 変わってしまった
        let node = value.node
        console.log('***error bounds changed:' + node.name)
        if (repair === true) {
          // 修復を試みる
          if (node.symbolId != null) {
            const dx = restoreBounds.x - beforeBounds.x
            const dy = restoreBounds.y - beforeBounds.y
            try {
              node.moveInParentCoordinates(dx, dy)
              node.resize(beforeBounds.width, beforeBounds.height)
            } catch (e) {}
            if (checkBounds(beforeBounds, getGlobalDrawBounds(node))) {
            } else {
              console.log('***修復できませんでした')
              result = false
            }
          } else {
            console.log('***Componentのため修復できませんでした')
            result = false
          }
        } else {
          result = false
        }
      }
    }
  }
  return result
}

/**
 * 描画サイズでのレスポンシブパラメータの取得
 * @param {SceneNode} node
 * @returns {*}
 */
function getDrawRectTransform(node) {
  let bounds = responsiveBounds[node.guid]
  return bounds ? bounds.responsiveParameter : null
}

/**
 * GlobalBoundsでのレスポンシブパラメータの取得
 * @param {SceneNode} node
 */
function getRectTransform(node) {
  let bounds = responsiveBounds[node.guid]
  return bounds ? bounds.responsiveParameterGlobal : null
}

/**
 * NodeNameはXDでつけられたものをTrimしただけ
 * @param {SceneNodeClass} node
 * @returns {string}
 */
function getNodeName(node) {
  return getNodeNameAndStyle(node).node_name
}

/**
 * IDを取得する #を削除する
 * @param nodeName
 * @return {string|null}
 */
function getIdFromNodeName(nodeName) {
  if (nodeName == null) {
    return null
  }
  const names = parseNodeName(nodeName)
  for (let name of names) {
    if (name.startsWith('#')) {
      return name.substring(1)
    }
  }
  return null
}

const STYLE_MATCH_LOG = 'match-log'

/**
 *
 * @param {string} nodeName
 * @param {SceneNodeClass} parent
 * @param cssRules
 * @param {string[]} addNodeNameArgs 追加するNodeNameArgs
 * @returns {*}
 */
function getStyleFromNodeName(
  nodeName,
  parent,
  cssRules,
  addNodeNameArgs = null,
) {
  const style = {}
  let nodeNameArgs = parseNodeName(nodeName)
  nodeNameArgs = nodeNameArgs.concat(addNodeNameArgs)
  for (const rule of cssRules) {
    const selectorOps = rule.selector_ops
    let selectorMatch = true
    let tmpParent = parent // セレクタチェック用のParent
    for (
      let indexSelectorOp = selectorOps.length - 1;
      indexSelectorOp >= 0 && selectorMatch; // selectorOpのトップまでいくか、このルールにマッチしなかったことが確定したら停止
      indexSelectorOp--
    ) {
      const currentSelectorOp = selectorOps[indexSelectorOp]
      const result = currentSelectorOp.match(nodeNameArgs, tmpParent)
      if (!result) {
        selectorMatch = false
        break // 次のルール
      }
      tmpParent = result.next_parent
    }
    if (selectorMatch) {
      Object.assign(style, rule.style)
    }
  }

  const localCss = parseCss(nodeName)
  if (localCss != null && localCss.length > 0) {
    // nodeNameのCSSパースに成功している -> ローカルStyleを持っている
    Object.assign(style, localCss[0].style) // 上書きする
    console.log('-----------local style------------', style)
  }

  const log = style[STYLE_MATCH_LOG]
  if (log) console.log(log)
  //console.log(nodeNameArgs)

  return style
}

function getElementName(node) {
  return node.constructor.name.toLowerCase()
}

const cacheNodeNameAndStyle = {}

const STYLE_REPEATGRID_CHILD_NAME = 'repeatgrid-child-name'

/**
 * node.nameをパースしオプションに分解する
 * この関数が基底にあり、正しくNodeName Styleが取得できるようにする
 * オプションのダイナミックな追加など､ここで処理しないと辻褄があわないケースがでてくる
 * @param {SceneNodeClass} node
 * @returns {{node_name: string, name: string, style: *}|null}
 */
function getNodeNameAndStyle(node) {
  if (node == null) {
    return null
  }

  // キャッシュ確認
  const cache = cacheNodeNameAndStyle[node.guid]
  if (cache) {
    return cache
  }

  let parentNode = node.parent
  let nodeName = node.name.trim()
  const style = getStyleFromNodeName(nodeName, parentNode, cssRules, [
    getElementName(node),
  ])

  // 名前の最初が//ならコメントNode
  if (nodeName.startsWith('//')) {
    style[STYLE_COMMENT_OUT] = true
    nodeName = nodeName.substring(2)
  }

  const value = {
    node_name: nodeName,
    name: nodeName, // 削除予定
    style,
  }
  // ここでキャッシュに書き込むことで、飛び出しループになることを防ぐ
  // 注意する箇所
  // 上： getStyleFromNodeName(nodeName, parentNode, cssRules, ...) で親への参照
  // 下： node.children.some(child => { const childStyle = getNodeNameAndStyle(child).style　で、子供への参照
  cacheNodeNameAndStyle[node.guid] = value

  if (parentNode && parentNode.constructor.name === 'RepeatGrid') {
    // 親がリピートグリッドの場合､名前が適当につけられるようです
    // Buttonといった名前やオプションが勝手につき､機能してしまうことを防ぐ
    // item_button
    // item_text
    // 2つセットをリピートグリッド化した場合､以下のような構成になる
    // リピートグリッド 1
    //   - item0
    //     - item_button
    //     - item_text
    //   - item1
    //     - item_button
    //     - item_text
    //   - item2
    //     - item_button
    //     - item_text
    // 以上のような構成になる
    nodeName = 'repeatgrid-child'
    const styleRepeatgridChildName = style[STYLE_REPEATGRID_CHILD_NAME]
    if (styleRepeatgridChildName) {
      nodeName = styleRepeatgridChildName
    }
    // 自身のChildインデックスを名前に利用する
    for (let i = 0; i < parentNode.children.length; i++) {
      if (parentNode.children.at(i) === node) {
        nodeName += '-' + i
        break
      }
    }
    value['node_name'] = nodeName
    value['name'] = nodeName

    // RepeatGridで、子供がすべてコメントアウトなら、子供を包括するグループもコメントアウトする
    style[STYLE_COMMENT_OUT] = !node.children.some(child => {
      // コメントアウトしてないものが一つでもあるか
      const childStyle = getNodeNameAndStyle(child).style
      return !childStyle[STYLE_COMMENT_OUT]
    })
  }

  return value
}

/**
 * @param root
 * @returns {{root: {name: *, type: string}, info: {canvas: {image: {w: number, h: number}, size: {w: number, h: number}, base: {w: number, x: number, h: number, y: number}}, version: string}}}
 */
function makeLayoutJson(root) {
  let rootBounds
  if (root instanceof Artboard) {
    rootBounds = getGlobalDrawBounds(root)
    rootBounds.cx = rootBounds.width / 2
    rootBounds.cy = rootBounds.height / 2
  } else {
    rootBounds = getDrawBoundsCMInBase(root, root.parent)
  }

  return {
    info: {
      version: '0.6.1',
      canvas: {
        image: {
          w: rootBounds.width,
          h: rootBounds.height,
        },
        size: {
          w: rootBounds.width,
          h: rootBounds.height,
        },
        base: {
          x: rootBounds.cx,
          y: rootBounds.cy,
          w: rootBounds.width,
          h: rootBounds.height,
        },
      },
    },
    root: {
      type: 'Root',
      name: root.name,
    },
  }
}

/**
 * CanvasGroupオプション
 * @param {*} json
 * @param {SceneNode} node
 * @param style
 */
function assignCanvasGroup(json, node, style) {
  let canvasGroup = style[STYLE_CANVAS_GROUP]
  if (canvasGroup != null) {
    Object.assign(json, {
      canvas_group: { alpha: 0 },
    })
  }
}

/**
 * オプションにpivot､stretchがあれば上書き
 * @param {*} json
 * @param {SceneNode} node
 */
function assignDrawRectTransform(json, node) {
  let param = getDrawRectTransform(node)
  if (param) {
    Object.assign(json, param)
  }
}

/**
 * 指定のAnchorパラメータを上書きする
 * anchor_min ahchor_max offset_min offset_maxがjson内に設定済みの必要がある
 * @param json
 * @param style
 */
function assignRectTransformAnchorOffsetX(json, style) {
  // 指定が会った場合、上書きする
  if (!style) return
  const anchorsX = style[STYLE_RECT_TRANSFORM_ANCHOR_OFFSET_X]
  if (anchorsX) {
    const anchorArgs = anchorsX.split(' ')
    if (anchorArgs.length >= 4) {
      json['anchor_min']['x'] = parseFloat(anchorArgs[0])
      json['anchor_max']['x'] = parseFloat(anchorArgs[1])
      json['offset_min']['x'] = parseFloat(anchorArgs[2])
      json['offset_max']['x'] = parseFloat(anchorArgs[3])
    }
  }
  const anchorsY = style[STYLE_RECT_TRANSFORM_ANCHOR_OFFSET_Y]
  if (anchorsY) {
    const anchorArgs = anchorsX.split(' ')
    if (anchorArgs.length >= 4) {
      json['anchor_min']['y'] = parseFloat(anchorArgs[0])
      json['anchor_max']['y'] = parseFloat(anchorArgs[1])
      json['offset_min']['y'] = parseFloat(anchorArgs[2])
      json['offset_max']['y'] = parseFloat(anchorArgs[3])
    }
  }
}

/**
 *
 * @param json
 * @param {SceneNode} node
 * @returns {null}
 */
function assignRectTransform(json, node) {
  let param = getRectTransform(node)
  if (param != null) {
    Object.assign(json, param)
  }
}

/**
 *
 * @param json
 * @param style
 */
function assignState(json, style) {
  /**
   * @type {string}
   */
  const styleState = style['state']
  if (!styleState) return
  const state = styleState.split(',').map(value => value.trim())
  Object.assign(json, {
    state,
  })
}

/**
 * BAUM2では使わないケースもあるが､
 * CenterMiddle座標と､サイズをアサインする
 * XY座標によるElementsソートなどに使われる
 * @param {*} json
 * @param {{cx:number, cy:number, width:number, height:number}} boundsCm
 */
function assignBoundsCM(json, boundsCm) {
  Object.assign(json, {
    x: boundsCm.cx,
    y: boundsCm.cy,
    w: boundsCm.width,
    h: boundsCm.height,
  })
}

/**
 *
 * @param json
 * @param {SceneNode} node
 * @param root
 * @param subFolder
 * @param renditions
 * @return {Promise<void>}
 */
async function assignImage(json, node, root, subFolder, renditions) {
  let { node_name, style } = getNodeNameAndStyle(node)

  // 今回出力するためのユニークな名前をつける
  const parentName = getNodeName(node.parent)

  let hashStringLength = 5
  // ファイル名が長すぎるとエラーになる可能性もある
  let fileName = convertToFileName(parentName + '-' + node_name, true)
  while (true) {
    const guidStr = '-' + node.guid.slice(0, hashStringLength)
    // すでに同じものがあるか検索
    const found = searchFileName(renditions, fileName + guidStr)
    if (!found) {
      // みつからなかった場合完了
      fileName += guidStr
      break
    }
    hashStringLength++
  }

  let fileExtension = '.png'
  if (checkBoolean(style[STYLE_IMAGE_NO_SLICE])) {
    fileExtension = '-noslice.png'
  }
  const image9Slice = style[STYLE_IMAGE_SLICE]
  if (image9Slice) {
    // RegexTest https://regex101.com/
    const pattern = /(?<t>[0-9]+)(px)?(\s+)?(?<r>[0-9]+)?(px)?(\s+)?(?<b>[0-9]+)?(px)?(\s+)?(?<l>[0-9]+)?(px)?/

    const result = image9Slice.match(pattern)
    /*
    省略については、CSSに準拠
    http://www.htmq.com/css3/border-image-slice.shtml
    上・右・下・左の端から内側へのオフセット量
    4番目の値が省略された場合には、2番目の値と同じ。
    3番目の値が省略された場合には、1番目の値と同じ。
    2番目の値が省略された場合には、1番目の値と同じ。
    */
    if (!result.groups.r) {
      result.groups.r = result.groups.t
    }
    if (!result.groups.b) {
      result.groups.b = result.groups.t
    }
    if (!result.groups.l) {
      result.groups.l = result.groups.r
    }
    if (result[1]) {
      let offset =
        parseInt(result.groups.t) * scale +
        'px,' +
        parseInt(result.groups.r) * scale +
        'px,' +
        parseInt(result.groups.b) * scale +
        'px,' +
        parseInt(result.groups.l) * scale +
        'px'
      //console.log(offset)
      fileExtension = '-9slice,' + offset + '.png'
    }
  }

  const drawBounds = getDrawBoundsCMInBase(node, root)
  Object.assign(json, {
    x: drawBounds.cx,
    y: drawBounds.cy,
    w: drawBounds.width,
    h: drawBounds.height,
    opacity: 100,
  })

  assignDrawRectTransform(json, node)

  const stylePreserveAspect = style[STYLE_PRESERVE_ASPECT]
  if (stylePreserveAspect != null) {
    Object.assign(json, {
      preserve_aspect: checkBoolean(stylePreserveAspect),
    })
  }

  const styleRayCastTarget = style[STYLE_RAYCAST_TARGET]
  if (styleRayCastTarget != null) {
    Object.assign(json, {
      raycast_target: checkBoolean(styleRayCastTarget),
    })
  }

  let localScale = 1.0
  if (style[STYLE_IMAGE_SCALE] != null) {
    const scaleImage = parseFloat(style[STYLE_IMAGE_SCALE])
    if (Number.isFinite(scaleImage)) {
      localScale = scaleImage
    }
  }

  if (!checkBoolean(style[STYLE_BLANK])) {
    Object.assign(json, {
      image: fileName,
    })
    if (!optionImageNoExport) {
      // 画像出力登録
      // この画像サイズが、0になっていた場合出力に失敗する
      // 例：レスポンシブパラメータを取得するため、リサイズする→しかし元にもどらなかった
      // 出力画像ファイル
      const file = await subFolder.createFile(fileName + fileExtension, {
        overwrite: true,
      })
      renditions.push({
        fileName: fileName,
        node: node,
        outputFile: file,
        type: application.RenditionType.PNG,
        scale: scale * localScale,
      })
    }
  }
}

/**
 *
 * @param json
 * @param {{}} style
 */
function assignContentSizeFitter(json, style) {
  const contentSizeFitterJson = getContentSizeFitterParam(style)
  if (contentSizeFitterJson != null) {
    Object.assign(json, {
      content_size_fitter: contentSizeFitterJson,
    })
  }
}

/**
 * @param json
 * @param style
 */
function assignScrollRect(json, style) {
  const styleScrollRect = style[STYLE_SCROLL_RECT]
  if (!styleScrollRect) return
  const {
    horizontal: scrollRectHorizontal,
    vertical: scrollRectVertical,
  } = getScrollRectStyle(styleScrollRect)
  Object.assign(json, {
    scroll_rect: {
      horizontal: scrollRectHorizontal,
      vertical: scrollRectVertical,
      auto_assign_scrollbar: true, // 同一グループ内からスクロールバーを探す
    },
  })
}

function assignRectMask2d(json, style) {
  const styleRectMask2D = style[STYLE_RECT_MASK_2D]
  if (!styleRectMask2D) return
  Object.assign(json, {
    rect_mask_2d: true, // 受け取り側、boolで判定しているためbool値でいれる　それ以外は弾かれる
  })
}

/**
 *
 * @param json
 * @param {SceneNodeClass} viewportNode
 * @param {SceneNodeClass} maskNode
 * @param {SceneNodeList} children
 * @param style
 */
function assignLayout(json, viewportNode, maskNode, children, style) {
  let layoutJson = getLayoutJson(json, viewportNode, maskNode, children, style)
  if (!layoutJson) return

  const layoutSpacingX = style[STYLE_LAYOUT_GROUP_SPACING_X]
  if (layoutSpacingX != null) {
    Object.assign(layoutJson, {
      spacing_x: parseInt(layoutSpacingX), //TODO: pxやenを無視している
    })
  }

  Object.assign(json, {
    layout: layoutJson,
  })
}

/**
 * レイアウトコンポーネント各種パラメータをStyleから設定する
 * @param layoutJson
 * @param style
 */
function assignLayoutParam(layoutJson, style) {
  if (style == null) return
  const styleChildAlignment = style[STYLE_LAYOUT_GROUP_CHILD_ALIGNMENT]
  if (styleChildAlignment) {
    Object.assign(layoutJson, {
      control_child_size: styleChildAlignment,
    })
  }
  const styleControlChildSize = style[STYLE_LAYOUT_GROUP_CONTROL_CHILD_SIZE]
  if (styleControlChildSize) {
    Object.assign(layoutJson, {
      control_child_size: styleControlChildSize,
    })
  }
  const styleUseChildScale = style[STYLE_LAYOUT_GROUP_USE_CHILD_SCALE]
  if (styleUseChildScale) {
    Object.assign(layoutJson, {
      use_child_scale: styleUseChildScale,
    })
  }
  const styleChildForceExpand = style[STYLE_LAYOUT_GROUP_CHILD_FORCE_EXPAND]
  if (styleChildForceExpand) {
    Object.assign(layoutJson, {
      child_force_expand: styleChildForceExpand,
    })
  }

  // GridLayoutGroupのみ適応される
  const styleStartAxis = style[STYLE_LAYOUT_GROUP_START_AXIS]
  if (styleStartAxis) {
    // まず横方向へ並べる
    if (hasAnyParamInStr(styleStartAxis, 'x', STR_HORIZONTAL)) {
      Object.assign(layoutJson, {
        start_axis: STR_HORIZONTAL,
      })
    }
    // まず縦方向へ並べる
    if (hasAnyParamInStr(styleStartAxis, 'y', STR_VERTICAL)) {
      Object.assign(layoutJson, {
        start_axis: STR_VERTICAL,
      })
    }
  }
}

/**
 *
 * @param {{}} json
 * @param {SceneNodeClass} node
 * @param {{}} style
 */
function assignLayoutElement(json, node, style) {
  const styleElement = style[STYLE_LAYOUT_ELEMENT]
  if (styleElement == null) return
  const bounds = getGlobalDrawBounds(node)
  if (hasParamInStr(styleElement, 'min')) {
    Object.assign(json, {
      layout_element: {
        min_width: bounds.width,
        min_height: bounds.height,
      },
    })
  }
  if (hasAnyParamInStr(styleElement, 'preferred')) {
    Object.assign(json, {
      layout_element: {
        preferred_width: bounds.width,
        preferred_height: bounds.height,
      },
    })
  }
}

function assignLayer(json, style) {
  const styleLayer = style[STYLE_LAYER]
  if (styleLayer != null) {
    Object.assign(json, { layer: styleLayer })
  }
}

const STYLE_SCROLL_RECT_CONTENT = 'scroll-rect-content'

/**
 *
 * @param {*} json
 * @param {SceneNode} node
 * @param {*} root
 * @param {*} funcForEachChild
 * 出力構成
 * Viewport +Image(タッチ用透明)　+ScrollRect +RectMask2D
 *   - $Content ← 自動生成
 *      - Node
 * @scrollで、スクロール方向を指定することで、ScrollRectコンポーネントがつく
 * Content内のレイアウト定義可能
 * Content内、すべて変換が基本(XDの見た目そのままコンバートが基本)
 * Item化する場合は指定する
 */
async function createViewport(json, node, root, funcForEachChild) {
  let { style } = getNodeNameAndStyle(node)

  // Viewportは必ずcontentを持つ
  // contentのアサインと名前設定
  let contentName = '.content'
  const styleScrollRectContent = style[STYLE_SCROLL_RECT_CONTENT]
  if (styleScrollRectContent) {
    const regex = /\s*['"](?<name>.*)['"]\s*/
    const token = regex.exec(styleScrollRectContent)
    if (token && token.groups.name) {
      contentName = token.groups.name
    }
  }

  Object.assign(json, {
    type: 'Viewport',
    name: getUnityName(node),
    fill_color: '#ffffff00', // タッチイベント取得Imageになる
    // Contentグループ情報
    content: {
      name: contentName,
    },
  })

  let contentJson = json[STR_CONTENT]
  //自動生成されるContentはNodeからできていないため getStyleFromNodeNameを呼び出す
  const contentStyle = getStyleFromNodeName(contentName, node, cssRules)

  if (node.constructor.name === 'Group') {
    // 通常グループ､マスクグループでViewportをつかう
    // Groupでもスクロールウィンドウはできるようにするが、RepeatGridではない場合レイアウト情報が取得しづらい
    let maskNode = node.mask
    // マスクが利用されたViewportである場合､マスクを取得する
    if (!maskNode) {
      console.log('***error viewport:マスクがみつかりませんでした')
    }
    let calcContentBounds = new CalcBounds()
    await funcForEachChild(null, child => {
      const childBounds = getGlobalBounds(child)
      calcContentBounds.addBounds(childBounds) // maskもContentBoundsの処理にいれる
      return child !== maskNode // maskNodeはFalse 処理をしない
    })

    // 縦の並び順を正常にするため､Yでソートする
    sortElementsByPositionAsc(json.elements)

    const maskBounds = getGlobalBounds(maskNode)
    const maskBoundsCM = getDrawBoundsCMInBase(maskNode, root)

    Object.assign(json, {
      x: maskBoundsCM.cx,
      y: maskBoundsCM.cy,
      w: maskBoundsCM.width,
      h: maskBoundsCM.height,
    })

    Object.assign(
      contentJson,
      getBoundsInBase(calcContentBounds.bounds, maskBounds), // 相対座標で渡す
    )

    assignLayout(contentJson, node, maskNode, node.children, contentStyle)
  } else if (node.constructor.name === 'RepeatGrid') {
    // リピートグリッドでViewportを作成する
    // リピードグリッド内、Itemとするか、全部実態化するか、
    // 以下縦スクロール専用でコーディング

    let calcContentBounds = new CalcBounds()
    /** @type {RepeatGrid} */
    let viewportNode = node
    const viewportBounds = getGlobalBounds(viewportNode)
    calcContentBounds.addBounds(viewportBounds)
    // AdobeXDの問題で　リピートグリッドの枠から外れているものもデータがくるケースがある
    // そういったものを省くための処理
    // Contentの領域も計算する
    await funcForEachChild(null, child => {
      const childBounds = getGlobalBounds(child)
      if (!testBounds(viewportBounds, childBounds)) {
        console.log(child.name + 'はViewportにはいっていない')
        return false // 処理しない
      }
      calcContentBounds.addBounds(childBounds)
      return true // 処理する
    })

    const maskBoundsCM = getDrawBoundsCMInBase(viewportNode, root)

    Object.assign(json, {
      x: maskBoundsCM.cx,
      y: maskBoundsCM.cy,
      w: maskBoundsCM.width,
      h: maskBoundsCM.height,
    })

    Object.assign(
      contentJson,
      getBoundsInBase(calcContentBounds.bounds, viewportBounds),
    )

    let gridLayoutJson = getLayoutFromRepeatGrid(viewportNode, contentStyle)
    if (gridLayoutJson != null) {
      Object.assign(contentJson, {
        layout: gridLayoutJson,
      })
    }
  }

  assignDrawRectTransform(json, node)
  assignContentSizeFitter(json, style)
  assignScrollRect(json, style)
  assignRectMask2d(json, style)

  // Content系
  // SizeFit
  assignContentSizeFitter(contentJson, contentStyle)
  assignLayer(contentJson, contentStyle)

  // ContentのRectTransformを決める
  const contentWidth = contentJson['width']
  const contentHeight = contentJson['height']
  const contentStyleFix = getStyleFix(contentStyle[STYLE_FIX])
  let pivot = { x: 0, y: 1 } // top-left
  let anchorMin = { x: 0, y: 1 }
  let anchorMax = { x: 0, y: 1 }
  let offsetMin = { x: 0, y: -contentHeight }
  let offsetMax = { x: contentWidth, y: 0 }
  Object.assign(contentJson, {
    fix: contentStyleFix,
    pivot: pivot, // ここのPivotはX,Yで渡す　他のところは文字列になっている
    anchor_min: anchorMin,
    anchor_max: anchorMax,
    offset_min: offsetMin,
    offset_max: offsetMax,
  })
  assignRectTransformAnchorOffsetX(contentJson, contentStyle) // anchor設定を上書きする
}

/**
 *
 * @param json
 * @param {SceneNode} node
 * @param root
 * @param funcForEachChild
 * @return {Promise<string>}
 */
async function createGroup(json, node, root, funcForEachChild) {
  let { style } = getNodeNameAndStyle(node)

  const type = 'Group'
  let boundsCM = getDrawBoundsCMInBase(node, root)
  Object.assign(json, {
    type: type,
    name: getUnityName(node),
    x: boundsCM.cx, // Baum2では使わないが､　VGROUPなど､レイアウトの情報としてもつ
    y: boundsCM.cy, // Baum2では使わないが､ VGroupなど､レイアウトの情報としてもつ
    w: boundsCM.width, // Baum2ではつかわないが､情報としていれる RectElementで使用
    h: boundsCM.height, // Baum2ではつかわないが､情報としていれる RectElementで使用
    elements: [], // Groupは空でもelementsをもっていないといけない
  })
  await funcForEachChild()

  if( style["active"]) {
    Object.assign(json, {
      deactive: checkBoolean(style["active"])
    })
  }
  assignDrawRectTransform(json, node)
  assignLayer(json, style)
  assignState(json, style)
  assignCanvasGroup(json, node, style)
  assignLayoutElement(json, node, style)
  assignLayout(json, node, node, node.children, style)
  assignContentSizeFitter(json, style)
}

/**
 * @param style
 * @param json
 * @param node
 * @param funcForEachChild
 * @returns {Promise<void>}
 */
async function createScrollbar(style, json, node, funcForEachChild) {
  const type = 'Scrollbar'
  Object.assign(json, {
    type: type,
    name: getUnityName(node),
  })
  let direction = style[STYLE_DIRECTION]
  if (direction != null) {
    Object.assign(json, {
      scroll_direction: direction,
    })
  }

  await funcForEachChild()

  assignDrawRectTransform(json, node)
  assignLayer(json, style)
  assignState(json, style)
  assignCanvasGroup(json, node, style)
  assignLayoutElement(json, node, style)
  assignLayout(json, node, node, node.children, style)
  assignContentSizeFitter(json, style)

  //return type
}

/**
 * @param json
 * @param node
 * @param root
 * @param funcForEachChild
 * @returns {Promise<void>}
 */
async function createToggle(json, node, root, funcForEachChild) {
  let { style } = getNodeNameAndStyle(node)

  Object.assign(json, {
    type: 'Toggle',
    name: getUnityName(node),
  })

  // Toggle group
  if (style[STYLE_TOGGLE_GROUP]) {
    Object.assign(json, {
      group: style[STYLE_TOGGLE_GROUP],
    })
  }

  assignBoundsCM(json, getDrawBoundsCMInBase(node, root))
  await funcForEachChild()
  assignDrawRectTransform(json, node)
  assignLayer(json, style)
  assignState(json, style)
  assignLayoutElement(json, node, style)
  assignContentSizeFitter(json, style)
}

/**
 *
 * @param json
 * @param node
 * @param root
 * @param funcForEachChild
 * @returns {Promise<string>}
 */
async function createButton(json, node, root, funcForEachChild) {
  let { style } = getNodeNameAndStyle(node)

  const type = 'Button'
  Object.assign(json, {
    type: type,
    name: getUnityName(node),
  })

  assignBoundsCM(json, getDrawBoundsCMInBase(node, root))
  await funcForEachChild()
  assignDrawRectTransform(json, node)
  assignLayer(json, style)
  assignState(json, style)

  return type
}

/**
 * テキストレイヤーの処理
 * @param {*} json
 * @param {SceneNode} node
 * @param {Artboard} artboard
 * @param {*} subfolder
 * @param {[]} renditions
 */
async function createText(json, node, artboard, subfolder, renditions) {
  let { style } = getNodeNameAndStyle(node)

  // ラスタライズオプションチェック
  if (checkStyleImage(style)) {
    await createImage(json, node, artboard, subfolder, renditions)
    return
  }

  if (
    !checkStyleText(style) &&
    !checkStyleInput(style) &&
    !checkStyleTextMeshPro(style)
  ) {
    await createImage(json, node, artboard, subfolder, renditions)
    return
  }

  const boundsCM = getBoundsCMInBase(node, artboard)

  /** @type {Text} */
  let nodeText = node
  let type = 'Text'
  if (checkStyleTextMeshPro(style)) {
    type = 'TextMeshPro'
  }
  if (checkStyleInput(style)) {
    type = 'Input'
  }

  let textType = 'point'
  let hAlign = nodeText.textAlign
  let vAlign = 'middle'
  if (nodeText.areaBox) {
    // エリア内テキストだったら
    textType = 'paragraph'
    // 上揃え
    vAlign = 'upper'
  }

  // @ALIGN オプションがあった場合､上書きする
  const styleAlign = style[STYLE_ALIGN]
  if (styleAlign != null) {
    hAlign = styleAlign
  }

  // @v-align オプションがあった場合、上書きする
  // XDでは、left-center-rightは設定できるため
  const styleVAlign = style[STYLE_V_ALIGN]
  if (styleVAlign != null) {
    vAlign = styleVAlign
  }

  // text.styleRangesの適応をしていない
  Object.assign(json, {
    type: type,
    name: getUnityName(node),
    text: nodeText.text,
    textType: textType,
    font: nodeText.fontFamily,
    style: nodeText.fontStyle,
    size: nodeText.fontSize * scale,
    color: nodeText.fill.toHex(true),
    align: hAlign + vAlign,
    x: boundsCM.cx,
    y: boundsCM.cy,
    w: boundsCM.width,
    h: boundsCM.height,
    vh: boundsCM.height,
    opacity: 100,
  })

  // Drawではなく、通常のレスポンシブパラメータを渡す　シャドウ等のエフェクトは自前でやる必要があるため
  assignRectTransform(json, node)
  assignLayer(json, style)
}

/**
 * パスレイヤー(楕円や長方形等)の処理
 * @param {*} json
 * @param {SceneNode} node
 * @param {Artboard} root
 * @param {*} subFolder
 * @param {*} renditions
 */
async function createImage(json, node, root, subFolder, renditions) {
  let { node_name, style } = getNodeNameAndStyle(node)

  const unityName = getUnityName(node)
  // もしボタンオプションがついているのなら　ボタンを生成してその子供にイメージをつける
  if (checkStyleButton(style)) {
    Object.assign(json, {
      type: 'Button',
      name: unityName,
      elements: [
        {
          type: 'Image',
          name: unityName + '-image',
        },
      ],
    })
    assignDrawRectTransform(json, node)
    await assignImage(json.elements[0], node, root, subFolder, renditions)
    //ボタン画像はボタンとぴったりサイズをあわせる
    let imageJson = json['elements'][0]
    Object.assign(imageJson, {
      anchor_min: { x: 0, y: 0 },
      anchor_max: { x: 1, y: 1 },
      offset_min: { x: 0, y: 0 },
      offset_max: { x: 0, y: 0 },
    })
  } else {
    Object.assign(json, {
      type: 'Image',
      name: node_name,
    })
    assignLayer(json, style)
    assignDrawRectTransform(json, node)
    assignState(json, style)
    await assignImage(json, node, root, subFolder, renditions)
    // assignComponent
    if (style[STYLE_COMPONENT] != null) {
      Object.assign(json, {
        component: {},
      })
    }
    // image type
    if (style[STYLE_IMAGE_TYPE] != null) {
      Object.assign(json, {
        image_type: style[STYLE_IMAGE_TYPE],
      })
    }
  }
}

/**
 * @param layoutJson
 * @param node
 * @param funcForEachChild
 * @returns {Promise<void>}
 */
async function createRoot(layoutJson, node, funcForEachChild) {
  let { style } = getNodeNameAndStyle(node)
  Object.assign(layoutJson, {
    // Artboardは親のサイズにぴったりはまるようにする
    anchor_min: {
      x: 0,
      y: 0,
    },
    anchor_max: {
      x: 1,
      y: 1,
    },
    offset_min: {
      x: 0,
      y: 0,
    },
    offset_max: {
      x: 0,
      y: 0,
    },
    elements: [], // これがないとBAUM2でエラーになる(elementsが見つからないため､例外がでる)
  })
  if (
    node.fillEnabled === true &&
    node.fill != null &&
    node.fill instanceof Color
  ) {
    Object.assign(layoutJson, {
      fill_color: node.fill.toHex(true),
    })
  }
  await funcForEachChild()
  assignLayer(layoutJson, style)
}

/**
 * Groupの処理 戻り値は処理したType
 * 注意:ここで､子供の処理もしてしまう
 * @param {*} json
 * @param {SceneNode} node
 * @param root
 * @param subFolder
 * @param renditions
 * @param {*} funcForEachChild
 * @returns {Promise<void>}
 */
async function nodeGroup(
  json,
  node,
  root,
  subFolder,
  renditions,
  funcForEachChild,
) {
  let { style } = getNodeNameAndStyle(node)

  if (checkStyleImage(style)) {
    await createImage(json, node, root, subFolder, renditions)
    return
  }

  if (checkStyleButton(style)) {
    await createButton(json, node, root, funcForEachChild)
    return
  }

  if (checkStyleSlider(style)) {
    const type = 'Slider'
    Object.assign(json, {
      type: type,
      name: getUnityName(node),
    })
    assignDrawRectTransform(json, node)
    await funcForEachChild()
    return
  }

  if (checkStyleScrollbar(style)) {
    await createScrollbar(style, json, node, funcForEachChild)
    return
  }

  if (checkStyleToggle(style)) {
    await createToggle(json, node, root, funcForEachChild)
    return
  }

  if (checkStyleViewport(style)) {
    await createViewport(json, node, root, funcForEachChild)
    return
  }

  // 通常のグループ
  await createGroup(json, node, root, funcForEachChild)
}

/**
 * func : node => {}  nodeを引数とした関数
 * @param {*} node
 * @param {*} func
 */
function nodeWalker(node, func) {
  let result = func(node)
  if (result === false) return // 明確なFalseの場合、子供へはいかない
  node.children.forEach(child => {
    nodeWalker(child, func)
  })
}

/**
 * アートボードの処理
 * @param {*} renditions
 * @param {*} outputFolder
 * @param {Artboard} root
 */
async function nodeRoot(renditions, outputFolder, root) {
  let subFolder
  let nodeNameAndStyle = getNodeNameAndStyle(root)

  let subFolderName = nodeNameAndStyle.node_name

  // フォルダ名に使えない文字を'_'に変換
  subFolderName = convertToFileName(subFolderName, false)

  // アートボード毎にフォルダを作成する
  if (!optionImageNoExport) {
    // TODO:他にやりかたはないだろうか
    try {
      subFolder = await outputFolder.getEntry(subFolderName)
    } catch (e) {
      subFolder = await outputFolder.createFolder(subFolderName)
    }
  }

  const layoutFileName = subFolderName + '.layout.json'
  const layoutFile = await outputFolder.createFile(layoutFileName, {
    overwrite: true,
  })

  let layoutJson = makeLayoutJson(root)

  let nodeWalker = async (nodeStack, layoutJson, depth, parentJson) => {
    let node = nodeStack[nodeStack.length - 1]
    // レイヤー名から名前とオプションの分割
    let { style } = getNodeNameAndStyle(node)

    /*
        const indent = (() => {
      let sp = ''
      for (let i = 0; i < depth; i++) sp += '  '
      return sp
    })()

    console.log(
      indent + "'" + name + "':" + constructorName,
      style,
      responsiveBounds[node.guid]['responsiveParameter'],
    )
    */

    // コメントアウトチェック
    if (checkStyleCommentOut(style)) {
      return
    }

    // 子Node処理関数
    /**
     * @param numChildren
     * @param funcFilter
     * @returns {Promise<void>}
     */
    let funcForEachChild = async (numChildren, funcFilter) => {
      const maxNumChildren = node.children.length
      if (numChildren == null) {
        numChildren = maxNumChildren
      } else if (numChildren > maxNumChildren) {
        numChildren = maxNumChildren
      }
      if (numChildren > 0) {
        layoutJson.elements = []
        // 後ろから順番に処理をする
        // 描画順に関わるので､非同期処理にしない
        for (let i = numChildren - 1; i >= 0; i--) {
          let child = node.children.at(i)
          if (funcFilter) {
            // Filter関数を呼び出し､Falseならばスキップ
            if (!funcFilter(child)) continue
          }
          let childJson = {}
          nodeStack.push(child)
          await nodeWalker(nodeStack, childJson, depth + 1, layoutJson)
          nodeStack.pop()
          // なにも入っていない場合はelementsに追加しない
          if (Object.keys(childJson).length > 0) {
            layoutJson.elements.push(childJson)
          }
        }
      }
    }

    // nodeの型で処理の分岐
    let constructorName = node.constructor.name
    switch (constructorName) {
      case 'Artboard':
        await createRoot(layoutJson, node, funcForEachChild)
        break
      case 'BooleanGroup':
      case 'Group':
      case 'RepeatGrid':
      case 'SymbolInstance':
        await nodeGroup(
          layoutJson,
          node,
          root,
          subFolder,
          renditions,
          funcForEachChild,
        )
        break
      case 'Line':
      case 'Ellipse':
      case 'Rectangle':
      case 'Path':
      case 'Polygon':
        await createImage(layoutJson, node, root, subFolder, renditions)
        await funcForEachChild()
        break
      case 'Text':
        await createText(layoutJson, node, root, subFolder, renditions)
        await funcForEachChild()
        break
      default:
        console.log('***error type:' + constructorName)
        await funcForEachChild()
        break
    }
  }

  await nodeWalker([root], layoutJson.root, 0)

  // rootにPivot情報があった場合､canvas.baseの位置を調整する
  let pivot = layoutJson.root['pivot']
  if (pivot && root.parent) {
    let node = getGlobalDrawBounds(root)
    let parent = getGlobalDrawBounds(root.parent)
    if (pivot.indexOf('left') >= 0) {
      layoutJson.info.canvas.base.x = parent.x - node.x - node.width / 2
    }
    if (pivot.indexOf('right') >= 0) {
      layoutJson.info.canvas.base.x =
        parent.x + parent.width - (node.x + node.width / 2)
    }
    if (pivot.indexOf('top') >= 0) {
      layoutJson.info.canvas.base.y = parent.y - node.y - node.height / 2
    }
    if (pivot.indexOf('bottom') >= 0) {
      layoutJson.info.canvas.base.y =
        parent.y + parent.height - (node.y + node.height / 2)
    }
  }

  // レイアウトファイルの出力
  await layoutFile.write(JSON.stringify(layoutJson, null, '  '))
}

/**
 * Baum2 export
 * @param {SceneNodeClass[]} roots
 * @param outputFolder
 * @param {SceneNodeClass[]} responsiveCheckRootNodes
 * @returns {Promise<void>}
 */
async function exportBaum2(roots, outputFolder, responsiveCheckRootNodes) {
  // ラスタライズする要素を入れる
  let renditions = []

  responsiveBounds = {}
  // レスポンシブパラメータの作成
  for (let responsiveCheckRootNode of responsiveCheckRootNodes) {
    makeResponsiveParameter(responsiveCheckRootNode) // responsiveBoundsに追加されていく
  }
  checkHashBounds(responsiveBounds, true)

  // シンボル用サブフォルダの作成
  // try {
  //   symbolSubFolder = await outputFolder.getEntry('symbol')
  // } catch (e) {
  //   symbolSubFolder = await outputFolder.createFolder('symbol')
  // }

  // アートボード毎の処理
  for (let root of roots) {
    await nodeRoot(renditions, outputFolder, root)
  }

  // すべて可視にする
  // 背景のぼかしをすべてオフにする　→　ボカシがはいっていると､その画像が書き込まれるため
  for (let root of roots) {
    nodeWalker(root, node => {
      const { node_name: nodeName, style } = getNodeNameAndStyle(node)
      if (checkStyleCommentOut(style)) {
        return false // 子供には行かないようにする
      }
      try {
        node.visible = true
      } catch (e) {
        console.log('***error ' + nodeName + ': visible true failed.')
      }
      try {
        if (node.blur != null) {
          // ぼかしをオフ
          node.blur = null
        }
      } catch (e) {
        console.log('***error ' + nodeName + ': blur off failed.')
      }
      // IMAGEであった場合、そのグループの不可視情報はそのまま活かすため
      // 自身は可視にし、子供の不可視情報は生かす
      // 本来は sourceImageをNaturalWidth,Heightで出力する
      if (style[STYLE_IMAGE] != null || style[STYLE_IMAGE_SLICE] != null) {
        return false
      }
    })
  }

  if (renditions.length !== 0 && !optionImageNoExport) {
    // 一括画像ファイル出力
    await application
      .createRenditions(renditions)
      .then(() => {
        console.log(`saved ${renditions.length} files`)
      })
      .catch(error => {
        //console.log(renditions)
        console.log('画像ファイル出力エラー:' + error)
        console.log(
          '1)access denied (disk permission)\n2)readonly folder\n3)not enough disk space\n4)maximum path(I think it’s 256 currently on both platform)\n5)image size 0px',
        )
      })
  } else {
    // 画像出力の必要がなければ終了
    // alert('no outputs')
  }
}

/**
 * Shorthand for creating Elements.
 * @param {*} tag The tag name of the element.
 * @param {*} [props] Optional props.
 * @param {*} children Child elements or strings
 */
function h(tag, props, ...children) {
  let element = document.createElement(tag)
  if (props) {
    if (props.nodeType || typeof props !== 'object') {
      children.unshift(props)
    } else {
      for (const name in props) {
        let value = props[name]
        if (name === 'style') {
          Object.assign(element.style, value)
        } else {
          element.setAttribute(name, value)
          element[name] = value
        }
      }
    }
  }
  for (let child of children) {
    element.appendChild(
      typeof child === 'object' ? child : document.createTextNode(child),
    )
  }
  return element
}

/**
 * alertの表示
 * @param {string} message
 * @param {string=} title
 */
async function alert(message, title) {
  if (title == null) {
    title = 'XD Baum2 Export'
  }
  let dialog = h(
    'dialog',
    h(
      'form',
      {
        method: 'dialog',
        style: {
          width: 400,
        },
      },
      h('h1', title),
      h('hr'),
      h('span', message),
      h(
        'footer',
        h(
          'button',
          {
            uxpVariant: 'primary',
            onclick(e) {
              dialog.close()
            },
          },
          'Close',
        ),
      ),
    ),
  )
  document.body.appendChild(dialog)
  return dialog.showModal()
}

/**
 * 出力対象を得る
 * @param {Selection} selection
 * @param {RootNode} root
 * @returns {SceneNode[]}
 */
async function getExportRootNodes(selection, root) {
  // 選択されているものがない場合 全てが変換対象
  // return selection.items.length > 0 ? selection.items : root.children
  if (selection.items.length !== 1) {
    await alert('出力アートボート直下のノードを1つ選択してください')
    throw 'not selected immediate child.'
  }
  const node = selection.items[0]
  const parentIsArtboard = node.parent instanceof Artboard
  if (!parentIsArtboard) {
    await alert('出力アートボート直下のノードを1つ選択してください')
    throw 'not selected immediate child.'
  }

  return [selection.items[0].parent]
}

/**
 *
 * @param {Selection} selection
 * @param {RootNode} root
 * @returns {Promise<void>}
 */
async function pluginExportBaum2Command(selection, root) {
  let inputFolder
  let inputScale
  let errorLabel
  let checkImageNoExport
  let checkCheckMarkedForExport
  let checkAllArtboard
  let dialog = h(
    'dialog',
    h(
      'form',
      {
        method: 'dialog',
        style: {
          width: 400,
        },
      },
      h('h1', 'XD Baum2 Export'),
      h('hr'),
      h(
        'label',
        {
          style: {
            flexDirection: 'row',
            alignItems: 'center',
          },
        },
        h('span', 'Folder'),
        (inputFolder = h('input', {
          style: {
            width: '60%',
          },
          readonly: true,
          border: 0,
        })),
        h(
          'button',
          {
            async onclick(e) {
              let folder = await fs.getFolder()
              if (folder != null) {
                inputFolder.value = folder.nativePath
                outputFolder = folder
              }
            },
          },
          '...',
        ),
      ),
      h(
        'label',
        {
          style: {
            flexDirection: 'row',
            alignItems: 'center',
          },
        },
        h('span', 'Scale'),
        (inputScale = h('input', {
          value: '4.0',
        })),
      ),
      h(
        'label',
        {
          style: {
            flexDirection: 'row',
            alignItems: 'center',
          },
        },
        (checkAllArtboard = h('input', {
          type: 'checkbox',
        })),
        h('span', '全てのアートボードを対象とする'),
      ),
      h(
        'label',
        {
          style: {
            flexDirection: 'row',
            alignItems: 'center',
          },
        },
        (checkCheckMarkedForExport = h('input', {
          type: 'checkbox',
        })),
        h('span', 'エキスポートマークがついているもののみ出力する'),
      ),
      h(
        'label',
        {
          style: {
            flexDirection: 'row',
            alignItems: 'center',
          },
        },
        (checkImageNoExport = h('input', {
          type: 'checkbox',
        })),
        h('span', 'イメージは出力しない'),
      ),
      (errorLabel = h(
        'label',
        {
          style: {
            alignItems: 'center',
            color: '#f00',
          },
        },
        '',
      )),
      h(
        'footer',
        h(
          'button',
          {
            uxpVariant: 'primary',
            onclick(e) {
              dialog.close()
            },
          },
          'Cancel',
        ),
        h(
          'button',
          {
            uxpVariant: 'cta',
            onclick(e) {
              // 出力できる状態かチェック
              // スケールの値が正常か
              let tmpScale = Number.parseFloat(inputScale.value)
              if (Number.isNaN(tmpScale)) {
                errorLabel.textContent = 'invalid scale value'
                return
              }
              scale = tmpScale
              // 出力フォルダは設定してあるか
              if (outputFolder == null) {
                errorLabel.textContent = 'invalid output folder'
                return
              }
              //
              optionImageNoExport = checkImageNoExport.checked
              optionCheckMarkedForExport = checkCheckMarkedForExport.checked

              dialog.close('export')
            },
          },
          'Export',
        ),
      ),
    ),
  )

  let exportRootNodes = await getExportRootNodes(selection, root)

  // 出力前にセッションデータをダイアログに反映する
  // Scale
  inputScale.value = scale
  // Folder
  inputFolder.value = ''
  if (outputFolder != null) {
    inputFolder.value = outputFolder.nativePath
  }
  // Responsive Parameter
  checkImageNoExport.checked = optionImageNoExport
  checkCheckMarkedForExport.checked = optionCheckMarkedForExport

  // Dialog表示
  document.body.appendChild(dialog)
  let result = await dialog.showModal()

  // 全てのアートボードが出力対象になっているか確認
  if (checkAllArtboard.checked) {
    exportRootNodes = root.children
  }

  // Dialogの結果チェック
  if (result === 'export') {
    try {
      await loadCssRules()
      // 出力ノードリスト
      /**
       * @type {SceneNodeClass[]}
       */
      let exportRoots = []
      // レスポンシブパラメータを取得するため､操作を行うアートボード
      /**
       * @type {SceneNodeClass[]}
       */
      let responsiveCheckArtboards = []

      // Artboard､SubPrefabを探し､　必要であればエキスポートマークチェックを行い､ 出力リストに登録する
      let currentArtboard = null
      let funcForEach = nodes => {
        nodes.forEach(node => {
          let nodeNameAndStyle = getNodeNameAndStyle(node)
          const isArtboard = node instanceof Artboard
          if (isArtboard) {
            if (isArtboard) currentArtboard = node
            if (optionCheckMarkedForExport && !node.markedForExport) {
              // エキスポートマークをみる且つ､マークがついてない場合は 出力しない
            } else {
              // 同じ名前のものは上書きされる
              exportRoots.push( node)
              if (isArtboard) {
                responsiveCheckArtboards.push( node)
              } else {
                // サブプレハブを選択して出力する場合は､currentArtboard==NULLの場合がある
                if (currentArtboard != null) {
                  responsiveCheckArtboards.push(currentArtboard)
                }
              }
            }
          }
          const children = node.children
          if (children) funcForEach(children)
        })
      }

      funcForEach(exportRootNodes)

      if (exportRoots.length === 0) {
        // 出力するものが見つからなかった
        await alert('no selected artboards.')
        return
      }
      await exportBaum2(exportRoots, outputFolder, responsiveCheckArtboards)
    } catch (e) {
      console.log(e)
      console.log(e.stack)
      await alert(e, 'error')
    }
    // データをもとに戻すため､意図的にエラーをスローする
    throw 'throw error for UNDO'
  }
}

/**
 * レスポンシブパラメータを取得し､名前に反映する
 * @param {*} selection
 * @param {*} root
 */
async function pluginResponsiveParamName(selection, root) {
  let selectionItems = selection.items
  // レスポンシブパラメータの作成
  responsiveBounds = {}
  selectionItems.forEach(item => {
    // あとで一括変化があったかどうか調べるため､responsiveBoundsにパラメータを追加していく
    makeResponsiveParameter(item)
    let func = node => {
      if (node.symbolId) return
      const param = calcRectTransform(node, {})
      if (param) {
        let styleFix = []
        for (let key in param.fix) {
          if (param.fix[key] === true) {
            styleFix.push(key[0])
          }
        }
        if (styleFix.length > 0) {
          let name = node.name.replace(/ +@fix=[a-z_\-]+/, '')
          let fixStr = styleFix
            .join('-')
            .replace('l-r', 'x') // 左右固定
            .replace('t-b', 'y') // 上下固定
            .replace('w-h', 'size') // サイズ固定
            .replace('x-y-size', 'size') // グループのresizeをやったところ､topleftも動いてしまったケース sizeのみにする
          try {
            node.name = name + ' @fix=' + fixStr
          } catch (e) {}
        }
      }
      node.children.forEach(child => {
        func(child)
      })
    }
    func(item)
  })

  console.log('@fix:done')

  // データをもとに戻すため､意図的にエラーをスローすると､付加した情報も消えてしまう
  if (!checkHashBounds(responsiveBounds, false)) {
    await alert('bounds is changed. thrown error for UNDO', '@fix')
  } else {
  }
}

/**
 * 選択した複数のグループのDrawBoundsのサイズをそろえるため､ダミーの描画オブジェクトを作成する
 * 現在は､同一Artboardであることを求める
 * @param {Selection} selection
 * @param {RootNode} root
 */
async function pluginAddImageSizeFix(selection, root) {
  const sizeFixerName = '#SIZE-FIXER'
  let artboard
  let groups = []
  // 選択されたものの検証　グループのものかどうかを探す
  selection.items.forEach(item => {
    if (!item.isContainer) {
      throw error('failed')
    }

    // すでにあるSizeFixerを削除する
    let sizeFixers = item.children.filter(child => {
      return child.name === sizeFixerName
    })
    sizeFixers.forEach(item => {
      item.removeFromParent()
    })

    if (artboard == null) {
      // 最初のアートボード登録
      artboard = getArtboard(item)
    } else {
      const myArtboard = getArtboard(item)
      // 同じアートボードであるか
      if (artboard !== myArtboard) {
        throw error('failed')
      }
    }
    groups.push(item)
  })

  // 選択されたグループの描画範囲を取得する
  let calcFixBounds = new CalcBounds()
  groups.forEach(group => {
    calcFixBounds.addBounds(group.globalDrawBounds)
  })

  // サイズ固定のためのダミー透明描画オブジェクトを作成する
  const fixBounds = calcFixBounds.bounds
  groups.forEach(group => {
    let fixerGraphic = new Rectangle()
    fixerGraphic.name = sizeFixerName
    fixerGraphic.width = fixBounds.width
    fixerGraphic.height = fixBounds.height
    fixerGraphic.fillEnabled = false
    fixerGraphic.strokeEnabled = false
    // まずは追加し
    group.addChild(fixerGraphic)
    // ズレを計算､移動する
    const lineBounds = fixerGraphic.globalBounds
    fixerGraphic.moveInParentCoordinates(
      fixBounds.x - lineBounds.x,
      fixBounds.y - lineBounds.y,
    )
  })
  await alert('done', 'Size Fixer')
}

/**
 * 選択したノードを画像出力する
 * 画像出力のテスト用
 * @param {Selection} selection
 * @param {RootNode} root
 */
async function testRendition(selection, root) {
  const folder = await fs.getFolder()
  const file = await folder.createFile('rendition.png')
  let renditionSettings = [
    {
      node: selection.items[0], // [1]
      outputFile: file, // [2]
      type: application.RenditionType.PNG, // [3]
      scale: 2, // [4]
    },
  ]
  application
    .createRenditions(renditionSettings) // [1]
    .then(results => {
      // [2]
      console.log(
        `PNG rendition has been saved at ${results[0].outputFile.nativePath}`,
      )
    })
    .catch(error => {
      // [3]
      console.log(error)
    })
}

/**
 *
 * @param {Selection} selection
 * @param {RootNode} root
 * @return {Promise<void>}
 */
async function testInteractions(selection, root) {
  // Print all the interactions triggered by a node
  const node = selection.items[0]
  console.log('test interactions:' + node.name)
  node.triggeredInteractions.forEach(interaction => {
    console.log(
      'Trigger: ' +
        interaction.trigger.type +
        ' -> Action: ' +
        interaction.action.type,
    )
    printAllProperties(interaction.action.destination)
  })
}

module.exports = {
  // コマンドIDとファンクションの紐付け
  commands: {
    exportBaum2Command: pluginExportBaum2Command,
    addResponsiveParam: pluginResponsiveParamName,
    addImageSizeFix: pluginAddImageSizeFix,
    testInteractions: testInteractions,
  },
}
