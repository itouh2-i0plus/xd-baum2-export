// XD拡張APIのクラスをインポート
const {
    Artboard,
    Text,
    Color,
    ImageFill
} = require("scenegraph");

const application = require("application");
const fs = require("uxp").storage.localFileSystem;

// 実験的オプションを有効にするかどうか
const experimentalOptionsEnable = true;

// 全体にかけるスケール
const scale = 4;


/**
 * ファイル名につかえる文字列に変換する
 * @param {string} name 
 * @return {string}
 */
function convertToFileName(name) {
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
    let bounds = node.globalDrawBounds;
    const x = bounds.x * scale;
    const y = bounds.y * scale;
    const w = bounds.width * scale;
    const h = bounds.height * scale;
    return {
        x,
        y,
        w,
        h
    };
}


/**
 * アートボードの座標とサイズを取得する
 * @param {artboard} artboard 
 */
function getArtboardBounds(artboard) {
    const x = artboard.translation.x * scale;
    const y = artboard.translation.y * scale;
    const w = artboard.width * scale;
    const h = artboard.height * scale;
    return {
        x,
        y,
        w,
        h
    };
}


/**
 * Artboard内での座標とサイズを取得する
 * x､yはCenterMiddleでの座標になる
 * @param {scenegraph} node 
 * @param {artboard} artboard 
 */
function getDrawBoundsInArtboard(node, artboard) {
    let {
        x,
        y,
        w,
        h
    } = getGlobalDrawBounds(node);
    const {
        x: ab_x,
        y: ab_y,
        w: ab_w,
        h: ab_h
    } = getArtboardBounds(artboard);
    return {
        x: x - ab_x + ab_w / 2,
        y: y - ab_y + ab_h / 2,
        w,
        h
    };
}


/**
 * string配列から指定のオプションがあるか検索し
 * ある場合は分解して戻す　ない場合はnull
 * 例
 * let r = getOption(["Pivot=LeftTop","pivot"]); 
 * // r:["Pivot","LeftTop"]
 * @param {string} optionName 
 * @param {string[]} options 
 */
function getOption(optionName, options) {
    if (options == null || !(options instanceof Array)) {
        return null;
    }
    const optionNameLowerCase = optionName.toLowerCase();
    let param = null;
    options.find(arg => {
        let f = arg.split("=");
        if (f == null) {
            f = [arg];
        }
        if (f[0].toLowerCase() == optionNameLowerCase) { // 大文字小文字関係なしに比較
            param = f;
            return true;
        }
        return false;
    });
    return param;
}


/**
 * オプションRasterizeチェック
 * 有効ならTrue
 * @param {string[]} options 
 * @return {boolean}
 */
function checkOptionRasterize(options) {
    if (!experimentalOptionsEnable) return false;
    const r = getOption("rasterize", options);
    if (r == null || r.length == 0) return false;
    if (r.length == 1) return true; // デフォルト True
    const val = r[1].toLowerCase();
    if (val == "false" || val == "0" || val == "null") return false;
    return true;
}


function assignPivot(json, node) {
    let pivot = getPivotAndStretch(node);
    if (pivot != null) {
        Object.assign(json, pivot);
    }
}


let counter = 1;

