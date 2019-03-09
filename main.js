// XD拡張APIのクラスをインポート
const {
    Artboard,
    Text,
    Color,
    ImageFill
} = require("scenegraph");
const scenegraph = require("scenegraph");
const application = require("application");
const fs = require("uxp").storage.localFileSystem;

// 全体にかけるスケール
var scale = 1.0;

// レスポンシブパラメータを保存する
var responsiveBounds = {};

// 出力するフォルダ
var outputFolder = null;

// レスポンシブパラメータを取得するオプション
var optionNeedResponsiveParameter = true;

// レスポンシブパラメータを取得するオプション
var optionEnableSubPrefab = true;

// Textノードは強制的にImageに変換する
var optionForceTextToImage = true;

const OPTION_RASTERIZE = "rasterize";
const OPTION_SUB_PREFAB = "subPrefab";
const OPTION_BUTTON = "button";
const OPTION_SLIDER = "slider";
const OPTION_SCROLLBAR = "scrollbar";
const OPTION_TOGGLE = "toggle";
const OPTION_LIST = "list";
const OPTION_SCROLLER = "scroller";

function checkOptionRasterize(options) {
    return checkBoolean(options[OPTION_RASTERIZE]);
}

function checkOptionSubPrefab(options) {
    return optionEnableSubPrefab && checkBoolean(options[OPTION_SUB_PREFAB]);
}

function checkOptionButton(options) {
    return checkBoolean(options[OPTION_BUTTON]);
}

function checkOptionSlider(options) {
    return checkBoolean(options[OPTION_SLIDER]);
}

function checkOptionScrollbar(options) {
    return checkBoolean(options[OPTION_SCROLLBAR]);
}

function checkOptionToggle(options) {
    return checkBoolean(options[OPTION_TOGGLE]);
}

function checkOptionList(options) {
    return checkBoolean(options[OPTION_LIST]);
}

function checkOptionScroller(options) {
    return checkBoolean(options[OPTION_SCROLLER]);
}


/**
 * ファイル名につかえる文字列に変換する
 * @param {*} name 
 * @param {boolean} includeDot ドットも変換対象にするか
 * @return {string}
 */
