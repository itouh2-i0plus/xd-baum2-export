// XD拡張APIのクラスをインポート
const {
  Artboard,
  Text,
  Color,
  ImageFill,
  Line,
  Rectangle,
} = require('scenegraph')
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
const OPTION_FIX = 'fix'
const OPTION_TEXTMP = 'textmp' // textmeshpro
const OPTION_GROUP = 'group'
const OPTION_VLAYOUT = 'vlayout'
const OPTION_HLAYOUT = 'hlayout'
const OPTION_GLAYOUT = 'glayout'
const OPTION_VIEWPORT = 'viewport'
const OPTION_CANVASGROUP = 'canvasgroup'
const OPTION_COMPONENT = 'component'
const OPTION_VERTICAL_FIT = 'verticalfit'
const OPTION_MIN_HEIGHT = 'minheight'
const OPTION_PREFERRED_HEIGHT = 'preferredheight'
const OPTION_PRESERVE_ASPECT = 'preserveaspect'
const OPTION_BLANK = 'blank'
const OPTION_ALIGN = 'align'
const OPTION_RAYCAST_TARGET = 'raycasttarget'
const OPTION_PADDING_BOTTOM = 'paddingbottom'

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
    eps = 0.00001 // リサイズして元にもどしたとき､これぐらいの誤差がでる
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
 * 親をさかのぼり､Artboardを探し出す
 */
function getArtboard(node) {
  let parent = node
  while (parent != null) {
    if (parent.constructor.name == 'Artboard') {
      return parent
    }
    parent = parent.parent
  }
  return null
}

/**
 * グローバル座標とサイズを取得する
 * @param {scenegraph} node
 */
