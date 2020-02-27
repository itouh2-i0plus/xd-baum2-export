/**
 * 良いCSSとは - Qiita
 * https://qiita.com/horikowa/items/7e6eb7c4bbb422241d9d
 *
 * CSSテストサイト
 * https://www.w3schools.com/css/tryit.asp?filename=trycss_sel_attribute_end
 * https://codepen.io/pen/
 */

// XD拡張APIのクラスをインポート
const {
  Artboard,
  Color,
  ImageFill,
  Rectangle,
  GraphicNode,
  root,
  selection,
} = require('scenegraph')
const application = require('application')
const fs = require('uxp').storage.localFileSystem
const commands = require('commands')

// 全体にかけるスケール
let globalScale = 1.0

//
/**
 * 出力するフォルダ
 * @type {Folder|null}
 */
let outputFolder = null

// エキスポートフラグを見るかどうか
let optionCheckMarkedForExport = true

// 画像を出力するかどうか
let optionImageNoExport = false

// コンテンツの変更のみかどうか
let optionChangeContentOnly = false

/**
 * レスポンシブパラメータを保存する
 * @type {ResponsiveParameter[]}
 */

let globalResponsiveBounds = null

/**
 * @type {{selector:CssSelector, declarations:CssDeclarations, at_rule:string }[]}
 */
let globalCssRules = null

let globalCssVars = {}

let cacheParseNodeName = {}

let cacheNodeNameAndStyle = {}

/**
 * グローバル変数をリセットする 再コンバートに必要なものだけのリセット
 */
function resetGlobalVariables() {
  globalResponsiveBounds = null
  globalCssRules = null
  globalCssVars = {}
  cacheParseNodeName = {}
  cacheNodeNameAndStyle = {}
}

const STR_CONTENT = 'content'
const STR_VERTICAL = 'vertical'
const STR_HORIZONTAL = 'horizontal'
const STR_PREFERRED = 'preferred'

// オプション文字列　全て小文字 数字を含まない
// OPTION名に H V　X Yといった、高さ方向をしめすものはできるだけ出さないようにする
const STYLE_ALIGN = 'align' // テキストの縦横のアライメントの設定が可能　XDの設定に上書き
const STYLE_BLANK = 'blank'
const STYLE_BUTTON = 'button'
const STYLE_BUTTON_TRANSITION = 'button-transition'
const STYLE_BUTTON_TRANSITION_TARGET_GRAPHIC_CLASS =
  'button-transition-target-graphic-class'
const STYLE_BUTTON_TRANSITION_HIGHLIGHTED_SPRITE_CLASS =
  'button-transition-highlighted-sprite-class'
const STYLE_BUTTON_TRANSITION_PRESSED_SPRITE_CLASS =
  'button-transition-pressed-sprite-class'
const STYLE_BUTTON_TRANSITION_SELECTED_SPRITE_CLASS =
  'button-transition-selected-sprite-class'
const STYLE_BUTTON_TRANSITION_DISABLED_SPRITE_CLASS =
  'button-transition-disabled-sprite-class'
const STYLE_CANVAS_GROUP = 'canvas-group' // 削除予定
const STYLE_COMMENT_OUT = 'comment-out'
const STYLE_COMPONENT = 'component'
const STYLE_CONTENT_SIZE_FITTER = 'content-size-fitter' //自身のSizeFitterオプション
const STYLE_CONTENT_SIZE_FITTER_HORIZONTAL_FIT =
  'content-size-fitter-horizontal-fit'
const STYLE_CONTENT_SIZE_FITTER_VERTICAL_FIT =
  'content-size-fitter-vertical-fit'
const STYLE_MARGIN_FIX = 'margin-fix'
const STYLE_IMAGE = 'image'
const STYLE_IMAGE_SCALE = 'image-scale'
const STYLE_IMAGE_SLICE = 'image-slice' // 9スライス ドット数を指定する
const STYLE_IMAGE_TYPE = 'image-type' // sliced tiled simple filled
const STYLE_INPUT = 'input'
const STYLE_LAYER = 'layer'
const STYLE_LAYOUT_ELEMENT = 'layout-element'
const STYLE_LAYOUT_GROUP = 'layout-group' //子供を自動的にどうならべるかのオプション
const STYLE_LAYOUT_GROUP_CHILD_ALIGNMENT = 'layout-group-child-alignment'
const STYLE_LAYOUT_GROUP_CHILD_FORCE_EXPAND = 'layout-group-child-force-expand'
const STYLE_LAYOUT_GROUP_CONTROL_CHILD_SIZE = 'layout-group-control-child-size'
const STYLE_LAYOUT_GROUP_SPACING_X = 'layout-group-spacing-x'
const STYLE_LAYOUT_GROUP_SPACING_Y = 'layout-group-spacing-y'
const STYLE_LAYOUT_GROUP_START_AXIS = 'layout-group-start-axis'
const STYLE_LAYOUT_GROUP_USE_CHILD_SCALE = 'layout-group-use-child-scale'
const STYLE_MATCH_LOG = 'match-log'
const STYLE_PRESERVE_ASPECT = 'preserve-aspect'
const STYLE_RAYCAST_TARGET = 'raycast-target' // 削除予定
const STYLE_RECT_MASK_2D = 'rect-mask-twod'
const STYLE_RECT_TRANSFORM_ANCHOR_OFFSET_X = 'rect-transform-anchor-offset-x'
const STYLE_RECT_TRANSFORM_ANCHOR_OFFSET_Y = 'rect-transform-anchor-offset-x'
const STYLE_REPEATGRID_ATTACH_TEXT_DATA_SERIES =
  'repeatgrid-attach-text-data-series'
const STYLE_REPEATGRID_ATTACH_IMAGE_DATA_SERIES =
  'repeatgrid-attach-image-data-series'
const STYLE_SCROLLBAR = 'scrollbar'
const STYLE_SCROLLBAR_DIRECTION = 'scrollbar-direction'
const STYLE_SCROLLBAR_HANDLE_CLASS = 'scrollbar-handle-class'
const STYLE_SCROLL_RECT = 'scroll-rect'
const STYLE_SCROLL_RECT_CONTENT_CLASS = 'scroll-rect-content-class'
const STYLE_SCROLL_RECT_HORIZONTAL_SCROLLBAR_CLASS =
  'scroll-rect-horizontal-scrollbar-class'
const STYLE_SCROLL_RECT_VERTICAL_SCROLLBAR_CLASS =
  'scroll-rect-vertical-scrollbar-class'
const STYLE_SLIDER = 'slider'
const STYLE_TEXT = 'text'
const STYLE_TEXTMP = 'textmp' // textmeshpro
const STYLE_TEXT_CONTENT = 'text-content'
const STYLE_TOGGLE = 'toggle'
const STYLE_TOGGLE_TRANSITION = 'toggle-transition'
const STYLE_TOGGLE_GRAPHIC_CLASS = 'toggle-graphic-class'
const STYLE_TOGGLE_TRANSITION_TARGET_GRAPHIC_CLASS =
  'toggle-transition-target-graphic-class'
const STYLE_TOGGLE_TRANSITION_HIGHLIGHTED_SPRITE_CLASS =
  'toggle-transition-highlighted-sprite-class'
const STYLE_TOGGLE_TRANSITION_PRESSED_SPRITE_CLASS =
  'toggle-transition-pressed-sprite-class'
const STYLE_TOGGLE_TRANSITION_SELECTED_SPRITE_CLASS =
  'toggle-transition-selected-sprite-class'
const STYLE_TOGGLE_TRANSITION_DISABLED_SPRITE_CLASS =
  'toggle-transition-disabled-sprite-class'
const STYLE_TOGGLE_GROUP = 'toggle-group'
const STYLE_VIEWPORT = 'viewport'
const STYLE_VIEWPORT_CREATE_CONTENT = 'viewport-create-content'
const STYLE_V_ALIGN = 'v-align' //テキストの縦方向のアライメント XDの設定に追記される
const STYLE_ADD_COMPONENT = 'add-component'

/**
 * @param {storage.Folder} currentFolder
 * @param {string} filename
 * @return {Promise<{selector: CssSelector, declarations: CssDeclarations, at_rule: string}[]>}
 */
async function loadCssRules(currentFolder, filename) {
  if (!currentFolder) return null
  console.log(`${filename}の読み込みを開始します`)
  let file
  try {
    file = await currentFolder.getEntry(filename)
  } catch (e) {
    // cssフォルダ以下にもあるか
    console.log('cssフォルダ以下にもあるかチェック')
    file = await currentFolder.getEntry('css/' + filename)
    if (!file) return null
  }
  const contents = await file.read()
  let parsed = parseCss(contents)
  for (let parsedElement of parsed) {
    const atRule = parsedElement.at_rule
    if (atRule) {
      const importTokenizer = /\s*@import\s*url\("(?<file_name>.*)"\);/
      let token = importTokenizer.exec(atRule)
      const importFileName = token.groups.file_name
      if (importFileName) {
        const p = await loadCssRules(currentFolder, importFileName)
        //TODO: 接続する位置とループ対策
        parsed = parsed.concat(p)
      }
    }
  }
  console.log(file.name, 'loaded.')
  return parsed
}

/**
 * cssRules内、　:root にある --ではじまる変数定期を抽出する
 * @param  {{selector:CssSelector, declarations:CssDeclarations, at_rule:string }[]} cssRules
 */
function createCssVars(cssRules) {
  const vars = {}
  for (let cssRule of cssRules) {
    if (cssRule.selector && cssRule.selector.isRoot()) {
      // console.log("root:をみつけました")
      const properties = cssRule.declarations.properties()
      for (let property of properties) {
        if (property.startsWith('--')) {
          const values = cssRule.declarations.values(property)
          // console.log(`変数${property}=${values}`)
          vars[property] = values[0]
        }
      }
    }
  }
  return vars
}

/**
 * CSS Parser
 * ruleブロック selectorとdeclaration部に分ける
 * 正規表現テスト https://regex101.com/r/QIifBs/
 * @param {string} text
 * @return {{selector:CssSelector, declarations:CssDeclarations, at_rule:string }[]}
 */
function parseCss(text, errorThrow = true) {
  // コメントアウト処理 エラー時に行数を表示するため、コメント内の改行を残す
  //TODO: 文字列内の /* */について正しく処理できない
  text = text.replace(/\/\*[\s\S]*?\*\//g, str => {
    let replace = ''
    for (let c of str) {
      if (c == '\n') replace += c
    }
    return replace
  })
  // declaration部がなくてもSelectorだけで取得できるようにする　NodeNameのパースに使うため
  const tokenizer = /(?<at_rule>\s*@[^;]+;\s*)|((?<selector>(("([^"\\]|\\.)*")|[^{"]+)+)({(?<decl_block>(("([^"\\]|\\.)*")|[^}"]*)*)}\s*)?)/gi
  const rules = []
  let token
  while ((token = tokenizer.exec(text))) {
    try {
      const tokenAtRule = token.groups.at_rule
      const tokenSelector = token.groups.selector
      const tokenDeclBlock = token.groups.decl_block
      if (tokenAtRule) {
        rules.push({ at_rule: tokenAtRule })
      } else if (tokenSelector) {
        const selector = new CssSelector(tokenSelector)
        let declarations = null
        if (tokenDeclBlock) {
          declarations = new CssDeclarations(tokenDeclBlock)
        }
        rules.push({
          selector,
          declarations,
        })
      }
    } catch (e) {
      if (errorThrow) {
        // エラー行の算出
        const parsedText = text.substr(0, token.index) // エラーの起きた文字列までを抜き出す
        const lines = parsedText.split(/\n/)
        //const errorIndex = text.indexOf()
        //const errorLastIndex = text.lastIndexOf("\n",token.index)
        const errorLine = text.substring(token.index - 30, token.index + 30)
        const errorText =
          `CSSのパースに失敗しました: ${lines.length}行目:${errorLine}\n` +
          e.message
        console.log(errorText)
        // console.log(e.stack)
        // console.log(text)
        throw errorText
      }
    }
  }
  return rules
}

