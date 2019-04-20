// XD拡張APIのクラスをインポート
const { Artboard, Text, Color, ImageFill } = require('scenegraph')
const scenegraph = require('scenegraph')
const application = require('application')
const fs = require('uxp').storage.localFileSystem

// 全体にかけるスケール
var scale = 2.0

// レスポンシブパラメータを保存する
var responsiveBounds = {}

// 出力するフォルダ
var outputFolder = null

// 拡張要素を有効にするかどうか TextMeshPro/EnhancedScroller/TextInput対応
var optionEnableExtended = true

// エキスポートフラグを見るかどうか
var optionCheckMarkedForExport = true

// レスポンシブパラメータを取得するオプション
var optionNeedResponsiveParameter = true

// レスポンシブパラメータを取得するオプション
var optionEnableSubPrefab = true

// Textノードは強制的にTextMeshProに変換する
var optionTextToTextMP = false

// Textノードは強制的にImageに変換する
var optionForceTextToImage = false

// オプション文字列　全て小文字 オプションは 大文字は小文字､-は消去し判定する
const OPTION_COMMENTOUT = 'commentout'
const OPTION_SUB_PREFAB = 'subprefab'
const OPTION_BUTTON = 'button'
const OPTION_SLIDER = 'slider'
const OPTION_SCROLLBAR = 'scrollbar'
const OPTION_IMAGE = 'image'
const OPTION_TEXT = 'text'
const OPTION_INPUT = 'input'
const OPTION_TOGGLE = 'toggle'
const OPTION_LIST = 'list'
const OPTION_SCROLLER = 'scroller'
const OPTION_PIVOT = 'pivot'
const OPTION_STRETCH_X = 'stretchx'
const OPTION_STRETCH_Y = 'stretchy'
const OPTION_STRETCH_XY = 'stretchxy'
const OPTION_STRETCH_W = 'stretchw'
const OPTION_STRETCH_H = 'stretchh'
const OPTION_STRETCH_WH = 'stretchwh'
const OPTION_FIX = 'fix'
const OPTION_TEXTMP = 'textmp' // textmeshpro
const OPTION_GROUP = 'group'
const OPTION_VGROUP = 'vgroup'
const OPTION_VIEWPORT = 'viewport'
const OPTION_CANVASGROUP = 'canvasgroup'
const OPTION_COMPONENT = 'component'
const OPTION_VERTICAL_FIT = 'verticalfit'
const OPTION_PREFERRED_HEIGHT = 'preferredheight'

function checkOptionCommentOut(options) {
  return checkBoolean(options[OPTION_COMMENTOUT])
}

function checkOptionSubPrefab(options) {
  return optionEnableSubPrefab && checkBoolean(options[OPTION_SUB_PREFAB])
}

function checkOptionButton(options) {
  return checkBoolean(options[OPTION_BUTTON])
}

function checkOptionSlider(options) {
  return checkBoolean(options[OPTION_SLIDER])
}

function checkOptionScrollbar(options) {
  return checkBoolean(options[OPTION_SCROLLBAR])
}

function checkOptionImage(options) {
  return checkBoolean(options[OPTION_IMAGE])
}

function checkOptionText(options) {
  return checkBoolean(options[OPTION_TEXT])
}

function checkOptionTextMeshPro(options) {
  return (
    optionEnableExtended &&
    (optionTextToTextMP || checkBoolean(options[OPTION_TEXTMP]))
  )
}

function checkOptionInput(options) {
  return optionEnableExtended && checkBoolean(options[OPTION_INPUT])
}

function checkOptionToggle(options) {
  return checkBoolean(options[OPTION_TOGGLE])
}

function checkOptionList(options) {
  return checkBoolean(options[OPTION_LIST])
}

function checkOptionScroller(options) {
  return optionEnableExtended && checkBoolean(options[OPTION_SCROLLER])
}

function checkOptionViewport(options) {
  return optionEnableExtended && checkBoolean(options[OPTION_VIEWPORT])
}

/**
 * 誤差範囲での差があるか
 * @param {number} a
 * @param {number} b
 * @param {number} eps
 */
function approxEqual(a, b, eps) {
  if (eps == null) {
    eps = 0.00001
  }
  return Math.abs(a - b) < eps
}

/**
 * ファイル名につかえる文字列に変換する
 * @param {*} name
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
  var propNames = []
  var o = obj
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
  const c = ('000000' + color.toString(16)).substr(-6)
  return c
}

/**
 * グローバル座標とサイズを取得する
 * @param {scenegraph} node
 */
function getGlobalDrawBounds(node) {
  const bounds = node.globalDrawBounds
  return {
    x: bounds.x * scale,
    y: bounds.y * scale,
    width: bounds.width * scale,
    height: bounds.height * scale,
  }
}

/**
 * グローバル座標とサイズを取得する
 * @param {scenegraph} node
 */
function getGlobalBounds(node) {
  const bounds = node.globalBounds
  // Artboardにあるスクロール領域のボーダー
  const viewPortHeight = node.viewportHeight
  if (viewPortHeight != null) bounds.height = viewPortHeight
  return {
    x: bounds.x * scale,
    y: bounds.y * scale,
    width: bounds.width * scale,
    height: bounds.height * scale,
  }
}

/**
 * Baum2用Boundsパラメータの取得
 * Artboard内でのDrawBoundsを取得する
 * x､yはCenterMiddleでの座標になる
 * @param {scenegraph} node
 * @param {artboard} base
 */
function getDrawBoundsInBaseCenterMiddle(node, base) {
  const nodeDrawBounds = getGlobalDrawBounds(node)
  const baseBounds = getGlobalBounds(base)
  return {
    x: nodeDrawBounds.x - (baseBounds.x + baseBounds.width / 2),
    y: nodeDrawBounds.y - (baseBounds.y + baseBounds.height / 2),
    width: nodeDrawBounds.width,
    height: nodeDrawBounds.height,
  }
}