function convertToFileName(name, includeDot) {
    if (includeDot) {
        return name.replace(/[\\/:*?"<>|#\.]/g, "_");
    }
    return name.replace(/[\\/:*?"<>|#]/g, "_");
}


/**
 * ラベル名につかえる文字列に変換する
 * @param {string} name 
 * @return {string}
 */
function convertToLabel(name) {
    return name.replace(/[\\/:*?"<>|# ]/g, "_");
}


/**
 * オブジェクトのもつ全てのプロパティを表示する
 * レスポンシブデザイン用プロパティが無いか調べるときに使用
 * @param {*} obj 
 */
function printAllProperties(obj) {
    var propNames = [];
    var o = obj;
    while (o) {
        propNames = propNames.concat(Object.getOwnPropertyNames(o));
        o = Object.getPrototypeOf(o);
    }
    console.log(propNames);
}


/**
 * Alphaを除きRGBで6桁16進の色の値を取得する
 * @param {number} color 
 */
function getRGB(color) {
    const c = ("000000" + color.toString(16)).substr(-6);
    return c;
}


/**
 * グローバル座標とサイズを取得する
 * @param {scenegraph} node 
 */
function getGlobalDrawBounds(node) {
    const bounds = node.globalDrawBounds;
    return {
        x: bounds.x * scale,
        y: bounds.y * scale,
        width: bounds.width * scale,
        height: bounds.height * scale
    };
}


/**
 * グローバル座標とサイズを取得する
 * @param {scenegraph} node 
 */
function getGlobalBounds(node) {
    const bounds = node.globalBounds;
    return {
        x: bounds.x * scale,
        y: bounds.y * scale,
        width: bounds.width * scale,
        height: bounds.height * scale
    };
}


/**
 * Artboard内でのDrawBoundsを取得する
 * x､yはCenterMiddleでの座標になる
 * @param {scenegraph} node 
 * @param {artboard} base 
 */
function getDrawBoundsInBase(node, base) {
    const nodeDrawBounds = getGlobalDrawBounds(node);
    const baseBounds = getGlobalBounds(base);
    return {
        x: nodeDrawBounds.x - (baseBounds.x + baseBounds.width / 2),
        y: nodeDrawBounds.y - (baseBounds.y + baseBounds.height / 2),
        width: nodeDrawBounds.width,
        height: nodeDrawBounds.height
    };
}


/**
 * Artboard内でのBoundsを取得する
 * @param {scenegraph} node 
 * @param {artboard} base 
 */
function getTopLeftBoundsInBase(node, base) {
    const nodeBounds = getGlobalBounds(node);
    const baseBounds = getGlobalBounds(base);
    return {
        x: nodeBounds.x - (baseBounds.x + baseBounds.width / 2),
        y: nodeBounds.y - (baseBounds.y + baseBounds.height / 2),
        width: nodeBounds.width,
        height: nodeBounds.height
    };
}


/**
 * Artboard内でのBoundsを取得する
 * x､yはCenterMiddleでの座標になる
 * @param {scenegraph} node 
 * @param {artboard} base 
 */
function getBoundsInBase(node, base) {
    const nodeBounds = getGlobalBounds(node);
    const baseBounds = getGlobalBounds(base);
    return {
        x: nodeBounds.x + nodeBounds.width / 2 - (baseBounds.x + baseBounds.width / 2),
        y: nodeBounds.y + nodeBounds.height / 2 - (baseBounds.y + baseBounds.height / 2),
        width: nodeBounds.width,
        height: nodeBounds.height
    };
}


function checkBoolean(r) {
    if ((typeof r) == "string") {
        const val = r.toLowerCase();
        if (val == "false" || val == "0" || val == "null") return false;
    }
    return r ? true : false;
}


function assignPivotAndStretch(json, node) {
    if (!optionNeedResponsiveParameter) {
        return null;
    }
    let pivot = getPivotAndStretch(node);
    if (pivot != null) {
        Object.assign(json, pivot);
    }
}


let counter = 1;

async function assignImage(json, node, root, subFolder, renditions, name) {
    const fileName = convertToFileName(`${name}(${counter})`, true);
    // 出力画像ファイル
    const file = await subFolder.createFile(fileName + ".png", {
        overwrite: true
    });
    counter++;

    const drawBounds = getDrawBoundsInBase(node, root);

    Object.assign(json, {
        image: fileName,
        x: drawBounds.x,
        y: drawBounds.y,
        w: drawBounds.width,
        h: drawBounds.height,
        opacity: 100
    });

    // 画像出力登録
    renditions.push({
        node: node,
        outputFile: file,
        type: application.RenditionType.PNG,
        scale: scale
    });

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
async function extractedGroup(json, node, root, funcForEachChild, name, options, depth) {
    if (depth > 0 && checkOptionSubPrefab(options)) {
        // 深度が0以上で､SubPrefabオプションをみつけた場合それ以下の処理は行わないようにする
        return "subPrefab";
    }
    if (checkOptionButton(options)) {
        const type = "Button"
        Object.assign(json, {
            type: type,
            name: name
        });
        assignPivotAndStretch(json, node);
        await funcForEachChild();
        return type;
    }

    if (checkOptionSlider(options)) {
        const type = "Slider"
        Object.assign(json, {
            type: type,
            name: name
        });
        await funcForEachChild();
        return type;
    }

    if (checkOptionSlider(options)) {
        const type = "Scrollbar";
        Object.assign(json, {
            type: type,
            name: name
        });
        await funcForEachChild();
        return type;
    }

    if (checkOptionToggle(options)) {
        const type = "Toggle";
        Object.assign(json, {
            type: type,
            name: name
        });
        await funcForEachChild();
        return type;
    }

    if (checkOptionList(options)) {
        const type = "List";
        Object.assign(json, {
            type: type,
            name: name,
            scroll: "vertical" // TODO:オプションを取得するようにする
        });
        await funcForEachChild();
        let areaElement = json.elements.find(element => {
            return element.name == "Area";
        });
        if (!areaElement) {
            console.log("***error not found Area");
        }
        return type;
    }

    if (checkOptionScroller(options)) {
        const type = "Scroller";
        Object.assign(json, {
            type: type,
            name: name,
            scroll: "vertical" // TODO:オプションを取得するようにする
        });
        await funcForEachChild();
        let areaElement = json.elements.find(element => {
            return element.name == "Area";
        });
        if (!areaElement) {
            console.log("***error not found Area");
        }
        return type;
    }
    // 他に"Mask"がある

    // 通常のグループ
    const type = "Group";
    let bounds = getGlobalDrawBounds(node);
    Object.assign(json, {
        type: type,
        name: name,
        w: bounds.width, // Baum2ではつかわないが､情報としていれる
        h: bounds.height, // Baum2ではつかわないが､情報としていれる
        elements: [] // Groupは空でもelementsをもっていないといけない
    });
    assignPivotAndStretch(json, node);
    if (checkOptionRasterize(options)) {}
    await funcForEachChild();

    return type;
}


/**
 * 
 * @param {*} beforeBounds 
 * @param {*} afterBounds 
 * @param {number} resizePlusWidth リサイズ時に増えた幅
 * @param {number} resizePlusHeight リサイズ時に増えた高さ
 */
function getResponsiveParameter(node, hashBounds) {
    if (!node) return null;
    const nodeBounds = hashBounds[node.guid];
    if (!nodeBounds || !nodeBounds["before"] || !nodeBounds["after"]) return null;
    const beforeBounds = nodeBounds["before"]["bounds"];
    const afterBounds = nodeBounds["after"]["bounds"];
    const parentBounds = hashBounds[node.parent.guid];
    if (!parentBounds || !parentBounds["before"] || !parentBounds["after"]) return null;
    const resizePlusWidth = parentBounds["after"]["bounds"].width - parentBounds["before"]["bounds"].width;
    const resizePlusHeight = parentBounds["after"]["bounds"].height - parentBounds["before"]["bounds"].height;


    let horizontalFix = null; // left center right
    let verticalFix = null; // top middle bottom

    // 横のレスポンシブパラメータを取得する
    if (beforeBounds.x == afterBounds.x) {
        horizontalFix = "left";
    } else {
        const subx = afterBounds.x - beforeBounds.x;
        horizontalFix = (subx > 0 && subx <= resizePlusWidth * 0.6) ? "center" : "right"; // 0.6 → 0.5より多めにとる
    }

    // 縦のレスポンシブパラメータを取得する
    if (beforeBounds.y == afterBounds.y) {
        verticalFix = "top";
    } else {
        const suby = afterBounds.y - beforeBounds.y;
        verticalFix = (suby > 0 && suby <= resizePlusHeight * 0.6) ? "middle" : "bottom";
    }

    let ret = {};

    // 横ストレッチチェック
    if (beforeBounds.width < afterBounds.width) {
        horizontalFix = null; // 縦ストレッチがある場合､pivot情報を消す
        Object.assign(ret, {
            stretchx: true
        })
    }

    // 縦ストレッチチェック
    if (beforeBounds.height < afterBounds.height) {
        verticalFix = null; // 縦ストレッチがある場合､pivot情報を消す
        Object.assign(ret, {
            stretchy: true
        })
    }

    // Pivot出力
    if (horizontalFix != null || verticalFix != null) {
        Object.assign(ret, {
            pivot: (horizontalFix || "") + (verticalFix || "")
        })
    }

    return ret;
}


function makeResponsiveParameter(root) {
    let nodeWalker = (node, func) => {
        func(node);
        node.children.forEach(child => {
            nodeWalker(child, func);
        });
    }

    let hashBounds = {};
    // 現在のboundsを取得する
    nodeWalker(root, node => {
        hashBounds[node.guid] = {
            node: node,
            before: {
                bounds: getGlobalBounds(node)
            }
        }
    });

    const artboardWidth = root.globalBounds.width;
    const artboardHeight = root.globalBounds.height;
    const resizePlusWidth = 100;
    const resizePlusHeight = 100;
    // Artboardのリサイズ
    root.resize(artboardWidth + resizePlusWidth, artboardHeight + resizePlusHeight);

    // 変更されたboundsを取得する
    nodeWalker(root, node => {
        var hash = hashBounds[node.guid] || (hashBounds[node.guid] = {});
        hash["after"] = {
            bounds: getGlobalBounds(node)
        }
    });

    // Artboardのサイズを元に戻す
    root.resize(artboardWidth, artboardHeight);

    // 元に戻ったときのbounds
    nodeWalker(root, node => {
        hashBounds[node.guid]["restore"] = {
            bounds: getGlobalBounds(node)
        }
    });

    // レスポンシブパラメータの生成
    for (var key in hashBounds) {
        var value = hashBounds[key];
        value["responsiveParameter"] = getResponsiveParameter(value["node"], hashBounds);
    }

    return hashBounds;
}


/**
 * レスポンシブパラメータを取得するため､Artboardのサイズを変更し元にもどす
 * 元通りのサイズに戻ったかどうかのチェック
 * @param {*} hashBounds 
 */
function checkBounds(hashBounds) {
    for (var key in hashBounds) {
        var value = hashBounds[key];
        if (value["before"] && value["restore"]) {
            var beforeBounds = value["before"]["bounds"];
            var restoreBounds = value["restore"]["bounds"];
            if (beforeBounds.x != restoreBounds.x ||
                beforeBounds.y != restoreBounds.y ||
                beforeBounds.width != restoreBounds.width ||
                beforeBounds.height != restoreBounds.height) {
                // 変わってしまった
                console.log("***error bounds changed:")
                console.log(value["node"]);
                return false;
            }
        }
    }
    return true;
}


/**
 * レスポンシブパラメータの取得
 * @param {*} node 
 */
function getPivotAndStretch(node) {
    let bounds = responsiveBounds[node.guid];
    return bounds ? bounds["responsiveParameter"] : null;
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
async function extractedText(json, node, artboard, subfolder, renditions, name, options) {
    // ラスタライズオプションチェック
    if (optionForceTextToImage || checkOptionRasterize(options)) {
        await extractedDrawing(json, node, artboard, subfolder, renditions, name, options);
        return;
    }
    const drawBounds = getDrawBoundsInBase(node, artboard);

    // text.styleRangesの適応をしていない
    Object.assign(json, {
        type: "Text",
        name: name,
        text: node.text,
        textType: "point",
        font: node.fontFamily,
        size: node.fontSize * scale,
        color: getRGB(node.fill.value),
        align: node.textAlign,
        x: drawBounds.x,
        y: drawBounds.y,
        w: drawBounds.width,
        h: drawBounds.height,
        vh: drawBounds.height,
        opacity: 100
    });

    //
    assignPivotAndStretch(json, node);
}


/**
 * パスレイヤー(楕円や長方形等)の処理
 * @param {*} json 
 * @param {scenegraph} node 
 * @param {artboard} artboard 
 * @param {*} subFolder 
 * @param {*} renditions 
 * @param {string} name 
 * @param {string[]} options 
 */
async function extractedDrawing(json, node, artboard, subFolder, renditions, name, options) {
    //
    Object.assign(json, {
        type: "Image",
        name: name,
    });

    // 
    assignPivotAndStretch(json, node);

    await assignImage(json, node, artboard, subFolder, renditions, name);
}

/**
 * .nameをパースしオプションに分解する
 * @param {*} str 
 */
function parseNameOptions(str) {
    let name = null;
    let options = {};
    let optionArray = str.split("@");
    if (optionArray != null && options.length > 0) {
        name = options[0].trim();
        optionArray.shift();
        optionArray.forEach(option => {
            let args = option.split("=");
            if (args > 1) {
                options[args[0].trim()] = args[1].trim();
            } else {
                options[option.trim()] = true;
            }
        })
    } else {
        name = str.trim();
    }

    // そのレイヤーをラスタライズする
    if (name.startsWith("*")) {
        options[OPTION_RASTERIZE] = true;
        name = name.substring(1);
    }

    // 名前の最後が/であれば､サブPrefabのオプションをONにする
    if (name.endsWith("/")) {
        options[OPTION_SUB_PREFAB] = true;
        name = name.slice(0, -1);
    }

    if (name.endsWith("Button")) {
        options[OPTION_BUTTON] = true;
    }

    if (name.endsWith("Slider")) {
        options[OPTION_SLIDER] = true;
    }

    if (name.endsWith("Scrollbar")) {
        options[OPTION_SCROLLBAR] = true;
    }

    if (name.endsWith("Toggle")) {
        options[OPTION_TOGGLE] = true;
    }

    if (name.endsWith("List")) {
        options[OPTION_LIST] = true;
    }

    if (name.endsWith("Scroller")) {
        options[OPTION_SCROLLER] = true;
    }

    return {
        name: name,
        options: options
    };
}

function concatNameOptions(name, options) {
    let str = "" + name;

    for (let key in options) {
        let val = options[key];
        str += "@" + key + "=" + val;
    }

    return str;
}


function makeLayoutJson(root) {
    let rootBounds;
    if (root instanceof Artboard) {
        rootBounds = getGlobalBounds(root);
        rootBounds.x = 0;
        rootBounds.y = 0;
    } else {
        rootBounds = getBoundsInBase(root, root.parent);
    }

    let layoutJson = {
        info: {
            version: "0.6.1",
            canvas: {
                image: {
                    w: rootBounds.width,
                    h: rootBounds.height
                },
                size: {
                    w: rootBounds.width,
                    h: rootBounds.height
                },
                base: {
                    x: rootBounds.x,
                    y: rootBounds.y,
                    w: rootBounds.width,
                    h: rootBounds.height
                }
            }
        },
        root: {
            type: "Root",
            name: root.name
        }
    };
    return layoutJson;
}


/**
 * アートボードの処理
 * @param {*} renditions 
 * @param {*} folder 
 * @param {artboard} root 
 */
async function extractedRoot(renditions, folder, root) {
    let nameOptions = parseNameOptions(root.name);

    let subFolderName = nameOptions.name;

    // フォルダ名に使えない文字を'_'に変換
    subFolderName = convertToFileName(subFolderName);

    // アートボード毎にフォルダを作成する
    // TODO:他にやりかたはないだろうか
    try {
        var subFolder = await folder.getEntry(subFolderName);
    } catch (e) {
        subFolder = await folder.createFolder(subFolderName);
    }

    const layoutFileName = subFolderName + ".layout.txt";
    const layoutFile = await folder.createFile(layoutFileName, {
        overwrite: true
    });

    var layoutJson = makeLayoutJson(root);

    let nodeWalker = async (nodeStack, layoutJson, depth) => {
        var node = nodeStack[nodeStack.length - 1];
        let constructorName = node.constructor.name;
        // レイヤー名から名前とオプションの分割
        let {
            name,
            options
        } = parseNameOptions(node.name);
        const indent = (depth => {
            let sp = "";
            for (let i = 0; i < depth; i++) sp += "  ";
            return sp;
        })(depth);

        console.log(indent + "'" + node.name + "':" + constructorName + " " + options);

        // 名前の最初1文字目が#ならコメントNode
        if (name.startsWith("#")) {
            return;
        }

        // 子Node処理関数
        let forEachChild = async () => {
            const numChildren = node.children.length;
            if (numChildren > 0) {
                layoutJson.elements = [];
                // 後ろから順番に処理をする
                // 描画順に関わるので､非同期処理にしない
                for (let i = numChildren - 1; i >= 0; i--) {
                    let childElement = {};
                    nodeStack.push(node.children.at(i));
                    await nodeWalker(nodeStack, childElement, depth + 1);
                    nodeStack.pop();
                    // なにも入っていない場合はelementsに追加しない
                    if (Object.keys(childElement).length > 0) {
                        layoutJson.elements.push(childElement);
                    }
                }
            }
        }

        // nodeの型で処理の分岐
        switch (constructorName) {
            case "Artboard":
                await forEachChild();
                break;
            case "BooleanGroup":
                {
                    // BooleanGroupは強制的にラスタライズする
                    options["rasterize"] = true;
                    let type = await extractedGroup(layoutJson, node, root, forEachChild, name, options, depth);
                }
                break;
            case "Group":
            case "RepeatGrid":
            case "SymbolInstance":
                {
                    let type = await extractedGroup(layoutJson, node, root, forEachChild, name, options, depth);
                }
                break;
            case "Line":
            case "Ellipse":
            case "Rectangle":
            case "Path":
                nodeStack.forEach(node => {});
                await extractedDrawing(layoutJson, node, root, subFolder, renditions, name, options);
                await forEachChild();
                break;
            case "Text":
                await extractedText(layoutJson, node, root, subFolder, renditions, name, options);
                await forEachChild();
                break;
            default:
                console.log("***error type:" + constructorName);
                await forEachChild();
                break;
        }

    };

    await nodeWalker([root], layoutJson.root, 0);

    // rootにPivot情報があった場合､canvas.baseの位置を調整する
    let pivot = layoutJson.root["pivot"];
    if (pivot && root.parent) {
        let node = getGlobalBounds(root);
        let parent = getGlobalBounds(root.parent);
        if (pivot.indexOf("left") >= 0) {
            layoutJson.info.canvas.base.x = (parent.x - node.x) - (node.width / 2);
        }
        if (pivot.indexOf("right") >= 0) {
            layoutJson.info.canvas.base.x = (parent.x + parent.width) - (node.x + node.width / 2);
        }
        if (pivot.indexOf("top") >= 0) {
            layoutJson.info.canvas.base.y = (parent.y - node.y) - (node.height / 2);
        }
        if (pivot.indexOf("bottom") >= 0) {
            layoutJson.info.canvas.base.y = (parent.y + parent.height) - (node.y + node.height / 2);
        }
    }

    // layout.txtの出力
    layoutFile.write(JSON.stringify(layoutJson, null, "  "));
    console.log(layoutFileName);

}

// Baum2 export
async function exportBaum2(roots, outputFolder) {
    // ラスタライズする要素を入れる
    let renditions = [];

    // レスポンシブパラメータの作成
    responsiveBounds = {}
    for (var i in roots) {
        let root = roots[i];
        if (optionNeedResponsiveParameter && root instanceof Artboard) {
            Object.assign(responsiveBounds, makeResponsiveParameter(root));
        }
    }

    // アートボード毎の処理
    for (var i in roots) {
        let root = roots[i];
        await extractedRoot(renditions, outputFolder, root);
    }

    if (renditions.length != 0) {
        // 一括画像ファイル出力
        application.createRenditions(renditions)
            .then(results => {
                console.log(`saved ${renditions.length} files`);
            })
            .catch(error => {
                console.log("error:" + error);
            });
    } else {
        // 画像出力の必要がなければ終了
        alert("no outputs");
    }

    if (!checkBounds(responsiveBounds)) {
        alert("bounds is changed. Please execute UNDO.");
    }

}


/**
 * Shorthand for creating Elements.
 * @param {*} tag The tag name of the element.
 * @param {*} [props] Optional props.
 * @param {*} children Child elements or strings
 */
function h(tag, props, ...children) {
    let element = document.createElement(tag);
    if (props) {
        if (props.nodeType || typeof props !== "object") {
            children.unshift(props);
        } else {
            for (let name in props) {
                let value = props[name];
                if (name == "style") {
                    Object.assign(element.style, value);
                } else {
                    element.setAttribute(name, value);
                    element[name] = value;
                }
            }
        }
    }
    for (let child of children) {
        element.appendChild(typeof child === "object" ? child : document.createTextNode(child));
    }
    return element;
}

/**
 * alertの表示
 * @param {string} message 
 */
async function alert(message) {
    let dialog =
        h("dialog",
            h("form", {
                    method: "dialog",
                    style: {
                        width: 400
                    }
                },
                h("h1", "XD Baum2 Export"),
                h("hr"),
                h("span", message),
                h("footer",
                    h("button", {
                        uxpVariant: "primary",
                        onclick(e) {
                            dialog.close()
                        }
                    }, "Close"),
                )
            )
        )
    document.body.appendChild(dialog);
    return await dialog.showModal();
}


async function exportBaum2Command(selection, root) {
    let inputFolder;
    let inputScale;
    let errorLabel;
    let checkGetResponsiveParameter;
    let checkEnableSubPrefab;
    let checkForceTextToImage;
    let dialog =
        h("dialog",
            h("form", {
                    method: "dialog",
                    style: {
                        width: 400
                    }
                },
                h("h1", "XD Baum2 Export"),
                h("hr"),
                h("label", {
                        style: {
                            flexDirection: "row",
                            alignItems: "center"
                        }
                    },
                    h("span", "Folder"),
                    inputFolder = h("input", {
                        style: {
                            width: "60%",
                        },
                        readonly: true,
                        border: 0
                    }),
                    h("button", {
                        async onclick(e) {
                            var folder = await fs.getFolder();
                            if (folder != null) {
                                inputFolder.value = folder.nativePath;
                                outputFolder = folder;
                            }
                        }
                    }, "...")
                ),
                h("label", {
                        style: {
                            flexDirection: "row",
                            alignItems: "center"
                        }
                    },
                    h("span", "Scale"),
                    inputScale = h("input", {
                        value: "4.0"
                    })
                ),
                h("label", {
                        style: {
                            flexDirection: "row",
                            alignItems: "center"
                        }
                    },
                    checkGetResponsiveParameter = h("input", {
                        type: "checkbox"
                    }),
                    h("span", "export responsive parameter (EXPERIMENTAL)")
                ),
                h("label", {
                        style: {
                            flexDirection: "row",
                            alignItems: "center"
                        }
                    },
                    checkEnableSubPrefab = h("input", {
                        type: "checkbox"
                    }),
                    h("span", "名前の最後に/がついている以下を独立したPrefabにする (EXPERIMENTAL)")
                ),
                h("label", {
                        style: {
                            flexDirection: "row",
                            alignItems: "center"
                        }
                    },
                    checkForceTextToImage = h("input", {
                        type: "checkbox"
                    }),
                    h("span", "Textを強制的に画像にして出力する (EXPERIMENTAL)")
                ),
                errorLabel = h("label", {
                        style: {
                            alignItems: "center",
                            color: "#f00"
                        }
                    },
                    ""
                ),
                h("footer",
                    h("button", {
                        uxpVariant: "primary",
                        onclick(e) {
                            dialog.close()
                        }
                    }, "Cancel"),
                    h("button", {
                        uxpVariant: "cta",
                        onclick(e) {
                            // 出力できる状態かチェック
                            // スケールの値が正常か
                            let tmpScale = Number.parseFloat(inputScale.value);
                            if (Number.isNaN(tmpScale)) {
                                errorLabel.textContent = "invalid scale value";
                                return;
                            }
                            scale = tmpScale;
                            // 出力フォルダは設定してあるか
                            if (outputFolder == null) {
                                errorLabel.textContent = "invalid output folder";
                                return;
                            }
                            // レスポンシブパラメータ
                            optionNeedResponsiveParameter = checkGetResponsiveParameter.checked;
                            // サブPrefab
                            optionEnableSubPrefab = checkEnableSubPrefab.checked;
                            //
                            optionForceTextToImage = checkForceTextToImage.checked;

                            dialog.close("export");
                        }
                    }, "Export")
                )
            )
        )

    // 出力前にセッションデータをダイアログに反映する
    // Scale
    inputScale.value = scale;
    // Folder
    inputFolder.value = "";
    if (outputFolder != null) {
        inputFolder.value = outputFolder.nativePath;
    }
    // Responsive Parameter
    checkGetResponsiveParameter.checked = optionNeedResponsiveParameter;
    checkEnableSubPrefab.checked = optionEnableSubPrefab;
    checkForceTextToImage.checked = optionForceTextToImage;

    // Dialog表示
    document.body.appendChild(dialog);
    let result = await dialog.showModal();

    // Dialogの結果チェック
    if (result == "export") {
        let roots = {};

        // 選択されているものがない場合 全てが変換対象
        let searchItems = selection.items.length > 0 ? selection.items : root.children

        let func = nodes => {
            nodes.forEach(node => {
                let nameOptions = parseNameOptions(node.name);
                if (node instanceof Artboard || checkOptionSubPrefab(nameOptions.options)) {
                    // 同じ名前のものは上書きされる
                    roots[nameOptions.name] = node;
                }
                var children = node.children;
                if (children) func(children);
            });
        }

        func(searchItems);

        if (roots.length == 0) {
            // 出力するものが見つからなかった
            alert("no selected artboards.")
            return;
        }

        await exportBaum2(roots, outputFolder);
    }

}


async function exportPivotCommand(selection, root) {
    console.log("pivot");
    var artboard = selection.items[0];

    if (artboard == null || !(artboard instanceof Artboard)) {
        alert("select artboard");
        return;
    }

    makeResponsiveParameter(artboard);

    return;
}


module.exports = { // コマンドIDとファンクションの紐付け
    commands: {
        baum2ExportCommand: exportBaum2Command,
        baum2PivotCommand: exportPivotCommand
    }
};