async function assignImage(json, node, artboard, subFolder, renditions, name) {
    const fileName = convertToFileName(`${name}(${counter})`);
    // 出力画像ファイル
    const file = await subFolder.createFile(fileName + ".png", {
        overwrite: true
    });
    counter++;

    const {
        x,
        y,
        w,
        h
    } = getDrawBoundsInArtboard(node, artboard);

    Object.assign(json, {
        image: fileName,
        x: x,
        y: y,
        w: w,
        h: h,
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
async function extractedGroup(json, node, funcForEachChild, name, options) {
    if (name.endsWith("Button")) {
        const type = "Button";
        Object.assign(json, {
            type: type,
            name: name
        });
        assignPivot(json, node);
        await funcForEachChild();
        return type;
    }

    if (name.endsWith("Slider")) {
        const type = "Slider";
        Object.assign(json, {
            type: type,
            name: name
        });
        await funcForEachChild();
        return type;
    }

    if (name.endsWith("Scrollbar")) {
        const type = "Scrollbar";
        Object.assign(json, {
            type: type,
            name: name
        });
        await funcForEachChild();
        return type;
    }

    if (name.endsWith("List")) {
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
        if (areaElement != null) {
            console.log("*** found Area ***");
        }
        return type;
    }

    // 通常のグループ
    const type = "Group";
    Object.assign(json, {
        type: type,
        name: name,
    });
    assignPivot(json, node);
    if (checkOptionRasterize(options)) {}
    await funcForEachChild();
    return type;
}


function getPivotAndStretch(node) {
    try {
        let parent = node.parent;
        let parentBounds = parent.boundsInParent;
        let parentWidth = parentBounds.width;
        let parentHeight = parentBounds.height;

        let horizontalFix = null; // left center right
        let verticalFix = null; // top middle bottom

        let beforeBounds = node.boundsInParent;
        let beforeFontSize = node.fontSize;

        // 親のサイズ変更
        parent.resize(parentWidth + 100, parentHeight + 100);
        let afterBounds = node.boundsInParent;

        // 親のサイズを元に戻す
        parent.resize(parentWidth, parentHeight);
        // 場合によって､フォントサイズが変わるためもとに戻す
        if (beforeFontSize != null) {
            node.fontSize = beforeFontSize;
        }

        // 横のレスポンシブパラメータを取得する
        if (beforeBounds.x == afterBounds.x) {
            horizontalFix = "left";
        } else {
            horizontalFix = (afterBounds.x - beforeBounds.x < 10) ? "center" : "right";
        }

        // 縦のレスポンシブパラメータを取得する
        if (beforeBounds.y == afterBounds.y) {
            verticalFix = "top";
        } else {
            verticalFix = (afterBounds.y - beforeBounds.y < 10) ? "middle" : "bottom";
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
    } catch (e) {
        console.log("***error getPivotAndStretch() failed");
    }
    return null;
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
    const label = convertToLabel(node.name);
    // ラスタライズオプションチェック
    if (checkOptionRasterize(options)) {
        await extractedDrawing(json, node, artboard, subfolder, renditions, name, options);
        return;
    }
    const {
        x,
        y,
        w,
        h
    } = getDrawBoundsInArtboard(node, artboard);

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
        x: x,
        y: y,
        w: w,
        h: h,
        vh: h,
        opacity: 100
    });

    //
    assignPivot(json, node);
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
    assignPivot(json, node);

    await assignImage(json, node, artboard, subFolder, renditions, name);

}


/**
 * アートボードの処理
 * @param {*} renditions 
 * @param {*} folder 
 * @param {artboard} artboard 
 */
async function extractedArtboard(renditions, folder, artboard) {
    let subFolderName = artboard.name;

    // フォルダ名に使えない文字を'_'に変換
    subFolderName = convertToFileName(subFolderName);

    // アートボード毎にフォルダを作成する
    // TODO:他にやりかたはないだろうか
    try {
        var subFolder = await folder.getEntry(subFolderName);
    } catch (e) {
        subFolder = await folder.createFolder(subFolderName);
    }

    const layoutFile = await folder.createFile(subFolderName + ".layout.txt", {
        overwrite: true
    });

    const {
        x,
        y,
        w,
        h
    } = getGlobalDrawBounds(artboard);

    let layoutJson = {
        info: {
            version: "0.6.1",
            canvas: {
                image: {
                    w: w,
                    h: h
                },
                size: {
                    w: w,
                    h: h
                },
                base: {
                    x: w,
                    y: h
                }
            }
        },
        root: {
            type: "Root",
            name: artboard.name
        }
    };

    let nodeWalker = async (nodeStack, layoutJson, depth) => {
        var node = nodeStack[nodeStack.length - 1];
        let constructorName = node.constructor.name;
        const indent = (depth => {
            let sp = "";
            for (let i = 0; i < depth; i++) sp += "  ";
            return sp;
        })(depth);
        console.log(indent + "'" + node.name + "':" + constructorName);

        // レイヤー名から名前とオプションの分割
        let name = node.name;
        let options = name.split("@");
        if (options != null && options.length > 0) {
            name = options[0];
            options.shift();
        }

        // 名前の最初1文字目での処理分別
        if (name.length > 0) {
            switch (name[0]) {
                case '#':
                    // コメント レイヤー
                    return;
                case '*':
                    // そのレイヤーをラスタライズする
                    options.push("Rasterize=true");
                    name = name.substring(1);
                    break;
                default:
                    break;
            }
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
            case "Group":
            case "RepeatGrid":
            case "SymbolInstance":
                {
                    let type = await extractedGroup(layoutJson, node, forEachChild, name, options);
                }
                break;
            case "Ellipse":
            case "Rectangle":
            case "Path":
                nodeStack.forEach(node => {});
                await extractedDrawing(layoutJson, node, artboard, subFolder, renditions, name, options);
                await forEachChild();
                break;
            case "Text":
                await extractedText(layoutJson, node, artboard, subFolder, renditions, name, options);
                await forEachChild();
                break;
            default:
                console.log("***error type:" + constructorName);
                await forEachChild();
                break;
        }

    };

    await nodeWalker([artboard], layoutJson.root, 0);

    // layout.txtの出力
    layoutFile.write(JSON.stringify(layoutJson, null, "  "));

}


// メインファンクション
async function mainHandlerFunction(selection, root) {
    let artboards = [];

    // 選択されているものがない場合 全てが変換対象
    (selection.items.length > 0 ? selection.items : root.children).forEach(child => {
        if (child instanceof Artboard) {
            artboards.push(child);
        }
    });

    if (artboards.length == 0) {
        console.log("変換対象がありません");
        return;
    }

    //const folder = await fs.getTemporaryFolder(); // テンポラリフォルダの選択
    const folder = await fs.getFolder(); // 出力フォルダの選択

    // ラスタライズする要素を入れる
    let renditions = [];

    // アートボード毎の処理
    // 画像を一度にラスタライズ･保存する処理と比較し､ここは非同期にするまでもないと考えます
    // TODO: Promise.allをつかいたい
    for (let index = 0; index < artboards.length; index++) {
        await extractedArtboard(renditions, folder, artboards[index]);
    }

    if (renditions.length == 0) {
        // 画像出力の必要がなければ終了
        return;
    }

    // 一括画像ファイル出力
    application.createRenditions(renditions)
        .then(results => {
            results.forEach(result => {
                console.log(`saved at ${result.outputFile.nativePath}`);
            });
        })
        .catch(error => {
            console.log("error:" + error);
        });
}

module.exports = { // コマンドIDとファンクションの紐付け
    commands: {
        baum2ExportCommand: mainHandlerFunction
    }
};