/**
 * Base内での x､yはCenterMiddleでの座標, WidhtHeightを取得する
 * @param {scenegraph} node
 * @param {artboard} base
 */
function getCMWHInBase(node, base) {
  const nodeBounds = getGlobalBounds(node)
  const baseBounds = getGlobalBounds(base)
  return {
    x:
      nodeBounds.x +
      nodeBounds.width / 2 -
      (baseBounds.x + baseBounds.width / 2),
    y:
      nodeBounds.y +
      nodeBounds.height / 2 -
      (baseBounds.y + baseBounds.height / 2),
    width: nodeBounds.width,
    height: nodeBounds.height,
  }
}

function checkBoolean(r) {
  if (typeof r == 'string') {
    const val = r.toLowerCase()
    if (val == 'false' || val == '0' || val == 'null') return false
  }
  return r ? true : false
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
 * @param {*} a
 * @param {*} b
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
 * @param {*} node
 */
function assignCanvasGroup(json, node, options) {
  let canvasGroup = options[OPTION_CANVASGROUP]
  if (canvasGroup != null) {
    Object.assign(json, {
      canvasgroup: { alpha: 0 },
    })
  }
}

/**
 * オプションにpivot､streachがあれば上書き
 * @param {*} json
 * @param {*} node
 */
function assignPivotAndStretch(json, node) {
  if (!optionNeedResponsiveParameter) {
    return null
  }
  let pivot = getPivotAndStretch(node)
  if (pivot != null) {
    Object.assign(json, pivot)
  }
}

function searchFileName(renditions, fileName) {
  const found = renditions.find(entry => {
    return entry.fileName == fileName
  })
  return found
}

async function assignImage(json, node, root, subFolder, renditions, name) {
  // 今回出力するためのユニークな名前をつける
  let { name: parentName, options: parentOptions } = parseNameOptions(
    node.parent,
  )
  let fileName = convertToFileName(parentName + ' - ' + name, true)
  // すでに同じものがあるか検索
  const found = searchFileName(renditions, fileName)
  if (found) {
    // 見つかった場合は､guidから文字列を付与しユニークとする
    const guid5 = '_' + node.guid.slice(0, 5)
    fileName += guid5
  }

  // 出力画像ファイル
  const file = await subFolder.createFile(fileName + '.png', {
    overwrite: true,
  })

  const drawBounds = getDrawBoundsInBaseCenterMiddle(node, root)
  Object.assign(json, {
    image: fileName,
    x: drawBounds.x,
    y: drawBounds.y,
    w: drawBounds.width,
    h: drawBounds.height,
    opacity: 100,
  })

  // 画像出力登録
  renditions.push({
    fileName: fileName,
    node: node,
    outputFile: file,
    type: application.RenditionType.PNG,
    scale: scale,
  })
}

async function assginScroller(
  json,
  node,
  root,
  subFolder,
  renditions,
  name,
  options,
  funcForEachChild,
) {
  let areaNodes = node.children.filter(child => {
    const { name, options } = parseNameOptions(child)
    return name == 'Area'
  })

  if (areaNodes.length == 0) {
    if (node.constructor.name == 'RepeatGrid') {
      /*
      Areaがなくて､リピートグリッドだけでもScrollerを作成する
      仕様:
      一番目のアイテムをテンプレートとして､Baum2にわたす(item[0])
      Itemはレスポンシブ設定自動取得できない
        → RepeatGridは､サイズの変更で､アイテムの数が変わるもののため
        → そのため､RepeatGridの中のアイテムは固定サイズになる
      列が1つ → 縦スクロール
      行が1つ → 横スクロール
      それ以外 → Grid
      */
      var scrollDirection = 'vertical'
      let items
      if (node.numColumns == 1) {
        // vertical
        var scrollDirection = 'vertical'
        // item[0]を一個だけコンバート
        await funcForEachChild(1)
        // アイテムの作成
        // Scroller直下にはリピートグリッドで並べた分のitem[0]があり､
        // もう1段したの子供がアイテムになる
        items = [json.elements[0]]
      } else if (node.numRows == 1) {
        // Horizontal
        scrollDirection = 'horizontal'
        // item[0]を一個だけコンバート
        await funcForEachChild(1)
        items = [json.elements[0]]
      } else {
        // Grid
        items = [
          {
            type: 'Group',
            name: 'item0',
            elements: [],
          },
        ]
        // Column分のitem[0]をコンバートする
        await funcForEachChild(node.numColumns)
        // 一列はいっているitemを作成する
        for (let i = 0; i < node.numColumns; i++) {
          var elem = json.elements[i]
          elem.name = 'item0-' + (node.numColumns - i - 1)
          items[0].elements.push(elem)
        }
      }

      // item[0]のグループをlefttopにする
      // items.forEach(item => {
      //     item['pivot'] = 'lefttop'
      // })

      Object.assign(json, {
        type: 'Scroller',
        name: name,
        scroll: scrollDirection,
      })

      const child0 = node.children.at(0)
      // cellのサイズはリピートグリッドの元になったもの全てのサイズ
      const cellWidth = node.cellSize.width * scale
      const cellHeight = node.cellSize.height * scale

      const spacing =
        scrollDirection == 'vertical'
          ? node.paddingY * scale
          : node.paddingX * scale
      const drawBounds = getDrawBoundsInBaseCenterMiddle(node, root)

      const paddingLeft = child0.topLeftInParent.x * scale
      const paddingTop = child0.topLeftInParent.y * scale

      const itemWidth =
        paddingLeft + // 左のスペース
        cellWidth * node.numColumns + // cellのサイズ*cellの個数
        node.paddingX * scale * (node.numColumns - 1) // cellとcellの隙間*(cellの個数-1)
      const itemHeight =
        paddingTop + // 上のスペース
        cellHeight * node.numRows + // cellのサイズ*cellの個数
        node.paddingY * scale * (node.numRows - 1) // cellとcellの隙間*(cellの個数-1)

      const paddingRight = drawBounds.width - itemWidth

      // リピートグリッドなら子供はすべてScrollerにいれるものになっている
      // 隙間のパラメータ
      Object.assign(json, {
        paddingLeft: paddingLeft,
        paddingRight: paddingRight,
        paddingTop: paddingTop,
        spacing: spacing,
        x: drawBounds.x,
        y: drawBounds.y,
        w: drawBounds.width,
        h: drawBounds.height,
        opacity: 100,
        elements: items, // トップの一個だけ
      })
      assignPivotAndStretch(json, node)
    } else {
      console.log('***error not found Area')
    }
  }
  return 'Scroller'
}

async function assginViewport(
  json,
  node,
  root,
  subFolder,
  renditions,
  name,
  options,
  funcForEachChild,
  depth,
) {
  if (node.constructor.name == 'RepeatGrid') {
    //以下縦スクロール専用でコーディング
    var scrollDirection = 'vertical'

    let contentBounds = new CalcBounds()

    const viewport = getGlobalDrawBounds(node)
    contentBounds.addBounds(viewport)
    // AdobeXDの問題で　リピートグリッドの枠から外れているものもデータがくるケースがある
    // そういったものを省くための処理
    // Contentの領域も計算する
    await funcForEachChild(null, child => {
      const nameOptions = parseNameOptions(child)
      //if (index == 0) return
      const bounds = getGlobalDrawBounds(child)
      if (!testBounds(viewport, bounds)) {
        console.log(nameOptions.name + 'はViewportにはいっていない')
        return false
      }
      contentBounds.addBounds(bounds)
      console.log(bounds)
      return true
    })
    const viewportBoundsCM = getDrawBoundsInBaseCenterMiddle(node, root)

    var child0 = node.children.at(0)
    const child0BoundsCM = getDrawBoundsInBaseCenterMiddle(child0, node)

    const cellWidth = node.cellSize.width * scale
    // item[0] がY方向へ移動している分
    const cellHeight = child0BoundsCM.y + node.cellSize.height * scale

    node.children.forEach((child, index) => {
      child['pivot'] = 'topleft'
      child['stretchx'] = true // 縦スクロールの場合､item[0]は横ストレッチ可にする
    })

    Object.assign(json, {
      type: 'Viewport',
      name: name,
      x: viewportBoundsCM.x,
      y: viewportBoundsCM.y,
      w: viewportBoundsCM.width,
      h: viewportBoundsCM.height,
      cellw: contentBounds.bounds.width,
      cellh: contentBounds.bounds.height,
      scroll: scrollDirection,
    })

    assignPivotAndStretch(json, node)

    //ViewportにVGROUPがついていた場合､その子供にVGROUPをつける
    if (options[OPTION_VGROUP] != null) {
      json.elements[0]['vgroup'] = {}
    }
  }
}

function assignVGroup(
  json,
  node,
  root,
  subFolder,
  renditions,
  name,
  options,
  funcForEachChild,
  depth,
) {
  // 子供(コンポーネント化するものを省く)のリスト用ソート 上から順に並ぶように
  json.elements.sort((elemA, elemB) => {
    const a_y = elemA['component'] ? Number.MAX_VALUE : elemA['y']
    const b_y = elemB['component'] ? Number.MAX_VALUE : elemB['y']
    return b_y - a_y
  })
  // componentの無いelemリストを作成する
  let elems = []
  for (let i = json.elements.length - 1; i >= 0; i--) {
    //後ろから追加していく
    let element = json.elements[i]
    if (element && element['component'] == null) {
      elems.push(element)
    }
  }
  // Paddingを取得するため､子供(コンポーネント化するものを除く)のサイズを取得する
  var childrenCalcBounds = new CalcBounds()
  node.children.forEach(child => {
    const nameOptions = parseNameOptions(child)
    if (nameOptions.options['component']) return
    childrenCalcBounds.addBounds(getGlobalDrawBounds(child))
  })
  //
  Object.assign(json, {
    vgroup: {},
  })
  let jsonVGroup = json['vgroup']
  // Paddingの計算
  let drawBounds = getGlobalDrawBounds(node)
  const childrenBounds = childrenCalcBounds.bounds
  const paddingLeft = childrenBounds.x - drawBounds.x
  const paddingTop = childrenBounds.y - drawBounds.y
  const paddingRight =
    drawBounds.x + drawBounds.width - (childrenBounds.x + childrenBounds.width)
  const paddingBottom =
    drawBounds.y +
    drawBounds.height -
    (childrenBounds.y + childrenBounds.height)
  Object.assign(jsonVGroup, {
    padding: {
      left: paddingLeft,
      right: paddingRight,
      top: paddingTop,
      bottom: paddingBottom,
    },
  })
  // 子供の1個め､2個め(コンポーネント化するものを省く)を見てSpacing､ChildAlignmentを決める
  if (elems[0] && elems[1]) {
    // spacingの計算 ソートした上で､elems[0]とelems[1]で計算する
    // 簡易的にやっている
    const spacing = elems[1].y - (elems[0].y + elems[0].h)
    Object.assign(jsonVGroup, {
      spacing: spacing,
    })
    // left揃えか
    if (approxEqual(elems[0].x, elems[1].x)) {
      Object.assign(jsonVGroup, {
        child_alignment: 'left',
      })
    } else if (approxEqual(elems[0].x + elems[0].w, elems[1].x + elems[1].w)) {
      Object.assign(jsonVGroup, {
        child_alignment: 'right',
      })
    } else {
      Object.assign(jsonVGroup, {
        child_alignment: 'center',
      })
    }
  }
  // items全部が stretchx:true なら　ChildForceExpand.width = true
  const foundNotStretchX = elems.forEach(elem => {
    return elem['stretchx'] != true
  })
  if (!foundNotStretchX) {
    Object.assign(jsonVGroup, {
      child_force_expand_width: true,
    })
  }
}

async function assginGroup(
  json,
  node,
  root,
  subFolder,
  renditions,
  name,
  options,
  funcForEachChild,
  depth,
) {
  const type = 'Group'
  let boundsCM = getDrawBoundsInBaseCenterMiddle(node, root)
  Object.assign(json, {
    type: type,
    name: name,
    x: boundsCM.x, // Baum2では使わないが､　VGROUPなど､レイアウトの情報としてもつ
    y: boundsCM.y, // Baum2では使わないが､ VGroupなど､レイアウトの情報としてもつ
    w: boundsCM.width, // Baum2ではつかわないが､情報としていれる RectElementで使用
    h: boundsCM.height, // Baum2ではつかわないが､情報としていれる RectElementで使用
    elements: [], // Groupは空でもelementsをもっていないといけない
  })
  assignPivotAndStretch(json, node)
  assignCanvasGroup(json, node, options)
  await funcForEachChild()

  // assginVerticaFit
  if (options[OPTION_VERTICAL_FIT] != null) {
    Object.assign(json, {
      vertical_fit: 'preferred', // デフォルトはpreferred
    })
  }

  // assginPreferredHeight
  if (options[OPTION_PREFERRED_HEIGHT] != null) {
    Object.assign(json, {
      preferred_height: json.h,
    })
  }

  // assignVGroup
  if (options[OPTION_VGROUP] != null) {
    assignVGroup(
      json,
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
  return type
}

/**
 * Groupの処理 戻り値は処理したType
 * 注意:ここで､子供の処理もしてしまう
 * @param {*} json
 * @param {scenegraph} node
 * @param {*} funcForEachChild
 * @param {string} name
 * @param {string[]} options
 */
async function nodeGroup(
  json,
  node,
  root,
  subFolder,
  renditions,
  name,
  options,
  funcForEachChild,
  depth,
) {
  if (depth > 0 && checkOptionSubPrefab(options)) {
    // SubPrefabオプションをみつけた場合それ以下の処理は行わないようにする
    // 深度が0以上というのは､必要か　→　必要 出力ノードになっている場合､depth==0なので
    return 'subPrefab'
  }
  if (checkOptionImage(options)) {
    await nodeDrawing(json, node, root, subFolder, renditions, name, options)
    return 'Image'
  }

  if (checkOptionButton(options)) {
    const type = 'Button'
    Object.assign(json, {
      type: type,
      name: name,
    })
    assignPivotAndStretch(json, node)
    await funcForEachChild()
    return type
  }

  if (checkOptionSlider(options)) {
    const type = 'Slider'
    Object.assign(json, {
      type: type,
      name: name,
    })
    await funcForEachChild()
    return type
  }

  if (checkOptionSlider(options)) {
    const type = 'Scrollbar'
    Object.assign(json, {
      type: type,
      name: name,
    })
    await funcForEachChild()
    return type
  }

  if (checkOptionToggle(options)) {
    const type = 'Toggle'
    Object.assign(json, {
      type: type,
      name: name,
    })
    // Toggle group
    if (options[OPTION_GROUP]) {
      Object.assign(json, {
        group: options[OPTION_GROUP],
      })
    }
    assignPivotAndStretch(json, node)
    await funcForEachChild()
    return type
  }

  if (checkOptionList(options)) {
    const type = 'List'
    Object.assign(json, {
      type: type,
      name: name,
      scroll: 'vertical', // TODO:オプションを取得するようにする
    })
    await funcForEachChild()
    let areaElement = json.elements.find(element => {
      return element.name == 'Area'
    })
    if (!areaElement) {
      console.log('***error not found Area')
    }
    return type
  }

  if (checkOptionScroller(options)) {
    return await assginScroller(
      json,
      node,
      root,
      subFolder,
      renditions,
      name,
      options,
      funcForEachChild,
    )
  }

  if (checkOptionViewport(options)) {
    return await assginViewport(
      json,
      node,
      root,
      subFolder,
      renditions,
      name,
      options,
      funcForEachChild,
    )
  }
  // 他に"Mask"がある

  // 通常のグループ
  return await assginGroup(
    json,
    node,
    root,
    subFolder,
    renditions,
    name,
    options,
    funcForEachChild,
  )
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
  addBounds(bounds) {
    this.addBoundsParam(bounds.x, bounds.y, bounds.width, bounds.height)
  }
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
 * 自動で取得されたレスポンシブパラメータは､optionの @Pivot @StretchXで上書きされる
 * @param {*} beforeBounds
 * @param {*} afterBounds
 * @param {number} resizePlusWidth リサイズ時に増えた幅
 * @param {number} resizePlusHeight リサイズ時に増えた高さ
 */
function getResponsiveParameter(node, hashBounds, options) {
  if (!node || !node.parent) return null
  if (!options) {
    // @Pivot @Stretchを取得するため
    const nameOptions = parseNameOptions(node)
    options = nameOptions.options
  }
  const nodeBounds = hashBounds[node.guid]
  if (!nodeBounds || !nodeBounds['before'] || !nodeBounds['after']) return null
  const beforeBounds = nodeBounds['before']['bounds']
  const afterBounds = nodeBounds['after']['bounds']
  const parentBounds = hashBounds[node.parent.guid]
  if (!parentBounds || !parentBounds['before'] || !parentBounds['after'])
    return null
  const resizePlusWidth =
    parentBounds['after']['bounds'].width -
    parentBounds['before']['bounds'].width
  const resizePlusHeight =
    parentBounds['after']['bounds'].height -
    parentBounds['before']['bounds'].height

  let horizontalFix = null // left center right
  let verticalFix = null // top middle bottom

  // 横のレスポンシブパラメータを取得する
  if (beforeBounds.x == afterBounds.x) {
    horizontalFix = 'left'
  } else {
    const subx = afterBounds.x - beforeBounds.x
    horizontalFix =
      subx > 0 && subx <= resizePlusWidth * 0.6 ? 'center' : 'right' // 0.6 → 0.5より多めにとる
  }

  // 縦のレスポンシブパラメータを取得する
  if (beforeBounds.y == afterBounds.y) {
    verticalFix = 'top'
  } else {
    const suby = afterBounds.y - beforeBounds.y
    verticalFix =
      suby > 0 && suby <= resizePlusHeight * 0.6 ? 'middle' : 'bottom'
  }

  let ret = {}

  // オプションからのパラメータを入れる
  // これらの値はオプションが定義されていなければNULLという判定が重要
  // NULLの場合、自動的にレスポンシブパラメータが付与される
  let pivotOption = options[OPTION_PIVOT]
  let stretchWOption = options[OPTION_STRETCH_X]
  let stretchHOption = options[OPTION_STRETCH_Y]

  if (options[OPTION_STRETCH_XY] != null) {
    stretchWOption = options[OPTION_STRETCH_XY]
    stretchHOption = options[OPTION_STRETCH_XY]
  }

  if (options[OPTION_STRETCH_W] != null) {
    stretchWOption = options[OPTION_STRETCH_W]
  }

  if (options[OPTION_STRETCH_H] != null) {
    stretchWOption = options[OPTION_STRETCH_H]
  }

  if (options[OPTION_STRETCH_WH] != null) {
    stretchWOption = options[OPTION_STRETCH_WH]
    stretchHOption = options[OPTION_STRETCH_WH]
  }

  let fixOption = options[OPTION_FIX]
  if (fixOption) {
    fixOption = fixOption.toLowerCase()

    let fixOptionWidth = null
    let fixOptionHeight = null
    let fixOptionTop = null
    let fixOptionBottom = null
    let fixOptionLeft = null
    let fixOptionRight = null

    fixOption = fixOption
      .replace('-w-', '-width-')
      .replace('-h-', '-height-')
      .replace('-t-', '-top-')
      .replace('-b-', '-bottom-')
      .replace('-l-', '-left-')
      .replace('-r-', '-right-')

    if (fixOption.indexOf('width') >= 0) {
      fixOptionWidth = 'width'
    }
    if (fixOption.indexOf('height') >= 0) {
      fixOptionHeight = 'height'
    }
    if (fixOption.indexOf('top') >= 0) {
      fixOptionTop = 'top'
    }
    if (fixOption.indexOf('bottom') >= 0) {
      fixOptionBottom = 'bottom'
    }
    if (fixOption.indexOf('left') >= 0) {
      fixOptionLeft = 'left'
    }
    if (fixOption.indexOf('right') >= 0) {
      fixOptionRight = 'right'
    }

    if (fixOptionWidth != null) {
      stretchWOption = false
      fixOption = fixOption.split(fixOptionWidth).join('')
    } else {
      stretchWOption = true
    }

    if (fixOptionHeight) {
      stretchHOption = false
      fixOption = fixOption.split(fixOptionHeight).join('')
    } else {
      stretchHOption = true
    }

    if (fixOptionLeft && fixOptionRight) {
      stretchWOption = true
      fixOption = fixOption
        .split(fixOptionLeft)
        .join('')
        .split(fixOptionRight)
        .join('')
    }

    if (fixOptionTop && fixOptionBottom) {
      stretchHOption = true
      fixOption = fixOption
        .split('top')
        .join('')
        .split('bottom')
        .join('')
    }

    pivotOption = fixOption
  }

  if (pivotOption) {
    ret['pivot'] = pivotOption
  }

  if (stretchWOption != null) {
    ret['stretchx'] = checkBoolean(stretchWOption)
  }

  if (stretchHOption != null) {
    ret['stretchy'] = checkBoolean(stretchHOption)
  }

  // 横ストレッチチェック
  if (
    stretchWOption == null &&
    beforeBounds.width * 1.0001 < afterBounds.width
  ) {
    // 1.0001 → ブレる分の余裕をもたせる
    horizontalFix = null // 横ストレッチがある場合､pivot情報を消す
    Object.assign(ret, {
      stretchx: true,
    })
    stretchWOption = true
  }

  // 縦ストレッチチェック
  if (
    stretchHOption == null &&
    beforeBounds.height * 1.0001 < afterBounds.height
  ) {
    // 1.0001 → ブレる分の余裕をもたせる
    verticalFix = null // 縦ストレッチがある場合､pivot情報を消す
    Object.assign(ret, {
      stretchy: true,
    })
    stretchHOption = true
  }

  // Pivot出力
  if (stretchWOption) horizontalFix = null
  if (stretchHOption) verticalFix = null
  if (pivotOption == null && (horizontalFix != null || verticalFix != null)) {
    Object.assign(ret, {
      pivot: (horizontalFix || '') + (verticalFix || ''),
    })
  }

  return ret
}

/**
 * root以下のノードのレスポンシブパラメータ作成
 * {
 *  "node":{},
 *  "before":{},
 *  "after":{},
 *  "restore":{},
 *  "responsiveParameter":{}
 * }
 * @param {*} root
 */
function makeResponsiveParameter(root) {
  let nodeWalker = (node, func) => {
    func(node)
    node.children.forEach(child => {
      nodeWalker(child, func)
    })
  }

  let hashBounds = {}
  // 現在のboundsを取得する
  nodeWalker(root, node => {
    hashBounds[node.guid] = {
      node: node,
      before: {
        bounds: getGlobalBounds(node),
      },
    }
  })

  const artboardWidth = root.globalBounds.width
  const artboardHeight = root.globalBounds.height
  const resizePlusWidth = 100
  const resizePlusHeight = 100
  // Artboardのリサイズ
  root.resize(
    artboardWidth + resizePlusWidth,
    artboardHeight + resizePlusHeight,
  )

  // 変更されたboundsを取得する
  nodeWalker(root, node => {
    var hash = hashBounds[node.guid] || (hashBounds[node.guid] = {})
    hash['after'] = {
      bounds: getGlobalBounds(node),
    }
  })

  // Artboardのサイズを元に戻す
  root.resize(artboardWidth, artboardHeight)

  // 元に戻ったときのbounds
  nodeWalker(root, node => {
    hashBounds[node.guid]['restore'] = {
      bounds: getGlobalBounds(node),
    }
  })

  // レスポンシブパラメータの生成
  for (var key in hashBounds) {
    var value = hashBounds[key]
    value['responsiveParameter'] = getResponsiveParameter(
      value['node'],
      hashBounds,
    )
  }

  return hashBounds
}

/**
 * レスポンシブパラメータを取得するため､Artboardのサイズを変更し元にもどす
 * 元通りのサイズに戻ったかどうかのチェック
 * @param {*} hashBounds
 */
function checkBounds(hashBounds) {
  for (var key in hashBounds) {
    var value = hashBounds[key]
    if (value['before'] && value['restore']) {
      var beforeBounds = value['before']['bounds']
      var restoreBounds = value['restore']['bounds']
      if (
        beforeBounds.x != restoreBounds.x ||
        beforeBounds.y != restoreBounds.y ||
        beforeBounds.width != restoreBounds.width ||
        beforeBounds.height != restoreBounds.height
      ) {
        // 変わってしまった
        console.log('***error bounds changed:')
        console.log(value['node'])
        return false
      }
    }
  }
  return true
}

/**
 * レスポンシブパラメータの取得
 * @param {*} node
 */
function getPivotAndStretch(node) {
  let bounds = responsiveBounds[node.guid]
  return bounds ? bounds['responsiveParameter'] : null
}

/**
 * テキストレイヤーの処理
 * @param {*} json
 * @param {scenegraph} node
 * @param {artboard} artboard
 * @param {*} subfolder
 * @param {[]} renditions
 * @param {string} name
 * @param {string[]} options
 */
async function nodeText(
  json,
  node,
  artboard,
  subfolder,
  renditions,
  name,
  options,
) {
  // ラスタライズオプションチェック
  if (optionForceTextToImage || checkOptionImage(options)) {
    await nodeDrawing(
      json,
      node,
      artboard,
      subfolder,
      renditions,
      name,
      options,
    )
    return
  }

  if (!checkOptionText(options) && !checkOptionInput(options)) {
    await nodeDrawing(
      json,
      node,
      artboard,
      subfolder,
      renditions,
      name,
      options,
    )
    return
  }

  const drawBounds = getDrawBoundsInBaseCenterMiddle(node, artboard)

  let type = 'Text'
  if (checkOptionTextMeshPro(options)) {
    type = 'TextMeshPro'
  }
  if (checkOptionInput(options)) {
    type = 'Input'
  }

  let textType = 'point'
  let align = node.textAlign
  if (node.areaBox) {
    // エリア内テキストだったら
    textType = 'paragraph'
    // 上揃え
    align += 'upper'
  }

  // text.styleRangesの適応をしていない
  Object.assign(json, {
    type: type,
    name: name,
    text: node.text,
    textType: textType,
    font: node.fontFamily,
    style: node.fontStyle,
    size: node.fontSize * scale,
    color: getRGB(node.fill.value),
    align: align,
    x: drawBounds.x,
    y: drawBounds.y,
    w: drawBounds.width,
    h: drawBounds.height,
    vh: drawBounds.height,
    opacity: 100,
  })

  //
  assignPivotAndStretch(json, node)
}

/**
 * パスレイヤー(楕円や長方形等)の処理
 * @param {*} json
 * @param {scenegraph} node
 * @param {artboard} root
 * @param {*} subFolder
 * @param {*} renditions
 * @param {string} name
 * @param {string[]} options
 */
async function nodeDrawing(
  json,
  node,
  root,
  subFolder,
  renditions,
  name,
  options,
  parentJson,
) {
  // もしボタンオプションがついているのなら　ボタンを生成してその子供にイメージをつける
  if (checkOptionButton(options)) {
    Object.assign(json, {
      type: 'Button',
      name: name,
      elements: [
        {
          type: 'Image',
          name: name + ' - image',
        },
      ],
    })
    assignPivotAndStretch(json, node)
    await assignImage(json.elements[0], node, root, subFolder, renditions, name)
  } else {
    Object.assign(json, {
      type: 'Image',
      name: name,
    })
    assignPivotAndStretch(json, node)
    await assignImage(json, node, root, subFolder, renditions, name)
    // assignComponent
    if (options[OPTION_COMPONENT] != null) {
      Object.assign(json, {
        component: {},
      })
    }
  }
}

/**
 * .nameをパースしオプションに分解する
 * @param {*} str
 */
function parseNameOptions(node) {
  let str = node.name
  let name = null
  let options = {}
  let optionArray = str.split('@')
  if (optionArray != null && optionArray.length > 0) {
    name = optionArray[0].trim()
    // 名前の部分を除去
    optionArray.shift()
    optionArray.forEach(option => {
      let args = option.split('=')
      if (args.length > 1) {
        options[
          args[0]
            .trim()
            .toLowerCase()
            .replace(/[-|_]/g, '')
        ] = args[1].trim().toLowerCase()
      } else {
        options[
          option
            .trim()
            .toLowerCase()
            .replace(/[-|_]/g, '')
        ] = true
      }
    })
  } else {
    name = str.trim()
  }

  // 名前の最初1文字目が#ならコメントNode
  if (name.startsWith('#')) {
    options[OPTION_COMMENTOUT] = true
    name = name.substring(1)
  }

  // そのレイヤーをラスタライズする
  if (name.startsWith('*')) {
    options[OPTION_IMAGE] = true
    name = name.substring(1)
  }

  if (name.startsWith('+')) {
    options[OPTION_COMPONENT] = true
    name = name.substring(1)
  }

  // 名前の最後が/であれば､サブPrefabのオプションをONにする
  if (name.endsWith('/')) {
    options[OPTION_SUB_PREFAB] = true
    name = name.slice(0, -1)
  }

  if (node.parent != null && node.parent.constructor.name == 'RepeatGrid') {
    // 親がリピートグリッドの場合､名前が適当につけられるようで
    // Buttonといった名前がつき､機能してしまうことを防ぐ
    // item_button
    // item_text
    // 2つセットをリピートグリッド化した場合､以下のような構成になる
    // リピートグリッド 1
    //   - item[0]
    //     - item_button
    //     - item_text
    //   - item[0]
    //     - item_button
    //     - item_text
    //   - item[0]
    //     - item_button
    //     - item_text
    // 以上のような構成になる
    name = 'item[0]'
    // 自身のChildインデックスを名前に利用する
    for (let i = 0; i < node.parent.children.length; i++) {
      if (node.parent.children.at(i) == node) {
        name = 'item' + i
        break
      }
    }
  }

  if (name.endsWith('Image') || name.endsWith('_image') || name == 'image') {
    options[OPTION_IMAGE] = true
  }

  if (name.endsWith('Button') || name.endsWith('_button') || name == 'button') {
    options[OPTION_BUTTON] = true
  }

  if (name.endsWith('Slider')) {
    options[OPTION_SLIDER] = true
  }

  if (name.endsWith('Scrollbar')) {
    options[OPTION_SCROLLBAR] = true
  }

  if (name.endsWith('Text') || name.endsWith('_text') || name == 'text') {
    options[OPTION_TEXT] = true
  }

  if (name.endsWith('Toggle') || name.endsWith('_toggle') || name == 'toggle') {
    options[OPTION_TOGGLE] = true
  }

  if (name.endsWith('List')) {
    options[OPTION_LIST] = true
  }

  // 拡張モード有効時のみ
  if (optionEnableExtended) {
    if (name.endsWith('Input')) {
      options[OPTION_INPUT] = true
    }

    if (
      name.endsWith('Scroller') ||
      name.endsWith('_scroller') ||
      name == 'scroller'
    ) {
      options[OPTION_SCROLLER] = true
    }

    if (
      name.endsWith('Viewport') ||
      name.endsWith('_viewport') ||
      name == 'viewport'
    ) {
      options[OPTION_VIEWPORT] = true
    }
  }

  return {
    name: name,
    options: options,
  }
}

function concatNameOptions(name, options) {
  let str = '' + name

  for (let key in options) {
    let val = options[key]
    str += '@' + key + '=' + val
  }

  return str
}

function makeLayoutJson(root) {
  let rootBounds
  if (root instanceof Artboard) {
    rootBounds = getGlobalBounds(root)
    rootBounds.x = 0
    rootBounds.y = 0
  } else {
    rootBounds = getCMWHInBase(root, root.parent)
  }

  let layoutJson = {
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
          x: rootBounds.x,
          y: rootBounds.y,
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
  return layoutJson
}

/**
 * アートボードの処理
 * @param {*} renditions
 * @param {*} folder
 * @param {artboard} root
 */
async function extractedRoot(renditions, folder, root) {
  let nameOptions = parseNameOptions(root)

  let subFolderName = nameOptions.name

  // フォルダ名に使えない文字を'_'に変換
  subFolderName = convertToFileName(subFolderName)

  // アートボード毎にフォルダを作成する
  // TODO:他にやりかたはないだろうか
  try {
    var subFolder = await folder.getEntry(subFolderName)
  } catch (e) {
    subFolder = await folder.createFolder(subFolderName)
  }

  const layoutFileName = subFolderName + '.layout.txt'
  const layoutFile = await folder.createFile(layoutFileName, {
    overwrite: true,
  })

  var layoutJson = makeLayoutJson(root)

  let nodeWalker = async (nodeStack, layoutJson, depth, parentJson) => {
    var node = nodeStack[nodeStack.length - 1]
    let constructorName = node.constructor.name
    // レイヤー名から名前とオプションの分割
    let { name, options } = parseNameOptions(node)

    const indent = (() => {
      let sp = ''
      for (let i = 0; i < depth; i++) sp += '  '
      return sp
    })()

    console.log(
      indent + "'" + name + "':" + constructorName,
      options,
      responsiveBounds[node.guid]['responsiveParameter'],
    )

    // コメントアウトチェック
    if (checkOptionCommentOut(options)) {
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
          artboard: true,
          elements: [], // これがないとBAUM2でエラーになる(elementsが見つからないため､例外がでる)
        })
        await funcForEachChild()
        break
      case 'BooleanGroup':
        {
          // BooleanGroupは強制的にラスタライズする
          options[OPTION_IMAGE] = true
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
        await nodeDrawing(
          layoutJson,
          node,
          root,
          subFolder,
          renditions,
          name,
          options,
          parentJson,
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
    let node = getGlobalBounds(root)
    let parent = getGlobalBounds(root.parent)
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

  // layout.txtの出力
  layoutFile.write(JSON.stringify(layoutJson, null, '  '))
  console.log(layoutFileName)
}

// Baum2 export
async function exportBaum2(roots, outputFolder, responsiveCheckArtboards) {
  // ラスタライズする要素を入れる
  let renditions = []

  // レスポンシブパラメータの作成
  responsiveBounds = {}
  if (optionNeedResponsiveParameter) {
    for (var i in responsiveCheckArtboards) {
      let artboard = responsiveCheckArtboards[i]
      Object.assign(responsiveBounds, makeResponsiveParameter(artboard))
    }
  }

  // アートボード毎の処理
  for (var i in roots) {
    let root = roots[i]
    await extractedRoot(renditions, outputFolder, root)
  }

  if (renditions.length != 0) {
    // 一括画像ファイル出力
    application
      .createRenditions(renditions)
      .then(results => {
        console.log(`saved ${renditions.length} files`)
      })
      .catch(error => {
        console.log('error:' + error)
      })
  } else {
    // 画像出力の必要がなければ終了
    // alert('no outputs')
  }

  if (!checkBounds(responsiveBounds)) {
    alert('bounds is changed. Please execute UNDO.')
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
      for (let name in props) {
        let value = props[name]
        if (name == 'style') {
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
 */
async function alert(message) {
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
  return await dialog.showModal()
}

async function exportBaum2Command(selection, root) {
  let inputFolder
  let inputScale
  let errorLabel
  let checkEnableExtended
  let checkGetResponsiveParameter
  let checkEnableSubPrefab
  let checkTextToTMP
  let checkForceTextToImage
  let checkCheckMarkedForExport
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
              var folder = await fs.getFolder()
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
        (checkEnableExtended = h('input', {
          type: 'checkbox',
        })),
        h('span', '拡張モード有効(TextMeshPro/EnhancedScroller/TextInput)'),
      ),
      h(
        'label',
        {
          style: {
            flexDirection: 'row',
            alignItems: 'center',
          },
        },
        (checkGetResponsiveParameter = h('input', {
          type: 'checkbox',
        })),
        h('span', 'レスポンシブパラメータの出力'),
      ),
      h(
        'label',
        {
          style: {
            flexDirection: 'row',
            alignItems: 'center',
          },
        },
        (checkEnableSubPrefab = h('input', {
          type: 'checkbox',
        })),
        h('span', '名前の最後に/がついている以下を独立したPrefabにする'),
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
              optionEnableExtended = checkEnableExtended.checked
              // レスポンシブパラメータ
              optionNeedResponsiveParameter =
                checkGetResponsiveParameter.checked
              // サブPrefab
              optionEnableSubPrefab = checkEnableSubPrefab.checked
              //
              optionTextToTextMP = checkTextToTMP.checked
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

  // 出力前にセッションデータをダイアログに反映する
  // Scale
  inputScale.value = scale
  // Folder
  inputFolder.value = ''
  if (outputFolder != null) {
    inputFolder.value = outputFolder.nativePath
  }
  // Responsive Parameter
  checkEnableExtended.checked = optionEnableExtended
  checkGetResponsiveParameter.checked = optionNeedResponsiveParameter
  checkEnableSubPrefab.checked = optionEnableSubPrefab
  checkTextToTMP.checked = optionTextToTextMP
  checkForceTextToImage.checked = optionForceTextToImage
  checkCheckMarkedForExport.checked = optionCheckMarkedForExport

  // Dialog表示
  document.body.appendChild(dialog)
  let result = await dialog.showModal()

  // Dialogの結果チェック
  if (result == 'export') {
    // 出力ノードリスト
    let exports = {}
    // レスポンシブパラメータを取得するため､操作を行うアートボード
    let responsiveCheckArtboards = {}

    // 選択されているものがない場合 全てが変換対象
    let searchItems =
      selection.items.length > 0 ? selection.items : root.children

    // Artboard､SubPrefabを探し､　必要であればエキスポートマークチェックを行い､ 出力リストに登録する
    let currentArtboard = null
    let func = nodes => {
      nodes.forEach(node => {
        let nameOptions = parseNameOptions(node)
        const isArtboard = node instanceof Artboard
        if (
          isArtboard ||
          checkOptionSubPrefab(nameOptions.options) //
        ) {
          if (isArtboard) currentArtboard = node
          if (optionCheckMarkedForExport && !node.markedForExport) {
            // エキスポートマークをみる且つ､マークがついてない場合は 出力しない
          } else {
            // 同じ名前のものは上書きされる
            exports[nameOptions.name] = node
            if (isArtboard) {
              responsiveCheckArtboards[nameOptions.name] = node
            } else {
              // サブプレハブを選択して出力する場合は､currentArtboard==NULLの場合がある
              if (currentArtboard != null) {
                responsiveCheckArtboards[currentArtboard.name] = currentArtboard
              }
            }
          }
        }
        var children = node.children
        if (children) func(children)
      })
    }

    func(searchItems)

    if (exports.length == 0) {
      // 出力するものが見つからなかった
      alert('no selected artboards.')
      return
    }

    await exportBaum2(exports, outputFolder, responsiveCheckArtboards)
  }
}

async function exportPivotCommand(selection, root) {
  console.log('pivot')
  var artboard = selection.items[0]

  if (artboard == null || !(artboard instanceof Artboard)) {
    alert('select artboard')
    return
  }

  makeResponsiveParameter(artboard)

  return
}

module.exports = {
  // コマンドIDとファンクションの紐付け
  commands: {
    baum2ExportCommand: exportBaum2Command,
  },
}
