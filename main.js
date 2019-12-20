// XD拡張APIのクラスをインポート
const { Artboard, Color, Rectangle } = require('scenegraph')
const application = require('application')
const fs = require('uxp').storage.localFileSystem

// 全体にかけるスケール
var scale = 1.0

// レスポンシブパラメータを保存する
/**
 * @type {{}}
 */
var responsiveBounds = {}

// 出力するフォルダ
var outputFolder = null

// エキスポートフラグを見るかどうか
var optionCheckMarkedForExport = true

// レスポンシブパラメータを取得するオプション
var optionEnableSubPrefab = true

// Textノードは強制的にTextMeshProに変換する
var optionDefaultTextMP = false

// Textノードは強制的にImageに変換する
var optionForceTextToImage = false

const STR_CONTENT = 'content'
const STR_VERTICAL = 'vertical'
const STR_HORIZONTAL = 'horizontal'
const STR_PREFERRED = 'preferred'

// オプション文字列　全て小文字
// OPTION名に H V　X Yといった、高さ方向をしめすものはできるだけ出さないようにする
const STYLE_TYPE_BUTTON = 'button'
const STYLE_TYPE_SLIDER = 'slider'
const STYLE_TYPE_SCROLLBAR = 'scrollbar'
const STYLE_TYPE_IMAGE = 'image'
const STYLE_TYPE_INPUT = 'input'
const STYLE_TYPE_TOGGLE = 'toggle'
const STYLE_TYPE_SCROLLER = 'scroller'
const STYLE_TYPE_TEXT = 'text'
const STYLE_TYPE_TEXTMP = 'textmp' // textmeshpro
const STYLE_TYPE_VIEWPORT = 'viewport'

const STYLE_COMMENT_OUT = 'comment-out'
const STYLE_SUB_PREFAB = 'sub-prefab' // 仕様策定から必要
const STYLE_SCROLL = 'scroll' // スクロール方向の指定 vertical horaizontal の文字列を含む
const STYLE_FIX = 'fix'
const STYLE_TOGGLE_GROUP = 'toggle-group'
const STYLE_CANVAS_GROUP = 'canvas-group' // 削除予定
const STYLE_COMPONENT = 'component'
const STYLE_MIN_HEIGHT = 'min-height' // 削除予定
const STYLE_PREFERRED_HEIGHT = 'preferred-height' // 削除予定
const STYLE_PRESERVE_ASPECT = 'preserve-aspect'
const STYLE_BLANK = 'blank'
const STYLE_ALIGN = 'align' // テキストの縦横のアライメントの設定が可能　XDの設定に上書き
const STYLE_V_ALIGN = 'v-align' //テキストの縦方向のアライメント XDの設定に追記される
const STYLE_RAYCAST_TARGET = 'raycast-target' // 削除予定
const STYLE_IMAGE_SCALE = 'image-scale'
const STYLE_IMAGE_TYPE = 'image-type'
const STYLE_IMAGE_NO_SLICE = 'image-no-slice' // 9スライスしない (アトラスを作成すると現在Unity側でうまく動作せず)
const STYLE_IMAGE_SLICE = 'image-slice' // 9スライス ドット数を指定する
const STYLE_LAYOUT = 'layout' //子供を自動的にどうならべるかのオプション
const STYLE_SIZE_FIT = 'size-fit' //自身のSizeFitterオプション
const OPTION_CONTENT = 'content'
const STYLE_DIRECTION = 'direction'
const STYLE_LAYOUT_ELEMENT = 'layout-element'

/**
 * @type {[{selector_ops:[{name:string,op:string}], style:{}}]}
 */
let cssRules = null

