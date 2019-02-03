// XD拡張APIのクラスをインポート
const {
    Artboard,
    Text,
    Color,
    ImageFill
} = require("scenegraph");

const application = require("application");
const fs = require("uxp").storage.localFileSystem;

// 全体にかけるスケール
const scale = 4;


function convertToFileName(name) {
    return name.replace(/[\\/:*?"<>|#]/g, "_");
}


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
 * @param {*} color 
 */
function getRGB(color) {
    const c = ("000000" + color.toString(16)).substr(-6);
    return c;
}


/**
 * グローバル座標とサイズを取得する
 * @param {*} node 
 */
function getGlobalBounds(node) {
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
 * @param {*} node 
 * @param {*} artboard 
 */
function getBounds(node, artboard) {
    let {
        x,
        y,
        w,
        h
    } = getGlobalBounds(node);
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
 * Groupの処理 戻り値は処理したType
 * 注意:ここで､子供の処理もしてしまう
 * @param {*} json 
 * @param {*} node 
 * @param {*} funcForEachChild 
 */
async function extractedGroup(json, node, funcForEachChild) {
    let name = node.name;
    // Groupの名前からタイプの判定をする
    // https://github.com/kyubuns/Baum2
    const args = name.split("@");
    if (args != null && args.length > 0) {
        name = args[0];
    }

    let pivot = null;

    if (name.endsWith("Button")) {
        const type = "Button";
        Object.assign(json, {
            type: type,
            name: name
        });
        if (pivot) {
            Object.assign(json, {
                pivot: pivot
            });
        }
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
        printAllProperties(node);
        return type;
    }

    // 通常のグループ
    const type = "Group";
    Object.assign(json, {
        type: type,
        name: name,
    });
    if (pivot) {
        Object.assign(json, {
            pivot: pivot
        });
    }
    await funcForEachChild();
    return type;
}


function extractedText(json, node, artboard) {
    const label = convertToLabel(node.name);
    const {
        x,
        y,
        w,
        h
    } = getBounds(node, artboard);
    // text.styleRangesの適応をしていない
    // Textレイヤーもラスタライズしてしまうオプションがあっても良いと思う
    Object.assign(json, {
        type: "Text",
        name: node.name,
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
}

let counter = 1;
async function extractedDrawing(json, node, artboard, subFolder, renditions) {
    const fileName = convertToFileName(`${node.name}(${counter})`);
    counter++;
    const {
        x,
        y,
        w,
        h
    } = getBounds(node, artboard);
    //
    Object.assign(json, {
        type: "Image",
        name: node.name,
        image: fileName,
        x: x,
        y: y,
        w: w,
        h: h,
        opacity: 100
    });
    // 出力画像ファイル
    const file = await subFolder.createFile(fileName + ".png", {
        overwrite: true
    });
    // 画像出力登録
    console.log(node.guid);
    renditions.push({
        node: node,
        outputFile: file,
        type: application.RenditionType.PNG,
        scale: scale
    });
}


async function funcArtboard(renditions, folder, artboard) {
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
    } = getGlobalBounds(artboard);

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
                    let type = await extractedGroup(layoutJson, node, forEachChild);
                }
                break;
            case "Ellipse":
            case "Rectangle":
            case "Path":
                nodeStack.forEach(node => {});
                await extractedDrawing(layoutJson, node, artboard, subFolder, renditions);
                await forEachChild();
                break;
            case "Text":
                extractedText(layoutJson, node, artboard);
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
        await funcArtboard(renditions, folder, artboards[index]);
    }

    if (renditions.length == 0) {
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