function getGlobalDrawBounds(node) {
  // レスポンシブパラメータ作成用で､すでに取得した変形してしまう前のパラメータがあった場合
  // それを利用するようにする
  const hashBounds = responsiveBounds
  let bounds = null
  if (hashBounds != null) {
    const hbounds = hashBounds[node.guid]
    if (hbounds != null && hbounds['before'] != null) {
      bounds = hbounds['before']['bounds']
    }
  }
  if (bounds == null) {
    bounds = node.globalDrawBounds
    bounds.x = bounds.x * scale
    bounds.y = bounds.y * scale
    bounds.width = bounds.width * scale
    bounds.height = bounds.height * scale
  }
  const viewPortHeight = node.viewportHeight
  if (viewPortHeight != null) bounds.height = viewPortHeight * scale
  return bounds
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
  const baseBounds = getGlobalDrawBounds(base)
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
function assignResponsiveParameter(json, node) {
  if (!optionNeedResponsiveParameter) {
    return null
  }
  let param = getResponsiveParameter(node)
  if (param != null) {
    Object.assign(json, param)
    /*
    // 高さが固定されているところに min_heightをいれる
    // 問題:リピートグリッドの中など自動だと高さがフィックスされるところに不必要についてる
    if (param != null && param['fix']['height'] === true) {
      var bounds = getGlobalDrawBounds(node)
      Object.assign(json, {
        min_height: bounds.height,
      })
    }
    */
  }
}

/**
 * BAUM2では使わないケースもあるが､
 * CenterMiddle座標と､サイズをアサインする
 * XY座標によるElementsソートなどに使われる
 * @param {*} json
 * @param {*} node
 */
function assignBoundsCM(json, boundsCM) {
  Object.assign(json, {
    x: boundsCM.x,
    y: boundsCM.y,
    w: boundsCM.width,
    h: boundsCM.height,
  })
}

function searchFileName(renditions, fileName) {
  const found = renditions.find(entry => {
    return entry.fileName == fileName
  })
  return found
}

async function symbolImage(json, node, root, subFolder, renditions, name) {
  console.log('symbol----------------------')
  printAllProperties(node)

  let symbolId = node.symbolId

  // 今回出力するためのユニークな名前をつける
  const { name: parentName, options: parentOptions } = parseNameOptions(
    node.parent,
  )
  const nameOptions = parseNameOptions(node)

  let fileName = convertToFileName(symbolId, true)
  const found = searchFileName(renditions, '../symbol/' + fileName)
  if (!found) {
    console.log('add rendition')
    // 出力画像ファイル
    const file = await symbolSubFolder.createFile(fileName + '.png', {
      overwrite: true,
    })

    // 画像出力登録
    renditions.push({
      fileName: '../symbol/' + fileName,
      node: node,
      outputFile: file,
      type: application.RenditionType.PNG,
      scale: scale,
    })
  }

  const drawBoundsCM = getDrawBoundsInBaseCenterMiddle(node, root)
  Object.assign(json, {
    image: '../symbol/' + fileName,
    x: drawBoundsCM.x,
    y: drawBoundsCM.y,
    w: drawBoundsCM.width,
    h: drawBoundsCM.height,
    opacity: 100,
  })

  assignResponsiveParameter(json, node)

  if (nameOptions.options[OPTION_PRESERVE_ASPECT]) {
    Object.assign(json, {
      preserve_aspect: true,
    })
  }
}

async function assignImage(
  json,
  node,
  root,
  subFolder,
  renditions,
  name,
  options,
) {
  let current = node

  // シンボルであれば､画像を再利用できるようにしたが､以下の理由でコメントアウト 2019/04/25
  // ･APIでSymbolのオーバーライドをしているか否かがわからない
  // ･Component待ち
  //　ーーーーここからーーーー
  // // 親がSymbolでないか調査する
  // while (current != null) {
  //   if (current.symbolId != null) {
  //     // 親にシンボルがいた
  //     await symbolImage(json, node, root, subFolder, renditions, name)
  //     return
  //   }
  //   current = current.parent
  // }
  //　ーーーーここまでーーーー

  // 今回出力するためのユニークな名前をつける
  const { name: parentName, options: parentOptions } = parseNameOptions(
    node.parent,
  )
  const nameOptions = parseNameOptions(node)

  let length = 5
  let fileName = convertToFileName(parentName + ' - ' + name, true)
  while (true) {
    const guidStr = '_' + node.guid.slice(0, length)
    // すでに同じものがあるか検索
    const found = searchFileName(renditions, fileName + guidStr)
    if (!found) {
      // みつからなかった場合完了
      fileName += guidStr
      break
    }
    length++
  }

  // 出力画像ファイル
  const file = await subFolder.createFile(fileName + '.png', {
    overwrite: true,
  })

  const drawBounds = getDrawBoundsInBaseCenterMiddle(node, root)
  Object.assign(json, {
    x: drawBounds.x,
    y: drawBounds.y,
    w: drawBounds.width,
    h: drawBounds.height,
    opacity: 100,
  })

  assignResponsiveParameter(json, node)

  const optionPreserveAspect = nameOptions.options[OPTION_PRESERVE_ASPECT]
  if (optionPreserveAspect != null) {
    Object.assign(json, {
      preserve_aspect: checkBoolean(optionPreserveAspect),
    })
  }

  const optionRaycastTarget = nameOptions.options[OPTION_RAYCAST_TARGET]
  if (optionRaycastTarget != null) {
    Object.assign(json, {
      raycast_target: checkBoolean(optionRaycastTarget),
    })
  }

  if (!checkBoolean(options[OPTION_BLANK])) {
    Object.assign(json, {
      image: fileName,
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
}

async function assignScroller(
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
      let item0
      if (node.numColumns == 1) {
        // vertical
        var scrollDirection = 'vertical'
        // item[0]を一個だけコンバート
        await funcForEachChild(1)
        // アイテムの作成
        // Scroller直下にはリピートグリッドで並べた分のitem[0]があり､
        // もう1段したの子供がアイテムになる
        item0 = json.elements[0]
      } else if (node.numRows == 1) {
        // Horizontal
        scrollDirection = 'horizontal'
        // item[0]を一個だけコンバート
        await funcForEachChild(1)
        items = [json.elements[0]]
      } else {
        // Grid
        item0 = {
          type: 'Group',
          name: 'item0',
          layout: {
            method: 'horizontal',
            padding: {
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            },
            spacing: 0,
          },
          elements: [],
        }
        // Column分のitem[0]をコンバートする
        await funcForEachChild(node.numColumns)
        // 一列はいっているitemを作成する
        for (let i = 0; i < 1; i++) {
          var elem = json.elements[i]
          //elem.name = 'item0-' + (node.numColumns - i - 1)
          elem.name = 'item0-' + i
          item0.elements.push(elem)
        }
        let item0_0 = item0.elements[0]
        // item0のRecttransform 縦スクロールは横にピッチリ　縦はitem0_0サイズ
        Object.assign(item0, {
          anchor_min: { x: 0, y: 1 },
          anchor_max: { x: 1, y: 1 },
          offset_min: { x: 0, y: -item0_0.h },
          offset_max: { x: 0, y: 0 },
        })
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

      // Paddingの計算
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
      let paddingBottom = null
      if (options[OPTION_PADDING_BOTTOM] != null)
        paddingBottom = parseFloat(options[OPTION_PADDING_BOTTOM]) * scale

      // リピートグリッドなら子供はすべてScrollerにいれるものになっている
      // 隙間のパラメータ
      Object.assign(json, {
        layout: {
          padding: {
            left: paddingLeft,
            right: paddingRight,
            top: paddingTop,
            bottom: paddingBottom,
          },
          spacing: spacing,
        },
        x: drawBounds.x,
        y: drawBounds.y,
        w: drawBounds.width,
        h: drawBounds.height,
        opacity: 100,
        elements: [item0], // トップの一個だけ
      })
      assignResponsiveParameter(json, node)
    } else {
      console.log('***error not found Area')
    }
  }
  return 'Scroller'
}

async function assignViewport(
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
  if (node.constructor.name == 'Group') {
    // 通常グループ､マスクグループでViewportをつかう
    // Areaを探し､AreaはDrawBounds情報のみ取得して処理しないようにする
    var viewportAreaNode = null
    let calcContentBounds = new CalcBounds()

    // マスクが利用されたViewportである場合､マスクを取得する
    if (node.mask) {
      viewportAreaNode = node.mask
    }
    await funcForEachChild(null, child => {
      if (child == viewportAreaNode) {
        // ViewportAreaNodeはElement処理をしない
        return false
      }
      const nameOptions = parseNameOptions(child)
      // まだAreaが確定していない場合､areaという名前の子供を探す
      if (
        viewportAreaNode == null &&
        nameOptions.name.toLowerCase() == 'area'
      ) {
        viewportAreaNode = child
        return false //処理しない(Elementに含まれない)
      }
      calcContentBounds.addBounds(getGlobalBounds(child))
      return true // 処理する
    })

    // 縦の並び順を正常にするため､Yでソートする
    sortElementsByPositionAsc(json.elements)

    // 以下縦スクロール専用でコーディング
    var scrollDirection = 'vertical'

    const viewportBoundsCM = getDrawBoundsInBaseCenterMiddle(
      viewportAreaNode,
      root,
    )

    Object.assign(json, {
      type: 'Viewport',
      name: name,
      scroll: scrollDirection,
      x: viewportBoundsCM.x,
      y: viewportBoundsCM.y,
      w: viewportBoundsCM.width,
      h: viewportBoundsCM.height,
      // Contentグループ情報
      content_w: calcContentBounds.bounds.width,
      content_h: calcContentBounds.bounds.height,
    })

    if (options[OPTION_VLAYOUT]) {
      let vlayoutJson = getVLayout(json, viewportAreaNode, node.children)
      // 縦スクロール､VGROUP内に可変HeightのNodeがあると､正確なPadding.Bottom値がでないため　一旦0にする
      vlayoutJson['padding']['bottom'] = 0

      if (options[OPTION_PADDING_BOTTOM] != null) {
        vlayoutJson['padding']['bottom'] =
          parseFloat(options[OPTION_PADDING_BOTTOM]) * scale
      }

      Object.assign(json, {
        layout: vlayoutJson,
      })

      forEachReverseElements(json.elements, elementJson => {
        if (!hasHeightLayouter(elementJson)) {
          // preferred-heightをつける
          Object.assign(elementJson, {
            preferred_height: elementJson.h,
          })
        }
      })
    }

    if (options[OPTION_GLAYOUT]) {
      let glayoutJson = getVLayout(json, viewportAreaNode, node.children)
      glayout['method'] = 'grid'
      // 縦スクロール､VGROUP内に可変HeightのNodeがあると､正確な値がでないため　一旦0にする
      glayoutJson['padding']['bottom'] = 0

      if (options[OPTION_PADDING_BOTTOM] != null) {
        glayoutJson['padding']['bottom'] =
          parseFloat(options[OPTION_PADDING_BOTTOM]) * scale
      }

      Object.assign(json, {
        layout: glayoutJson,
      })
    }

    assignResponsiveParameter(json, node)
  } else if (node.constructor.name == 'RepeatGrid') {
    // リピートグリッドでスクロールエリアを作成する
    // 以下縦スクロール専用でコーディング
    var scrollDirection = 'vertical'
    let calcContentBounds = new CalcBounds()
    const viewportAreaBounds = getGlobalDrawBounds(node)
    calcContentBounds.addBounds(viewportAreaBounds)
    // AdobeXDの問題で　リピートグリッドの枠から外れているものもデータがくるケースがある
    // そういったものを省くための処理
    // Contentの領域も計算する
    await funcForEachChild(null, child => {
      const nameOptions = parseNameOptions(child)
      const bounds = getGlobalDrawBounds(child)
      if (!testBounds(viewportAreaBounds, bounds)) {
        console.log(nameOptions.name + 'はViewportにはいっていない')
        return false // 処理しない
      }
      calcContentBounds.addBounds(bounds)
      return true // 処理する
    })
    const viewportBoundsCM = getDrawBoundsInBaseCenterMiddle(node, root)

    var child0 = node.children.at(0)
    const child0BoundsCM = getDrawBoundsInBaseCenterMiddle(child0, node)

    const cellWidth = node.cellSize.width * scale
    // item[0] がY方向へ移動している分
    const cellHeight = child0BoundsCM.y + node.cellSize.height * scale

    Object.assign(json, {
      type: 'Viewport',
      name: name,
      scroll: scrollDirection,
      x: viewportBoundsCM.x,
      y: viewportBoundsCM.y,
      w: viewportBoundsCM.width,
      h: viewportBoundsCM.height,
      // Contentグループ情報
      content_w: calcContentBounds.bounds.width,
      content_h: calcContentBounds.bounds.height,
      layout: options[OPTION_VLAYOUT] ? true : null,
    })

    assignResponsiveParameter(json, node)
  }
}

/**
 * Viewportの子供の整理をする
 * ･Y順に並べる
 */
function sortElementsByPositionAsc(jsonElements) {
  // 子供のリスト用ソート 上から順に並ぶように　(コンポーネント化するものをは一番下 例:Image Component)
  jsonElements.sort((elemA, elemB) => {
    const a_y = elemA['component'] ? Number.MAX_VALUE : elemA['y']
    const b_y = elemB['component'] ? Number.MAX_VALUE : elemB['y']
    if (a_y == b_y) {
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
    if (b_y == a_y) {
      const a_x = elemA['component'] ? Number.MAX_VALUE : elemA['x']
      const b_x = elemB['component'] ? Number.MAX_VALUE : elemB['x']
      return a_x - b_x
    }
    return a_y - b_y
  })
}

/**
 * VLayoutパラメータを生成する
 * ※List､LayoutGroup､Viewport共通
 * AreaNode　と　json.elementsの子供情報から
 * Spacing､Padding､Alignment情報を生成する
 * 子供の1個め､2個め(コンポーネント化するものを省く)を見てSpacing､ChildAlignmentを決める
 * そのため､json.elementsは予めソートしておくことが必要
 * @param {*} json
 * @param {*} areaNode
 */
function getVLayout(json, areaNode, nodeChildren) {
  // Paddingを取得するため､子供(コンポーネント化するもの･Areaを除く)のサイズを取得する
  // ToDo: jsonの子供情報Elementsも､node.childrenも両方つかっているが現状しかたなし
  var childrenCalcBounds = new CalcBounds()
  var childrenMinMaxSize = new MinMaxSize()
  nodeChildren.forEach(child => {
    const nameOptions = parseNameOptions(child)
    // コンポーネントにする場合は除く
    if (nameOptions.options['component']) return
    // Mask Viewportグループのように､子供のなかに描画エリア指定されているものがある場合も除く
    if (child == areaNode) return
    const childBounds = getGlobalDrawBounds(child)
    childrenCalcBounds.addBounds(childBounds)
    childrenMinMaxSize.addSize(childBounds.width, childBounds.height)
  })
  //
  let jsonVLayout = {}
  // Paddingの計算
  let areaBounds = getGlobalDrawBounds(areaNode)
  const childrenBounds = childrenCalcBounds.bounds
  const paddingLeft = childrenBounds.x - areaBounds.x
  const paddingTop = childrenBounds.y - areaBounds.y
  const paddingRight =
    areaBounds.x + areaBounds.width - (childrenBounds.x + childrenBounds.width)
  const paddingBottom =
    areaBounds.y +
    areaBounds.height -
    (childrenBounds.y + childrenBounds.height)
  Object.assign(jsonVLayout, {
    method: 'vertical',
    padding: {
      left: paddingLeft,
      right: paddingRight,
      top: paddingTop,
      bottom: paddingBottom,
    },
    cell_max_width: childrenMinMaxSize.maxWidth,
    cell_max_height: childrenMinMaxSize.maxHeight,
  })

  // componentの無いelemリストを作成する
  let elems = []
  forEachReverseElements(json.elements, element => {
    //後ろから追加していく
    if (element && element['component'] == null) {
      elems.push(element)
    }
  })

  // 子供の1個め､2個め(コンポーネント化するものを省く)を見てSpacing､ChildAlignmentを決める
  // そのため､json.elementsは予めソートしておくことが必要
  // childrenでは､ソートされていないため､使用できない
  const elem0 = elems[0]
  let elem1 = null

  // 縦にそこそこ離れているELEMを探す
  for (let i = 1; i < elems.length; i++) {
    // そこそこ離れている判定 少々のズレに目をつぶる
    if (Math.abs(elem0.y - elems[i].y) > (elem0.h / 2) * 0.3 + 2) {
      elem1 = elems[i]
      break
    }
  }
  if (elem0 && elem1) {
    // spacingの計算 ソートした上で､elem0とelem1で計算する
    // 簡易的にやっている
    const spacing = elem1.y - (elem0.y + elem0.h)
    if (Number.isFinite(spacing)) {
      Object.assign(jsonVLayout, {
        spacing: spacing,
      })
    }
    // left揃えか
    if (approxEqual(elem0.x, elem1.x)) {
      Object.assign(jsonVLayout, {
        child_alignment: 'left',
      })
    } else if (approxEqual(elem0.x + elem0.w / 2, elem1.x + elem1.w / 2)) {
      Object.assign(jsonVLayout, {
        child_alignment: 'right',
      })
    } else {
      Object.assign(jsonVLayout, {
        child_alignment: 'center',
      })
    }
  }
  // items全部が stretchx:true なら　ChildForceExpand.width = true
  const foundNotStretchX = elems.forEach(elem => {
    return elem['stretchx'] != true
  })
  if (!foundNotStretchX) {
    Object.assign(jsonVLayout, {
      child_force_expand_width: true,
    })
  }

  return jsonVLayout
}

function assignVLayout(json, node) {
  // 子供のリスト用ソート 上から順に並ぶように　(コンポーネント化するものをは一番下 例:Image Component)
  sortElementsByPositionAsc(json.elements)
  var jsonVLayout = getVLayout(json, node, node.children)
  Object.assign(json, {
    layout: jsonVLayout,
  })
}

function assignGLayout(json, node) {
  // 子供のリスト用ソート 上から順に並ぶように　(コンポーネント化するものをは一番下 例:Image Component)
  sortElementsByPositionAsc(json.elements)
  var jsonVLayout = getVLayout(json, node, node.children)
  jsonVLayout['method'] = 'grid'
  Object.assign(json, {
    layout: jsonVLayout,
  })
}

/**
 * Heightレイアウトするための情報をもっているElementか
 * @param {*} elementJson
 */
function hasHeightLayouter(elementJson) {
  const type = elementJson['type']
  if (type == 'Text') {
    return true
  }
  if (elementJson['layout'] && elementJson['layout']['method'] == 'vertical') {
    return true
  }
  if (elementJson['preferred_height']) {
    return true
  }
  return false
}

/**
 * 逆順にForEach　コンポーネント化するものを省く
 * @param {*} elements
 * @param {*} func
 */
function forEachReverseElements(elements, func) {
  for (let i = elements.length - 1; i >= 0; i--) {
    //後ろから追加していく
    let elementJson = elements[i]
    if (elementJson && elementJson['component'] == null) {
      func(elementJson)
    }
  }
}

async function assignGroup(
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
  assignResponsiveParameter(json, node)
  assignCanvasGroup(json, node, options)
  await funcForEachChild()

  // assignVerticaFit
  if (options[OPTION_VERTICAL_FIT] != null) {
    Object.assign(json, {
      vertical_fit: 'preferred', // デフォルトはpreferred
    })
  }

  // assignPreferredHeight
  if (options[OPTION_PREFERRED_HEIGHT] != null) {
    Object.assign(json, {
      preferred_height: json.h,
    })
  }

  if (options[OPTION_MIN_HEIGHT] != null) {
    Object.assign(json, {
      min_height: json.h,
    })
  }

  // assignVGroup
  if (options[OPTION_VLAYOUT] != null) {
    assignVLayout(json, node)
    Object.assign(json, {
      size_fit_vertical: 'preferred', // 子供の推奨サイズでこのグループの高さは決まる
    })
    forEachReverseElements(json.elements, elementJson => {
      if (!hasHeightLayouter(elementJson)) {
        // preferred-heightをつける
        Object.assign(elementJson, {
          preferred_height: elementJson.h,
        })
      }
    })
  }

  if (options[OPTION_GLAYOUT] != null) {
    assignGLayout(json, node)
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
    assignResponsiveParameter(json, node)
    assignBoundsCM(json, getDrawBoundsInBaseCenterMiddle(node, root))
    await funcForEachChild()
    return type
  }

  if (checkOptionSlider(options)) {
    const type = 'Slider'
    Object.assign(json, {
      type: type,
      name: name,
    })
    assignResponsiveParameter(json, node)
    await funcForEachChild()
    return type
  }

  if (checkOptionSlider(options)) {
    const type = 'Scrollbar'
    Object.assign(json, {
      type: type,
      name: name,
    })
    assignResponsiveParameter(json, node)
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
    assignResponsiveParameter(json, node)
    assignBoundsCM(json, getDrawBoundsInBaseCenterMiddle(node, root))
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
    return await assignScroller(
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
    return await assignViewport(
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
  return await assignGroup(
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

function assignExEyFromBounds(bounds) {
  bounds['ex'] = bounds.x + bounds.width
  bounds['ey'] = bounds.y + bounds.height
}

/**
 * 文字列の中に所定のパラメータ文字列がるかチェックする
 * option = x
 * option = -x-
 * option = -x
 * @param {*} optionStr
 * @param {*} paramStr
 */
function hasOptionParam(optionStr, paramStr) {
  if (optionStr == null || paramStr == null) return null
  if (optionStr == paramStr) return true
  if (optionStr.startsWith(`${paramStr}-`)) return true
  if (optionStr.indexOf(`-${paramStr}-`) >= 0) return true
  if (optionStr.endsWith(`-${paramStr}`)) return true
  return false
}

/**
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
 * @param {*} beforeBounds
 * @param {*} afterBounds
 * @param {number} resizePlusWidth リサイズ時に増えた幅
 * @param {number} resizePlusHeight リサイズ時に増えた高さ
 */
function calcResponsiveParameter(node, hashBounds, options) {
  if (!node || !node.parent) return null
  if (!options) {
    // @Pivot @Stretchを取得するため
    const nameOptions = parseNameOptions(node)
    options = nameOptions.options
  }
  //console.log(`----------------------${node.name}----------------------`)
  let fixOptionWidth = null
  let fixOptionHeight = null
  let fixOptionTop = null
  let fixOptionBottom = null
  let fixOptionLeft = null
  let fixOptionRight = null

  const bounds = hashBounds[node.guid]
  if (!bounds || !bounds['before'] || !bounds['after']) return null
  let beforeBounds = bounds['before']['bounds']
  const afterBounds = bounds['after']['bounds']
  const parentBounds = hashBounds[node.parent.guid]
  if (!parentBounds || !parentBounds['before'] || !parentBounds['after'])
    return null

  let parentBeforeBounds = parentBounds['before']['bounds']
  const parentAfterBounds = parentBounds['after']['bounds']

  assignExEyFromBounds(beforeBounds)
  assignExEyFromBounds(afterBounds)
  assignExEyFromBounds(parentBeforeBounds)
  assignExEyFromBounds(parentAfterBounds)

  const optionFix = options[OPTION_FIX]

  // X座標
  if (
    optionFix == null &&
    approxEqual(beforeBounds.width, afterBounds.width, 0.0005)
  ) {
    fixOptionWidth = true
  }
  if (
    optionFix == null &&
    approxEqual(
      beforeBounds.x - parentBeforeBounds.x,
      afterBounds.x - parentAfterBounds.x,
    )
  ) {
    // ロックされている
    fixOptionLeft = true
  } else {
    // 親のX座標･Widthをもとに､Left座標がきまる
    const beforeFixOptionLeft =
      (beforeBounds.x - parentBeforeBounds.x) / parentBeforeBounds.width
    fixOptionLeft = beforeFixOptionLeft
  }

  const beforeRight =
    parentBeforeBounds.x +
    parentBeforeBounds.width -
    (beforeBounds.x + beforeBounds.width)
  const afterRight =
    parentAfterBounds.x +
    parentAfterBounds.width -
    (afterBounds.x + afterBounds.width)

  if (optionFix == null && approxEqual(beforeRight, afterRight, 0.001)) {
    // ロックされている 0.001以下の誤差が起きることを確認した
    fixOptionRight = true
  } else {
    // 親のX座標･Widthをもとに､割合でRight座標がきまる
    const beforeFixOptionRight =
      (beforeBounds.ex - parentBeforeBounds.x) / parentBeforeBounds.width
    fixOptionRight = beforeFixOptionRight
  }

  // Y座標
  if (
    optionFix == null &&
    approxEqual(beforeBounds.height, afterBounds.height, 0.0005)
  ) {
    fixOptionHeight = true
  }
  if (
    optionFix == null &&
    approxEqual(
      beforeBounds.y - parentBeforeBounds.y,
      afterBounds.y - parentAfterBounds.y,
    )
  ) {
    fixOptionTop = true
  } else {
    // 親のY座標･heightをもとに､Top座標がきまる
    const beforeFixOptionTop =
      (beforeBounds.y - parentBeforeBounds.y) / parentBeforeBounds.height
    fixOptionTop = beforeFixOptionTop
  }
  const beforeBottom = parentBeforeBounds.ey - beforeBounds.ey
  const afterBottom = parentAfterBounds.ey - afterBounds.ey
  if (optionFix == null && approxEqual(beforeBottom, afterBottom, 0.0005)) {
    fixOptionBottom = true
  } else {
    // 親のY座標･Heightをもとに､Bottom座標がきまる
    const beforeFixOptionBottom =
      1 - (parentBeforeBounds.ey - beforeBounds.ey) / parentBeforeBounds.height
    fixOptionBottom = beforeFixOptionBottom
  }

  if (optionFix != null) {
    // オプションが指定してあれば､上書きする
    let fixOption = optionFix.toLowerCase()

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
  }

  // console.log('left:' + fixOptionLeft, 'right:' + fixOptionRight)
  // console.log('top:' + fixOptionTop, 'bottom:' + fixOptionBottom)
  // console.log('width:' + fixOptionWidth, 'height:' + fixOptionHeight)

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
  } else if (fixOptionLeft != null) {
    anchorMin.x = fixOptionLeft
    offsetMin.x = 0
  }
  if (fixOptionRight === true) {
    // 親のX座標から､X座標が固定値できまる
    anchorMax.x = 1
    offsetMax.x = beforeBounds.ex - parentBeforeBounds.ex
  } else if (fixOptionRight != null) {
    anchorMax.x = fixOptionRight
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
      anchorMin.x = anchorMax.x = (fixOptionLeft + fixOptionRight) / 2
      offsetMin.x = -beforeBounds.width / 2
      offsetMax.x = beforeBounds.width / 2
    }
  }

  // AdobeXD と　Unity2D　でY軸の向きがことなるため､Top→Max　Bottom→Min
  if (fixOptionTop === true) {
    // 親のY座標から､Y座標が固定値できまる
    anchorMax.y = 1
    offsetMax.y = -(beforeBounds.y - parentBeforeBounds.y)
  } else if (fixOptionTop != null) {
    anchorMax.y = 1 - fixOptionTop
    offsetMax.y = 0
  }
  if (fixOptionBottom === true) {
    // 親のY座標から､Y座標が固定値できまる
    anchorMin.y = 0
    offsetMin.y = -(beforeBounds.ey - parentBeforeBounds.ey)
  } else if (fixOptionBottom != null) {
    anchorMin.y = 1 - fixOptionBottom
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
      anchorMin.y = anchorMax.y = 1 - (fixOptionTop + fixOptionBottom) / 2
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

  let ret = {
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

  return ret
}

/**
 * func : node => {}  nodeを引数とした関数
 * @param {*} node
 * @param {*} func
 */
function nodeWalker(node, func) {
  func(node)
  node.children.forEach(child => {
    nodeWalker(child, func)
  })
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
  let hashBounds = {}
  // 現在のboundsを取得する
  nodeWalker(root, node => {
    hashBounds[node.guid] = {
      node: node,
      before: {
        visible: node.visible,
        bounds: getGlobalDrawBounds(node),
      },
    }
  })

  const rootWidth = root.globalBounds.width
  const rootHeight = root.globalBounds.height
  const resizePlusWidth = 100
  const resizePlusHeight = 100

  // Artboardのリサイズ
  root.resize(rootWidth + resizePlusWidth, rootHeight + resizePlusHeight)
  const viewportHeight = root.viewportHeight
  if (root.viewportHeight != null) {
    root.viewportHeight = viewportHeight + resizePlusHeight
  }

  // 変更されたboundsを取得する
  nodeWalker(root, node => {
    var hash = hashBounds[node.guid] || (hashBounds[node.guid] = {})
    hash['after'] = {
      bounds: getGlobalDrawBounds(node),
    }
  })

  // Artboardのサイズを元に戻す
  root.resize(rootWidth, rootHeight)
  if (root.viewportHeight != null) root.viewportHeight = viewportHeight

  // 元に戻ったときのbounds
  nodeWalker(root, node => {
    hashBounds[node.guid]['restore'] = {
      bounds: getGlobalDrawBounds(node),
    }
  })

  // レスポンシブパラメータの生成
  for (var key in hashBounds) {
    var value = hashBounds[key]
    value['responsiveParameter'] = calcResponsiveParameter(
      value['node'],
      hashBounds,
      null,
    )
  }

  return hashBounds
}

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
 */
function checkHashBounds(hashBounds, repair) {
  var result = true
  for (var key in hashBounds) {
    var value = hashBounds[key]
    if (value['before'] && value['restore']) {
      var beforeBounds = value['before']['bounds']
      var restoreBounds = value['restore']['bounds']
      if (!checkBoundsVerbose(beforeBounds, restoreBounds)) {
        // 変わってしまった
        let node = value['node']
        console.log('***error bounds changed:' + node.name)
        if (repair == true) {
          // 修復を試みる
          var dx = restoreBounds.x - beforeBounds.x
          var dy = restoreBounds.y - beforeBounds.y
          try {
            node.moveInParentCoordinates(dx, dy)
            node.resize(beforeBounds.width, beforeBounds.height)
          } catch (e) {}
          if (checkBounds(beforeBounds, getGlobalDrawBounds(node))) {
            console.log('修復されました')
          } else {
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
 * レスポンシブパラメータの取得
 * @param {*} node
 */
function getResponsiveParameter(node) {
  let bounds = responsiveBounds[node.guid]
  return bounds ? bounds['responsiveParameter'] : null
}

/**
 * 幅が固定されているか
 * @param {*} node
 */
function isFixWidth(node) {
  var param = getResponsiveParameter(node)
  return checkBoolean(param['fix']['width'])
}

function isFixHeight(node) {
  var param = getResponsiveParameter(node)
  return checkBoolean(param['fix']['height'])
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

  const drawBoundsCM = getDrawBoundsInBaseCenterMiddle(node, artboard)

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

  // @ALIGN オプションがあった場合､上書きする
  const optionAlign = options[OPTION_ALIGN]
  if (optionAlign != null) {
    align = optionAlign
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
    x: drawBoundsCM.x,
    y: drawBoundsCM.y,
    w: drawBoundsCM.width,
    h: drawBoundsCM.height,
    vh: drawBoundsCM.height,
    opacity: 100,
  })

  //
  assignResponsiveParameter(json, node)
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
    assignResponsiveParameter(json, node)
    await assignImage(
      json.elements[0],
      node,
      root,
      subFolder,
      renditions,
      name,
      options,
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
      name: name,
    })
    assignResponsiveParameter(json, node)
    await assignImage(json, node, root, subFolder, renditions, name, options)
    // assignComponent
    if (options[OPTION_COMPONENT] != null) {
      Object.assign(json, {
        component: {},
      })
    }
    // assginPreferredHeight
    if (options[OPTION_PREFERRED_HEIGHT] != null) {
      Object.assign(json, {
        preferred_height: json.h, //assignImageでわりあてられている
      })
    }
    // assginMinHeight
    if (options[OPTION_MIN_HEIGHT] != null) {
      Object.assign(json, {
        min_height: json.h, //assignImageでわりあてられている
      })
    }
  }
}

/**
 * node.nameをパースしオプションに分解する
 * オプションのダイナミックな追加など､ここで処理しないと辻褄があわないケースがでてくる
 * @param {*} str
 */
function parseNameOptions(node) {
  let name = null
  let options = {}

  let nameStr = node.name
  let parent = node.parent
  if (parent != null && parent.constructor.name == 'RepeatGrid') {
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
    nameStr = 'item0'
    // 自身のChildインデックスを名前に利用する
    for (let i = 0; i < parent.children.length; i++) {
      if (parent.children.at(i) == node) {
        nameStr = 'item' + i
        break
      }
    }

    // 親の属性をみてオプションを定義する
    const parentNameOptions = parseNameOptions(parent)
    // 親がVGroup属性をもったリピートグリッドの場合､itemもVGroupオプションを持つようにする
    // viewport　(Unityではここで､vgroupはもたない)
    //   content +vgroup +content_size_fitter (これらはBaum2で付与される)
    //     item0 +vgroup
    if (parentNameOptions.options[OPTION_VLAYOUT] != null) {
      options[OPTION_VLAYOUT] = true
    }
  }

  let optionArray = nameStr.split('@')
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
    name = nameStr.trim()
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

  if (name.endsWith('Image') || name.endsWith('_image') || name == 'image') {
    options[OPTION_IMAGE] = true
  }

  if (name.endsWith('Button') || name.endsWith('_button') || name == 'button') {
    options[OPTION_BUTTON] = true
  }

  if (name.endsWith('Slider') || name.endsWith('_slider') || name == 'slider') {
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
 * @param {*} outputFolder
 * @param {artboard} root
 */
async function nodeRoot(renditions, outputFolder, root) {
  let nameOptions = parseNameOptions(root)

  let subFolderName = nameOptions.name

  // フォルダ名に使えない文字を'_'に変換
  subFolderName = convertToFileName(subFolderName)

  // アートボード毎にフォルダを作成する
  // TODO:他にやりかたはないだろうか
  try {
    var subFolder = await outputFolder.getEntry(subFolderName)
  } catch (e) {
    subFolder = await outputFolder.createFolder(subFolderName)
  }

  const layoutFileName = subFolderName + '.layout.json'
  const layoutFile = await outputFolder.createFile(layoutFileName, {
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

  // レイアウトファイルの出力
  layoutFile.write(JSON.stringify(layoutJson, null, '  '))
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
  if (optionNeedResponsiveParameter) {
    for (var i in responsiveCheckArtboards) {
      let artboard = responsiveCheckArtboards[i]
      Object.assign(responsiveBounds, makeResponsiveParameter(artboard))
    }
  }

  // シンボル用サブフォルダの作成
  // try {
  //   symbolSubFolder = await outputFolder.getEntry('symbol')
  // } catch (e) {
  //   symbolSubFolder = await outputFolder.createFolder('symbol')
  // }

  // アートボード毎の処理
  for (var i in roots) {
    let root = roots[i]
    await nodeRoot(renditions, outputFolder, root)
  }

  for (var i in roots) {
    let root = roots[i]
    nodeWalker(root, node => {
      try {
        node.visible = true
      } catch (e) {}
    })
  }

  if (renditions.length != 0) {
    // 一括画像ファイル出力
    await application
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

  // データをもとに戻すため､意図的にエラーをスローする
  if (!checkHashBounds(responsiveBounds)) {
    // alert('bounds is changed. throwed error for UNDO')
  }
  throw 'throw error for UNDO'
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
  return await dialog.showModal()
}

function getExportRootNodes(selection, root) {
  // 選択されているものがない場合 全てが変換対象
  // return selection.items.length > 0 ? selection.items : root.children
  if (selection.items.length != 1) {
    alert('出力アートボート直下のノードを1つ選択してください')
    throw 'not selected immediate child.'
  }
  var node = selection.items[0]
  const parentIsArtboard = node.parent instanceof Artboard
  if (!parentIsArtboard) {
    alert('出力アートボート直下のノードを1つ選択してください')
    throw 'not selected immediate child.'
  }

  return [selection.items[0].parent]
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
  checkEnableExtended.checked = optionEnableExtended
  checkGetResponsiveParameter.checked = optionNeedResponsiveParameter
  checkEnableSubPrefab.checked = optionEnableSubPrefab
  checkTextToTMP.checked = optionTextToTextMP
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
  if (result == 'export') {
    // 出力ノードリスト
    let exports = {}
    // レスポンシブパラメータを取得するため､操作を行うアートボード
    let responsiveCheckArtboards = {}

    // Artboard､SubPrefabを探し､　必要であればエキスポートマークチェックを行い､ 出力リストに登録する
    let currentArtboard = null
    let funcForEach = nodes => {
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
        if (children) funcForEach(children)
      })
    }

    funcForEach(exportRootNodes)

    if (exports.length == 0) {
      // 出力するものが見つからなかった
      alert('no selected artboards.')
      return
    }

    await exportBaum2(exports, outputFolder, responsiveCheckArtboards)
  }
}

async function addFixCommand(selection, root) {
  let selectionItems = selection.items
  // レスポンシブパラメータの作成
  responsiveBounds = {}
  selectionItems.forEach(item => {
    // あとで一括変化があったかどうか調べるため､responsiveBoundsにパラメータを追加していく
    Object.assign(responsiveBounds, makeResponsiveParameter(item))
    let func = node => {
      if (node.symbolId != null) return
      const param = calcResponsiveParameter(node, responsiveBounds, {})
      if (param != null) {
        let fixOptions = []
        for (let key in param.fix) {
          if (param.fix[key] === true) {
            fixOptions.push(key[0])
          }
        }
        if (fixOptions.length > 0) {
          let name = node.name.replace(/ +@fix=[a-z_\-]+/, '')
          let optionStr = fixOptions
            .join('-')
            .replace('l-r', 'x') // 左右固定
            .replace('t-b', 'y') // 上下固定
            .replace('w-h', 'size') // サイズ固定
            .replace('x-y-size', 'size') // グループのresizeをやったところ､topleftも動いてしまったケース sizeのみにする
          try {
            const newName = name + ' @fix=' + optionStr
            node.name = newName
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
    alert('bounds is changed. throwed error for UNDO', '@fix')
  } else {
  }
}

/**
 * 選択した複数のグループのDrawBoundsのサイズをそろえるため､ダミーの描画オブジェクトを作成する
 * 現在は､同一Artboardであることを求める
 * @param {*} selection
 * @param {*} root
 */
async function addImageSizeFix(selection, root) {
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
      return child.name == sizeFixerName
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
      if (artboard != myArtboard) {
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
    let fixerGpraphic = new Rectangle()
    fixerGpraphic.name = sizeFixerName
    fixerGpraphic.width = fixBounds.width
    fixerGpraphic.height = fixBounds.height
    fixerGpraphic.fillEnabled = false
    fixerGpraphic.strokeEnabled = false
    // まずは追加し
    group.addChild(fixerGpraphic)
    // ズレを計算､移動する
    const lineBounds = fixerGpraphic.globalBounds
    fixerGpraphic.moveInParentCoordinates(
      fixBounds.x - lineBounds.x,
      fixBounds.y - lineBounds.y,
    )
  })
  alert('done', 'Size Fixer')
}

module.exports = {
  // コマンドIDとファンクションの紐付け
  commands: {
    exportBaum2Command: exportBaum2Command,
    addFixCommand: addFixCommand,
    addImageSizeFix: addImageSizeFix,
  },
}