async function loadCssRules() {
  if (cssRules != null) return
  cssRules = []
  const folder = await fs.getPluginFolder()
  const file = await folder.getEntry('xd-unity.css')
  const contents = await file.read()
  const rules = parseCss(contents)
  for (const rule of rules) {
    let nameOps = parseCssSelector(rule.selector)
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
 * 正規表現テスト https://regex101.com/
 * @param selector
 * @return {[{op:string, name:string}]}
 */
function parseCssSelector(selector) {
  selector = selector.trim()
  const regexSelector = /(?<name>[\.#]?[a-zA-Z0-9_\-]+)?(?<attr>\[(?<attr_name>[a-z]+)(?<attr_op>[$=]+)\"(?<attr_val>.*)\"\])?(?<op>[ >]+)?/gi
  let token
  // セレクターを分解
  let nameOps = []
  while ((token = regexSelector.exec(selector))) {
    let op = token.groups.op
    /**
     * opの種類は　'', ' '(スペース), '>'
     * .a.b -> selector_ops:[ {name:".a","op":""}, {name:".b","op":""} ]
     * .a > .b -> selector_ops:[ {name:".a","op":">"}, {name:".b","op":""} ]
     */
    if (!op) {
      op = ''
    } else {
      op = op.trim()
      if (op === '') op = '%20' // 空白が全部きえてしまった場合　→ '%20'(スペース)
    }
    nameOps.push({ op, name: token.groups.name })
  }
  return nameOps
}

function checkStyleCommentOut(style) {
  return checkBoolean(style[STYLE_COMMENT_OUT])
}

function checkStyleSubPrefab(style) {
  return optionEnableSubPrefab && checkBoolean(style[STYLE_SUB_PREFAB])
}

function checkStyleButton(style) {
  return checkBoolean(style[STYLE_TYPE_BUTTON])
}

function checkStyleSlider(style) {
  return checkBoolean(style[STYLE_TYPE_SLIDER])
}

function checkStyleScrollbar(style) {
  return checkBoolean(style[STYLE_TYPE_SCROLLBAR])
}

function checkStyleImage(style) {
  if (checkBoolean(style[STYLE_IMAGE_SLICE])) {
    return true
  }
  return checkBoolean(style[STYLE_TYPE_IMAGE])
}

function checkStyleText(style) {
  return checkBoolean(style[STYLE_TYPE_TEXT])
}

function checkStyleTextMeshPro(style) {
  return checkBoolean(style[STYLE_TYPE_TEXTMP])
}

function checkStyleInput(style) {
  return checkBoolean(style[STYLE_TYPE_INPUT])
}

function checkStyleToggle(style) {
  return checkBoolean(style[STYLE_TYPE_TOGGLE])
}

function checkStyleScroller(style) {
  return checkBoolean(style[STYLE_TYPE_SCROLLER])
}

function checkStyleViewport(style) {
  return checkBoolean(style[STYLE_TYPE_VIEWPORT])
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
  if (hashBounds != null) {
    const hBounds = hashBounds[node.guid]
    if (hBounds != null && hBounds['before'] != null) {
      bounds = Object.assign({}, hBounds['before']['bounds'])
    }
  }
  if (bounds != null) return bounds

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
    if (hBounds != null && hBounds['before'] != null) {
      bounds = Object.assign({}, hBounds['before']['global_bounds'])
    }
  }
  if (bounds != null) return bounds

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
  if (param != null) {
    Object.assign(json, param)
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
  console.log('-------------------', style)
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

function searchFileName(renditions, fileName) {
  return renditions.find(entry => {
    return entry.fileName === fileName
  })
}

/**
 *
 * @param json
 * @param {SceneNode} node
 * @param root
 * @param subFolder
 * @param renditions
 * @param name
 * @param style
 * @return {Promise<void>}
 */
async function assignImage(
  json,
  node,
  root,
  subFolder,
  renditions,
  name,
  style,
) {
  // 今回出力するためのユニークな名前をつける
  const parentName = getNodeName(node.parent)
  const nodeNameAndStyle = getNodeNameAndStyle(node)

  let hashStringLength = 5
  // ファイル名が長すぎるとエラーになる可能性もある
  let fileName = convertToFileName(parentName + '-' + name, true)
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
    // var pattern = /([0-9]+px)?[^0-9]?([0-9]+px)?[^0-9]?([0-9]+px)?[^0-9]?([0-9]+px)?[^0-9]?/
    const pattern = /([0-9]+)(px)[^0-9]?([0-9]+)?(px)?[^0-9]?([0-9]+)?(px)?[^0-9]?([0-9]+)?(px)?[^0-9]?/
    //var result = pattern.exec(options[OPTION_9SLICE])
    const result = image9Slice.match(pattern)
    /*
    省略については、CSSに準拠
    http://www.htmq.com/css3/border-image-slice.shtml
    上・右・下・左の端から内側へのオフセット量
    4番目の値が省略された場合には、2番目の値と同じ。
    3番目の値が省略された場合には、1番目の値と同じ。
    2番目の値が省略された場合には、1番目の値と同じ。
    */
    if (result[3] == null) {
      result[3] = result[1]
    }
    if (result[5] == null) {
      result[5] = result[1]
    }
    if (result[7] == null) {
      result[7] = result[3]
    }
    if (result[1] != null) {
      let offset =
        parseInt(result[1]) * scale +
        'px,' +
        parseInt(result[3]) * scale +
        'px,' +
        parseInt(result[5]) * scale +
        'px,' +
        parseInt(result[7]) * scale +
        'px'
      //console.log(offset)
      fileExtension = '-9slice,' + offset + '.png'
    }
  }

  // 出力画像ファイル
  const file = await subFolder.createFile(fileName + fileExtension, {
    overwrite: true,
  })

  const drawBounds = getDrawBoundsCMInBase(node, root)
  Object.assign(json, {
    x: drawBounds.cx,
    y: drawBounds.cy,
    w: drawBounds.width,
    h: drawBounds.height,
    opacity: 100,
  })

  assignDrawRectTransform(json, node)

  const optionPreserveAspect = nodeNameAndStyle.options[STYLE_PRESERVE_ASPECT]
  if (optionPreserveAspect != null) {
    Object.assign(json, {
      preserve_aspect: checkBoolean(optionPreserveAspect),
    })
  }

  const optionRayCastTarget = nodeNameAndStyle.options[STYLE_RAYCAST_TARGET]
  if (optionRayCastTarget != null) {
    Object.assign(json, {
      raycast_target: checkBoolean(optionRayCastTarget),
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
    // 画像出力登録
    // この画像サイズが、0になっていた場合出力に失敗する
    // 例：レスポンシブパラメータを取得するため、リサイズする→しかし元にもどらなかった
    renditions.push({
      fileName: fileName,
      node: node,
      outputFile: file,
      type: application.RenditionType.PNG,
      scale: scale * localScale,
    })
  }
}

/**
 * @param option
 * @return {{}|null}
 */
function getSizeFitterParam(option) {
  if (option == null) return null
  let horizontalFit = null
  let verticalFit = null
  if (option === true) {
    horizontalFit = STR_PREFERRED
    verticalFit = STR_PREFERRED
  } else {
    const optionStr = option.toString().toLowerCase()
    if (optionStr.includes(STR_HORIZONTAL) || hasOptionParam(optionStr, 'x')) {
      horizontalFit = STR_PREFERRED
    }
    if (optionStr.includes(STR_VERTICAL) || hasOptionParam(optionStr, 'y')) {
      verticalFit = STR_PREFERRED
    }
  }

  let param = {}
  if (horizontalFit != null) {
    Object.assign(param, {
      horizontal_fit: horizontalFit,
    })
  }
  if (verticalFit != null) {
    Object.assign(param, {
      vertical_fit: verticalFit,
    })
  }
  if (Object.keys(param).length == 0) {
    return null
  }
  return param
}

/**
 * content-size-fit は content内のオプションになる
 * @param json
 * @param optionContentSizeFit
 */
function assignContentSizeFit(json, optionContentSizeFit) {
  if (optionContentSizeFit == null) return
  optionContentSizeFit = optionContentSizeFit.toLowerCase()
  let jsonContent = json[STR_CONTENT]
  if (jsonContent == null) {
    json[STR_CONTENT] = {}
    jsonContent = json[STR_CONTENT]
  }
  const sizeFitterParam = getSizeFitterParam(optionContentSizeFit)
  if (sizeFitterParam != null) {
    Object.assign(jsonContent, {
      size_fitter: sizeFitterParam,
    })
  }

  // Unityと乖離　ややこしくなる
  /*
  // $Contentが親(大抵Viewport)にサイズフィットするかどうか
  let sizeFitParent = ''
  if (optionContentSizeFit.includes('parenth')) {
    sizeFitParent += 'horizontal'
  }
  if (optionContentSizeFit.includes('parentv')) {
    sizeFitParent += 'vertical'
  }
  if (sizeFitParent != '') {
    Object.assign(jsonContent, {
      size_fit_parent: sizeFitParent,
    })
  }
  */
}

/**
 *
 * @param json
 * @param {{}} style
 */
function assignSizeFit(json, style) {
  const optionSizeFit = style[STYLE_SIZE_FIT]
  if (optionSizeFit != null) {
    const sizeFitterParam = getSizeFitterParam(optionSizeFit)
    if (sizeFitterParam != null) {
      Object.assign(json, {
        size_fitter: sizeFitterParam,
      })
    }
  }
}

/**
 *
 * @param {*} json
 * @param {SceneNode} node
 * @param {*} root
 * @param {*} subFolder
 * @param {*} renditions
 * @param {*} name
 * @param {*} style
 * @param {*} funcForEachChild
 * @param {*} depth=undefined
 * 出力構成
 * Viewport +Image(タッチ用透明)　+ScrollRect +RectMask2D
 *   - $Content ← 自動生成
 *      - Node
 * @scrollで、スクロール方向を指定することで、ScrollRectコンポーネントがつく
 * Content内のレイアウト定義可能
 * Content内、すべて変換が基本(XDの見た目そのままコンバートが基本)
 * Item化する場合は指定する
 */
async function createViewport(
  json,
  node,
  root,
  subFolder,
  renditions,
  name,
  style,
  funcForEachChild,
  depth,
) {
  // スクロールする方向を取得する
  // これがNULLのままなら、Unity上ではスクロールしない
  let scrollDirection = null
  const styleScroll = style[STYLE_SCROLL]
  if (styleScroll != null) {
    scrollDirection = ''
    if (
      styleScroll.includes(STR_VERTICAL) ||
      hasOptionParam(styleScroll, 'y')
    ) {
      scrollDirection += STR_VERTICAL
    }
    if (
      styleScroll.includes(STR_HORIZONTAL) ||
      hasOptionParam(styleScroll, 'x')
    ) {
      scrollDirection += STR_HORIZONTAL
    }
  }

  // Viewportは必ずcontentを持つ
  // contentのアサインと名前設定
  let contentName = '.content'
  Object.assign(json, {
    content: {
      name: contentName,
    },
  })

  let contentJson = json[STR_CONTENT]
  const contentStyle = getStyleFromNodeName(contentName, node, cssRules)

  if (node.constructor.name === 'Group') {
    /** @type {Group} */
    let groupNode = node
    // 通常グループ､マスクグループでViewportをつかう
    // Groupでもスクロールウィンドウはできるようにするが、RepeatGridではない場合レイアウト情報が取得しづらい
    let maskNode = null
    let calcContentBounds = new CalcBounds()

    // マスクが利用されたViewportである場合､マスクを取得する
    if (groupNode.mask) {
      maskNode = groupNode.mask
    } else {
      console.log('***error viewport:マスクがみつかりませんでした')
    }
    await funcForEachChild(null, child => {
      const childBounds = getGlobalBounds(child)
      calcContentBounds.addBounds(childBounds) // maskもContentBoundsの処理にいれる

      if (child === maskNode) {
        // maskはElement処理をしない
        return false
      }
      const nodeName = getNodeName(child)
      // まだviewportが確定していない場合､areaという名前の子供を探す(Baum2互換)
      if (maskNode == null && nodeName.toLowerCase() === 'area') {
        maskNode = child
        return false //処理しない(Elementに含まれない)
      }
      return true // 処理する
    })

    // 縦の並び順を正常にするため､Yでソートする
    sortElementsByPositionAsc(json.elements)

    const maskBounds = getGlobalBounds(maskNode)
    const maskBoundsCM = getDrawBoundsCMInBase(maskNode, root)

    Object.assign(json, {
      type: 'Viewport',
      name: getUnityName(node),
      x: maskBoundsCM.cx,
      y: maskBoundsCM.cy,
      w: maskBoundsCM.width,
      h: maskBoundsCM.height,
      fill_color: '#ffffff00', // タッチイベント取得Imageになる
      // Contentグループ情報
    })

    Object.assign(
      contentJson,
      getBoundsInBase(calcContentBounds.bounds, maskBounds), // 相対座標で渡す
    )

    assignLayout(json[STR_CONTENT], node, maskNode, node.children, contentStyle)
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
      const nodeName = getNodeName(child)
      const bounds = getGlobalDrawBounds(child)
      if (!testBounds(viewportBounds, bounds)) {
        console.log(nodeName + 'はViewportにはいっていない')
        return false // 処理しない
      }
      calcContentBounds.addBounds(bounds)
      return true // 処理する
    })

    const viewportBoundsCM = getDrawBoundsCMInBase(viewportNode, root)

    let child0 = viewportNode.children.at(0)
    const child0BoundsCM = getDrawBoundsCMInBase(child0, viewportNode)

    const cellWidth = viewportNode.cellSize.width * scale
    // item[0] がY方向へ移動している分
    const cellHeight = child0BoundsCM.cy + viewportNode.cellSize.height * scale

    Object.assign(json, {
      type: 'Viewport',
      name: getUnityName(node),
      x: viewportBoundsCM.cx,
      y: viewportBoundsCM.cy,
      w: viewportBoundsCM.width,
      h: viewportBoundsCM.height,
      fill_color: '#ffffff00', // タッチイベント取得Imageになる
      // Contentグループ情報
    })

    Object.assign(
      contentJson,
      getBoundsInBase(calcContentBounds.bounds, viewportBounds),
    )

    const contentOptionLayout = contentStyle[STYLE_LAYOUT]
    if (contentOptionLayout != null) {
      if (hasOptionParam(contentOptionLayout, 'grid')) {
        let gridLayoutJson = getGridLayoutFromRepeatGrid(viewportNode)

        // スクロールの方向が横なら、並びは縦から
        if (scrollDirection === STR_VERTICAL) {
          Object.assign(gridLayoutJson, {
            start_axis: STR_HORIZONTAL,
          })
        }

        // スクロールの方向が縦なら、並びは横から
        if (scrollDirection === STR_HORIZONTAL) {
          Object.assign(gridLayoutJson, {
            start_axis: STR_VERTICAL,
          })
        }

        // 固定する数(constraintCount)は、ここでは決定しない
        // レスポンシブに変更される数なので、アプリケーション側で対応する
        // 高さがFIXされていれば、FixedRowCountは決定してもいいかも
        // https://forum.unity.com/threads/gridlayout-contentsizefitter-doesnt-work-in-4-6-1p3.286353/
        // ここで、GridLayout、ContentSizeFitterをしたうえで、constraintCountを決めるMonoBehaviourサンプルがある

        Object.assign(contentJson, {
          layout: gridLayoutJson,
        })
      }
    }
  }

  assignDrawRectTransform(json, node)

  assignSizeFit(json, style)
  // scrollオプションが設定されていれば、scroll情報を埋め込む
  if (styleScroll) {
    Object.assign(json, {
      scroll: {
        direction: scrollDirection,
        auto_assign_scrollbar: true, // 同一グループ内からスクロールバーを探す
      },
    })
  }

  // Content系
  // SizeFit
  assignSizeFit(contentJson, contentStyle)

  // ContentのRectTransformを決める
  const contentWidth = contentJson['width']
  const contentHeight = contentJson['height']
  const contentOptionFix = getOptionFix(contentStyle[STYLE_FIX])
  let pivot = { x: 0, y: 1 } // top-left
  let anchorMin = { x: 0, y: 1 }
  let anchorMax = { x: 0, y: 1 }
  let offsetMin = { x: 0, y: -contentHeight }
  let offsetMax = { x: contentWidth, y: 0 }
  if (contentOptionFix != null) {
    if (contentOptionFix.top === true && contentOptionFix.bottom === true) {
      // 親と縦を一致させる　ViewportとMaskが同じサイズ、という条件のもと成り立つ方法
      anchorMin.y = 0
      offsetMin.y = 0
    }
    if (contentOptionFix.left === true && contentOptionFix.right === true) {
      // 親と横を一致させる　ViewportとMaskが同じサイズ、という条件のもと成り立つ方法
      anchorMax.x = 1
      offsetMax.x = 0
    }
  }
  Object.assign(contentJson, {
    fix: contentOptionFix,
    pivot: pivot, // ここのPivotはX,Yで渡す　他のところは文字列になっている
    anchor_min: anchorMin,
    anchor_max: anchorMax,
    offset_min: offsetMin,
    offset_max: offsetMax,
  })
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
 * @return {{}}
 */
function getGridLayoutFromRepeatGrid(repeatGrid) {
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
    const nodeNameAndStyle = getNodeNameAndStyle(node)
    // コンポーネントにする場合は除く
    if (nodeNameAndStyle.options[STYLE_COMPONENT]) return
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
  let jsonVLayout = {}
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

  /*
  // items全部が stretchx:true なら　ChildForceExpand.width = true
  const foundNotStretchX = elements.forEach(elem => {
    return elem["stretchx"] !== true
  })
  if (!foundNotStretchX) {
    Object.assign(jsonVLayout, {
      child_force_expand_width: true
    })
  }
  */

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
    jsonLayout = getGridLayoutFromRepeatGrid(viewportNode)
  } else {
    // RepeatGridでなければ、VLayout情報から取得する
    jsonLayout = calcLayout(json, viewportNode, maskNode, children)
    jsonLayout['method'] = 'grid'
  }
  return jsonLayout
}

/**
 * @param optionLayoutString
 * @param json
 * @param viewportNode
 * @param maskNode
 * @param children
 * @return {null}
 */
function getLayoutJson(
  optionLayoutString,
  json,
  viewportNode,
  maskNode,
  children,
) {
  let layoutJson = null
  if (
    optionLayoutString.includes(STR_VERTICAL) ||
    hasOptionParam(optionLayoutString, 'y')
  ) {
    layoutJson = calcVLayout(json, viewportNode, maskNode, children)
  } else if (
    optionLayoutString.includes(STR_HORIZONTAL) ||
    hasOptionParam(optionLayoutString, 'x')
  ) {
    layoutJson = calcHLayout(json, viewportNode, maskNode, children)
  } else if (
    optionLayoutString.includes('grid') ||
    hasOptionParam(optionLayoutString, 'g')
  ) {
    layoutJson = calcGridLayout(json, viewportNode, maskNode, children)
  }
  if (layoutJson != null) {
    Object.assign(layoutJson, {
      control_child_size_width: true,
      control_child_size_height: true,
    })
    if (optionLayoutString.includes('expand-x')) {
      Object.assign(layoutJson, {
        child_force_expand_width: true,
      })
    }
    if (optionLayoutString.includes('expand-y')) {
      Object.assign(layoutJson, {
        child_force_expand_height: true,
      })
    }
  }
  return layoutJson
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
  if (style == null || style[STYLE_LAYOUT] == null) return
  let styleLayout = style[STYLE_LAYOUT]
  let layoutJson = getLayoutJson(
    styleLayout,
    json,
    viewportNode,
    maskNode,
    children,
  )

  const layoutSpacingX = style['layout-spacing-x']
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
  if (id != null) {
    return id
  }
  return nodeName
}

/**
 *
 * @param json
 * @param {SceneNode} node
 * @param root
 * @param subFolder
 * @param renditions
 * @param name
 * @param style
 * @param funcForEachChild
 * @param depth
 * @return {Promise<string>}
 */
async function createGroup(
  json,
  node,
  root,
  subFolder,
  renditions,
  name,
  style,
  funcForEachChild,
  depth,
) {
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
  assignDrawRectTransform(json, node)
  assignCanvasGroup(json, node, style)
  await funcForEachChild()

  assignLayout(json, node, node, node.children, style)
  assignSizeFit(json, style)

  return type
}

/**
 * @param style
 * @param json
 * @param name
 * @param node
 * @param funcForEachChild
 * @returns {Promise<void>}
 */
async function createScrollbar(style, json, name, node, funcForEachChild) {
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

  assignSizeFit(json, style)
  assignLayout(json, node, node, node.children, style)

  assignDrawRectTransform(json, node)
  await funcForEachChild()
  //return type
}

/**
 *
 * @param {} json
 * @param {SceneNodeClass} node
 * @param {} style
 */
function assignLayoutElement(json, node, style) {
  if (style[STYLE_LAYOUT_ELEMENT] == null) return
  const option = style[STYLE_LAYOUT_ELEMENT]
  if (hasOptionParam(option, 'min')) {
    const bounds = getGlobalDrawBounds(node)
    Object.assign(json, {
      layout_element: {
        min_width: bounds.width,
        min_height: bounds.height,
      },
    })
  }
}

/**
 * @param json
 * @param name
 * @param style
 * @param node
 * @param root
 * @param funcForEachChild
 * @returns {Promise<string>}
 */
async function createToggle(json, name, style, node, root, funcForEachChild) {
  const type = 'Toggle'
  Object.assign(json, {
    type: type,
    name: getUnityName(node),
  })
  // Toggle group
  if (style[STYLE_TOGGLE_GROUP]) {
    Object.assign(json, {
      group: style[STYLE_TOGGLE_GROUP],
    })
  }
  assignLayoutElement(json, node, style)
  assignDrawRectTransform(json, node)
  assignBoundsCM(json, getDrawBoundsCMInBase(node, root))
  assignState(json, style)
  await funcForEachChild()
  return type
}

/**
 *
 * @param json
 * @param name
 * @param node
 * @param root
 * @param funcForEachChild
 * @returns {Promise<string>}
 */
async function createButton(json, name, node, root, funcForEachChild) {
  const type = 'Button'
  Object.assign(json, {
    type: type,
    name: getUnityName(node),
  })
  assignDrawRectTransform(json, node)
  assignBoundsCM(json, getDrawBoundsCMInBase(node, root))
  assignState(json, getNodeNameAndStyle(node))
  await funcForEachChild()
  return type
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
 * @param {string} name
 * @param {} style
 * @param depth
 * @returns {Promise<string|void|*>}
 */
async function nodeGroup(
  json,
  node,
  root,
  subFolder,
  renditions,
  name,
  style,
  funcForEachChild,
  depth,
) {
  if (depth > 0 && checkStyleSubPrefab(style)) {
    // SubPrefabオプションをみつけた場合それ以下の処理は行わないようにする
    // 深度が0以上というのは､必要か　→　必要 出力ノードになっている場合､depth==0なので
    return 'subPrefab'
  }
  if (checkStyleImage(style)) {
    await createImage(json, node, root, subFolder, renditions, name, style)
    return 'Image'
  }

  if (checkStyleButton(style)) {
    return await createButton(json, name, node, root, funcForEachChild)
  }

  if (checkStyleSlider(style)) {
    const type = 'Slider'
    Object.assign(json, {
      type: type,
      name: getUnityName(node),
    })
    assignDrawRectTransform(json, node)
    await funcForEachChild()
    return type
  }

  if (checkStyleScrollbar(style)) {
    await createScrollbar(style, json, name, node, funcForEachChild)
    return 'Scrollbar'
  }

  if (checkStyleToggle(style)) {
    return await createToggle(json, name, style, node, root, funcForEachChild)
  }

  if (checkStyleScroller(style)) {
    return await createScroller(
      json,
      node,
      root,
      subFolder,
      renditions,
      name,
      style,
      funcForEachChild,
    )
  }

  if (checkStyleViewport(style)) {
    return await createViewport(
      json,
      node,
      root,
      subFolder,
      renditions,
      name,
      style,
      funcForEachChild,
    )
  }

  // 通常のグループ
  return await createGroup(
    json,
    node,
    root,
    subFolder,
    renditions,
    name,
    style,
    funcForEachChild,
  )
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

/**
 * 文字列の中に所定のパラメータ文字列がるかチェックする
 * option = x
 * option = ,x,
 * option = ,x
 * @param {string} optionStr
 * @param {string} paramStr
 * @return {null|boolean}
 */
function hasOptionParam(optionStr, paramStr) {
  if (optionStr == null || paramStr == null) return null
  if (optionStr === paramStr) return true
  if (optionStr.startsWith(`${paramStr} `)) return true
  if (optionStr.indexOf(` ${paramStr} `) >= 0) return true
  return optionStr.endsWith(` ${paramStr}`)
}

/**
 * @param {string} optionFix
 * @returns {null|{top: boolean, left: boolean, bottom: boolean, width: boolean, right: boolean, height: boolean}}
 */
function getOptionFix(optionFix) {
  if (optionFix == null) {
    return null
  }
  let fixOption = optionFix.toLowerCase()
  let fixOptionWidth = false
  let fixOptionHeight = false
  let fixOptionTop = false
  let fixOptionBottom = false
  let fixOptionLeft = false
  let fixOptionRight = false

  if (
    hasOptionParam(fixOption, 'w') ||
    fixOption.indexOf('width') >= 0 ||
    fixOption.indexOf('size') >= 0
  ) {
    fixOptionWidth = true
  }
  if (
    hasOptionParam(fixOption, 'h') ||
    fixOption.indexOf('height') >= 0 ||
    fixOption.indexOf('size') >= 0
  ) {
    fixOptionHeight = true
  }
  if (hasOptionParam(fixOption, 't') || fixOption.indexOf('top') >= 0) {
    fixOptionTop = true
  }
  if (hasOptionParam(fixOption, 'b') || fixOption.indexOf('bottom') >= 0) {
    fixOptionBottom = true
  }
  if (hasOptionParam(fixOption, 'l') || fixOption.indexOf('left') >= 0) {
    fixOptionLeft = true
  }
  if (hasOptionParam(fixOption, 'r') || fixOption.indexOf('right') >= 0) {
    fixOptionRight = true
  }
  if (hasOptionParam(fixOption, 'x')) {
    fixOptionLeft = true
    fixOptionRight = true
  }
  if (hasOptionParam(fixOption, 'y')) {
    fixOptionTop = true
    fixOptionBottom = true
  }

  return {
    left: fixOptionLeft,
    right: fixOptionRight,
    top: fixOptionTop,
    bottom: fixOptionBottom,
    width: fixOptionWidth,
    height: fixOptionHeight,
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
 * @param hashBounds
 * @param style
 * @param calcDrawBounds
 * @return {{offset_max: {x: null, y: null}, fix: {top: (boolean|number), left: (boolean|number), bottom: (boolean|number), width: boolean, right: (boolean|number), height: boolean}, anchor_min: {x: null, y: null}, anchor_max: {x: null, y: null}, offset_min: {x: null, y: null}}|null}
 */
function calcRectTransform(node, hashBounds, style, calcDrawBounds = true) {
  if (!node || !node.parent) return null
  if (!style) {
    // @Pivot @Stretchを取得するため
    const nodeNameAndStyle = getNodeNameAndStyle(node)
    style = nodeNameAndStyle.options
  }
  // console.log(`----------------------${node.name}----------------------`)
  let fixOptionWidth = null
  let fixOptionHeight = null
  let fixOptionTop = null
  let fixOptionBottom = null
  let fixOptionLeft = null
  let fixOptionRight = null

  const optionFix = style[STYLE_FIX]
  if (optionFix != null) {
    // オプションが設定されたら、全ての設定が決まる(NULLではなくなる)
    const options = getOptionFix(optionFix)
    fixOptionWidth = options.width
    fixOptionHeight = options.height
    fixOptionTop = options.top
    fixOptionBottom = options.bottom
    fixOptionLeft = options.left
    fixOptionRight = options.right
  }

  const boundsParameterName = calcDrawBounds ? 'bounds' : 'global_bounds'

  const bounds = hashBounds[node.guid]
  if (!bounds || !bounds['before'] || !bounds['after']) return null
  const beforeBounds = bounds['before'][boundsParameterName]
  const afterBounds = bounds['after'][boundsParameterName]
  const parentBounds = hashBounds[node.parent.guid]
  if (!parentBounds || !parentBounds['before'] || !parentBounds['after'])
    return null

  const parentBeforeBounds = parentBounds['before'][boundsParameterName]
  const parentAfterBounds = parentBounds['after'][boundsParameterName]

  // console.log(parentBeforeBounds)
  // console.log(beforeBounds)

  // X座標
  // console.log(node.name + '-------------------')
  // console.log(beforeBounds.width, afterBounds.width)
  if (fixOptionWidth == null) {
    if (approxEqual(beforeBounds.width, afterBounds.width, 0.0005)) {
      fixOptionWidth = true
    } else {
      fixOptionWidth = false
    }
  }

  if (fixOptionLeft == null) {
    if (
      approxEqual(
        beforeBounds.x - parentBeforeBounds.x,
        afterBounds.x - parentAfterBounds.x,
      )
    ) {
      // ロックされている
      fixOptionLeft = true
    } else {
      // 親のX座標･Widthをもとに､Left座標がきまる
      fixOptionLeft =
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

  if (fixOptionRight == null) {
    if (fixOptionRight == null && approxEqual(beforeRight, afterRight, 0.001)) {
      // ロックされている 0.001以下の誤差が起きることを確認した
      fixOptionRight = true
    } else {
      // 親のX座標･Widthをもとに､割合でRight座標がきまる
      fixOptionRight =
        (parentBeforeBounds.ex - beforeBounds.ex) / parentBeforeBounds.width
    }
  }

  // Y座標
  if (fixOptionHeight == null) {
    if (approxEqual(beforeBounds.height, afterBounds.height, 0.0005)) {
      fixOptionHeight = true
    } else {
      fixOptionHeight = false
    }
  }

  if (fixOptionTop == null) {
    if (
      approxEqual(
        beforeBounds.y - parentBeforeBounds.y,
        afterBounds.y - parentAfterBounds.y,
      )
    ) {
      fixOptionTop = true
    } else {
      // 親のY座標･heightをもとに､Top座標がきまる
      fixOptionTop =
        (beforeBounds.y - parentBeforeBounds.y) / parentBeforeBounds.height
    }
  }

  const beforeBottom = parentBeforeBounds.ey - beforeBounds.ey
  const afterBottom = parentAfterBounds.ey - afterBounds.ey
  if (fixOptionBottom == null) {
    if (
      fixOptionBottom == null &&
      approxEqual(beforeBottom, afterBottom, 0.0005)
    ) {
      fixOptionBottom = true
    } else {
      // 親のY座標･Heightをもとに､Bottom座標がきまる
      fixOptionBottom =
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

  if (fixOptionLeft === true) {
    // 親のX座標から､X座標が固定値できまる
    anchorMin.x = 0
    offsetMin.x = beforeBounds.x - parentBeforeBounds.x
  } else {
    anchorMin.x = fixOptionLeft
    offsetMin.x = 0
  }
  if (fixOptionRight === true) {
    // 親のX座標から､X座標が固定値できまる
    anchorMax.x = 1
    offsetMax.x = beforeBounds.ex - parentBeforeBounds.ex
  } else {
    anchorMax.x = 1 - fixOptionRight
    offsetMax.x = 0
  }

  if (fixOptionWidth) {
    if (fixOptionLeft === true /*&& fixOptionRight !== true*/) {
      anchorMax.x = anchorMin.x
      offsetMax.x = offsetMin.x + beforeBounds.width
    } else if (fixOptionLeft !== true && fixOptionRight === true) {
      anchorMin.x = anchorMax.x
      offsetMin.x = offsetMax.x - beforeBounds.width
    }
    if (fixOptionLeft !== true && fixOptionRight !== true) {
      //両方共ロックされていない
      anchorMin.x = anchorMax.x = (fixOptionLeft + 1 - fixOptionRight) / 2
      offsetMin.x = -beforeBounds.width / 2
      offsetMax.x = beforeBounds.width / 2
    }
  }

  // AdobeXD と　Unity2D　でY軸の向きがことなるため､Top→Max　Bottom→Min
  if (fixOptionTop === true) {
    // 親のY座標から､Y座標が固定値できまる
    anchorMax.y = 1
    offsetMax.y = -(beforeBounds.y - parentBeforeBounds.y)
  } else {
    anchorMax.y = 1 - fixOptionTop
    offsetMax.y = 0
  }
  if (fixOptionBottom === true) {
    // 親のY座標から､Y座標が固定値できまる
    anchorMin.y = 0
    offsetMin.y = -(beforeBounds.ey - parentBeforeBounds.ey)
  } else {
    anchorMin.y = fixOptionBottom
    offsetMin.y = 0
  }

  if (fixOptionHeight) {
    if (fixOptionTop === true /*&& fixOptionBottom !== true*/) {
      anchorMin.y = anchorMax.y
      offsetMin.y = offsetMax.y - beforeBounds.height
    } else if (fixOptionTop !== true && fixOptionBottom === true) {
      anchorMax.y = anchorMin.y
      offsetMax.y = offsetMin.y + beforeBounds.height
    } else if (fixOptionTop !== true && fixOptionBottom !== true) {
      //両方共ロックされていない
      anchorMin.y = anchorMax.y = 1 - (fixOptionTop + 1 - fixOptionBottom) / 2
      offsetMin.y = -beforeBounds.height / 2
      offsetMax.y = beforeBounds.height / 2
    }
  }

  if (
    optionFix != null &&
    (hasOptionParam(optionFix, 'c') || optionFix.indexOf('center') >= 0)
  ) {
    anchorMin.x = 0.5
    anchorMax.x = 0.5
    const center = beforeBounds.x + beforeBounds.width / 2
    const parentCenter = parentBeforeBounds.x + parentBeforeBounds.width / 2
    offsetMin.x = center - parentCenter - beforeBounds.width / 2
    offsetMax.x = center - parentCenter + beforeBounds.width / 2
  }

  if (
    optionFix != null &&
    (hasOptionParam(optionFix, 'm') || optionFix.indexOf('middle') >= 0)
  ) {
    anchorMin.y = 0.5
    anchorMax.y = 0.5
    const middle = beforeBounds.y + beforeBounds.height / 2
    const parentMiddle = parentBeforeBounds.y + parentBeforeBounds.height / 2
    offsetMin.y = -(middle - parentMiddle) - beforeBounds.height / 2
    offsetMax.y = -(middle - parentMiddle) + beforeBounds.height / 2
  }

  return {
    fix: {
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
  }
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
 * root以下のノードのレスポンシブパラメータ作成
 * @param root
 * @return {{node:{}, before:{}, after:{}, restore:{} responsiveParameter:{}}}
 */
function makeResponsiveParameter(root) {
  let hashBounds = {}
  // 現在のboundsを取得する
  nodeWalker(root, node => {
    hashBounds[node.guid] = {
      node: node,
      before: {
        visible: node.visible,
        bounds: getGlobalDrawBounds(node),
        global_bounds: getGlobalBounds(node),
      },
    }
  })

  const rootWidth = root.globalBounds.width
  const rootHeight = root.globalBounds.height
  const resizePlusWidth = 100
  const resizePlusHeight = 100

  // Artboardのリサイズ
  const viewportHeight = root.viewportHeight // viewportの高さの保存
  root.resize(rootWidth + resizePlusWidth, rootHeight + resizePlusHeight)
  if (root.viewportHeight != null) {
    // viewportの高さを高さが変わった分の変化に合わせる
    root.viewportHeight = viewportHeight + resizePlusHeight
  }

  // 変更されたboundsを取得する
  nodeWalker(root, node => {
    let hash = hashBounds[node.guid] || (hashBounds[node.guid] = {})
    hash['after'] = {
      bounds: getGlobalDrawBounds(node),
      global_bounds: getGlobalBounds(node),
    }
  })

  // Artboardのサイズを元に戻す
  root.resize(rootWidth, rootHeight)
  if (root.viewportHeight != null) root.viewportHeight = viewportHeight

  // 元に戻ったときのbounds
  nodeWalker(root, node => {
    hashBounds[node.guid]['restore'] = {
      bounds: getGlobalDrawBounds(node),
      global_bounds: getGlobalBounds(node),
    }
  })

  // レスポンシブパラメータの生成
  for (let key in hashBounds) {
    let value = hashBounds[key]
    // DrawBoundsでのレスポンシブパラメータ(場合によっては不正確)
    value['responsiveParameter'] = calcRectTransform(
      value['node'],
      hashBounds,
      null,
    )
    // GlobalBoundsでのレスポンシブパラメータ(場合によっては不正確)
    value['responsiveParameterGlobal'] = calcRectTransform(
      value['node'],
      hashBounds,
      null,
      false,
    )
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
 * @param {*} hashBounds
 * @param {boolean|null} repair
 */
function checkHashBounds(hashBounds, repair) {
  let result = true
  for (const key in hashBounds) {
    const value = hashBounds[key]
    if (value['before'] && value['restore']) {
      let beforeBounds = value['before']['bounds']
      let restoreBounds = value['restore']['bounds']
      if (!checkBoundsVerbose(beforeBounds, restoreBounds)) {
        // 変わってしまった
        let node = value['node']
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
  return bounds ? bounds['responsiveParameter'] : null
}

/**
 * GlobalBoundsでのレスポンシブパラメータの取得
 * @param {SceneNode} node
 */
function getRectTransform(node) {
  let bounds = responsiveBounds[node.guid]
  return bounds ? bounds['responsiveParameterGlobal'] : null
}

/**
 * 幅が固定されているか
 * @param {*} node
 */
function isFixWidth(node) {
  const param = getDrawRectTransform(node)
  return checkBoolean(param['fix']['width'])
}

function isFixHeight(node) {
  const param = getDrawRectTransform(node)
  return checkBoolean(param['fix']['height'])
}

/**
 * テキストレイヤーの処理
 * @param {*} json
 * @param {SceneNode} node
 * @param {Artboard} artboard
 * @param {*} subfolder
 * @param {[]} renditions
 * @param {string} name
 * @param {string[]} style
 */
async function nodeText(
  json,
  node,
  artboard,
  subfolder,
  renditions,
  name,
  style,
) {
  // ラスタライズオプションチェック
  if (optionForceTextToImage || checkStyleImage(style)) {
    await createImage(json, node, artboard, subfolder, renditions, name, style)
    return
  }

  if (
    !checkStyleText(style) &&
    !checkStyleInput(style) &&
    !checkStyleTextMeshPro(style)
  ) {
    await createImage(json, node, artboard, subfolder, renditions, name, style)
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
  const optionAlign = style[STYLE_ALIGN]
  if (optionAlign != null) {
    hAlign = optionAlign
  }

  // @v-align オプションがあった場合、上書きする
  // XDでは、left-center-rightは設定できるため
  const optionVAlign = style[STYLE_V_ALIGN]
  if (optionVAlign != null) {
    vAlign = optionVAlign
  }

  // text.styleRangesの適応をしていない
  Object.assign(json, {
    type: type,
    name: getUnityName(node),
    text: node.text,
    textType: textType,
    font: node.fontFamily,
    style: node.fontStyle,
    size: node.fontSize * scale,
    color: getRGB(node.fill.value),
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
}

/**
 * パスレイヤー(楕円や長方形等)の処理
 * @param {*} json
 * @param {SceneNode} node
 * @param {Artboard} root
 * @param {*} subFolder
 * @param {*} renditions
 * @param {string} unityName
 * @param {{}} style
 */
async function createImage(
  json,
  node,
  root,
  subFolder,
  renditions,
  unityName,
  style,
) {
  // もしボタンオプションがついているのなら　ボタンを生成してその子供にイメージをつける
  unityName = getUnityName(node)
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
    await assignImage(
      json.elements[0],
      node,
      root,
      subFolder,
      renditions,
      unityName,
      style,
    )
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
      name: unityName,
    })
    assignDrawRectTransform(json, node)
    assignState(json, style)
    await assignImage(json, node, root, subFolder, renditions, unityName, style)
    // assignComponent
    if (style[STYLE_COMPONENT] != null) {
      Object.assign(json, {
        component: {},
      })
    }
    // assignPreferredHeight
    if (style[STYLE_PREFERRED_HEIGHT] != null) {
      Object.assign(json, {
        preferred_height: json.h, //assignImageでわりあてられている
      })
    }
    // assignMinHeight
    if (style[STYLE_MIN_HEIGHT] != null) {
      Object.assign(json, {
        min_height: json.h, //assignImageでわりあてられている
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
 * 名前後ろに機能が入っているかどうかのチェック
 * @param type
 * @param name
 * @return {boolean}
 */
function checkEndsTypeName(type, name) {
  return (
    type === name ||
    name.endsWith('+' + type) ||
    name.endsWith('-' + type) ||
    name.endsWith('_' + type) ||
    name.endsWith('.' + type) ||
    name.endsWith(' ' + type)
  )
}

/**
 * NodeNameはXDでつけられたものをTrimしただけ
 * @param {SceneNodeClass} node
 * @returns {string}
 */
function getNodeName(node) {
  return node.name.trim()
}

function getIdFromNodeName(nodeName) {
  if (nodeName == null) {
    return null
  }
  const selector = parseCssSelector(nodeName)
  for (let selectorElement of selector) {
    if (selectorElement.name.startsWith('#')) {
      return selectorElement.name.substring(1)
    }
  }
  return null
}

/**
 * 現時点での仕様では、XDのnameはClass
 * ・重複OK(idは重複なし)
 * ・複数持てる 例 "viewport-x list-x"
 * TODO: この関数はSelectorのマッチ用によく呼び出されるため、キャッシュの生成が必要
 * @param nodeName
 * @returns {string[]}
 */
function getClassesFromNodeName(nodeName) {
  // 分解
  const names = parseCssSelector(nodeName)
  // .がついているもの（Class名）を探す
  const classes = []
  for (const arg of names) {
    if (arg.name.startsWith('.')) {
      classes.push(arg.name)
    }
  }
  return classes
}

/**
 *
 * @param {string} nodeName
 * @param {SceneNodeClass} parent
 * @param cssRules
 * @returns {*}
 */
function getStyleFromNodeName(nodeName, parent, cssRules) {
  // console.log('--------------------------------', nodeName)
  const style = {}
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
      switch (currentSelectorOp.op) {
        case '': {
          let nodeClasses = getClassesFromNodeName(nodeName)
          const found = nodeClasses.find(nodeClass => {
            // console.log('--------------------------------nodeClass', nodeClass)
            // console.log("'" + currentSelectorOp.name + "'=='" + nodeClass + "'")
            return nodeClass === currentSelectorOp.name
          })
          if (found == null) {
            // 見つからなかった
            selectorMatch = false
            break // 次のルール
          }
          // console.log('-----------------found---------------')
          break
        }
        case '>': {
          if (tmpParent == null) {
            selectorMatch = false
            break
          }
          let classes = getClassesFromNodeName(getNodeName(tmpParent))
          tmpParent = tmpParent.parent
          const found = classes.find(
            className => className === currentSelectorOp.name,
          )
          if (found == null) {
            // 見つからなかった
            selectorMatch = false
            break // 次のルール
          }
          // console.log('---------------------------found')
          break
        }
        default:
          console.log('***error unknown selector.op:', currentSelectorOp.op)
          break
      }
    }
    if (selectorMatch) {
      Object.assign(style, rule.style)
    }
  }
  return style
}

/**
 * node.nameをパースしオプションに分解する
 * オプションのダイナミックな追加など､ここで処理しないと辻褄があわないケースがでてくる
 * @param {SceneNodeClass} node
 * @returns {null|{node_name: string, name: string, options: *, style: *}}
 */
function getNodeNameAndStyle(node) {
  if (node == null) {
    return null
  }

  let parentNode = node.parent
  let nodeName = getNodeName(node)
  const style = getStyleFromNodeName(nodeName, parentNode, cssRules)

  if (parentNode.constructor.name === 'RepeatGrid') {
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
    nodeName = '0'
    // 自身のChildインデックスを名前に利用する
    for (let i = 0; i < parentNode.children.length; i++) {
      if (parentNode.children.at(i) === node) {
        nodeName = i.toString()
        break
      }
    }

    // RepeatGridで、子供がすべてコメントアウトなら、子供を包括するグループもコメントアウトする
    let commentOut = true
    node.children.forEach(child => {
      if (!child.name.startsWith('//')) {
        commentOut = false
      }
    })
    if (commentOut) {
      style[STYLE_COMMENT_OUT] = true
    }
  }

  // 名前の最初1文字目が//ならコメントNode
  if (nodeName.startsWith('//')) {
    style[STYLE_COMMENT_OUT] = true
    nodeName = nodeName.substring(2)
  }

  const css = parseCss(nodeName)
  if (css != null && css.length > 0) {
    // nodeNameのCSSパースに成功している -> ローカルStyleを持っている
    Object.assign(style, css[0].style) // 上書きする
    console.log('-----------style------------', style)
  }

  return {
    node_name: nodeName,
    name: nodeName, // 削除予定
    style,
    options: style, // 削除予定
  }
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
 * アートボードの処理
 * @param {*} renditions
 * @param {*} outputFolder
 * @param {Artboard} root
 */
async function nodeRoot(renditions, outputFolder, root) {
  let subFolder
  let nodeNameAndStyle = getNodeNameAndStyle(root)

  let subFolderName = nodeNameAndStyle.name

  // フォルダ名に使えない文字を'_'に変換
  subFolderName = convertToFileName(subFolderName)

  // アートボード毎にフォルダを作成する
  // TODO:他にやりかたはないだろうか
  try {
    subFolder = await outputFolder.getEntry(subFolderName)
  } catch (e) {
    subFolder = await outputFolder.createFolder(subFolderName)
  }

  const layoutFileName = subFolderName + '.layout.json'
  const layoutFile = await outputFolder.createFile(layoutFileName, {
    overwrite: true,
  })

  let layoutJson = makeLayoutJson(root)

  let nodeWalker = async (nodeStack, layoutJson, depth, parentJson) => {
    let node = nodeStack[nodeStack.length - 1]
    let constructorName = node.constructor.name
    // レイヤー名から名前とオプションの分割
    let { name, options } = getNodeNameAndStyle(node)

    const indent = (() => {
      let sp = ''
      for (let i = 0; i < depth; i++) sp += '  '
      return sp
    })()

    /*
    console.log(
      indent + "'" + name + "':" + constructorName,
      options,
      responsiveBounds[node.guid]['responsiveParameter'],
    )
    */

    // コメントアウトチェック
    if (checkStyleCommentOut(options)) {
      return
    }

    // 子Node処理関数
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
    switch (constructorName) {
      case 'Artboard':
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
        break
      case 'BooleanGroup':
        {
          // BooleanGroupは強制的にラスタライズする
          options[STYLE_TYPE_IMAGE] = true
          const type = await nodeGroup(
            layoutJson,
            node,
            root,
            subFolder,
            renditions,
            name,
            options,
            funcForEachChild,
            depth,
          )
        }
        break
      case 'Group':
      case 'RepeatGrid':
      case 'SymbolInstance':
        {
          const type = await nodeGroup(
            layoutJson,
            node,
            root,
            subFolder,
            renditions,
            name,
            options,
            funcForEachChild,
            depth,
          )
        }
        break
      case 'Line':
      case 'Ellipse':
      case 'Rectangle':
      case 'Path':
      case 'Polygon':
        await createImage(
          layoutJson,
          node,
          root,
          subFolder,
          renditions,
          name,
          options,
        )
        await funcForEachChild()
        break
      case 'Text':
        await nodeText(
          layoutJson,
          node,
          root,
          subFolder,
          renditions,
          name,
          options,
        )
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
  console.log(layoutFileName)
}

// シンボル出力用サブフォルダ　未使用
let symbolSubFolder

// Baum2 export
async function exportBaum2(roots, outputFolder, responsiveCheckArtboards) {
  // ラスタライズする要素を入れる
  let renditions = []

  // レスポンシブパラメータの作成
  responsiveBounds = {}
  for (const i in responsiveCheckArtboards) {
    let artboard = responsiveCheckArtboards[i]
    Object.assign(responsiveBounds, makeResponsiveParameter(artboard))
  }

  checkHashBounds(responsiveBounds, true)

  // シンボル用サブフォルダの作成
  // try {
  //   symbolSubFolder = await outputFolder.getEntry('symbol')
  // } catch (e) {
  //   symbolSubFolder = await outputFolder.createFolder('symbol')
  // }

  // アートボード毎の処理
  for (const i in roots) {
    let root = roots[i]
    await nodeRoot(renditions, outputFolder, root)
  }

  // すべて可視にする
  // 背景のぼかしをすべてオフにする　→　ボカシがはいっていると､その画像が書き込まれるため
  for (const i in roots) {
    let root = roots[i]
    nodeWalker(root, node => {
      const nodeNameAndStyle = getNodeNameAndStyle(node)
      if (checkStyleCommentOut(nodeNameAndStyle.options)) {
        return false // 子供には行かないようにする
      }
      try {
        node.visible = true
      } catch (e) {
        console.log(
          '***error ' + nodeNameAndStyle.name + ': visible true failed.',
        )
      }
      try {
        if (node.blur != null) {
          // ぼかしをオフ
          node.blur = null
        }
      } catch (e) {
        console.log('***error ' + nodeNameAndStyle.name + ': blur off failed.')
      }
      // 9SLICEであった場合、そのグループの不可視情報はそのまま活かすため
      // 自身は可視にし、子供の不可視情報は生かす
      // 本来は sourceImageをNaturalWidth,Heightで出力する
      if (nodeNameAndStyle.options[STYLE_IMAGE_SLICE] != null) {
        return false
      }
    })
  }

  if (renditions.length !== 0) {
    // 一括画像ファイル出力
    await application
      .createRenditions(renditions)
      .then(results => {
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
 *
 * @param {Selection} selection
 * @param {RootNode} root
 * @returns {SceneNode[]}
 */
function getExportRootNodes(selection, root) {
  // 選択されているものがない場合 全てが変換対象
  // return selection.items.length > 0 ? selection.items : root.children
  if (selection.items.length !== 1) {
    alert('出力アートボート直下のノードを1つ選択してください')
    throw 'not selected immediate child.'
  }
  const node = selection.items[0]
  const parentIsArtboard = node.parent instanceof Artboard
  if (!parentIsArtboard) {
    alert('出力アートボート直下のノードを1つ選択してください')
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
  await loadCssRules()

  let inputFolder
  let inputScale
  let errorLabel
  let checkEnableSubPrefab
  let checkTextToTMP
  let checkForceTextToImage
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
        (checkTextToTMP = h('input', {
          type: 'checkbox',
        })),
        h('span', 'TextはTextMeshProにして出力する (拡張モードが必要)'),
      ),
      h(
        'label',
        {
          style: {
            flexDirection: 'row',
            alignItems: 'center',
          },
        },
        (checkForceTextToImage = h('input', {
          type: 'checkbox',
        })),
        h('span', 'Textを強制的に画像にして出力する'),
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
              // サブPrefab
              // optionEnableSubPrefab = checkEnableSubPrefab.checked
              //
              optionDefaultTextMP = checkTextToTMP.checked
              //
              optionForceTextToImage = checkForceTextToImage.checked
              //
              optionCheckMarkedForExport = checkCheckMarkedForExport.checked

              dialog.close('export')
            },
          },
          'Export',
        ),
      ),
    ),
  )

  let exportRootNodes = getExportRootNodes(selection, root)

  // 出力前にセッションデータをダイアログに反映する
  // Scale
  inputScale.value = scale
  // Folder
  inputFolder.value = ''
  if (outputFolder != null) {
    inputFolder.value = outputFolder.nativePath
  }
  // Responsive Parameter
  // checkEnableSubPrefab.checked = optionEnableSubPrefab
  checkTextToTMP.checked = optionDefaultTextMP
  checkForceTextToImage.checked = optionForceTextToImage
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
    // 出力ノードリスト
    let exports = {}
    // レスポンシブパラメータを取得するため､操作を行うアートボード
    let responsiveCheckArtboards = {}

    // Artboard､SubPrefabを探し､　必要であればエキスポートマークチェックを行い､ 出力リストに登録する
    let currentArtboard = null
    let funcForEach = nodes => {
      nodes.forEach(node => {
        let nodeNameAndStyle = getNodeNameAndStyle(node)
        const isArtboard = node instanceof Artboard
        if (
          isArtboard ||
          checkStyleSubPrefab(nodeNameAndStyle.options) //
        ) {
          if (isArtboard) currentArtboard = node
          if (optionCheckMarkedForExport && !node.markedForExport) {
            // エキスポートマークをみる且つ､マークがついてない場合は 出力しない
          } else {
            // 同じ名前のものは上書きされる
            exports[nodeNameAndStyle.name] = node
            if (isArtboard) {
              responsiveCheckArtboards[nodeNameAndStyle.name] = node
            } else {
              // サブプレハブを選択して出力する場合は､currentArtboard==NULLの場合がある
              if (currentArtboard != null) {
                responsiveCheckArtboards[currentArtboard.name] = currentArtboard
              }
            }
          }
        }
        const children = node.children
        if (children) funcForEach(children)
      })
    }

    funcForEach(exportRootNodes)

    if (!Object.keys(exports).length) {
      // 出力するものが見つからなかった
      await alert('no selected artboards.')
      return
    }

    try {
      await exportBaum2(exports, outputFolder, responsiveCheckArtboards)
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
    Object.assign(responsiveBounds, makeResponsiveParameter(item))
    let func = node => {
      if (node.symbolId != null) return
      const param = calcRectTransform(node, responsiveBounds, {})
      if (param != null) {
        let styleFix = []
        for (let key in param.fix) {
          if (param.fix[key] === true) {
            styleFix.push(key[0])
          }
        }
        if (styleFix.length > 0) {
          let name = node.name.replace(/ +@fix=[a-z_\-]+/, '')
          let optionStr = styleFix
            .join('-')
            .replace('l-r', 'x') // 左右固定
            .replace('t-b', 'y') // 上下固定
            .replace('w-h', 'size') // サイズ固定
            .replace('x-y-size', 'size') // グループのresizeをやったところ､topleftも動いてしまったケース sizeのみにする
          try {
            node.name = name + ' @fix=' + optionStr
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
  if (!checkHashBounds(responsiveBounds)) {
    await alert('bounds is changed. throwed error for UNDO', '@fix')
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