class CssDeclarations {
  /**
   * @param {null|string} declarationBlock
   */
  constructor(declarationBlock = null) {
    /**
     * @type {string[][]}
     */
    if (declarationBlock) {
      this.declarations = parseCssDeclarationBlock(declarationBlock)
    } else {
      this.declarations = {}
    }
  }

  /**
   * @return {string[]}
   */
  properties() {
    return Object.keys(this.declarations)
  }

  /**
   * @param property
   * @return {string[]}
   */
  values(property) {
    return this.declarations[property]
  }

  /**
   * @param {string} property
   * @return {*|null}
   */
  first(property) {
    const values = this.values(property)
    if (values == null) return null
    return values[0]
  }

  setFirst(property, value) {
    let values = this.values(property)
    if (!values) {
      values = this.declarations[property] = []
    }
    values[0] = value
  }

  checkBool(property) {
    return checkBool(this.first(property))
  }
}

/**
 * @param {string} declarationBlock
 * @return {string[][]}
 */
function parseCssDeclarationBlock(declarationBlock) {
  declarationBlock = declarationBlock.trim()
  const tokenizer = /(?<property>[^:";\s]+)\s*:\s*|(?<value>"(?<string>([^"\\]|\\.)*)"|var\([^\)]+\)|[^";:\s]+)/gi
  /** @type {string[][]}　*/
  let values = {}
  /** @type {string[]}　*/
  let currentValues = null
  let token
  while ((token = tokenizer.exec(declarationBlock))) {
    const property = token.groups.property
    if (property) {
      currentValues = []
      values[property] = currentValues
    }
    let value = token.groups.value
    if (value) {
      if (token.groups.string) {
        value = token.groups.string
      }
      if (!currentValues) {
        // Propertyが無いのに値がある場合
        throw 'DeclarationBlockのパースに失敗しました'
      }
      currentValues.push(value)
    }
  }
  return values
}

/**
 * NodeNameをCSSパースする　これによりローカルCSSも取得する
 * WARN: ※ここの戻り値を変更するとキャッシュも変更されてしまう
 * NodeNameとは node.nameのこと
 * // によるコメントアウト処理もここでする
 * @param {string} nodeName
 * @param nodeName
 * @return {{classNames:string[], id:string, tagName:string, declarations:CssDeclarations}}
 */
function parseNodeName(nodeName) {
  nodeName = nodeName.trim()
  const cache = cacheParseNodeName[nodeName]
  if (cache) {
    return cache
  }
  // コメントアウトチェック
  let result = null
  if (nodeName.startsWith('//')) {
    // コメントアウトのスタイルを追加する
    const declarations = new CssDeclarations()
    declarations.setFirst(STYLE_COMMENT_OUT, true)
    result = { declarations }
  } else {
    try {
      let rules = parseCss(nodeName, false) // 名前はエラーチェックしない
      if (!rules || rules.length === 0 || !rules[0].selector) {
        // パースできなかった場合はそのまま返す
        result = { tagName: nodeName }
      } else {
        result = rules[0].selector.json['rule'] // 一番外側の｛｝をはずす
        Object.assign(result, {
          declarations: rules[0].declarations,
        })
      }
    } catch (e) {
      result = { tagName: nodeName }
    }
  }
  cacheParseNodeName[nodeName] = result
  return result
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
      ex: this.ex,
      ey: this.ey,
    }
  }
}

class GlobalBounds {
  /**
   * @param {SceneNodeClass} node
   */
  constructor(node) {
    this.visible = node.visible
    this.bounds = getGlobalDrawBounds(node)
    this.virtual_global_bounds = this.global_bounds = getGlobalBounds(node)
    if (node.mask) {
      //** @type {Group}
      let group = node
      // console.log('マスク持ちをみつけた', node)
      // マスクを持っている場合、マスクされているノード全体のGlobalBoundsを取得する
      //TODO: 以下が必要なのは、.contentを作成するものだけ
      let childrenCalcBounds = new CalcBounds()
      // セルサイズを決めるため最大サイズを取得する
      group.children.forEach(node => {
        const { style } = getNodeNameAndStyle(node)
        // コンポーネントにする場合は除く
        if (style.first(STYLE_COMPONENT)) return
        childrenCalcBounds.addBounds(node.globalBounds)
      })
      this.virtual_global_bounds = childrenCalcBounds.bounds
    }
  }
}

class ResponsiveParameter {
  constructor(node) {
    this.node = node
  }

  updateBefore() {
    // Before
    this.before = new GlobalBounds(this.node)
  }

  updateAfter() {
    this.after = new GlobalBounds(this.node)
  }

  updateRestore() {
    this.restore = new GlobalBounds(this.node)
  }

  update(hashResponsiveParameter) {
    // DrawBoundsでのレスポンシブパラメータ(場合によっては不正確)
    this.responsiveParameter = calcRectTransform(
      this.node,
      hashResponsiveParameter,
    )
    // GlobalBoundsでのレスポンシブパラメータ(場合によっては不正確)
    this.responsiveParameterGlobal = calcRectTransform(
      this.node,
      hashResponsiveParameter,
      false,
    )
  }
}

/**
 * ファイル名につかえる文字列に変換する
 * @param {string} name
 * @param {boolean} convertDot ドットも変換対象にするか
 * @return {string}
 */
function convertToFileName(name, convertDot = false) {
  if (convertDot) {
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
 * @param node
 * @returns {RepeatGrid|null}
 */
function getRepeatGrid(node) {
  let parent = node
  while (parent != null) {
    if (parent.constructor.name === 'RepeatGrid') {
      return parent
    }
    parent = parent.parent
  }
  return null
}

function getGlobalBounds(node) {
  const bounds = node.globalBounds
  // Artboardにあるスクロール領域のボーダー
  const viewPortHeight = node.viewportHeight
  if (viewPortHeight != null) bounds.height = viewPortHeight
  return {
    x: bounds.x * globalScale,
    y: bounds.y * globalScale,
    width: bounds.width * globalScale,
    height: bounds.height * globalScale,
    ex: (bounds.x + bounds.width) * globalScale,
    ey: (bounds.y + bounds.height) * globalScale,
  }
}

function getGlobalDrawBounds(node) {
  let bounds = node.globalDrawBounds
  const viewPortHeight = node.viewportHeight
  if (viewPortHeight != null) bounds.height = viewPortHeight
  return {
    x: bounds.x * globalScale,
    y: bounds.y * globalScale,
    width: bounds.width * globalScale,
    height: bounds.height * globalScale,
    ex: (bounds.x + bounds.width) * globalScale,
    ey: (bounds.y + bounds.height) * globalScale,
  }
}

/**
 * リサイズされる前のグローバル座標とサイズを取得する
 * responsiveBoundsの中の値は壊れないようにする
 * @param {SceneNodeClass} node
 * @return {null|Bounds}
 */
function getBeforeGlobalDrawBounds(node) {
  // レスポンシブパラメータ作成用で､すでに取得した変形してしまう前のパラメータがあった場合
  // それを利用するようにする
  let bounds = null
  const hashBounds = globalResponsiveBounds
  if (hashBounds) {
    const hBounds = hashBounds[node.guid]
    if (hBounds && hBounds.before) {
      bounds = Object.assign({}, hBounds.before.bounds)
    }
  }
  if (bounds) return bounds
  // throw 'リサイズ前のGlobalDrawBoundsの情報がありません'+node.name
  return null
}

/**
 * リサイズされる前のグローバル座標とサイズを取得する
 * @param {SceneNodeClass} node
 * @return {null|Bounds}
 */
function getBeforeGlobalBounds(node) {
  const hashBounds = globalResponsiveBounds
  let bounds = null
  if (hashBounds != null) {
    const hBounds = hashBounds[node.guid]
    if (hBounds && hBounds.before) {
      bounds = Object.assign({}, hBounds.before.global_bounds)
    }
  }
  if (bounds) return bounds
  // throw 'リサイズ前のGlobalBoundsの情報がありません'+node.name
  return null
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
  const nodeDrawBounds = getBeforeGlobalDrawBounds(node)
  const baseBounds = getBeforeGlobalDrawBounds(base)
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
  const nodeBounds = getBeforeGlobalBounds(node)
  const baseBounds = getBeforeGlobalBounds(base)
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
function checkBool(r) {
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
 * @param {Style} style
 * @return {{}|null}
 */
function getContentSizeFitterParam(style) {
  if (style == null) return null

  let param = {}
  const styleHorizontalFit = style.first(
    STYLE_CONTENT_SIZE_FITTER_HORIZONTAL_FIT,
  )
  if (styleHorizontalFit) {
    Object.assign(param, {
      horizontal_fit: styleHorizontalFit.trim(),
    })
  }
  const styleVerticalFit = style.first(STYLE_CONTENT_SIZE_FITTER_VERTICAL_FIT)
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
 * @param {Style} style
 * @return {{}}
 */
function getLayoutFromRepeatGrid(repeatGrid, style) {
  let layoutJson = {}
  const repeatGridBounds = getBeforeGlobalBounds(repeatGrid)
  const nodesBounds = getNodeListBeforeGlobalBounds(repeatGrid.children, null)
  Object.assign(layoutJson, {
    method: 'grid',
    padding: {
      left: nodesBounds.bounds.x - repeatGridBounds.x,
      right: 0,
      top: nodesBounds.bounds.y - repeatGridBounds.y,
      bottom: 0,
    },
    spacing_x: repeatGrid.paddingX * globalScale, // 横の隙間
    spacing_y: repeatGrid.paddingY * globalScale, // 縦の隙間
    cell_max_width: repeatGrid.cellSize.width * globalScale,
    cell_max_height: repeatGrid.cellSize.height * globalScale,
  })
  addLayoutParam(layoutJson, style)

  if (style != null) {
    if (style.hasValue(STYLE_LAYOUT_GROUP, 'x', STR_HORIZONTAL)) {
      // gridLayoutJson を Horizontalに変える
      layoutJson['method'] = STR_HORIZONTAL
    } else if (style.hasValue(STYLE_LAYOUT_GROUP, 'y', STR_VERTICAL)) {
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
function getNodeListBeforeGlobalBounds(nodeList, withoutNode = null) {
  //ToDo: jsonの子供情報Elementsも､node.childrenも両方つかっているが現状しかたなし
  let childrenCalcBounds = new CalcBounds()
  // セルサイズを決めるため最大サイズを取得する
  let childrenMinMaxSize = new MinMaxSize()
  nodeList.forEach(node => {
    const { style } = getNodeNameAndStyle(node)
    // コンポーネントにする場合は除く
    if (style.first(STYLE_COMPONENT)) return
    if (node === withoutNode) return // 除くものかチェック　MaskはたいていBoundsの中に入れる
    const childBounds = getBeforeGlobalBounds(node)
    childrenCalcBounds.addBounds(childBounds)
    childrenMinMaxSize.addSize(childBounds.width, childBounds.height)
  })
  return {
    bounds: childrenCalcBounds.bounds,
    node_max_width: childrenMinMaxSize.maxWidth * globalScale,
    node_max_height: childrenMinMaxSize.maxHeight * globalScale,
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
  let childrenCalcBounds = getNodeListBeforeGlobalBounds(nodeChildren, maskNode)
  //
  // Paddingの計算
  let viewportBounds = getBeforeGlobalDrawBounds(parentNode) // 描画でのサイズを取得する　影など増えた分も考慮したPaddingを取得する
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
 * @param {Style} style
 * @return {null}
 */
function getLayoutJson(json, viewportNode, maskNode, children, style) {
  if (style == null) return null
  let styleLayout = style.values(STYLE_LAYOUT_GROUP)
  if (!styleLayout) return null
  let layoutJson = null
  if (hasAnyValue(styleLayout, 'y', STR_VERTICAL)) {
    layoutJson = calcVLayout(json, viewportNode, maskNode, children)
  } else if (hasAnyValue(styleLayout, 'x', STR_HORIZONTAL)) {
    layoutJson = calcHLayout(json, viewportNode, maskNode, children)
  } else if (hasAnyValue(styleLayout, 'grid')) {
    layoutJson = calcGridLayout(json, viewportNode, maskNode, children)
  }
  if (layoutJson != null) {
    addLayoutParam(layoutJson, style)
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

const STYLE_UNITY_NAME = 'unity-name'

/**
 * @param {SceneNodeClass} node
 */
function getUnityName(node) {
  const { node_name: nodeName, style } = getNodeNameAndStyle(node)
  let unityName = style.first(STYLE_UNITY_NAME)
  if (unityName) {
    const childIndex = getChildIndex(node)
    unityName = unityName.replace(/\${childIndex}/, childIndex)
    return unityName
  }
  const id = getCssIdFromNodeName(node)
  return id ? id : nodeName
}

/**
 * @param {[]} styleFix
 * @returns {null|{top: boolean, left: boolean, bottom: boolean, width: boolean, right: boolean, height: boolean}}
 */
function getStyleFix(styleFix) {
  if (styleFix == null) {
    return null
  }

  // null：わからない　true:フィックス　false:フィックスされていないで確定 いずれ数字に変わる
  let styleFixWidth = false
  let styleFixHeight = false
  let styleFixTop = false
  let styleFixBottom = false
  let styleFixLeft = false
  let styleFixRight = false

  if (hasAnyValue(styleFix, 'w', 'width', 'size')) {
    styleFixWidth = true
  }
  if (hasAnyValue(styleFix, 'h', 'height', 'size')) {
    styleFixHeight = true
  }
  if (hasAnyValue(styleFix, 't', 'top')) {
    styleFixTop = true
  }
  if (hasAnyValue(styleFix, 'b', 'bottom')) {
    styleFixBottom = true
  }
  if (hasAnyValue(styleFix, 'l', 'left')) {
    styleFixLeft = true
  }
  if (hasAnyValue(styleFix, 'r', 'right')) {
    styleFixRight = true
  }
  if (hasAnyValue(styleFix, 'x')) {
    styleFixLeft = true
    styleFixRight = true
  }
  if (hasAnyValue(styleFix, 'y')) {
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
 * @param {Style} style
 * @param calcDrawBounds
 * @return {{offset_max: {x: null, y: null}, fix: {top: (boolean|number), left: (boolean|number), bottom: (boolean|number), width: boolean, right: (boolean|number), height: boolean}, anchor_min: {x: null, y: null}, anchor_max: {x: null, y: null}, offset_min: {x: null, y: null}}|null}
 */
function calcRectTransform(node, hashBounds, calcDrawBounds = true) {
  if (!node || !node.parent) return null

  const boundsParameterName = calcDrawBounds ? 'bounds' : 'global_bounds'

  const bounds = hashBounds[node.guid]
  if (!bounds || !bounds.before || !bounds.after) return null
  const beforeBounds = bounds.before[boundsParameterName]
  const afterBounds = bounds.after[boundsParameterName]

  const parentBounds = hashBounds[node.parent.guid]
  if (!parentBounds || !parentBounds.before || !parentBounds.after) return null
  //virtual_global_boundsは、親がマスク持ちグループで会った場合、グループ全体のBoundsになる
  const parentBeforeBounds = parentBounds.before.virtual_global_bounds
  const parentAfterBounds = parentBounds.after.virtual_global_bounds

  // fix を取得するため
  // TODO: anchor スタイルのパラメータはとるべきでは
  const style = getNodeNameAndStyle(node).style

  // console.log(`----------------------${node.name}----------------------`)
  let styleFixWidth = null
  let styleFixHeight = null
  let styleFixTop = null
  let styleFixBottom = null
  let styleFixLeft = null
  let styleFixRight = null

  const styleFix = style.values(STYLE_MARGIN_FIX)
  if (styleFix != null) {
    // オプションが設定されたら、全ての設定が決まる(NULLではなくなる)
    const fix = getStyleFix(styleFix)
    console.log(node.name, 'のmargin-fixが設定されました', fix)
    styleFixWidth = fix.width
    styleFixHeight = fix.height
    styleFixTop = fix.top
    styleFixBottom = fix.bottom
    styleFixLeft = fix.left
    styleFixRight = fix.right
  }

  // X座標
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
    }
  }
  if (!styleFixLeft) {
    // TODO:0もここに含まれるのではないか
    // 親のX座標･Widthをもとに､Left値がきまる
    styleFixLeft =
      (beforeBounds.x - parentBeforeBounds.x) / parentBeforeBounds.width
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
    if (approxEqual(beforeRight, afterRight, 0.001)) {
      // ロックされている 0.001以下の誤差が起きることを確認した
      styleFixRight = true
    }
  }
  if (!styleFixRight) {
    // TODO:0もここに含まれるのではないか
    // 親のX座標･Widthをもとに､割合でRight座標がきまる
    styleFixRight =
      (parentBeforeBounds.ex - beforeBounds.ex) / parentBeforeBounds.width
  }

  // Y座標
  if (styleFixHeight == null) {
    styleFixHeight = approxEqual(beforeBounds.height, afterBounds.height, 0.001)
  }

  if (styleFixTop == null) {
    if (
      approxEqual(
        beforeBounds.y - parentBeforeBounds.y,
        afterBounds.y - parentAfterBounds.y,
        0.001,
      )
    ) {
      styleFixTop = true
    }
  }
  if (!styleFixTop) {
    // 親のY座標･heightをもとに､Top座標がきまる
    styleFixTop =
      (beforeBounds.y - parentBeforeBounds.y) / parentBeforeBounds.height
  }

  const beforeBottom = parentBeforeBounds.ey - beforeBounds.ey
  const afterBottom = parentAfterBounds.ey - afterBounds.ey
  if (styleFixBottom == null) {
    if (approxEqual(beforeBottom, afterBottom, 0.001)) {
      styleFixBottom = true
    }
  }
  if (!styleFixBottom) {
    // 親のY座標･Heightをもとに､Bottom座標がきまる
    styleFixBottom =
      (parentBeforeBounds.ey - beforeBounds.ey) / parentBeforeBounds.height
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

  if (style.hasValue(STYLE_MARGIN_FIX, 'c', 'center')) {
    anchorMin.x = 0.5
    anchorMax.x = 0.5
    const center = beforeBounds.x + beforeBounds.width / 2
    const parentCenter = parentBeforeBounds.x + parentBeforeBounds.width / 2
    offsetMin.x = center - parentCenter - beforeBounds.width / 2
    offsetMax.x = center - parentCenter + beforeBounds.width / 2
  }

  if (style.hasValue(STYLE_MARGIN_FIX, 'm', 'middle')) {
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
function makeResponsiveBounds(root) {
  let hashBounds = {}
  // 現在のboundsを取得する
  traverseNode(root, node => {
    let param = new ResponsiveParameter(node)
    param.updateBefore()
    hashBounds[node.guid] = param
  })

  const rootWidth = root.globalBounds.width
  const rootHeight = root.globalBounds.height
  const resizePlusWidth = -100
  const resizePlusHeight = -100

  // rootのリサイズ
  const viewportHeight = root.viewportHeight // viewportの高さの保存
  root.resize(rootWidth + resizePlusWidth, rootHeight + resizePlusHeight)
  if (viewportHeight) {
    // viewportの高さを高さが変わった分の変化に合わせる
    root.viewportHeight = viewportHeight + resizePlusHeight
  }

  // 変更されたboundsを取得する
  traverseNode(root, node => {
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
  traverseNode(root, node => {
    hashBounds[node.guid].updateRestore()
  })

  // レスポンシブパラメータの生成
  for (let key in hashBounds) {
    hashBounds[key].update(hashBounds) // ここまでに生成されたデータが必要
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
 * 描画サイズでのレスポンシブパラメータの取得
 * @param {SceneNodeClass} node
 * @returns {*}
 */
function getRectTransformDraw(node) {
  let bounds = globalResponsiveBounds[node.guid]
  return bounds ? bounds.responsiveParameter : null
}

/**
 * GlobalBoundsでのレスポンシブパラメータの取得
 * @param {SceneNodeClass} node
 */
function getRectTransform(node) {
  let bounds = globalResponsiveBounds[node.guid]
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
 * @param {SceneNodeClass} node SceneNodeClassでないといけない
 * @return {string|null}
 */
function getCssIdFromNodeName(node) {
  if (node == null) {
    return null
  }
  const parsed = parseNodeName(getNodeName(node))
  if (parsed && parsed.id) return parsed.id
  return null
}

class Style {
  /**
   *
   * @param {*[][]} style
   */
  constructor(style = null) {
    if (style != null) {
      this.style = style
    } else {
      this.style = {}
    }
  }

  /**
   * スタイルへ宣言部を追加する
   * ここで VAR()など値に変わる
   * @param {CssDeclarations} declarations
   */
  addDeclarations(declarations) {
    const properties = declarations.properties()
    for (let property of properties) {
      const declValues = declarations.values(property)
      const values = []
      for (let declValue of declValues) {
        // console.log('declValue:', declValue)
        if (typeof declValue == 'string' && declValue.startsWith('var(')) {
          const tokenizer = /var\(\s*(?<id>\S*)\s*\)/
          let token = tokenizer.exec(declValue.trim())
          const id = token.groups.id
          let value = id ? globalCssVars[id] : null
          // console.log(`var(${id})をみつけました値は${value}`)
          values.push(value)
        } else {
          values.push(declValue)
        }
      }
      this.style[property] = values
    }
  }

  values(property) {
    return this.style[property]
  }

  /**
   * @param {string} property
   * @return {*|null}
   */
  first(property) {
    const values = this.values(property)
    if (values == null) return null
    return values[0]
  }

  /**
   *
   * @param {string} property
   * @param {*} value
   */
  setFirst(property, value) {
    let values = this.values(property)
    if (!values) {
      values = this.style[property] = []
    }
    values[0] = value
  }

  /**
   * @param {string} property
   * @return {boolean}
   */
  has(property) {
    let values = this.values(property)
    return !!values
  }

  /**
   * @param {string} property
   * @param checkValues
   * @return {boolean}
   */
  hasValue(property, ...checkValues) {
    //hasAnyValue(this.values(), checkValues)
    let values = this.values(property)
    if (!values) {
      return false
    }
    for (let value of values) {
      for (let checkValue of checkValues) {
        if (value === checkValue) return true
      }
    }
    return false
  }

  checkBool(property) {
    return checkBool(this.first(property))
  }

  /**
   * Valuesの値を連結した文字列を返す
   * @param {string} property
   * @return {string|null}
   */
  str(property) {
    const values = this.values(property)
    if (!values) return null
    let str = ''
    for (let value of values) {
      str += value.toString() + ' '
    }
    return str
  }

  forEach(callback) {
    for (let styleKey in this.style) {
      callback(styleKey, this.style[styleKey])
    }
  }
}

/**
 * @param {[]} values
 * @param {*} checkValues
 * @return {boolean}
 */
function hasAnyValue(values, ...checkValues) {
  if (!values) {
    return false
  }
  for (let value of values) {
    for (let checkValue of checkValues) {
      if (value === checkValue) return true
    }
  }
  return false
}

const STYLE_CHECK_LOG = 'check-log'

/**
 *
 * @param {{name:string, parent:*}} node
 * @returns {Style}
 */
function getStyleFromNode(node) {
  let style = new Style()
  let localCss = null
  try {
    localCss = parseNodeName(node.name)
  } catch (e) {
    //node.nameがパースできなかった
  }

  for (const rule of globalCssRules) {
    /** @type {CssSelector} */
    const selector = rule.selector
    if (
      selector &&
      selector.matchRule(
        node,
        null,
        rule.declarations.checkBool(STYLE_CHECK_LOG),
      )
    ) {
      // console.log('マッチした宣言をスタイルに追加', rule)
      style.addDeclarations(rule.declarations)
    }
  }

  if (localCss && localCss.declarations) {
    // console.log('nodeNameのCSSパースに成功した ローカル宣言部を持っている')
    style.addDeclarations(localCss.declarations)
  }

  if (style.has(STYLE_MATCH_LOG)) {
    console.log(style.values(STYLE_MATCH_LOG))
  }

  //console.log('Style:',style)
  return style
}

/**
 * 自分が何番目の子供か
 * @param node
 * @return {number}
 */
function getChildIndex(node) {
  const parentNode = node.parent
  if (!parentNode) return -1
  for (
    let childIndex = 0;
    childIndex < parentNode.children.length;
    childIndex++
  ) {
    if (parentNode.children.at(childIndex) === node) {
      return childIndex
    }
  }
  return -1
}

/**
 * node.nameをパースしオプションに分解する
 * この関数が基底にあり、正しくNodeName Styleが取得できるようにする
 * ここで処理しないと辻褄があわないケースがでてくる
 * 例：repeatgrid-child-nameで得られる名前
 * @param {SceneNodeClass} node ここのNodeはSceneNodeClassでないといけない
 * @returns {{node_name: string, name: string, style: Style}|null}
 */
function getNodeNameAndStyle(node) {
  if (node == null) {
    return null
  }

  // キャッシュ確認
  if (node.guid) {
    const cache = cacheNodeNameAndStyle[node.guid]
    if (cache) {
      return cache
    }
  }

  let parentNode = node.parent
  /**
   * @type {string}
   */
  let nodeName = node.name.trim()
  const style = getStyleFromNode(node)

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
    /*
    const styleRepeatgridChildName = style.first(STYLE_REPEATGRID_CHILD_NAME)
    if (styleRepeatgridChildName) {
      nodeName = styleRepeatgridChildName
    }
    // 自身のChildインデックスを名前に利用する
    const childIndex = getChildIndex(node)
    nodeName = nodeName.replace(/\${childIndex}/, childIndex.toString())
     */

    value['node_name'] = nodeName
    value['name'] = nodeName

    // RepeatGridで、子供がすべてコメントアウトなら、子供を包括するグループもコメントアウトする
    style.setFirst(
      STYLE_COMMENT_OUT,
      !node.children.some(child => {
        // コメントアウトしてないものが一つでもあるか
        const childStyle = getNodeNameAndStyle(child).style
        return !childStyle.first(STYLE_COMMENT_OUT)
      }),
    )
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
    rootBounds = getBeforeGlobalDrawBounds(root)
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
 * @param json
 * @param {Style} style
 */
function addActive(json, style) {
  if (style.first('active')) {
    Object.assign(json, {
      active: checkBool(style.first('active')),
    })
  }
}

/**
 * CanvasGroupオプション
 * @param {*} json
 * @param {SceneNode} node
 * @param style
 */
function addCanvasGroup(json, node, style) {
  let canvasGroup = style.first(STYLE_CANVAS_GROUP)
  if (canvasGroup != null) {
    Object.assign(json, {
      canvas_group: { alpha: 0 },
    })
  }
}

/**
 * 指定のAnchorパラメータを設定する
 * @param json
 * @param style
 */
function addRectTransformAnchorOffsetX(json, style) {
  if (!style) return
  // RectTransformの値がない場合、作成する
  //TODO: 初期値はいらないだろうか
  if (!('anchor_min' in json)) json['anchor_min'] = {}
  if (!('anchor_max' in json)) json['anchor_max'] = {}
  if (!('offset_min' in json)) json['offset_min'] = {}
  if (!('offset_max' in json)) json['offset_max'] = {}
  // Styleで指定が会った場合、上書きする
  const anchorsX = style.values(STYLE_RECT_TRANSFORM_ANCHOR_OFFSET_X)
  const anchorsY = style.values(STYLE_RECT_TRANSFORM_ANCHOR_OFFSET_Y)
  if (anchorsX) {
    json['anchor_min']['x'] = parseFloat(anchorsX[0])
    json['anchor_max']['x'] = parseFloat(anchorsX[1])
    json['offset_min']['x'] = parseFloat(anchorsX[2])
    json['offset_max']['x'] = parseFloat(anchorsX[3])
  }
  if (anchorsY) {
    json['anchor_min']['y'] = parseFloat(anchorsY[0])
    json['anchor_max']['y'] = parseFloat(anchorsY[1])
    json['offset_min']['y'] = parseFloat(anchorsY[2])
    json['offset_max']['y'] = parseFloat(anchorsY[3])
  }
}

/**
 * オプションにpivot､stretchがあれば上書き
 * @param {*} json
 * @param {SceneNodeClass} node
 */
function addDrawRectTransform(json, node) {
  let param = getRectTransformDraw(node)
  if (param) {
    Object.assign(json, param)
  }
}

/**
 *
 * @param json
 * @param {SceneNode} node
 * @returns {null}
 */
function addRectTransform(json, node) {
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
function addState(json, style) {
  /**
   * @type {string}
   */
  /* 廃止
  const styleState = style.first("state")
  if (!styleState) return
  const state = styleState.split(",").map(value => value.trim())
  Object.assign(json, {
    state
  })
   */
}

/**
 * @param json
 * @param {SceneNodeClass} node
 */
function addClassNames(json, node) {
  const parsedName = parseNodeName(node.name)
  // console.log(`${node.name}からクラスを書き出す`)
  if (!parsedName || parsedName.classNames == null) return
  // console.log(`class_names: ${parsedName}`)

  const classNames = []
  for (let className of parsedName.classNames) {
    classNames.push(removeDotStart(className)) // ドットをとる
  }

  Object.assign(json, {
    class_names: classNames,
  })
}

/**
 * BAUM2では使わないケースもあるが､
 * CenterMiddle座標と､サイズをアサインする
 * XY座標によるElementsソートなどに使われる
 * @param {*} json
 * @param {{cx:number, cy:number, width:number, height:number}} boundsCm
 */
function addBoundsCM(json, boundsCm) {
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
 * @param outputFolder
 * @param renditions
 * @return {Promise<void>}
 */
async function addImage(json, node, root, outputFolder, renditions) {
  let { node_name, style } = getNodeNameAndStyle(node)

  // 今回出力するためのユニークな名前をつける
  const parentName = getNodeName(node.parent)

  let hashStringLength = 5
  // ファイル名が長すぎるとエラーになる可能性もある
  let fileName = convertToFileName(parentName + '+' + node_name, true)
  while (true) {
    const guidStr = '+' + node.guid.slice(0, hashStringLength)
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
  // 明確にfalseと指定してある場合にNO SLICEとする
  if (style.first(STYLE_IMAGE_SLICE) === 'false') {
    fileExtension = '-noslice.png'
  }
  const image9SliceValues = style.values(STYLE_IMAGE_SLICE)
  if (image9SliceValues && image9SliceValues.length > 1) {
    if (node.rotation !== 0) {
      console.log(
        'warning*** 回転しているノードの9スライス指定は無効になります',
      )
    } else {
      /*
       省略については、CSSに準拠
       http://www.htmq.com/css3/border-image-slice.shtml
       上・右・下・左の端から内側へのオフセット量
       4番目の値が省略された場合には、2番目の値と同じ。
       3番目の値が省略された場合には、1番目の値と同じ。
       2番目の値が省略された場合には、1番目の値と同じ。
       */
      const paramLength = image9SliceValues.length
      const top = parseInt(image9SliceValues[0]) * globalScale
      const right =
        paramLength > 1 ? parseInt(image9SliceValues[1]) * globalScale : top
      const bottom =
        paramLength > 2 ? parseInt(image9SliceValues[2]) * globalScale : top
      const left =
        paramLength > 3 ? parseInt(image9SliceValues[3]) * globalScale : right
      let offset = top + 'px,' + right + 'px,' + bottom + 'px,' + left + 'px'
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

  addDrawRectTransform(json, node)

  Object.assign(json, {
    image: {},
  })
  let imageJson = json['image']

  const stylePreserveAspect = style.first(STYLE_PRESERVE_ASPECT)
  if (stylePreserveAspect != null) {
    Object.assign(imageJson, {
      preserve_aspect: checkBool(stylePreserveAspect),
    })
  }

  const styleRayCastTarget = style.first(STYLE_RAYCAST_TARGET)
  if (styleRayCastTarget != null) {
    Object.assign(imageJson, {
      raycast_target: checkBool(styleRayCastTarget),
    })
  }

  // image type
  const styleImageType = style.first(STYLE_IMAGE_TYPE)
  if (styleImageType != null) {
    Object.assign(imageJson, {
      image_type: styleImageType,
    })
  }

  let renditionNode = node
  let renditionScale = globalScale

  if (
    !optionImageNoExport &&
    image9SliceValues &&
    node.isContainer &&
    node.rotation === 0
  ) {
    // 回転している場合はできない
    console.log(
      '9スライス以下の画像を出力するのに、ソース画像と同サイズが渡すことができるか調べる',
    )
    /**
     * @type {Group}
     */
    node.children.some(child => {
      // source という名前で且つ、ImageFillを持ったノードを探す
      if (
        child.name === 'source' &&
        child.fill &&
        child.fill.constructor.name === 'ImageFill'
      ) {
        child.visible = true
        // 元のサイズにして出力対象にする
        child.resize(child.fill.naturalWidth, child.fill.naturalHeight)
        renditionNode = child
        return true
      }
    })
  }

  if (style.first(STYLE_IMAGE_SCALE) != null) {
    const scaleImage = parseFloat(style.first(STYLE_IMAGE_SCALE))
    if (Number.isFinite(scaleImage)) {
      renditionScale = globalScale * scaleImage
    }
  }

  if (!checkBool(style.first(STYLE_BLANK))) {
    Object.assign(json, {
      image: fileName,
    })
    if (outputFolder && !optionImageNoExport) {
      // 画像出力登録
      // この画像サイズが、0になっていた場合出力に失敗する
      // 例：レスポンシブパラメータを取得するため、リサイズする→しかし元にもどらなかった
      // 出力画像ファイル
      const file = await outputFolder.createFile(fileName + fileExtension, {
        overwrite: true,
      })
      renditions.push({
        fileName: fileName,
        node: renditionNode,
        outputFile: file,
        type: application.RenditionType.PNG,
        scale: renditionScale,
      })
    }
  }
}

/**
 *
 * @param json
 * @param {Style} style
 */
function addContentSizeFitter(json, style) {
  const contentSizeFitterJson = getContentSizeFitterParam(style)
  if (contentSizeFitterJson != null) {
    Object.assign(json, {
      content_size_fitter: contentSizeFitterJson,
    })
  }
}

/**
 * @param json
 * @param {Style} style
 */
function addScrollRect(json, style) {
  const styleScrollRect = style.first(STYLE_SCROLL_RECT)
  if (!styleScrollRect) return
  Object.assign(json, {
    scroll_rect: {
      horizontal: style.hasValue(STYLE_SCROLL_RECT, 'x', STR_HORIZONTAL),
      vertical: style.hasValue(STYLE_SCROLL_RECT, 'y', STR_VERTICAL),
    },
  })

  const scrollRectJson = json['scroll_rect']
  const content_class = removeDotStart(
    style.first(STYLE_SCROLL_RECT_CONTENT_CLASS),
  )
  if (content_class) {
    Object.assign(scrollRectJson, {
      content_class,
    })
  }
  const vertical_scrollbar_class = removeDotStart(
    style.first(STYLE_SCROLL_RECT_VERTICAL_SCROLLBAR_CLASS),
  )
  if (vertical_scrollbar_class) {
    Object.assign(scrollRectJson, {
      vertical_scrollbar_class,
    })
  }
  const horizontal_scrollbar_class = removeDotStart(
    style.first(STYLE_SCROLL_RECT_HORIZONTAL_SCROLLBAR_CLASS),
  )
  if (horizontal_scrollbar_class) {
    Object.assign(scrollRectJson, {
      horizontal_scrollbar_class,
    })
  }
}

function addRectMask2d(json, style) {
  const styleRectMask2D = style.first(STYLE_RECT_MASK_2D)
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
 * @param {Style} style
 */
function addLayout(json, viewportNode, maskNode, children, style) {
  let layoutJson = getLayoutJson(json, viewportNode, maskNode, children, style)
  if (!layoutJson) return

  const layoutSpacingX = style.first(STYLE_LAYOUT_GROUP_SPACING_X)
  if (layoutSpacingX) {
    Object.assign(layoutJson, {
      spacing_x: parseInt(layoutSpacingX), //TODO: pxやenを無視している
    })
  }
  const layoutSpacingY = style.first(STYLE_LAYOUT_GROUP_SPACING_Y)
  if (layoutSpacingY) {
    Object.assign(layoutJson, {
      spacing_y: parseInt(layoutSpacingY), //TODO: pxやenを無視している
    })
  }

  console.log('addLayout:', layoutJson)

  Object.assign(json, {
    layout: layoutJson,
  })
}

/**
 * レイアウトコンポーネント各種パラメータをStyleから設定する
 * @param layoutJson
 * @param {Style} style
 */
function addLayoutParam(layoutJson, style) {
  if (style == null) return
  const styleChildAlignment = style.first(STYLE_LAYOUT_GROUP_CHILD_ALIGNMENT)
  if (styleChildAlignment) {
    Object.assign(layoutJson, {
      control_child_size: styleChildAlignment,
    })
  }
  const styleControlChildSize = style.str(STYLE_LAYOUT_GROUP_CONTROL_CHILD_SIZE)
  if (styleControlChildSize) {
    Object.assign(layoutJson, {
      control_child_size: styleControlChildSize,
    })
  }
  const styleUseChildScale = style.first(STYLE_LAYOUT_GROUP_USE_CHILD_SCALE)
  if (styleUseChildScale) {
    Object.assign(layoutJson, {
      use_child_scale: styleUseChildScale,
    })
  }
  const styleChildForceExpand = style.first(
    STYLE_LAYOUT_GROUP_CHILD_FORCE_EXPAND,
  )
  if (styleChildForceExpand) {
    Object.assign(layoutJson, {
      child_force_expand: styleChildForceExpand,
    })
  }

  // GridLayoutGroupのみ適応される
  const styleStartAxis = style.first(STYLE_LAYOUT_GROUP_START_AXIS)
  if (styleStartAxis) {
    // まず横方向へ並べる
    if (style.hasValue(STYLE_LAYOUT_GROUP_START_AXIS, 'x', STR_HORIZONTAL)) {
      Object.assign(layoutJson, {
        start_axis: STR_HORIZONTAL,
      })
    }
    // まず縦方向へ並べる
    if (style.hasValue(STYLE_LAYOUT_GROUP_START_AXIS, 'y', STR_VERTICAL)) {
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
 * @param {Style} style
 */
function addLayoutElement(json, node, style) {
  const bounds = getBeforeGlobalDrawBounds(node)
  if (style.hasValue(STYLE_LAYOUT_ELEMENT, 'min')) {
    Object.assign(json, {
      layout_element: {
        min_width: bounds.width,
        min_height: bounds.height,
      },
    })
  }
  if (style.hasValue(STYLE_LAYOUT_ELEMENT, 'preferred')) {
    Object.assign(json, {
      layout_element: {
        preferred_width: bounds.width,
        preferred_height: bounds.height,
      },
    })
  }
}

/**
 *
 * @param json
 * @param {Style} style
 */
function addLayer(json, style) {
  const styleLayer = style.first(STYLE_LAYER)
  if (styleLayer != null) {
    Object.assign(json, { layer: styleLayer })
  }
}

/**
 * @param json
 * @param {Style} style
 */
function addComponents(json, style) {
  const components = []
  style.forEach((propertyName, value) => {
    // "add-component-XXXX"を探す
    if (propertyName.startsWith(STYLE_ADD_COMPONENT + '-')) {
      const properties = []
      // "XXX-YYYY" を探す
      const componentName = propertyName.substring(14) + '-'
      style.forEach((key, value) => {
        if (key.startsWith(componentName)) {
          properties.push({ path: value[0], values: value.slice(1) })
        }
      })
      const component = {
        type: style.first(propertyName),
        name: componentName,
        method: 'add',
        properties,
      }
      components.push(component)
    }
  })

  if (components.length > 0) {
    Object.assign(json, {
      components,
    })
  }
}

/**
 * Contentグループの作成
 * 主にスクロール用　アイテム用コンテナ
 * @param style
 * @param json
 * @param node
 * @param funcForEachChild
 * @param root
 * @returns {Promise<void>}
 */
async function createContent(style, json, node, funcForEachChild, root) {
  // Content
  // Viewportは必ずcontentを持つ
  let createContentName = 'content'
  const styleViewportCreateContent = style.first(STYLE_VIEWPORT_CREATE_CONTENT)
  if (styleViewportCreateContent) {
    createContentName = styleViewportCreateContent
  }

  // contentのアサインと名前設定
  Object.assign(json, {
    content: {
      name: createContentName,
    },
  })
  let contentJson = json[STR_CONTENT]
  const contentStyle = getStyleFromNode({
    name: createContentName,
    parent: node,
  })

  if (node.constructor.name === 'Group') {
    // 通常グループ､マスクグループでContentの作成
    // ContentのRectTransformは　場合によって異なる
    // ・通常グループで作成したとき親とぴったりサイズ
    // ・Maskグループで作成したときは親のサイズにしばられない →　座標はどうするか　センター合わせなのか
    // Groupでもスクロールウィンドウはできるようにするが、RepeatGridではない場合レイアウト情報が取得しづらい
    let maskNode = node.mask
    // マスクが利用されたViewportである場合､マスクを取得する
    if (!maskNode) {
      console.log('***error viewport:マスクがみつかりませんでした')
    }
    let calcContentBounds = new CalcBounds()
    await funcForEachChild(null, child => {
      const childBounds = getBeforeGlobalBounds(child)
      calcContentBounds.addBounds(childBounds) // maskもContentBoundsの処理にいれる
      return child !== maskNode // maskNodeはFalse 処理をしない
    })

    // 縦の並び順を正常にするため､Yでソートする
    sortElementsByPositionAsc(json.elements)

    for (let childJson of json.elements) {
    }

    const maskBounds = getBeforeGlobalBounds(maskNode)
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

    // これはコンテントのレイアウトオプションで実行すべき
    addLayout(contentJson, node, maskNode, node.children, contentStyle)
  } else if (node.constructor.name === 'RepeatGrid') {
    // リピートグリッドでContentの作成
    // ContentのRectTransformは　場合によって異なるが、リピートグリッドの場合は確定できない
    // 縦スクロールを意図しているか　→ Content.RectTransformは横サイズぴったり　縦に伸びる
    // 横スクロールを意図しているか　→ Content.RectTransformは縦サイズぴったり　横に伸びる
    // こちらが確定できないため
    let calcContentBounds = new CalcBounds()
    /** @type {RepeatGrid} */
    let viewportNode = node
    const viewportBounds = getBeforeGlobalBounds(viewportNode)
    calcContentBounds.addBounds(viewportBounds)
    // AdobeXDの問題で　リピートグリッドの枠から外れているものもデータがくるケースがある
    // そういったものを省くための処理
    // Contentの領域も計算する
    await funcForEachChild(null, child => {
      const childBounds = getBeforeGlobalBounds(child)
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

  // ContentのRectTransformを決める
  // addRectTransformができない　→ Recttransformのキャッシュをもっていないため
  const contentX = contentJson['x']
  const contentY = contentJson['y']
  const contentWidth = contentJson['width']
  const contentHeight = contentJson['height']
  const contentStyleFix = getStyleFix(contentStyle.values(STYLE_MARGIN_FIX))

  let pivot = { x: 0, y: 1 } // top-left
  let anchorMin = { x: 0, y: 1 }
  let anchorMax = { x: 0, y: 1 }
  let offsetMin = { x: contentX, y: -contentHeight - contentY }
  let offsetMax = { x: contentWidth + contentX, y: -contentY }
  Object.assign(contentJson, {
    fix: contentStyleFix,
    pivot: pivot, // ここのPivotはX,Yで渡す　他のところは文字列になっている
    anchor_min: anchorMin,
    anchor_max: anchorMax,
    offset_min: offsetMin,
    offset_max: offsetMax,
  })

  addRectTransformAnchorOffsetX(contentJson, contentStyle) // anchor設定を上書きする

  addContentSizeFitter(contentJson, contentStyle)
  addLayer(contentJson, contentStyle)
}

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

  Object.assign(json, {
    type: 'Viewport',
    name: getUnityName(node),
    fill_color: '#ffffff00', // タッチイベント取得Imageになる
  })

  // ScrollRect
  addScrollRect(json, style)

  await createContent(style, json, node, funcForEachChild, root)

  // 基本
  addActive(json, style)
  addDrawRectTransform(json, node)
  addLayer(json, style)
  addState(json, style)
  addClassNames(json, node)

  addContentSizeFitter(json, style)
  addScrollRect(json, style)
  addRectMask2d(json, style)
}

/**
 * Stretch変形できるものへ変換コピーする
 * @param {SceneNodeClass} item
 */
function duplicateStretchable(item) {
  let fill = item.fill
  if (fill != null && item.constructor.name === 'Rectangle') {
    // ImageFillをもったRectangleのコピー
    let rect = new Rectangle()
    rect.name = item.name + '-stretch'
    SetGlobalBounds(rect, item.globalBounds) // 同じ場所に作成
    // 新規に作成することで、元のイメージがCCライブラリのイメージでもSTRETCH変形ができる
    let cloneFill = fill.clone()
    cloneFill.scaleBehavior = ImageFill.SCALE_STRETCH
    rect.fill = cloneFill
    selection.insertionParent.addChild(rect)
    return rect
  }
  // それ以外の場合は普通にコピー
  const selectionItems = [].concat(selection.items)
  selection.items = [item]
  commands.duplicate()
  const node = selection.items[0]
  //node.removeFromParent()
  selection.items = selectionItems
  return node
}

function SetGlobalBounds(node, newGlobalBounds) {
  const globalBounds = node.globalBounds
  const deltaX = newGlobalBounds.x - globalBounds.x
  const deltaY = newGlobalBounds.y - globalBounds.y
  node.moveInParentCoordinates(deltaX, deltaY)
  node.resize(newGlobalBounds.width, newGlobalBounds.height)
}

/**
 *
 * @param json
 * @param {SceneNodeClass} node
 * @param {SceneNodeClass} root
 * @param funcForEachChild
 * @return {Promise<string>}
 */
async function createGroup(json, node, root, funcForEachChild) {
  let { style } = getNodeNameAndStyle(node)

  /**
   * @type {Group}
   */
  const nodeGroup = node

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

  const styleAddContent = style.first('add-content')
  if (styleAddContent) {
    const sourceNode = searchNode(styleAddContent)
    const nodeBounds = getBeforeGlobalBounds(node)
    const duplicated = duplicateStretchable(sourceNode)
    duplicated.name = duplicated.name + ' copy'
    duplicated.removeFromParent()
    nodeGroup.addChildAfter(duplicated, nodeGroup.children.at(0))
    SetGlobalBounds(duplicated, nodeBounds)
  }

  // 基本
  addActive(json, style)
  addDrawRectTransform(json, node)
  addLayer(json, style)
  addState(json, style)
  addClassNames(json, node)
  //
  addComponents(json, style)
  addCanvasGroup(json, node, style)
  addLayoutElement(json, node, style)
  addLayout(json, node, node, node.children, style)
  addContentSizeFitter(json, style)
}

/**
 * @param {string} name
 */
function removeDotStart(name) {
  if (name == null) return null
  if (name.startsWith('.')) {
    name = name.substring(1)
  }
  return name
}

/**
 * @param json
 * @param node
 * @param funcForEachChild
 * @returns {Promise<void>}
 */
async function createScrollbar(json, node, funcForEachChild) {
  let { style } = getNodeNameAndStyle(node)

  const type = 'Scrollbar'
  Object.assign(json, {
    type: type,
    name: getUnityName(node),
    scrollbar: {},
  })

  let scrollbarJson = json['scrollbar']
  let direction = style.first(STYLE_SCROLLBAR_DIRECTION)
  if (direction != null) {
    Object.assign(scrollbarJson, {
      direction,
    })
  }
  let handle_class = style.first(STYLE_SCROLLBAR_HANDLE_CLASS)
  if (handle_class != null) {
    handle_class = removeDotStart(handle_class)
    Object.assign(scrollbarJson, {
      handle_class,
    })
  }

  const bounds = getBeforeGlobalBounds(node)
  const childlenBounds = getNodeListBeforeGlobalBounds(node.children)
  const spacingX = bounds.width - childlenBounds.bounds.width
  const spacingY = bounds.height - childlenBounds.bounds.height
  Object.assign(scrollbarJson, {
    child_spacing_x: spacingX,
    child_spacing_y: spacingY,
  })

  await funcForEachChild()

  // 基本
  addActive(json, style)
  addDrawRectTransform(json, node)
  addLayer(json, style)
  addState(json, style)
  addClassNames(json, node)
  //
  addCanvasGroup(json, node, style)
  addLayoutElement(json, node, style)
  addLayout(json, node, node, node.children, style)
  addContentSizeFitter(json, style)

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
    toggle: {},
  })

  const toggleJson = json['toggle']

  // Toggle group
  const group = style.first(STYLE_TOGGLE_GROUP)
  if (group) {
    Object.assign(toggleJson, {
      group,
    })
  }

  const graphic_class = style.first(STYLE_TOGGLE_GRAPHIC_CLASS)
  if (graphic_class) {
    Object.assign(toggleJson, {
      graphic_class,
    })
  }

  addBoundsCM(json, getDrawBoundsCMInBase(node, root))
  await funcForEachChild()

  let styleToggleTransition = style.first(STYLE_TOGGLE_TRANSITION)
  if (styleToggleTransition) {
    const target_graphic_class = style.first(
      STYLE_TOGGLE_TRANSITION_TARGET_GRAPHIC_CLASS,
    )
    const highlighted_sprite_class = style.first(
      STYLE_TOGGLE_TRANSITION_HIGHLIGHTED_SPRITE_CLASS,
    )
    const pressed_sprite_class = style.first(
      STYLE_TOGGLE_TRANSITION_PRESSED_SPRITE_CLASS,
    )
    const selected_sprite_class = style.first(
      STYLE_TOGGLE_TRANSITION_SELECTED_SPRITE_CLASS,
    )
    const disabled_sprite_class = style.first(
      STYLE_TOGGLE_TRANSITION_DISABLED_SPRITE_CLASS,
    )
    Object.assign(toggleJson, {
      target_graphic_class,
      transition: styleToggleTransition,
      sprite_state: {
        highlighted_sprite_class,
        pressed_sprite_class,
        selected_sprite_class,
        disabled_sprite_class,
      },
    })
  }

  // 基本パラメータ・コンポーネント
  addActive(json, style)
  addDrawRectTransform(json, node)
  addLayer(json, style)
  addState(json, style)
  addClassNames(json, node)
  //
  addLayoutElement(json, node, style)
  addContentSizeFitter(json, style)
}

/**
 *
 * @param json
 * @param node
 * @param root
 * @param {*|null} funcForEachChild
 * @returns {Promise<string>}
 */
async function createButton(json, node, root, funcForEachChild) {
  let { style } = getNodeNameAndStyle(node)

  const type = 'Button'
  Object.assign(json, {
    type: type,
    name: getUnityName(node),
  })

  addBoundsCM(json, getDrawBoundsCMInBase(node, root))
  if (funcForEachChild) await funcForEachChild() // 子供を作成するかどうか選択できる createImageから呼び出された場合は子供の処理をしない
  let styleButtonTransition = style.first(STYLE_BUTTON_TRANSITION)
  if (styleButtonTransition) {
    const target_graphic_class = style.first(
      STYLE_BUTTON_TRANSITION_TARGET_GRAPHIC_CLASS,
    )
    const highlighted_sprite_class = style.first(
      STYLE_BUTTON_TRANSITION_HIGHLIGHTED_SPRITE_CLASS,
    )
    const pressed_sprite_class = style.first(
      STYLE_BUTTON_TRANSITION_PRESSED_SPRITE_CLASS,
    )
    const selected_sprite_class = style.first(
      STYLE_BUTTON_TRANSITION_SELECTED_SPRITE_CLASS,
    )
    const disabled_sprite_class = style.first(
      STYLE_BUTTON_TRANSITION_DISABLED_SPRITE_CLASS,
    )
    Object.assign(json, {
      button: {
        target_graphic_class,
        transition: styleButtonTransition,
        sprite_state: {
          highlighted_sprite_class,
          pressed_sprite_class,
          selected_sprite_class,
          disabled_sprite_class,
        },
      },
    })
  }

  // 基本パラメータ
  addActive(json, style)
  addDrawRectTransform(json, node)
  addLayer(json, style)
  addState(json, style)
  addClassNames(json, node)
  addComponents(json, style)
}

/**
 * パスレイヤー(楕円や長方形等)の処理
 * @param {*} json
 * @param {SceneNodeClass} node
 * @param {SceneNodeClass} root
 * @param {*} outputFolder
 * @param {*} renditions
 */
async function createImage(json, node, root, outputFolder, renditions) {
  //TODO: 塗りチェック、シャドウチェック、輪郭チェック、全てない場合はイメージコンポーネントも無しにする
  let { style } = getNodeNameAndStyle(node)

  const unityName = getUnityName(node)
  // もしボタンオプションがついているのなら　ボタンを生成してその子供にイメージをつける
  if (style.checkBool(STYLE_BUTTON)) {
    // イメージはコンポーネントにするべき? -> グループの場合もあるのでコンポーネントにできない
    //TODO: ただし指定はできても良いはず
    await createButton(json, node, root, null)
    Object.assign(json, {
      elements: [
        {
          type: 'Image',
          name: unityName + ' image',
        },
      ],
    })

    // imageの作成
    await addImage(json.elements[0], node, root, outputFolder, renditions)
    //ボタン画像はボタンとぴったりサイズをあわせる
    let imageJson = json['elements'][0]
    Object.assign(imageJson, {
      anchor_min: { x: 0, y: 0 },
      anchor_max: { x: 1, y: 1 },
      offset_min: { x: 0, y: 0 },
      offset_max: { x: 0, y: 0 },
    })
    // レイヤーは親と同じ物を使用 activeかどうかは設定せず、親に依存するようにする
    addLayer(imageJson, style)
  } else {
    Object.assign(json, {
      type: 'Image',
      name: unityName,
    })
    // 基本パラメータ
    addActive(json, style)
    addDrawRectTransform(json, node)
    addLayer(json, style)
    addState(json, style)
    addClassNames(json, node)
    // assignComponent
    if (style.first(STYLE_COMPONENT) != null) {
      Object.assign(json, {
        component: {},
      })
    }
    await addImage(json, node, root, outputFolder, renditions)
  }
  //
  const imageDataValues = style.values(
    STYLE_REPEATGRID_ATTACH_IMAGE_DATA_SERIES,
  )
  if (imageDataValues && imageDataValues.length > 0) {
    console.log('image data series')
    let repeatGrid = getRepeatGrid(node)

    const dataSeries = []
    for (let value of imageDataValues) {
      if (value.startsWith('data:image/')) {
        let imageFill = new ImageFill(value)
        dataSeries.push(imageFill)
      } else {
        let imageNode = searchNode(value)
        dataSeries.push(imageNode.fill)
      }
    }
    repeatGrid.attachImageDataSeries(node, dataSeries)
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
  addLayer(layoutJson, style)
}

/**
 * TextNodeの処理
 * 画像になるか、Textコンポーネントをもつ
 * @param {*} json
 * @param {SceneNode} node
 * @param {Artboard} artboard
 * @param {*} outputFolder
 * @param {[]} renditions
 */
async function nodeText(json, node, artboard, outputFolder, renditions) {
  let { style } = getNodeNameAndStyle(node)

  /** @type {Text} */
  let nodeText = node

  // コンテンツ書き換え対応
  const styleTextContent = style.first(STYLE_TEXT_CONTENT)
  if (styleTextContent) {
    /** @type {SymbolInstance} */
    const si = nodeText.parent
    // RepeatGrid内は操作できない
    // コンポーネント内は操作できない　例外としてインスタンスが生成されていないマスターは操作できる
    if (!si.isMaster) {
      // マスターかどうかをチェックして、例外情報（EditContext外例外）が表示されるのをできるだけ抑止している
      nodeText.text = styleTextContent
    }
  }

  const styleValuesAttachText = style.values(
    STYLE_REPEATGRID_ATTACH_TEXT_DATA_SERIES,
  )
  if (styleValuesAttachText) {
    let repeatGrid = getRepeatGrid(nodeText)
    if (repeatGrid) {
      repeatGrid.attachTextDataSeries(nodeText, styleValuesAttachText)
    }
  }

  // ラスタライズオプションチェック
  if (style.checkBool(STYLE_IMAGE) || style.checkBool(STYLE_IMAGE_SLICE)) {
    await createImage(json, node, artboard, outputFolder, renditions)
    return
  }

  if (
    !style.checkBool(STYLE_TEXT) &&
    !style.checkBool(STYLE_INPUT) &&
    !style.checkBool(STYLE_TEXTMP)
  ) {
    await createImage(json, node, artboard, outputFolder, renditions)
    return
  }

  const boundsCM = getBoundsCMInBase(node, artboard)

  let type = 'Text'
  if (style.checkBool(STYLE_TEXTMP)) {
    type = 'TextMeshPro'
  }
  if (style.checkBool(STYLE_INPUT)) {
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
  const styleAlign = style.first(STYLE_ALIGN)
  if (styleAlign != null) {
    hAlign = styleAlign
  }

  // @v-align オプションがあった場合、上書きする
  // XDでは、left-center-rightは設定できるため
  const styleVAlign = style.first(STYLE_V_ALIGN)
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
    size: nodeText.fontSize * globalScale,
    color: nodeText.fill.toHex(true),
    align: hAlign + vAlign,
    x: boundsCM.cx,
    y: boundsCM.cy,
    w: boundsCM.width,
    h: boundsCM.height,
    vh: boundsCM.height,
    opacity: 100,
  })

  // 基本パラメータ
  addActive(json, style)
  addRectTransform(json, node) // Drawではなく、通常のレスポンシブパラメータを渡す　シャドウ等のエフェクトは自前でやる必要があるため
  addLayer(json, style)
  addState(json, style)
  addClassNames(json, node)
}

/**
 * @param {string} nodeName
 * @return {SceneNodeClass|null}
 */
function searchNode(nodeName) {
  let found = null
  traverseNode(root, node => {
    if (node.name === nodeName) {
      found = node
      return false
    }
  })
  return found
}

/**
 * func : node => {}  nodeを引数とした関数
 * @param {SceneNodeClass} node
 * @param {*} func
 */
function traverseNode(node, func) {
  let result = func(node)
  if (result === false) return // 明確なFalseの場合、子供へはいかない
  node.children.forEach(child => {
    traverseNode(child, func)
  })
}

/**
 * アートボードの処理
 * @param {*} renditions
 * @param outputFolder
 * @param {SceneNodeClass} root
 */
async function nodeRoot(renditions, outputFolder, root) {
  let layoutJson = makeLayoutJson(root)

  let traverse = async (
    nodeStack,
    layoutJson,
    depth,
    enableWriteToLayoutJson,
  ) => {
    let node = nodeStack[nodeStack.length - 1]
    // レイヤー名から名前とオプションの分割
    let { style } = getNodeNameAndStyle(node)

    // コメントアウトチェック
    if (style.checkBool(STYLE_COMMENT_OUT)) {
      return
    }

    // 子Node処理関数
    /**
     * @param numChildren
     * @param funcFilter
     * @returns {Promise<void>}
     */
    let funcForEachChild = async (numChildren = null, funcFilter = null) => {
      // layoutJson,node,nodeStackが依存しているため、グローバル関数化しない
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
          await traverse(
            nodeStack,
            childJson,
            depth + 1,
            enableWriteToLayoutJson,
          )
          nodeStack.pop()
          // なにも入っていない場合はelementsに追加しない
          if (enableWriteToLayoutJson && Object.keys(childJson).length > 0) {
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
      case 'Group':
      case 'BooleanGroup':
      case 'RepeatGrid':
      case 'SymbolInstance':
        {
          if (
            style.checkBool(STYLE_IMAGE) ||
            style.checkBool(STYLE_IMAGE_SLICE)
          ) {
            // console.log('groupでのSTYLE_IMAGE処理 子供のコンテンツ変更は行うが、イメージ出力はしない')
            enableWriteToLayoutJson = false //TODO: 関数にわたす引数にならないか
            let tempOutputFolder = outputFolder
            outputFolder = null
            await funcForEachChild()
            outputFolder = tempOutputFolder
            await createImage(layoutJson, node, root, outputFolder, renditions)
            return
          }
          if (style.checkBool(STYLE_BUTTON)) {
            await createButton(layoutJson, node, root, funcForEachChild)
            return
          }
          if (style.checkBool(STYLE_SLIDER)) {
            const type = 'Slider'
            Object.assign(layoutJson, {
              type: type,
              name: getUnityName(node),
            })
            addDrawRectTransform(layoutJson, node)
            await funcForEachChild()
            return
          }
          if (style.checkBool(STYLE_SCROLLBAR)) {
            await createScrollbar(layoutJson, node, funcForEachChild)
            return
          }
          if (style.checkBool(STYLE_TOGGLE)) {
            await createToggle(layoutJson, node, root, funcForEachChild)
            return
          }
          if (style.checkBool(STYLE_VIEWPORT)) {
            await createViewport(layoutJson, node, root, funcForEachChild)
            return
          }
          // 通常のグループ
          await createGroup(layoutJson, node, root, funcForEachChild)
        }
        break
      case 'Line':
      case 'Ellipse':
      case 'Rectangle':
      case 'Path':
      case 'Polygon':
        await createImage(layoutJson, node, root, outputFolder, renditions)
        await funcForEachChild()
        break
      case 'Text':
        await nodeText(layoutJson, node, root, outputFolder, renditions)
        await funcForEachChild()
        break
      default:
        console.log('***error type:' + constructorName)
        await funcForEachChild()
        break
    }
  }

  await traverse([root], layoutJson.root, 0, true)

  return layoutJson
}

/**
 * XdUnityUI export
 * @param {SceneNodeClass[]} roots
 * @param outputFolder
 * @returns {Promise<void>}
 */
async function exportXdUnityUI(roots, outputFolder) {
  resetGlobalVariables()

  // ラスタライズする要素を入れる
  let renditions = []

  globalResponsiveBounds = {}

  for (let root of roots) {
    globalCssRules = await loadCssRules(
      await fs.getPluginFolder(),
      'xd-unity.css',
    )
    const artboardCssFilename = convertToFileName(root.name) + '.css'
    try {
      const artboardCssRoles = await loadCssRules(
        outputFolder,
        artboardCssFilename,
      )
      if (artboardCssRoles) {
        globalCssRules = globalCssRules.concat(artboardCssRoles)
      }
    } catch (e) {
      console.log(`***error ${artboardCssFilename}の読み込みに失敗しました`)
      console.log(e.message)
      console.log(e.stack)
    }
    globalCssVars = createCssVars(globalCssRules)

    globalResponsiveBounds = makeResponsiveBounds(root)

    let nodeNameAndStyle = getNodeNameAndStyle(root)
    let subFolderName = nodeNameAndStyle.node_name
    // フォルダ名に使えない文字を'_'に変換
    subFolderName = convertToFileName(subFolderName, false)

    let subFolder
    // アートボード毎にフォルダを作成する
    if (!optionChangeContentOnly && !optionImageNoExport && outputFolder) {
      // TODO:他にやりかたはないだろうか
      try {
        subFolder = await outputFolder.getEntry(subFolderName)
      } catch (e) {
        subFolder = await outputFolder.createFolder(subFolderName)
      }
    }

    const layoutJson = await nodeRoot(renditions, subFolder, root)

    if (outputFolder && !optionChangeContentOnly) {
      const layoutFileName = subFolderName + '.layout.json'
      const layoutFile = await outputFolder.createFile(layoutFileName, {
        overwrite: true,
      })
      // レイアウトファイルの出力
      await layoutFile.write(JSON.stringify(layoutJson, null, '  '))
    }
  }

  // すべて可視にする
  // 背景のぼかしをすべてオフにする　→　ボカシがはいっていると､その画像が書き込まれるため
  if (!optionChangeContentOnly) {
    for (let root of roots) {
      traverseNode(root, node => {
        const { node_name: nodeName, style } = getNodeNameAndStyle(node)
        if (style.checkBool(STYLE_COMMENT_OUT)) {
          return false // 子供には行かないようにする
        }
        try {
          if (!node.visible) node.visible = true
          if (node.blur != null) {
            // ぼかしをオフ　ぼかした絵がそのまま画像になるため
            node.blur = null
          }
        } catch (e) {
          console.log('***error ' + nodeName + ': blur off failed.')
        }
        // IMAGEであった場合、そのグループの不可視情報はそのまま活かすため
        // 自身は可視にし、子供の不可視情報は生かす
        // 本来は sourceImageをNaturalWidth,Heightで出力する
        if (
          style.checkBool(STYLE_IMAGE) ||
          style.checkBool(STYLE_IMAGE_SLICE) != null ||
          node.constructor.name == 'RepeatGrid'
        ) {
          return false
        }
      })
    }
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
        // 出力失敗に関して参考サイト
        // https://forums.adobexdplatform.com/t/details-for-io-failed/1185/14
        console.log(
          '1)access denied (disk permission)\n2)readonly folder\n3)not enough disk space\n4)maximum path(I think it’s 256 currently on both platform)\n5)image size 0px',
        )
        alert(
          '画像の出力に失敗しました\n以下のような可能性があります\n・書き込み先の問題\n・パス名が流すぎる\n・イメージサイズが0px',
        )
      })
  } else {
    // 画像出力の必要がなければ終了
    // alert('no outputs')
  }
}

/**
 * 選択されたものがExportに適しているかチェックし
 * 適しているノードならば返す
 * ・ルート直下のノードを１つ選択している
 * ・ロックされていない
 * @param selection
 * @return {Promise<null|*>}
 */
async function getExportNodeFromSelection(selection) {
  if (selection.items.length !== 1) {
    return null
  }
  let node = selection.items[0]
  try {
    let parent = node.parent
    if (!(parent instanceof Artboard)) return null
  } catch (e) {
    return null
  }
  return node
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
    title = 'XdUnityUI Export'
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
 * Selectionから出力対象アートボードを得る
 * アートボード直下のノードが選択されているかも確認（EditContext対応）
 * @param {Selection} selection
 * @returns {SceneNode[]}
 */
async function getExportArtboards(selection) {
  // 選択されているものがない場合 全てが変換対象
  // return selection.items.length > 0 ? selection.items : root.children
  if (selection.items.length !== 1) {
    await alert('出力アートボート直下のノードを1つ選択してください')
    throw 'not selected immediate child.'
  }
  const node = selection.items[0]
  if (node.locked) {
    await alert('ロックされていないルート直下のノードを1つ選択してください')
    throw 'selected locked child.'
  }
  const parent = node.parent
  const parentIsArtboard = parent instanceof Artboard
  if (!parentIsArtboard) {
    await alert('出力アートボート直下のノードを1つ選択してください')
    throw 'not selected immediate child.'
  }

  return [parent]
}

/**
 *
 * @param {Selection} selection
 * @param {RootNode} root
 * @returns {Promise<void>}
 */
async function pluginExportXdUnityUICommand(selection, root) {
  let inputFolder
  let inputScale
  let errorLabel
  let checkImageNoExport
  let checkCheckMarkedForExport
  let checkAllArtboard
  let checkChangeContentOnly
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
      h('h1', 'XdUnityUI Export'),
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
      h(
        'label',
        {
          style: {
            flexDirection: 'row',
            alignItems: 'center',
          },
        },
        (checkChangeContentOnly = h('input', {
          type: 'checkbox',
        })),
        h('span', 'CSSによるコンテンツの変更のみ実行'),
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

              globalScale = tmpScale
              optionImageNoExport = checkImageNoExport.checked
              optionCheckMarkedForExport = checkCheckMarkedForExport.checked
              optionChangeContentOnly = checkChangeContentOnly.checked

              // 出力フォルダは設定してあるか
              if (!optionChangeContentOnly && outputFolder == null) {
                errorLabel.textContent = 'invalid output folder'
                return
              }

              dialog.close('export')
            },
          },
          'Export',
        ),
      ),
    ),
  )

  // 出力前にセッションデータをダイアログに反映する
  // Scale
  inputScale.value = globalScale
  // Folder
  inputFolder.value = ''
  if (outputFolder != null) {
    inputFolder.value = outputFolder.nativePath
  }
  // Responsive Parameter
  checkImageNoExport.checked = optionImageNoExport
  checkCheckMarkedForExport.checked = optionCheckMarkedForExport
  checkChangeContentOnly.checked = optionChangeContentOnly

  // Dialog表示
  document.body.appendChild(dialog)
  let result = await dialog.showModal()

  // Dialogの結果チェック 出力しないのなら終了
  if (result !== 'export') return

  /**
   * @type {SceneNodeClass[]|SceneNodeList}
   */
  let exportRoots = []

  if (optionChangeContentOnly) {
    exportRoots = [getArtboard(selection.items[0])]
  } else {
    const node = await getExportNodeFromSelection(selection)
    if (!node) {
      await alert(
        '選択条件\n・選択は１つ\n・出力アートボード直下\n・ロックされていない\n',
      )
      throw 'Selected node is not immediate child.'
    }
    let parent = node.parent
    // 全てのアートボードが出力対象になっているか確認
    if (checkAllArtboard.checked) {
      root.children.forEach(node => {
        exportRoots.push(node)
      })
    } else {
      exportRoots.push(parent)
    }
  }

  if (exportRoots.length === 0) {
    await alert('対象が見つかりません')
    return
  }

  try {
    // 出力ノードリスト
    /**
     * @type {SceneNodeClass[]}
     */
    await exportXdUnityUI(exportRoots, outputFolder)
  } catch (e) {
    console.log(e)
    console.log(e.stack)
    await alert(e.message, 'error')
  }
  console.log('export baum2 done.')
  // データをもとに戻すため､意図的にエラーをスローする
  if (!optionChangeContentOnly) {
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
  globalResponsiveBounds = {}
  selectionItems.forEach(item => {
    // あとで一括変化があったかどうか調べるため､responsiveBoundsにパラメータを追加していく
    makeResponsiveBounds(item)
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
  // Artboardをリサイズしてもとに戻しても、まったく同じ状態には戻らない
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
  if (!folder) return console.log('User canceled folder picker.')
  const file = await folder.createFile('rendition.png')
  let node = selection.items[0];
  console.log(node.name)
  let renditionSettings = [
    {
      node: node, // [1]
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

class CssSelector {
  /**
   * @param {string} selectorText
   */
  constructor(selectorText) {
    if (!selectorText) {
      throw 'CssSelectorがNULLで作成されました'
    }
    // console.log("SelectorTextをパースします",selectorText)
    this.json = cssSelectorParser.parse(selectorText.trim())
    /*
    console.log(
      'SelectorTextをパースしました',
      JSON.stringify(this.json, null, '  '),
    )
     */
  }

  /**
   * 擬似クラスの:rooｔであるか
   * @return {boolean}
   */
  isRoot() {
    const rule = this.json['rule']
    if (!rule) return false
    const pseudos = rule['pseudos']
    // console.log("isRoot() pseudos確認:", pseudos)
    return pseudos && pseudos[0].name === 'root'
  }

  /**
   *
   * @param {{name:string, parent:*}} node
   * @param {{type:string, classNames:string[], id:string, tagName:string, pseudos:*[], nestingOperator:string, rule:*, selectors:*[] }|null} rule
   * @return {null|*}
   */
  matchRule(node, rule = null, verboseLog = false) {
    if (!rule) {
      rule = this.json
    }
    if (!rule) {
      return null
    }
    let checkNode = node
    let ruleRule = rule.rule
    switch (rule.type) {
      case 'rule': {
        // まず奥へ入っていく
        if (ruleRule) {
          checkNode = this.matchRule(node, ruleRule, verboseLog)
          if (!checkNode) {
            return null
          }
        }
        break
      }
      case 'selectors': {
        for (let selector of rule.selectors) {
          ruleRule = selector.rule
          checkNode = this.matchRule(node, ruleRule, verboseLog)
          if (checkNode) break
        }
        if (!checkNode) {
          return null
        }
        break
      }
      case 'ruleSet': {
        return this.matchRule(node, ruleRule, verboseLog)
      }
      default:
        return null
    }
    if (ruleRule && ruleRule.nestingOperator === null) {
      // console.log('nullオペレータ確認をする')
      while (checkNode) {
        let result = CssSelector.check(checkNode, rule, verboseLog)
        if (result) {
          // console.log('nullオペレータで整合したものをみつけた')
          return checkNode
        }
        checkNode = checkNode.parent
      }
      // console.log('nullオペレータで整合するものはみつからなかった')
      return null
    }
    let result = CssSelector.check(checkNode, rule, verboseLog)
    if (!result) {
      // console.log('このruleは適合しなかった')
      return null
    }
    // console.log('check成功')
    if (rule.nestingOperator === '>' || rule.nestingOperator === null) {
      // console.log('nestingオペレータ確認のため、checkNodeを親にすすめる')
      checkNode = checkNode.parent
    }
    return checkNode
  }

  /**
   * @param {{name:string, parent:*}} node
   * @param {{type:string, classNames:string[], id:string, tagName:string, attrs:*[], pseudos:*[], nestingOperator:string, rule:*, selectors:*[] }|null} rule
   * @return {boolean}
   */
  static check(node, rule, verboseLog = false) {
    if (!node) return false
    const nodeName = node.name.trim()
    const parsedNodeName = parseNodeName(nodeName)
    if (verboseLog) {
      console.log('ルール check ----------')
      console.log(node)
      console.log(parsedNodeName)
      console.log('以下のruleと照らし合わせる')
      console.log(rule)
      console.log('----')
    }
    if (rule.tagName && rule.tagName !== '*') {
      if (
        rule.tagName !== parsedNodeName.tagName &&
        rule.tagName !== nodeName
      ) {
        if (verboseLog) console.log('tagName not found')
        return false
      }
    }
    if (rule.id && rule.id !== parsedNodeName.id) {
      if (verboseLog) console.log('id not found')
      return false
    }
    if (rule.classNames) {
      if (!parsedNodeName.classNames) return false
      for (let className of rule.classNames) {
        const found = parsedNodeName.classNames.find(c => c === className)
        if (!found) {
          if (verboseLog) console.log('classNames not found')
          return false
        }
      }
    }
    if (rule.attrs) {
      // console.log('attrチェック')
      for (let attr of rule.attrs) {
        switch (attr.name) {
          case 'class': {
            if (
              !CssSelector.namesCheck(
                attr.operator,
                parsedNodeName.classNames,
                attr.value,
              )
            )
              return false
            break
          }
          case 'id': {
            if (
              !CssSelector.nameCheck(
                attr.operator,
                parsedNodeName.id,
                attr.value,
              )
            )
              return false
            break
          }
          case 'tag-name': {
            if (
              !CssSelector.nameCheck(
                attr.operator,
                parsedNodeName.tagName,
                attr.value,
              )
            )
              return false
            break
          }
          case 'type-of':
          case 'typeof': {
            if (
              !CssSelector.nameCheck(
                attr.operator,
                node.constructor.name,
                attr.value,
              )
            )
              return false
            break
          }
          default:
            console.log('***error 未対応の要素名です:', attr.name)
            return false
        }
      }
    }
    if (rule.pseudos) {
      for (let pseudo of rule.pseudos) {
        switch (pseudo.name) {
          case 'nth-child':
            const nthChild = parseInt(pseudo.value)
            const nodeChildIndex = getChildIndex(node) + 1
            if (nthChild !== nodeChildIndex) return false
            break
          case 'root':
            if (node.parent) return false // 親があるのならマッチしない
            break
          default:
            console.log('***error 未対応の疑似要素です', pseudo.name)
            return false
        }
      }
    }
    //console.log(nodeName)
    //console.log(JSON.stringify(parsedNodeName, null, '  '))
    if (verboseLog) console.log('マッチしました')
    return true
  }

  /**
   * @param {string} op
   * @param {string[]} names
   * @param value
   */
  static namesCheck(op, names, value) {
    if (!op || names == null) return false
    for (let name of names) {
      if (this.nameCheck(op, name, value)) return true
    }
    return false
  }

  /**
   * @param {string} op
   * @param {string} name
   * @param value
   */
  static nameCheck(op, name, value) {
    if (!op || name == null || value == null) return false
    switch (op) {
      case '=':
        return name === value
      case '*=':
        return name.includes(value) > 0
      case '^=':
        return name.startsWith(value)
      case '$=':
        return name.endsWith(value)
      case '|=':
        if (name === value) return true
        return name.startsWith(value + '-')
    }
    return false
  }
}

const CssSelectorParser = require('./node_modules/css-selector-parser/lib/css-selector-parser')
  .CssSelectorParser
let cssSelectorParser = new CssSelectorParser()
//cssSelectorParser.registerSelectorPseudos('has')
cssSelectorParser.registerNumericPseudos('nth-child')
cssSelectorParser.registerNestingOperators('>', '+', '~', ' ')
cssSelectorParser.registerAttrEqualityMods('^', '$', '*', '~')
cssSelectorParser.enableSubstitutes()

/**
 *
 * @param {Selection} selection
 * @param {RootNode} root
 * @return {Promise<void>}
 */
async function testParse(selection, root) {
  const folder = await fs.getPluginFolder()
  const file = await folder.getEntry('xd-unity.css')
  let text = await file.read()

  const selector =
    //'.a:nth-child(2)'
    //'[class$="-aaa"]'
    ':root'
  //'a.b,#c > d.e'
  //'a > #b1, #b2 {key:value}'
  //'#id.hello,hello'
  const cssSelector = new CssSelector(selector)

  //const result = cssSelector.matchRule(selection.items[0])
  console.log(result)
}

module.exports = {
  // コマンドIDとファンクションの紐付け
  commands: {
    exportXdUnityUICommand: pluginExportXdUnityUICommand,
    addResponsiveParam: pluginResponsiveParamName,
    addImageSizeFix: pluginAddImageSizeFix,
    testPlugin: testRendition,
  },
}
